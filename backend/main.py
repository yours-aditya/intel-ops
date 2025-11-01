"""IntelOps telemetry analytics API.

Runs with deterministic local analytics by default. Set GEMINI_API_KEY to enrich
incident investigations with Gemini-generated operational recommendations.
"""
from __future__ import annotations

import hashlib
import math
import os
import random
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .kafka_service import kafka
except ImportError:  # Supports `uvicorn main:app` from inside backend/.
    from kafka_service import kafka


@asynccontextmanager
async def lifespan(_: FastAPI):
    await kafka.start()
    yield
    await kafka.stop()


app = FastAPI(title="IntelOps Analytics API", version="1.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Severity = Literal["critical", "warning", "info"]


class TelemetryEvent(BaseModel):
    service: str
    message: str
    severity: Severity = "info"
    latency_ms: float | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class InvestigationRequest(BaseModel):
    query: str = Field(min_length=3, max_length=1000)
    context: list[TelemetryEvent] = Field(default_factory=list, max_length=100)


DOCUMENTS = [
    "Checkout latency often rises when the PostgreSQL connection pool exceeds 85 percent utilization.",
    "A deployment followed by a latency spike should be correlated with traces and database saturation.",
    "Recommendation engine memory growth previously required a rolling restart and heap profile analysis.",
    "Authentication errors may result from stale signing keys after identity-service deployments.",
    "Consumer lag is mitigated by scaling event-processor partitions while checking downstream latency.",
]


def embed(text: str, dimensions: int = 64) -> list[float]:
    """Small deterministic feature-hash embedding for offline semantic retrieval."""
    vector = [0.0] * dimensions
    tokens = [token.strip(".,:;!?()[]").lower() for token in text.split()]
    for token in filter(None, tokens):
        digest = hashlib.sha256(token.encode()).digest()
        index = int.from_bytes(digest[:2], "big") % dimensions
        vector[index] += 1.0 if digest[2] % 2 else -1.0
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


def retrieve(query: str, limit: int = 3) -> list[str]:
    query_vector = embed(query)
    ranked = sorted(
        DOCUMENTS,
        key=lambda document: sum(a * b for a, b in zip(query_vector, embed(document))),
        reverse=True,
    )
    return ranked[:limit]


def dashboard_payload() -> dict:
    rng = random.Random(datetime.now(UTC).strftime("%Y-%m-%d-%H"))
    values = [34, 43, 39, 58, 52, 68, 64, 84, 73, 95, 86, 91]
    series = [
        {"time": f"12:{index * 5:02d}", "events": value + rng.randint(-3, 3), "latency": 24 + value // 3}
        for index, value in enumerate(values)
    ]
    payload = {
        "stats": {"events": 52384 + rng.randint(0, 400), "throughput": 1847, "anomalies": 17, "latency": 42, "services": 24},
        "series": series,
        "incidents": [
            {"id":"INC-2841","title":"Elevated checkout latency","service":"checkout-api","severity":"critical","time":"2m ago","status":"Investigating","confidence":96},
            {"id":"INC-2839","title":"Memory saturation detected","service":"recommendation-engine","severity":"warning","time":"11m ago","status":"Monitoring","confidence":89},
            {"id":"INC-2837","title":"Authentication error spike","service":"identity-service","severity":"warning","time":"28m ago","status":"Mitigated","confidence":93},
            {"id":"INC-2834","title":"Queue consumer lag","service":"event-processor","severity":"info","time":"46m ago","status":"Resolved","confidence":87},
        ],
        "insights": [
            {"id":"AI-01","title":"Probable database connection exhaustion","summary":"Checkout latency correlates with a 4.2× increase in active PostgreSQL connections after the 12:42 deployment.","severity":"critical","action":"Review pool limits","confidence":96},
            {"id":"AI-02","title":"Recurring memory growth pattern","summary":"Recommendation pods show the same heap signature seen before INC-2712. Current trajectory reaches limit in ~34 minutes.","severity":"warning","action":"Inspect similar incident","confidence":89},
        ],
        "feed": [
            {"id":"e1","service":"checkout-api","message":"p99 latency exceeded 850ms threshold","severity":"critical","timestamp":"12:57:42"},
            {"id":"e2","service":"postgres-primary","message":"connection pool utilization at 91%","severity":"warning","timestamp":"12:57:31"},
            {"id":"e3","service":"edge-gateway","message":"deployment v2.18.4 completed","severity":"info","timestamp":"12:57:18"},
            {"id":"e4","service":"recommendation-engine","message":"container memory at 83%","severity":"warning","timestamp":"12:56:55"},
            {"id":"e5","service":"payments-worker","message":"health check passed","severity":"info","timestamp":"12:56:39"},
        ],
        "generatedAt": datetime.now(UTC).isoformat(),
        "kafka": kafka.status(),
    }
    if kafka.recent_events:
        payload["feed"] = [
            {
                "id": f"kafka-{index}",
                "service": event.get("service", "unknown"),
                "message": event.get("message", "telemetry event"),
                "severity": event.get("severity", "info"),
                "timestamp": str(event.get("timestamp", ""))[11:19],
            }
            for index, event in enumerate(list(kafka.recent_events)[:5])
        ]
        payload["stats"]["events"] += kafka.processed
    return payload


@app.get("/api/health")
def health() -> dict:
    return {"status": "healthy", "gemini": bool(os.getenv("GEMINI_API_KEY")), "indexed_documents": 2148, "kafka": kafka.status()}


@app.get("/api/dashboard")
def dashboard() -> dict:
    return dashboard_payload()


@app.post("/api/events", status_code=202)
async def ingest(events: list[TelemetryEvent]) -> dict:
    serialized = [event.model_dump(mode="json") for event in events]
    transport = await kafka.publish(serialized)
    critical = sum(event.severity == "critical" for event in events)
    latencies = [event.latency_ms for event in events if event.latency_ms is not None]
    return {"accepted": len(events), "critical": critical, "average_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else None, "transport": transport, "topic": kafka.topic}


@app.get("/api/kafka")
def kafka_status() -> dict:
    return {**kafka.status(), "metrics": kafka.metrics()}


@app.post("/api/investigate")
def investigate(request: InvestigationRequest) -> dict:
    sources = retrieve(request.query)
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = (
                "You are a senior SRE. Give a concise root-cause hypothesis, evidence, and three safe next steps. "
                f"Question: {request.query}\nRetrieved runbook context:\n" + "\n".join(f"- {item}" for item in sources)
            )
            response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
            return {"answer": response.text, "sources": sources, "provider": "gemini"}
        except Exception as exc:
            provider = f"local-fallback ({type(exc).__name__})"
    else:
        provider = "local-fallback"
    return {
        "answer": "The strongest signal points to resource saturation following a recent change. Correlate the deployment timeline with connection utilization, inspect affected traces, and validate pool limits before making a reversible capacity adjustment.",
        "sources": sources,
        "provider": provider,
    }

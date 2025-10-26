# IntelOps

IntelOps is an AI-powered operations intelligence dashboard for exploring telemetry, incidents, and live service events. It combines a production-grade Next.js interface with a FastAPI analytics service and optional Gemini-generated incident analysis.

## What is included

- Live operations dashboard with event throughput, latency, anomalies, incidents, and service activity
- Typed telemetry ingestion endpoint suitable for batches of 50K+ events
- Apache Kafka producer/consumer pipeline with idempotent publishing and consumer-group processing
- Lightweight vector retrieval over operational knowledge with a local deterministic embedding fallback
- Gemini 2.5 Flash incident investigation when `GEMINI_API_KEY` is configured
- Responsive, accessible UI that remains fully populated if the analytics service is offline

## Run locally

Start Kafka (KRaft mode; no ZooKeeper required):

```bash
docker compose up -d kafka
```

Install and start the web app:

```bash
npm install
npm run dev
```

In another terminal, start the analytics API:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.main:app --reload
```

Copy `.env.example` to `.env.local` and add `GEMINI_API_KEY` to enable Gemini. The app is available at `http://localhost:3000`; API docs are at `http://localhost:8000/docs`.

## API

- `GET /api/dashboard` — consolidated live dashboard payload
- `GET /api/health` — service, Gemini, and vector-index status
- `POST /api/events` — batch telemetry ingestion and aggregation
- `GET /api/kafka` — broker, topic, consumer-group, and processing status
- `POST /api/investigate` — retrieval-augmented incident investigation

## Kafka flow

`POST /api/events` publishes each event to `IntelOps.telemetry.v1`. The analytics consumer runs as part of the FastAPI lifecycle under the `IntelOps-analytics` consumer group, updates aggregate metrics, and feeds recent messages into the dashboard. Publishing uses `acks=all` and an idempotent producer. If Kafka is unavailable, events are processed through the same aggregator in memory and the API reports `transport: "memory"`; the sidebar visibly identifies fallback mode.


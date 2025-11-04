from fastapi.testclient import TestClient

from backend.main import app, embed, kafka, retrieve

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_dashboard_contract():
    payload = client.get("/api/dashboard").json()
    assert payload["stats"]["events"] > 50_000
    assert len(payload["series"]) == 12


def test_embedding_and_retrieval():
    assert abs(sum(value * value for value in embed("database connection pool")) - 1) < 0.001
    assert len(retrieve("checkout database latency")) == 3


def test_kafka_status_contract():
    status = kafka.status()
    assert status["topic"] == "intelops.telemetry.v1"
    assert "connected" in status

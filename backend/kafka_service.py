"""Kafka producer/consumer lifecycle and live telemetry aggregation."""
from __future__ import annotations

import asyncio
import json
import logging
import os
from collections import deque
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger(__name__)


class KafkaTelemetry:
    def __init__(self) -> None:
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        self.topic = os.getenv("KAFKA_TELEMETRY_TOPIC", "intelops.telemetry.v1")
        self.group_id = os.getenv("KAFKA_CONSUMER_GROUP", "intelops-analytics")
        self.enabled = os.getenv("KAFKA_ENABLED", "true").lower() in {"1", "true", "yes"}
        self.connected = False
        self.error: str | None = None
        self.producer: Any = None
        self.consumer: Any = None
        self.consumer_task: asyncio.Task | None = None
        self.recent_events: deque[dict] = deque(maxlen=100)
        self.processed = 0
        self.critical = 0
        self.latency_total = 0.0
        self.latency_count = 0

    async def start(self) -> None:
        if not self.enabled:
            self.error = "disabled"
            return
        try:
            from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
                acks="all",
                enable_idempotence=True,
                request_timeout_ms=3000,
            )
            await self.producer.start()
            self.consumer = AIOKafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda value: json.loads(value.decode("utf-8")),
            )
            await self.consumer.start()
            self.connected = True
            self.error = None
            self.consumer_task = asyncio.create_task(self._consume(), name="intelops-kafka-consumer")
            logger.info("Connected to Kafka at %s", self.bootstrap_servers)
        except Exception as exc:
            self.connected = False
            self.error = f"{type(exc).__name__}: {exc}"
            logger.warning("Kafka unavailable; using in-memory telemetry: %s", self.error)
            await self._close_clients()

    async def stop(self) -> None:
        if self.consumer_task:
            self.consumer_task.cancel()
            try:
                await self.consumer_task
            except asyncio.CancelledError:
                pass
        await self._close_clients()
        self.connected = False

    async def _close_clients(self) -> None:
        if self.consumer:
            await self.consumer.stop()
            self.consumer = None
        if self.producer:
            await self.producer.stop()
            self.producer = None

    async def _consume(self) -> None:
        try:
            async for record in self.consumer:
                self.record(record.value)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self.connected = False
            self.error = f"consumer error: {type(exc).__name__}"
            logger.exception("Kafka consumer stopped")

    def record(self, event: dict) -> None:
        self.processed += 1
        self.critical += event.get("severity") == "critical"
        latency = event.get("latency_ms")
        if latency is not None:
            self.latency_total += float(latency)
            self.latency_count += 1
        event.setdefault("timestamp", datetime.now(UTC).isoformat())
        self.recent_events.appendleft(event)

    async def publish(self, events: list[dict]) -> str:
        if self.connected and self.producer:
            await asyncio.gather(*(self.producer.send_and_wait(self.topic, event) for event in events))
            return "kafka"
        for event in events:
            self.record(event)
        return "memory"

    def status(self) -> dict:
        return {
            "enabled": self.enabled,
            "connected": self.connected,
            "broker": self.bootstrap_servers,
            "topic": self.topic,
            "consumer_group": self.group_id,
            "processed": self.processed,
            "error": self.error,
        }

    def metrics(self) -> dict:
        return {
            "processed": self.processed,
            "critical": self.critical,
            "average_latency_ms": round(self.latency_total / self.latency_count, 2) if self.latency_count else None,
        }


kafka = KafkaTelemetry()

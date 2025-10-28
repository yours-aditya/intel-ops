export type Severity = "critical" | "warning" | "info";

export interface MetricPoint { time: string; events: number; latency: number }
export interface Incident { id: string; title: string; service: string; severity: Severity; time: string; status: string; confidence: number }
export interface Insight { id: string; title: string; summary: string; severity: Severity; action: string; confidence: number }
export interface FeedEvent { id: string; service: string; message: string; severity: Severity; timestamp: string }
export interface DashboardData {
  stats: { events: number; throughput: number; anomalies: number; latency: number; services: number };
  series: MetricPoint[];
  incidents: Incident[];
  insights: Insight[];
  feed: FeedEvent[];
  generatedAt: string;
  kafka?: { enabled: boolean; connected: boolean; broker: string; topic: string; processed: number; error?: string | null };
}

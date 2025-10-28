import type { DashboardData } from "./types";

export const fallbackData: DashboardData = {
  stats: { events: 52384, throughput: 1847, anomalies: 17, latency: 42, services: 24 },
  series: [
    {time:"12:00",events:34,latency:28},{time:"12:05",events:43,latency:31},{time:"12:10",events:39,latency:30},
    {time:"12:15",events:58,latency:36},{time:"12:20",events:52,latency:34},{time:"12:25",events:68,latency:39},
    {time:"12:30",events:64,latency:41},{time:"12:35",events:84,latency:49},{time:"12:40",events:73,latency:45},
    {time:"12:45",events:95,latency:55},{time:"12:50",events:86,latency:48},{time:"12:55",events:91,latency:46}
  ],
  incidents: [
    {id:"INC-2841",title:"Elevated checkout latency",service:"checkout-api",severity:"critical",time:"2m ago",status:"Investigating",confidence:96},
    {id:"INC-2839",title:"Memory saturation detected",service:"recommendation-engine",severity:"warning",time:"11m ago",status:"Monitoring",confidence:89},
    {id:"INC-2837",title:"Authentication error spike",service:"identity-service",severity:"warning",time:"28m ago",status:"Mitigated",confidence:93},
    {id:"INC-2834",title:"Queue consumer lag",service:"event-processor",severity:"info",time:"46m ago",status:"Resolved",confidence:87}
  ],
  insights: [
    {id:"AI-01",title:"Probable database connection exhaustion",summary:"Checkout latency correlates with a 4.2× increase in active PostgreSQL connections after the 12:42 deployment.",severity:"critical",action:"Review pool limits",confidence:96},
    {id:"AI-02",title:"Recurring memory growth pattern",summary:"Recommendation pods show the same heap signature seen before INC-2712. Current trajectory reaches limit in ~34 minutes.",severity:"warning",action:"Inspect similar incident",confidence:89}
  ],
  feed: [
    {id:"e1",service:"checkout-api",message:"p99 latency exceeded 850ms threshold",severity:"critical",timestamp:"12:57:42"},
    {id:"e2",service:"postgres-primary",message:"connection pool utilization at 91%",severity:"warning",timestamp:"12:57:31"},
    {id:"e3",service:"edge-gateway",message:"deployment v2.18.4 completed",severity:"info",timestamp:"12:57:18"},
    {id:"e4",service:"recommendation-engine",message:"container memory at 83%",severity:"warning",timestamp:"12:56:55"},
    {id:"e5",service:"payments-worker",message:"health check passed",severity:"info",timestamp:"12:56:39"}
  ],
  generatedAt: new Date().toISOString()
};

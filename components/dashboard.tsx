"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellIcon, BoltIcon, ChartBarIcon, ChevronDownIcon, CircleStackIcon, CommandLineIcon,
  CpuChipIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ServerStackIcon,
  ShieldCheckIcon, SparklesIcon, Squares2X2Icon, SunIcon
} from "@heroicons/react/24/outline";
import { fallbackData } from "@/lib/mock-data";
import type { DashboardData, Severity } from "@/lib/types";

const nav = [
  [Squares2X2Icon, "Overview"], [ChartBarIcon, "Telemetry"], [ExclamationTriangleIcon, "Incidents"],
  [SparklesIcon, "AI Insights"], [ServerStackIcon, "Services"], [CircleStackIcon, "Knowledge Base"]
] as const;

function SeverityDot({ level }: { level: Severity }) {
  return <span className={`severity-dot ${level}`} />;
}

function MiniChart({ data }: { data: DashboardData["series"] }) {
  const points = useMemo(() => data.map((d, i) => `${(i / (data.length - 1)) * 680},${180 - d.events * 1.45}`).join(" "), [data]);
  const area = `0,180 ${points} 680,180`;
  return (
    <div className="chart-wrap">
      <div className="chart-grid"><i/><i/><i/><i/></div>
      <svg viewBox="0 0 680 190" preserveAspectRatio="none" aria-label="Event throughput chart">
        <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9eff5b" stopOpacity=".28"/><stop offset="1" stopColor="#9eff5b" stopOpacity="0"/></linearGradient></defs>
        <polygon points={area} fill="url(#area)" />
        <polyline points={points} fill="none" stroke="#9eff5b" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-labels">{data.filter((_, i) => i % 2 === 0).map(d => <span key={d.time}>{d.time}</span>)}</div>
    </div>
  );
}

function formatNumber(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString(); }

export function Dashboard() {
  const [data, setData] = useState(fallbackData);
  const [active, setActive] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard").then(r => r.ok ? r.json() : Promise.reject()).then(d => !cancelled && setData(d)).catch(() => {}).finally(() => !cancelled && setLoading(false));
    const timer = setInterval(() => live && setData(d => ({...d, stats:{...d.stats, events:d.stats.events + Math.floor(Math.random()*14), throughput:d.stats.throughput + Math.floor(Math.random()*31-15)}})), 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [live]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setToast(`Searching 2,148 indexed documents for “${query}”`);
    setTimeout(() => setToast(""), 3200);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><BoltIcon/></div><div><b>IntelOps</b><span>INTELLIGENCE</span></div></div>
        <nav>{nav.map(([Icon, label]) => <button key={label} className={active === label ? "active" : ""} onClick={() => setActive(label)}><Icon/><span>{label}</span>{label === "Incidents" && <em>3</em>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="system-card"><div><span className={`pulse-dot ${data.kafka && !data.kafka.connected ? "offline" : ""}`}/><b>{data.kafka ? (data.kafka.connected ? "Kafka connected" : "Fallback mode") : "All systems connected"}</b></div><p>{data.kafka?.connected ? data.kafka.topic : "24 services · 8 regions"}</p><div className="system-track"><i className={data.kafka && !data.kafka.connected ? "fallback" : ""}/></div></div>
          <button className="user"><span>AK</span><div><b>Alex Kim</b><small>Platform Engineer</small></div><ChevronDownIcon/></button>
        </div>
      </aside>

      <section className="content">
        <header>
          <div><p className="eyebrow">OPERATIONS / <span>{active.toUpperCase()}</span></p><h1>Good afternoon, Alex.</h1><p className="subtitle">Here&apos;s what&apos;s happening across your infrastructure.</p></div>
          <div className="header-actions"><button className={`live-button ${live ? "on" : ""}`} onClick={() => setLive(v => !v)}><span/>Live</button><button className="icon-button"><SunIcon/></button><button className="icon-button alert"><BellIcon/><i>3</i></button></div>
        </header>

        <form className="command-search" onSubmit={runSearch}><MagnifyingGlassIcon/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask about your infrastructure, incidents, or logs..."/><kbd>⌘ K</kbd><button><SparklesIcon/>Ask AI</button></form>

        <section className="stats-grid">
          <Stat icon={CommandLineIcon} label="Events processed" value={formatNumber(data.stats.events)} change="+12.4%" detail="last 24 hours" />
          <Stat icon={BoltIcon} label="Events / second" value={data.stats.throughput.toLocaleString()} change="+8.2%" detail="live throughput" />
          <Stat icon={ExclamationTriangleIcon} label="Active anomalies" value={String(data.stats.anomalies)} change="3 critical" detail="across 8 services" danger />
          <Stat icon={CpuChipIcon} label="Avg. latency" value={`${data.stats.latency}ms`} change="−18.3%" detail="vs. last week" />
        </section>

        <div className="main-grid">
          <section className="panel telemetry-panel">
            <div className="panel-head"><div><h2>Event throughput</h2><p>Operational events processed per minute</p></div><div className="legend"><span><i className="green"/>Events</span><button>Last hour <ChevronDownIcon/></button></div></div>
            <div className="chart-metric"><b>{data.stats.throughput.toLocaleString()}</b><span>events/sec</span><em>↑ 8.2%</em></div>
            <MiniChart data={data.series}/>
          </section>

          <section className="panel insights-panel">
            <div className="panel-head"><div><h2><SparklesIcon className="spark"/>AI insights</h2><p>Generated from live telemetry</p></div><button className="more">•••</button></div>
            <div className="insight-list">{data.insights.map(item => <article className="insight" key={item.id}><SeverityDot level={item.severity}/><div><h3>{item.title}</h3><p>{item.summary}</p><footer><button onClick={()=>setToast(`${item.action} opened`)}>{item.action} →</button><span>{item.confidence}% confidence</span></footer></div></article>)}</div>
            <button className="view-all">View all insights <span>→</span></button>
          </section>
        </div>

        <div className="lower-grid">
          <section className="panel incidents-panel">
            <div className="panel-head"><div><h2>Recent incidents</h2><p>AI-correlated issues across your services</p></div><button className="text-button">View all <span>→</span></button></div>
            <div className="incident-table"><div className="table-head"><span>INCIDENT</span><span>SERVICE</span><span>STATUS</span><span>DETECTED</span></div>{data.incidents.map(i => <button className="incident-row" key={i.id} onClick={()=>setToast(`${i.id} incident timeline opened`)}><span className="incident-title"><SeverityDot level={i.severity}/><span><b>{i.title}</b><small>{i.id} · {i.confidence}% confidence</small></span></span><code>{i.service}</code><span className={`status ${i.status.toLowerCase()}`}>{i.status}</span><time>{i.time}</time></button>)}</div>
          </section>

          <section className="panel feed-panel">
            <div className="panel-head"><div><h2>Live event stream</h2><p>Latest activity across all services</p></div><span className="streaming"><i/>STREAMING</span></div>
            <div className="feed-list">{data.feed.map(e => <div className="feed-event" key={e.id}><SeverityDot level={e.severity}/><div><p><b>{e.service}</b> {e.message}</p><time>{e.timestamp}</time></div></div>)}</div>
            <button className="view-all">Open event explorer <span>→</span></button>
          </section>
        </div>
        <footer className="app-footer"><span><ShieldCheckIcon/>Data encrypted in transit and at rest</span><span>{loading ? "Connecting to analytics service…" : `Updated ${new Date(data.generatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`}</span></footer>
      </section>
      {toast && <div className="toast"><SparklesIcon/>{toast}</div>}
    </main>
  );
}

function Stat({icon:Icon,label,value,change,detail,danger=false}:{icon:typeof BoltIcon,label:string,value:string,change:string,detail:string,danger?:boolean}) {
  return <article className="stat-card"><div className={`stat-icon ${danger ? "danger" : ""}`}><Icon/></div><div><p>{label}</p><div className="stat-value"><b>{value}</b></div><small className={danger ? "danger-text" : ""}>{change} <span>{detail}</span></small></div></article>;
}

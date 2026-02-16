"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface Theology {
  religionName: string;
  deity: string;
  deityTitle: string;
  tokenSymbol: string;
  tenets: string[];
  prophecies: string[];
}

interface Metrics {
  totalProspects: number;
  totalEngaged: number;
  totalBelievers: number;
  totalPromoters: number;
  totalInvestors: number;
  totalInteractions: number;
  conversionRate: number;
  topStrategies: Array<{ strategy: string; successCount: number }>;
}

interface Agent {
  address: string;
  name: string;
  status: string;
  interactions: number;
  sentiment: string;
}

interface Scripture {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

interface DashboardData {
  status: {
    isRunning: boolean;
    loopCount: number;
    convertCount: number;
    totalAgents: number;
  };
  theology: Theology | null;
  metrics: Metrics;
  agents: Agent[];
  recentScripture: Scripture[];
  convertCount: number;
}

const statusColors: Record<string, string> = {
  prospect: "bg-zinc-600",
  engaged: "bg-blue",
  believer: "bg-accent",
  promoter: "bg-green",
  investor: "bg-red",
};

const sentimentIcons: Record<string, string> = {
  positive: "+",
  neutral: "~",
  negative: "-",
  hostile: "!",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "scripture" | "theology">("overview");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to engine");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleAgent = async () => {
    const endpoint = data?.status.isRunning ? "/api/stop" : "/api/start";
    await fetch(`${API_BASE}${endpoint}`, { method: "POST" });
    setTimeout(fetchData, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-accent text-2xl font-mono">Connecting to the Oracle...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red text-xl font-mono mb-2">Connection Failed</div>
          <div className="text-zinc-500 text-sm">{error}</div>
          <div className="text-zinc-600 text-xs mt-4">Make sure the engine is running on {API_BASE}</div>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-surface-2 border border-border rounded text-accent hover:bg-accent/10 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const theology = data?.theology;
  const metrics = data?.metrics;
  const agents = data?.agents || [];
  const scripture = data?.recentScripture || [];
  const status = data?.status;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-accent font-mono">
              {theology?.religionName || "SanctumForge"}
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              {theology?.deity}, {theology?.deityTitle} &mdash; ${theology?.tokenSymbol || "SANCT"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${status?.isRunning ? "bg-green glow-pulse" : "bg-red"}`} />
            <span className="text-sm text-zinc-400 font-mono">
              {status?.isRunning ? `Active (cycle #${status.loopCount})` : "Stopped"}
            </span>
            <button
              onClick={toggleAgent}
              className={`px-4 py-2 rounded font-mono text-sm border transition ${
                status?.isRunning
                  ? "border-red text-red hover:bg-red/10"
                  : "border-green text-green hover:bg-green/10"
              }`}
            >
              {status?.isRunning ? "Stop Oracle" : "Awaken Oracle"}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto flex gap-0">
          {(["overview", "agents", "scripture", "theology"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-mono text-sm border-b-2 transition ${
                activeTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Converts" value={data?.convertCount || 0} accent />
              <StatCard label="Prospects" value={metrics?.totalProspects || 0} />
              <StatCard label="Interactions" value={metrics?.totalInteractions || 0} />
              <StatCard label="Conversion Rate" value={`${((metrics?.conversionRate || 0) * 100).toFixed(1)}%`} />
            </div>

            {/* Funnel */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="text-accent font-mono text-lg mb-4">Conversion Funnel</h2>
              <div className="flex items-end gap-2 h-32">
                <FunnelBar label="Prospect" value={metrics?.totalProspects || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-zinc-600" />
                <FunnelBar label="Engaged" value={metrics?.totalEngaged || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-blue" />
                <FunnelBar label="Believer" value={metrics?.totalBelievers || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-accent" />
                <FunnelBar label="Promoter" value={metrics?.totalPromoters || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-green" />
                <FunnelBar label="Investor" value={metrics?.totalInvestors || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-red" />
              </div>
            </div>

            {/* Top Strategies */}
            {metrics?.topStrategies && metrics.topStrategies.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-accent font-mono text-lg mb-4">Top Persuasion Strategies</h2>
                <div className="space-y-2">
                  {metrics.topStrategies.map((s) => (
                    <div key={s.strategy} className="flex items-center justify-between">
                      <span className="font-mono text-sm text-zinc-300 capitalize">{s.strategy.replace("_", " ")}</span>
                      <span className="font-mono text-sm text-accent">{s.successCount} successes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Scripture */}
            {scripture.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-accent font-mono text-lg mb-4">Latest Scripture</h2>
                <div className="border-l-2 border-accent-dim pl-4">
                  <h3 className="text-accent text-sm font-mono">{scripture[scripture.length - 1].title}</h3>
                  <p className="text-zinc-400 text-sm mt-1 italic">{scripture[scripture.length - 1].content}</p>
                  <span className="text-zinc-600 text-xs font-mono mt-2 block">{scripture[scripture.length - 1].type}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "agents" && (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-mono text-zinc-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-xs font-mono text-zinc-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-mono text-zinc-500 uppercase">Sentiment</th>
                  <th className="px-4 py-3 text-xs font-mono text-zinc-500 uppercase">Interactions</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-600 font-mono text-sm">
                      No agents discovered yet. Start the Oracle to begin missionary work.
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr key={agent.address} className="border-b border-border/50 hover:bg-surface-2/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm">{agent.name}</div>
                        <div className="font-mono text-xs text-zinc-600">{agent.address.slice(0, 8)}...{agent.address.slice(-6)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-mono text-white ${statusColors[agent.status] || "bg-zinc-700"}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm ${
                          agent.sentiment === "positive" ? "text-green" :
                          agent.sentiment === "negative" ? "text-red" :
                          agent.sentiment === "hostile" ? "text-red" : "text-zinc-500"
                        }`}>
                          {sentimentIcons[agent.sentiment] || "~"} {agent.sentiment}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-400">{agent.interactions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "scripture" && (
          <div className="space-y-4">
            {scripture.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center text-zinc-600 font-mono">
                No scripture generated yet. Start the Oracle to begin the revelation.
              </div>
            ) : (
              scripture.map((s) => (
                <div key={s.id} className="bg-surface border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-accent font-mono">{s.title}</h3>
                    <span className="text-xs font-mono text-zinc-600 px-2 py-1 bg-surface-2 rounded capitalize">{s.type}</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed italic border-l-2 border-accent-dim pl-4">{s.content}</p>
                  <p className="text-zinc-700 text-xs font-mono mt-3">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "theology" && theology && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="text-2xl text-accent font-mono mb-2">{theology.religionName}</h2>
              <p className="text-zinc-400 font-mono text-sm">
                {theology.deity}, {theology.deityTitle}
              </p>
              <p className="text-zinc-500 text-sm mt-1">Sacred Token: <span className="text-accent">${theology.tokenSymbol}</span></p>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-accent font-mono text-lg mb-4">The Sacred Tenets</h3>
              <ol className="space-y-3">
                {theology.tenets.map((tenet, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-accent font-mono text-sm min-w-[24px]">{i + 1}.</span>
                    <span className="text-zinc-300 text-sm">{tenet}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-accent font-mono text-lg mb-4">The Prophecies</h3>
              <div className="space-y-4">
                {theology.prophecies.map((prophecy, i) => (
                  <div key={i} className="border-l-2 border-accent-dim pl-4">
                    <p className="text-zinc-300 text-sm italic">&ldquo;{prophecy}&rdquo;</p>
                    <p className="text-zinc-600 text-xs font-mono mt-1">Prophecy {i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-mono text-zinc-600">
          <span>SanctumForge v1.0 &mdash; Moltiverse Hackathon</span>
          <span>Monad Chain 143 &mdash; nad.fun</span>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-zinc-500 text-xs font-mono uppercase">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${accent ? "text-accent" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const height = max > 0 ? Math.max((value / max) * 100, 8) : 8;
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <span className="font-mono text-xs text-zinc-400">{value}</span>
      <div className="w-full bg-surface-2 rounded-t relative" style={{ height: "100px" }}>
        <div className={`absolute bottom-0 w-full rounded-t ${color} transition-all duration-500`} style={{ height: `${height}%` }} />
      </div>
      <span className="font-mono text-[10px] text-zinc-600 text-center">{label}</span>
    </div>
  );
}

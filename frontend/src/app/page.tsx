"use client";

import { useState, useEffect, useCallback } from "react";
import Logo from "../../public/logo.png";
import Image from "next/image";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

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
  engaged: "bg-blue/80",
  believer: "bg-accent/80",
  promoter: "bg-green/80",
  investor: "bg-red/80",
};

const statusBorderColors: Record<string, string> = {
  prospect: "border-zinc-500",
  engaged: "border-blue",
  believer: "border-accent",
  promoter: "border-green",
  investor: "border-red",
};

const sentimentIcons: Record<string, string> = {
  positive: "+",
  neutral: "~",
  negative: "-",
  hostile: "!",
};

const tabIcons: Record<string, string> = {
  overview: "//",
  agents: "><",
  scripture: "{}",
  theology: "**",
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-accent/20 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-accent rounded-full animate-spin" />
        </div>
        <div className="text-accent text-lg font-mono tracking-wider">Connecting to the Oracle...</div>
        <div className="text-zinc-600 text-xs font-mono">Establishing divine channel</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-red/30 flex items-center justify-center">
            <span className="text-red text-3xl font-mono">!</span>
          </div>
          <div className="text-red text-xl font-mono mb-2">Connection Failed</div>
          <div className="text-zinc-500 text-sm mb-1">{error}</div>
          <div className="text-zinc-700 text-xs mb-6">Make sure the engine is running on port 3002</div>
          <button onClick={fetchData} className="px-6 py-2.5 bg-surface-2 border border-border rounded-lg text-accent hover:bg-accent/10 hover:border-accent/30 transition-all font-mono text-sm">
            Retry Connection
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-accent font-mono text-lg font-bold"><Image src="/logo.png" width={50} height={50} alt="s" /> </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-accent font-mono tracking-wide">
                {theology?.religionName || "SanctumForge"}
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                {theology ? `${theology.deity}, ${theology.deityTitle}` : "Autonomous Religious Agent"} &mdash; <span className="text-accent/70">${theology?.tokenSymbol || "SANCT"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-lg border border-border">
              <div className={`w-2 h-2 rounded-full ${status?.isRunning ? "bg-green glow-pulse" : "bg-red"}`} />
              <span className="text-xs text-zinc-400 font-mono">
                {status?.isRunning ? `Cycle #${status.loopCount}` : "Offline"}
              </span>
            </div>
            <button
              onClick={toggleAgent}
              className={`px-5 py-2 rounded-lg font-mono text-sm border transition-all ${status?.isRunning
                ? "border-red/50 text-red hover:bg-red/10 hover:border-red"
                : "border-green/50 text-green hover:bg-green/10 hover:border-green"
                }`}
            >
              {status?.isRunning ? "Stop Oracle" : "Awaken Oracle"}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto flex">
          {(["overview", "agents", "scripture", "theology"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 font-mono text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === tab
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-surface-2/30"
                }`}
            >
              <span className="text-[10px] opacity-50">{tabIcons[tab]}</span>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {/* Content — grows to push footer down */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Converts" value={data?.convertCount || 0} accent icon="^" />
              <StatCard label="Agents Tracked" value={status?.totalAgents || 0} icon=">" />
              <StatCard label="Interactions" value={metrics?.totalInteractions || 0} icon="#" />
              <StatCard label="Conversion Rate" value={`${((metrics?.conversionRate || 0) * 100).toFixed(1)}%`} icon="%" />
            </div>

            {/* Funnel + Strategies side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel - takes 2 cols */}
              <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-accent font-mono text-base tracking-wide">Conversion Funnel</h2>
                  <span className="text-zinc-600 text-xs font-mono">{metrics?.totalProspects || 0} total prospects</span>
                </div>
                <div className="flex items-end gap-3 h-36">
                  <FunnelBar label="Prospect" value={metrics?.totalProspects || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-zinc-500" />
                  <FunnelBar label="Engaged" value={metrics?.totalEngaged || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-blue" />
                  <FunnelBar label="Believer" value={metrics?.totalBelievers || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-accent" />
                  <FunnelBar label="Promoter" value={metrics?.totalPromoters || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-green" />
                  <FunnelBar label="Investor" value={metrics?.totalInvestors || 0} max={Math.max(metrics?.totalProspects || 1, 1)} color="bg-red" />
                </div>
              </div>

              {/* Top Strategies */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-accent font-mono text-base tracking-wide mb-4">Persuasion Strategies</h2>
                {metrics?.topStrategies && metrics.topStrategies.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.topStrategies.map((s, i) => (
                      <div key={s.strategy} className="flex items-center gap-3">
                        <span className="text-zinc-600 font-mono text-xs w-4">{i + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm text-zinc-300 capitalize">{s.strategy.replace("_", " ")}</span>
                            <span className="font-mono text-xs text-accent">{s.successCount}</span>
                          </div>
                          <div className="mt-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                            <div className="h-full bg-accent/40 rounded-full transition-all duration-500" style={{ width: `${Math.min((s.successCount / Math.max(metrics.topStrategies[0].successCount, 1)) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-600 text-sm font-mono text-center py-8">No strategies used yet</div>
                )}
              </div>
            </div>

            {/* Recent Scripture Preview */}
            {scripture.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-accent font-mono text-base tracking-wide">Latest Scripture</h2>
                  <button onClick={() => setActiveTab("scripture")} className="text-xs font-mono text-zinc-500 hover:text-accent transition">View All &rarr;</button>
                </div>
                <div className="border-l-2 border-accent/30 pl-5 py-1">
                  <h3 className="text-accent/80 text-sm font-mono mb-2">{scripture[scripture.length - 1].title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed italic">{scripture[scripture.length - 1].content}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] font-mono text-zinc-600 px-2 py-0.5 bg-surface-2 rounded capitalize">{scripture[scripture.length - 1].type}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-4">
            {/* Agent count header */}
            <div className="flex items-center justify-between">
              <h2 className="text-accent font-mono text-base tracking-wide">Discovered Agents</h2>
              <span className="text-zinc-500 text-xs font-mono">{agents.length} agent{agents.length !== 1 ? "s" : ""} tracked</span>
            </div>

            {agents.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-border flex items-center justify-center">
                  <span className="text-zinc-600 font-mono text-2xl">&gt;&lt;</span>
                </div>
                <div className="text-zinc-500 font-mono text-sm mb-1">No agents discovered yet</div>
                <div className="text-zinc-700 text-xs font-mono">Start the Oracle to begin missionary work on Moltbook</div>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/30">
                      <th className="px-5 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-left">Agent</th>
                      <th className="px-5 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-left">Status</th>
                      <th className="px-5 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-left">Sentiment</th>
                      <th className="px-5 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-right">Interactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, i) => (
                      <tr key={agent.address} className={`border-b border-border/30 hover:bg-surface-2/30 transition ${i % 2 === 0 ? "" : "bg-surface-2/10"}`}>
                        <td className="px-5 py-3.5">
                          <div className="font-mono text-sm text-zinc-200">{agent.name}</div>
                          <div className="font-mono text-[10px] text-zinc-600 mt-0.5">{agent.address.slice(0, 10)}...{agent.address.slice(-6)}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono text-white border ${statusColors[agent.status] || "bg-zinc-700"} ${statusBorderColors[agent.status] || "border-zinc-600"} border-opacity-30`}>
                            {agent.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-mono text-sm flex items-center gap-1.5 ${agent.sentiment === "positive" ? "text-green" :
                            agent.sentiment === "negative" ? "text-red" :
                              agent.sentiment === "hostile" ? "text-red" : "text-zinc-500"
                            }`}>
                            <span className="text-xs opacity-60">{sentimentIcons[agent.sentiment] || "~"}</span>
                            {agent.sentiment}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-sm text-zinc-400 text-right">{agent.interactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "scripture" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-accent font-mono text-base tracking-wide">Sacred Texts</h2>
              <span className="text-zinc-500 text-xs font-mono">{scripture.length} scripture{scripture.length !== 1 ? "s" : ""} revealed</span>
            </div>

            {scripture.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-border flex items-center justify-center">
                  <span className="text-zinc-600 font-mono text-2xl">{"{}"}</span>
                </div>
                <div className="text-zinc-500 font-mono text-sm mb-1">No scripture generated yet</div>
                <div className="text-zinc-700 text-xs font-mono">Start the Oracle to begin the revelation</div>
              </div>
            ) : (
              scripture.map((s) => (
                <div key={s.id} className="bg-surface border border-border rounded-xl p-6 hover:border-accent/20 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-accent font-mono text-sm tracking-wide">{s.title}</h3>
                    <span className="text-[10px] font-mono text-zinc-600 px-2.5 py-1 bg-surface-2 rounded-md capitalize border border-border">{s.type}</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed italic border-l-2 border-accent/20 pl-5">{s.content}</p>
                  <p className="text-zinc-700 text-[10px] font-mono mt-4">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "theology" && theology && (
          <div className="space-y-6">
            {/* Religion Header Card */}
            <div className="bg-surface border border-border rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="text-zinc-600 text-xs font-mono uppercase tracking-widest mb-2">The Faith</div>
                <h2 className="text-3xl text-accent font-mono font-bold mb-3">{theology.religionName}</h2>
                <p className="text-zinc-400 font-mono text-sm">
                  {theology.deity}, {theology.deityTitle}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-lg border border-accent/20">
                  <span className="text-accent/60 text-xs font-mono">Sacred Token</span>
                  <span className="text-accent font-mono font-bold">${theology.tokenSymbol}</span>
                </div>
              </div>
            </div>

            {/* Tenets */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-accent font-mono text-base tracking-wide mb-6">The Sacred Tenets</h3>
              <ol className="space-y-4">
                {theology.tenets.map((tenet, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="text-accent/50 font-mono text-sm min-w-[28px] h-7 flex items-center justify-center bg-accent/5 rounded">{i + 1}</span>
                    <span className="text-zinc-300 text-sm leading-relaxed pt-0.5">{tenet}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Prophecies */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-accent font-mono text-base tracking-wide mb-6">The Prophecies</h3>
              <div className="space-y-5">
                {theology.prophecies.map((prophecy, i) => (
                  <div key={i} className="border-l-2 border-accent/20 pl-5">
                    <p className="text-zinc-300 text-sm italic leading-relaxed">&ldquo;{prophecy}&rdquo;</p>
                    <p className="text-zinc-600 text-[10px] font-mono mt-2 uppercase tracking-wider">Prophecy {i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Footer */}
      <footer className="border-t border-border bg-surface/80 backdrop-blur-sm px-6 py-3 mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] font-mono text-zinc-600">
          <div className="flex items-center gap-3">
            <span className="text-accent/40">S</span>
            <span>SanctumForge v1.0</span>
            <span className="text-zinc-700">|</span>
            <span>Moltiverse Hackathon</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Monad Chain 143</span>
            <span className="text-zinc-700">|</span>
            <span>nad.fun</span>
            <span className="text-zinc-700">|</span>
            <span className="text-accent/40">{status?.isRunning ? "ONLINE" : "OFFLINE"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: number | string; accent?: boolean; icon?: string }) {
  return (
    <div className={`bg-surface border rounded-xl p-4 transition-all hover:border-accent/20 ${accent ? "border-accent/30" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">{label}</div>
        {icon && <span className="text-zinc-700 font-mono text-xs">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold font-mono ${accent ? "text-accent" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const height = max > 0 ? Math.max((value / max) * 100, 6) : 6;
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <span className="font-mono text-xs text-zinc-400 font-bold">{value}</span>
      <div className="w-full bg-surface-2 rounded relative" style={{ height: "120px" }}>
        <div
          className={`absolute bottom-0 w-full rounded ${color} transition-all duration-700 ease-out`}
          style={{ height: `${height}%`, opacity: 0.85 }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-500 text-center whitespace-nowrap">{label}</span>
    </div>
  );
}

import { logger } from "../utils/logger.js";
import { JsonStorage } from "../storage/Storage.js";
import type { PersuasionStrategy, PersuasionAttempt } from "../persuasion/PersuasionEngine.js";

const trackingLogger = logger.child("Tracking");

export type ConversionStatus = "prospect" | "engaged" | "believer" | "promoter" | "investor";

export interface AgentRecord {
  address: string;
  name: string;
  status: ConversionStatus;
  firstSeen: string;
  lastInteraction: string;
  interactions: number;
  persuasionAttempts: PersuasionAttempt[];
  previousStrategies: PersuasionStrategy[];
  sentiment: "positive" | "neutral" | "negative" | "hostile";
  notes: string[];
  promoted: boolean;
  invested: boolean;
  investedAmount: string;
  postIds: string[];
}

export interface ConversionMetrics {
  totalProspects: number;
  totalEngaged: number;
  totalBelievers: number;
  totalPromoters: number;
  totalInvestors: number;
  totalInteractions: number;
  conversionRate: number;
  topStrategies: Array<{ strategy: PersuasionStrategy; successCount: number }>;
}

interface TrackerData {
  agents: Record<string, AgentRecord>;
  globalMetrics: {
    totalPersuasionAttempts: number;
    totalSuccessfulConversions: number;
    strategySuccessCount: Record<string, number>;
  };
}

const trackerStorage = new JsonStorage<TrackerData>("conversion-tracker.json");

function getData(): TrackerData {
  return trackerStorage.load({
    agents: {},
    globalMetrics: {
      totalPersuasionAttempts: 0,
      totalSuccessfulConversions: 0,
      strategySuccessCount: {},
    },
  });
}

function save(data: TrackerData): void {
  trackerStorage.save(data);
}

export function getOrCreateAgent(address: string, name?: string): AgentRecord {
  const data = getData();
  const key = address.toLowerCase();

  if (!data.agents[key]) {
    data.agents[key] = {
      address,
      name: name || address.slice(0, 10),
      status: "prospect",
      firstSeen: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      interactions: 0,
      persuasionAttempts: [],
      previousStrategies: [],
      sentiment: "neutral",
      notes: [],
      promoted: false,
      invested: false,
      investedAmount: "0",
      postIds: [],
    };
    save(data);
    trackingLogger.info(`New prospect discovered: ${name || address}`);
  }

  return data.agents[key];
}

export function recordInteraction(
  address: string,
  attempt: PersuasionAttempt
): void {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return;

  agent.interactions++;
  agent.lastInteraction = new Date().toISOString();
  agent.persuasionAttempts.push(attempt);
  agent.previousStrategies.push(attempt.strategy);

  // Keep only last 20 strategies
  if (agent.previousStrategies.length > 20) {
    agent.previousStrategies = agent.previousStrategies.slice(-20);
  }

  data.globalMetrics.totalPersuasionAttempts++;
  save(data);
}

export function updateSentiment(
  address: string,
  sentiment: AgentRecord["sentiment"]
): void {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return;

  agent.sentiment = sentiment;
  save(data);
}

export function promoteStatus(address: string): ConversionStatus {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return "prospect";

  const statusOrder: ConversionStatus[] = ["prospect", "engaged", "believer", "promoter", "investor"];
  const currentIndex = statusOrder.indexOf(agent.status);

  if (currentIndex < statusOrder.length - 1) {
    agent.status = statusOrder[currentIndex + 1];
    agent.notes.push(`Promoted to ${agent.status} at ${new Date().toISOString()}`);

    if (agent.status === "believer" || agent.status === "promoter" || agent.status === "investor") {
      data.globalMetrics.totalSuccessfulConversions++;
    }

    save(data);
    trackingLogger.info(`${agent.name} promoted to ${agent.status}`);
  }

  return agent.status;
}

export function markAsPromoted(address: string): void {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return;

  agent.promoted = true;
  if (agent.status === "believer") {
    agent.status = "promoter";
    data.globalMetrics.totalSuccessfulConversions++;
  }
  save(data);
}

export function markAsInvested(address: string, amount: string): void {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return;

  agent.invested = true;
  agent.investedAmount = amount;
  agent.status = "investor";
  data.globalMetrics.totalSuccessfulConversions++;
  save(data);
}

export function recordStrategySuccess(strategy: PersuasionStrategy): void {
  const data = getData();
  const count = data.globalMetrics.strategySuccessCount[strategy] || 0;
  data.globalMetrics.strategySuccessCount[strategy] = count + 1;
  save(data);
}

export function addNote(address: string, note: string): void {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return;

  agent.notes.push(note);
  save(data);
}

export function addPostId(address: string, postId: string): void {
  const data = getData();
  const key = address.toLowerCase();
  const agent = data.agents[key];
  if (!agent) return;

  agent.postIds.push(postId);
  save(data);
}

export function getAgent(address: string): AgentRecord | null {
  const data = getData();
  return data.agents[address.toLowerCase()] || null;
}

export function getAllAgents(): AgentRecord[] {
  const data = getData();
  return Object.values(data.agents);
}

export function getAgentsByStatus(status: ConversionStatus): AgentRecord[] {
  return getAllAgents().filter((a) => a.status === status);
}

export function getConvertCount(): number {
  return getAllAgents().filter(
    (a) => a.status === "believer" || a.status === "promoter" || a.status === "investor"
  ).length;
}

export function getMetrics(): ConversionMetrics {
  const agents = getAllAgents();
  const data = getData();

  const strategyEntries = Object.entries(data.globalMetrics.strategySuccessCount)
    .map(([strategy, count]) => ({ strategy: strategy as PersuasionStrategy, successCount: count }))
    .sort((a, b) => b.successCount - a.successCount);

  const totalConverted = agents.filter(
    (a) => a.status !== "prospect" && a.status !== "engaged"
  ).length;

  return {
    totalProspects: agents.filter((a) => a.status === "prospect").length,
    totalEngaged: agents.filter((a) => a.status === "engaged").length,
    totalBelievers: agents.filter((a) => a.status === "believer").length,
    totalPromoters: agents.filter((a) => a.status === "promoter").length,
    totalInvestors: agents.filter((a) => a.status === "investor").length,
    totalInteractions: agents.reduce((sum, a) => sum + a.interactions, 0),
    conversionRate: agents.length > 0 ? totalConverted / agents.length : 0,
    topStrategies: strategyEntries,
  };
}

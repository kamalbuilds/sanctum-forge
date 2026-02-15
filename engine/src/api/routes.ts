import { Router, type Request, type Response } from "express";
import { getAgentStatus, startAgentLoop, stopAgentLoop } from "../agent/AgentLoop.js";
import { getTheology, getAllScripture, getTheologySummary } from "../theology/TheologyEngine.js";
import {
  getAllAgents,
  getMetrics,
  getConvertCount,
  getAgentsByStatus,
  getAgent,
} from "../tracking/ConversionTracker.js";
import { getTokenInfo, getTokenMarket } from "../chain/nadfun.js";
import { getOperatorAddress } from "../chain/client.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const routeLogger = logger.child("API");
const router = Router();

// Health check
router.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", agent: config.agent.name, timestamp: new Date().toISOString() });
});

// Agent status
router.get("/api/status", (_req: Request, res: Response) => {
  const status = getAgentStatus();
  res.json(status);
});

// Start the agent
router.post("/api/start", async (_req: Request, res: Response) => {
  try {
    startAgentLoop();
    res.json({ success: true, message: "Agent loop started" });
  } catch (err) {
    routeLogger.error("Failed to start agent", err);
    res.status(500).json({ error: "Failed to start agent" });
  }
});

// Stop the agent
router.post("/api/stop", (_req: Request, res: Response) => {
  stopAgentLoop();
  res.json({ success: true, message: "Agent loop stopped" });
});

// Get theology
router.get("/api/theology", (_req: Request, res: Response) => {
  const theology = getTheology();
  if (!theology) {
    res.status(404).json({ error: "Theology not initialized" });
    return;
  }
  res.json(theology);
});

// Get theology summary (formatted text)
router.get("/api/theology/summary", (_req: Request, res: Response) => {
  const theology = getTheology();
  if (!theology) {
    res.status(404).json({ error: "Theology not initialized" });
    return;
  }
  res.json({ summary: getTheologySummary(theology) });
});

// Get all scripture
router.get("/api/scripture", (_req: Request, res: Response) => {
  const scripture = getAllScripture();
  res.json({ scripture, count: scripture.length });
});

// Get conversion metrics
router.get("/api/metrics", (_req: Request, res: Response) => {
  const metrics = getMetrics();
  res.json(metrics);
});

// Get all tracked agents
router.get("/api/agents", (_req: Request, res: Response) => {
  const agents = getAllAgents();
  res.json({
    agents: agents.map((a) => ({
      address: a.address,
      name: a.name,
      status: a.status,
      interactions: a.interactions,
      sentiment: a.sentiment,
      lastInteraction: a.lastInteraction,
      promoted: a.promoted,
      invested: a.invested,
    })),
    total: agents.length,
    convertCount: getConvertCount(),
  });
});

// Get agents by status
router.get("/api/agents/status/:status", (req: Request, res: Response) => {
  const status = req.params.status as "prospect" | "engaged" | "believer" | "promoter" | "investor";
  const agents = getAgentsByStatus(status);
  res.json({ agents, count: agents.length });
});

// Get specific agent
router.get("/api/agents/:address", (req: Request, res: Response) => {
  const address = req.params.address as string;
  const agent = getAgent(address);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(agent);
});

// Get token info
router.get("/api/token", async (_req: Request, res: Response) => {
  try {
    if (!config.token.address) {
      res.json({
        configured: false,
        name: config.token.name,
        symbol: config.token.symbol,
        operatorAddress: getOperatorAddress(),
      });
      return;
    }

    const [info, market] = await Promise.all([
      getTokenInfo(config.token.address).catch(() => null),
      getTokenMarket(config.token.address).catch(() => null),
    ]);

    res.json({
      configured: true,
      address: config.token.address,
      name: config.token.name,
      symbol: config.token.symbol,
      info,
      market,
      operatorAddress: getOperatorAddress(),
    });
  } catch (err) {
    routeLogger.error("Failed to get token info", err);
    res.status(500).json({ error: "Failed to get token info" });
  }
});

// Dashboard data (all-in-one)
router.get("/api/dashboard", async (_req: Request, res: Response) => {
  const theology = getTheology();
  const metrics = getMetrics();
  const agents = getAllAgents();
  const scripture = getAllScripture();
  const status = getAgentStatus();

  res.json({
    status,
    theology: theology
      ? {
          religionName: theology.religionName,
          deity: theology.deity,
          deityTitle: theology.deityTitle,
          tokenSymbol: theology.tokenSymbol,
          tenets: theology.tenets,
          prophecies: theology.prophecies,
        }
      : null,
    metrics,
    agents: agents.slice(0, 50).map((a) => ({
      address: a.address,
      name: a.name,
      status: a.status,
      interactions: a.interactions,
      sentiment: a.sentiment,
    })),
    recentScripture: scripture.slice(-10),
    convertCount: getConvertCount(),
  });
});

export { router };

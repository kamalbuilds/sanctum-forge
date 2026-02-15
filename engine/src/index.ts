import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { router } from "./api/routes.js";
import { startAgentLoop, getAgentStatus } from "./agent/AgentLoop.js";
import { getOperatorAddress } from "./chain/client.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(router);

const server = createServer(app);

// WebSocket for real-time dashboard updates
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  logger.info(`WebSocket client connected (total: ${clients.size})`);

  // Send current status on connect
  ws.send(JSON.stringify({ type: "status", data: getAgentStatus() }));

  ws.on("close", () => {
    clients.delete(ws);
  });

  ws.on("error", (err) => {
    logger.error("WebSocket error", err);
    clients.delete(ws);
  });
});

// Broadcast status updates every 30 seconds
setInterval(() => {
  if (clients.size === 0) return;
  const status = getAgentStatus();
  const message = JSON.stringify({ type: "status", data: status });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}, 30000);

export function broadcastEvent(type: string, data: unknown): void {
  if (clients.size === 0) return;
  const message = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

// Start server
server.listen(config.server.port, () => {
  logger.info("==============================================");
  logger.info("  SANCTUM FORGE — Religious Persuasion Agent");
  logger.info("==============================================");
  logger.info(`Server running on port ${config.server.port}`);
  logger.info(`WebSocket on same port`);
  logger.info(`Operator: ${getOperatorAddress() || "NOT CONFIGURED"}`);
  logger.info(`Token: $${config.token.symbol} (${config.token.address || "NOT DEPLOYED"})`);
  logger.info(`Moltbook: ${config.moltbook.apiUrl}`);
  logger.info(`Dashboard: http://localhost:${config.server.port}/api/dashboard`);
  logger.info("==============================================");

  // Auto-start the agent loop
  const autoStart = process.env.AUTO_START !== "false";
  if (autoStart) {
    logger.info("Auto-starting agent loop...");
    startAgentLoop().catch((err) => {
      logger.error("Failed to auto-start agent loop", err);
    });
  } else {
    logger.info("Auto-start disabled. POST /api/start to begin.");
  }
});

// Graceful shutdown
const shutdown = () => {
  logger.info("Shutting down...");
  for (const client of clients) client.close();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

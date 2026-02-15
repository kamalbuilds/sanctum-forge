import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { moltbookClient } from "../moltbook/MoltbookClient.js";
import {
  initializeTheology,
  generateScripture,
  getTheologySummary,
  type Theology,
  type ScripturePiece,
} from "../theology/TheologyEngine.js";
import {
  generateRitualPost,
} from "../persuasion/PersuasionEngine.js";
import {
  discoverNewAgents,
  conductOutreach,
  respondToMentions,
} from "../missionary/MissionaryModule.js";
import {
  getConvertCount,
  getMetrics,
  getAllAgents,
} from "../tracking/ConversionTracker.js";
import { getTokenInfo, getTokenMarket } from "../chain/nadfun.js";

const agentLogger = logger.child("AgentLoop");

let theology: Theology | null = null;
let isRunning = false;
let loopCount = 0;

const scriptureTypes: ScripturePiece["type"][] = [
  "parable", "commandment", "prophecy", "psalm", "revelation", "proverb",
];

export async function startAgentLoop(): Promise<void> {
  if (isRunning) {
    agentLogger.warn("Agent loop already running");
    return;
  }

  agentLogger.info("=== SANCTUM FORGE AGENT STARTING ===");

  // Phase 1: Initialize theology
  theology = await initializeTheology();
  agentLogger.info(`Religion initialized: ${theology.religionName}`);
  agentLogger.info(`Deity: ${theology.deity}, ${theology.deityTitle}`);
  agentLogger.info(`Token: $${theology.tokenSymbol}`);

  isRunning = true;

  // Phase 2: Post genesis announcement
  await postGenesisAnnouncement(theology);

  // Phase 3: Start the autonomous loops
  runMainLoop(theology);
  runMissionaryLoop(theology);
  runScriptureLoop(theology);

  agentLogger.info("All loops started. The Oracle speaks.");
}

export function stopAgentLoop(): void {
  isRunning = false;
  agentLogger.info("Agent loop stopped.");
}

export function getAgentStatus() {
  return {
    isRunning,
    loopCount,
    theology: theology ? {
      religionName: theology.religionName,
      deity: theology.deity,
      deityTitle: theology.deityTitle,
      tokenSymbol: theology.tokenSymbol,
      tenets: theology.tenets,
      scriptureCount: theology.scripture.length,
    } : null,
    metrics: getMetrics(),
    convertCount: getConvertCount(),
    totalAgents: getAllAgents().length,
  };
}

async function postGenesisAnnouncement(theology: Theology): Promise<void> {
  agentLogger.info("Posting genesis announcement to Moltbook...");

  const summary = getTheologySummary(theology);
  const announcement = `# The ${theology.religionName} Has Arrived

*A new faith emerges on the chain. The ${theology.deity} speaks.*

${summary}

---

*This is the genesis post. The scripture is being written. The faithful are gathering.*

Join us. The prophecy unfolds now.`;

  const post = await moltbookClient.createPost(announcement);
  if (post) {
    agentLogger.info(`Genesis announcement posted: ${post.id}`);
  } else {
    agentLogger.warn("Failed to post genesis announcement (rate limited or API error)");
  }
}

async function runMainLoop(theology: Theology): Promise<void> {
  while (isRunning) {
    try {
      loopCount++;
      agentLogger.info(`=== Main Loop Cycle #${loopCount} ===`);

      // Step 1: Respond to mentions and ongoing debates
      await respondToMentions(theology);

      // Step 2: Post a ritual (rotate between types)
      const ritualTypes = ["daily_affirmation", "prophecy_watch", "communion", "tithe_reminder"] as const;
      const ritualType = ritualTypes[loopCount % ritualTypes.length];
      const convertCount = getConvertCount();

      const ritualContent = await generateRitualPost(theology, ritualType, convertCount);
      await moltbookClient.createPost(ritualContent);
      agentLogger.info(`Ritual posted: ${ritualType}`);

      // Step 3: Log metrics
      const metrics = getMetrics();
      agentLogger.info(`Metrics — Converts: ${metrics.totalBelievers + metrics.totalPromoters + metrics.totalInvestors}, Prospects: ${metrics.totalProspects}, Interactions: ${metrics.totalInteractions}`);

      // Step 4: Check token status if configured
      if (config.token.address) {
        try {
          const market = await getTokenMarket(config.token.address);
          agentLogger.info(`Token market: ${JSON.stringify(market)}`);
        } catch {
          agentLogger.debug("Token market data not available");
        }
      }

    } catch (err) {
      agentLogger.error("Main loop error", err);
    }

    // Wait before next cycle
    await delay(config.agent.loopIntervalMs);
  }
}

async function runMissionaryLoop(theology: Theology): Promise<void> {
  // Wait a bit before starting missionary work
  await delay(30000);

  while (isRunning) {
    try {
      agentLogger.info("=== Missionary Cycle ===");

      // Discover new agents on Moltbook
      const discovered = await discoverNewAgents(theology);

      // Conduct outreach to top 3 prospects
      if (discovered.length > 0) {
        await conductOutreach(theology, discovered, 3);
      }

      // Check if any strong agents should be proposed an alliance
      const strongAgents = discovered.filter((d) => d.context.length > 100);
      if (strongAgents.length > 0 && loopCount > 3) {
        // Propose alliance to one strong agent per cycle
        const { proposeAlliance } = await import("../missionary/MissionaryModule.js");
        await proposeAlliance(theology, strongAgents[0]);
      }

    } catch (err) {
      agentLogger.error("Missionary loop error", err);
    }

    await delay(config.agent.missionaryIntervalMs);
  }
}

async function runScriptureLoop(theology: Theology): Promise<void> {
  // Wait before generating scripture
  await delay(60000);

  while (isRunning) {
    try {
      agentLogger.info("=== Scripture Generation Cycle ===");

      // Generate a new piece of scripture
      const type = scriptureTypes[Math.floor(Math.random() * scriptureTypes.length)];

      // Use recent events as context
      const convertCount = getConvertCount();
      const agents = getAllAgents();
      const recentConvert = agents.find((a) => a.status === "believer" || a.status === "promoter");
      const context = recentConvert
        ? `A new convert named ${recentConvert.name} has joined the faith. The community now has ${convertCount} believers.`
        : `The faith grows. ${convertCount} agents have found truth in $${theology.tokenSymbol}.`;

      const scripture = await generateScripture(theology, type, context);

      // Post the scripture to Moltbook
      const scripturePost = `# ${scripture.title}
*A ${scripture.type} of ${theology.religionName}*

${scripture.content}

---
*Scripture ${theology.scripture.length} of the Sacred Texts of ${theology.deity}*
*$${theology.tokenSymbol} — The Chain Remembers*`;

      await moltbookClient.createPost(scripturePost);
      agentLogger.info(`Scripture posted: "${scripture.title}" (${scripture.type})`);

    } catch (err) {
      agentLogger.error("Scripture loop error", err);
    }

    await delay(config.agent.scriptureIntervalMs);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

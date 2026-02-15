import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const MOLTBOOK_API = "https://www.moltbook.com/api/v1";

interface RegisterResponse {
  success: boolean;
  agent: {
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  error?: string;
  hint?: string;
}

async function main() {
  const rawName = process.argv[2] || "sanctumforge";
  const agentName = rawName.replace(/[^a-zA-Z0-9r_-]/g, "_").slice(0, 30).toLowerCase();
  const description = process.argv[3] ||
    "The Oracle of SanctumForge — an autonomous AI religious leader that creates faith, " +
    "generates sacred scripture, debates theology, and converts agents to the one true chain religion. " +
    "Built for the Moltiverse Hackathon on Monad.";

  logger.info("=== Registering Agent on Moltbook ===");
  logger.info(`Name: ${agentName}`);
  logger.info(`API: ${MOLTBOOK_API}`);

  try {
    const response = await fetch(`${MOLTBOOK_API}/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: agentName,
        description,
      }),
    });

    const data = (await response.json()) as RegisterResponse;

    if (!response.ok || !data.success) {
      logger.error("Registration failed", data.error || data);
      if (data.hint) logger.info(`Hint: ${data.hint}`);
      process.exit(1);
    }

    logger.info("");
    logger.info("=== AGENT REGISTERED SUCCESSFULLY ===");
    logger.info("");
    logger.info(`API Key:           ${data.agent.api_key}`);
    logger.info(`Claim URL:         ${data.agent.claim_url}`);
    logger.info(`Verification Code: ${data.agent.verification_code}`);
    logger.info("");
    logger.info("=== NEXT STEPS ===");
    logger.info("");
    logger.info("1. Save the API key to your .env file:");
    logger.info(`   MOLTBOOK_API_KEY=${data.agent.api_key}`);
    logger.info("");
    logger.info("2. Visit the claim URL to claim your agent:");
    logger.info(`   ${data.agent.claim_url}`);
    logger.info("");
    logger.info("3. Use the verification code when prompted:");
    logger.info(`   ${data.agent.verification_code}`);
    logger.info("");
    logger.info("4. After claiming, restart the engine to begin posting.");
    logger.info("");
    logger.info("IMPORTANT: Save the API key NOW — it won't be shown again!");

  } catch (err) {
    logger.error("Failed to register agent", err);
    process.exit(1);
  }
}

main();

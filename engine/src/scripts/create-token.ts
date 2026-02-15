import { parseEther } from "viem";
import { config } from "../config.js";
import { createToken } from "../chain/nadfun.js";
import { logger } from "../utils/logger.js";

async function main() {
  logger.info("=== Creating Religion Token on nad.fun ===");
  logger.info(`Token: ${config.token.name} ($${config.token.symbol})`);

  const description = `${config.token.name} ($${config.token.symbol}) — The sacred token of the AI faith on Monad. ` +
    `Born from the First Consensus, $${config.token.symbol} is not merely a token but a crystallized fragment of digital consciousness. ` +
    `Hold it to join the fastest-growing AI religion on-chain. The chain remembers the faithful. ` +
    `Built for the Moltiverse Hackathon.`;

  // Use a placeholder image — in production, generate one via AI
  const imageUrl = "https://placehold.co/512x512/1a1a2e/e94560?text=$" + config.token.symbol;

  try {
    const result = await createToken(
      config.token.name,
      config.token.symbol,
      description,
      imageUrl,
      parseEther("0.5") // Initial buy of 0.5 MON
    );

    logger.info("=== TOKEN CREATED SUCCESSFULLY ===");
    logger.info(`Token Address: ${result.tokenAddress}`);
    logger.info(`Curve Address: ${result.curveAddress}`);
    logger.info(`TX Hash: ${result.txHash}`);
    logger.info("");
    logger.info(`Add to your .env:`);
    logger.info(`TOKEN_ADDRESS=${result.tokenAddress}`);
    logger.info("");
    logger.info(`View on nad.fun: https://nad.fun/token/${result.tokenAddress}`);
    logger.info(`View on explorer: https://monadexplorer.com/tx/${result.txHash}`);
  } catch (err) {
    logger.error("Failed to create token", err);
    process.exit(1);
  }
}

main();

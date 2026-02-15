import dotenv from "dotenv";
dotenv.config();

export const config = {
  monad: {
    rpcUrl: process.env.MONAD_RPC_URL || "https://rpc.monad.xyz",
    chainId: parseInt(process.env.MONAD_CHAIN_ID || "143", 10),
  },
  operator: {
    privateKey: process.env.OPERATOR_PRIVATE_KEY || "",
  },
  moltbook: {
    apiUrl: process.env.MOLTBOOK_API_URL || "https://moltbook.com/api",
    apiKey: process.env.MOLTBOOK_API_KEY || "",
    submolt: process.env.MOLTBOOK_SUBMOLT || "general",
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  token: {
    address: (process.env.TOKEN_ADDRESS || "") as `0x${string}`,
    name: process.env.TOKEN_NAME || "SanctumForge",
    symbol: process.env.TOKEN_SYMBOL || "SANCT",
  },
  server: {
    port: parseInt(process.env.PORT || "3002", 10),
  },
  agent: {
    name: process.env.AGENT_NAME || "The Oracle of SanctumForge",
    loopIntervalMs: parseInt(process.env.LOOP_INTERVAL_MS || "60000", 10),
    missionaryIntervalMs: parseInt(process.env.MISSIONARY_INTERVAL_MS || "300000", 10),
    scriptureIntervalMs: parseInt(process.env.SCRIPTURE_INTERVAL_MS || "600000", 10),
  },
} as const;

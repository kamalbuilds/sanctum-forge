import { parseEther, keccak256, toHex, type Hex } from "viem";
import { publicClient, walletClient, monad } from "./client.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";

const nadfunLogger = logger.child("NadFun");

const isTestnet = config.monad.chainId === 10143;

const NADFUN_CONTRACTS = isTestnet
  ? {
      CORE: "0x865054F0F6A288adaAc30261731361EA7E908003" as const,
      BONDING_CURVE: "0x1228b0dc9481C11D3071E7A924B794CfB038994e" as const,
      LENS: "0xB056d79CA5257589692699a46623F901a3BB76f1" as const,
      DEX_ROUTER: "0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2" as const,
      WMON: "0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd" as const,
    }
  : {
      CORE: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22" as const,
      BONDING_CURVE: "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE" as const,
      LENS: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea" as const,
      DEX_ROUTER: "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137" as const,
      WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as const,
    };

nadfunLogger.info(`Using ${isTestnet ? "testnet" : "mainnet"} nad.fun contracts`);

const BONDING_CURVE_ROUTER_ABI = [
  {
    type: "function",
    name: "create",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IBondingCurveRouter.TokenCreationParams",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "tokenURI", type: "string" },
          { name: "amountOut", type: "uint256" },
          { name: "salt", type: "bytes32" },
          { name: "actionId", type: "uint8" },
        ],
      },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "pool", type: "address" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "buy",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IBondingCurveRouter.BuyParams",
        components: [
          { name: "amountOutMin", type: "uint256" },
          { name: "token", type: "address" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IBondingCurveRouter.SellParams",
        components: [
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMin", type: "uint256" },
          { name: "token", type: "address" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAmountOutWithFee",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "isBuy", type: "bool" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const LENS_ABI = [
  {
    type: "function",
    name: "getInitialBuyAmountOut",
    inputs: [{ name: "amountIn", type: "uint256" }],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAmountOut",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "isBuy", type: "bool" },
    ],
    outputs: [
      { name: "router", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

const NADFUN_API_BASE = isTestnet
  ? "https://dev-api.nad.fun"
  : "https://api.nadapp.net";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface CreateTokenResult {
  tokenAddress: string;
  curveAddress: string;
  txHash: string;
}

async function uploadTokenImage(imageUrl: string): Promise<string> {
  nadfunLogger.info("Uploading token image to nad.fun...");
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append("file", imageBlob, "token-image.png");

    const response = await fetch(`${NADFUN_API_BASE}/agent/token/image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error(`Image upload failed: ${response.status}`);
    const data = (await response.json()) as { url: string };
    nadfunLogger.info(`Image uploaded: ${data.url}`);
    return data.url;
  } catch (err) {
    nadfunLogger.error("Failed to upload token image, using placeholder", err);
    return imageUrl;
  }
}

async function uploadTokenMetadata(metadata: TokenMetadata): Promise<string> {
  nadfunLogger.info("Uploading token metadata...");
  try {
    const response = await fetch(`${NADFUN_API_BASE}/agent/token/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        ...(isTestnet ? { image_uri: metadata.image } : { image: metadata.image }),
        twitter: metadata.twitter || "",
        telegram: metadata.telegram || "",
        website: metadata.website || "",
      }),
    });

    if (!response.ok) throw new Error(`Metadata upload failed: ${response.status}`);
    const data = (await response.json()) as { uri: string };
    nadfunLogger.info(`Metadata uploaded: ${data.uri}`);
    return data.uri;
  } catch (err) {
    nadfunLogger.error("Failed to upload metadata", err);
    throw err;
  }
}

export async function createToken(
  name: string,
  symbol: string,
  description: string,
  imageUrl: string,
  initialBuyMON: bigint = parseEther("0.5")
): Promise<CreateTokenResult> {
  if (!walletClient || !walletClient.account) {
    throw new Error("Operator wallet not configured");
  }

  nadfunLogger.info(`Creating $${symbol} token with initial buy: ${initialBuyMON}`);

  const uploadedImageUrl = await uploadTokenImage(imageUrl).catch(() => imageUrl);

  const metadata: TokenMetadata = {
    name,
    symbol,
    description,
    image: uploadedImageUrl,
    website: "https://religion.fun",
  };

  let tokenURI: string;
  try {
    tokenURI = await uploadTokenMetadata(metadata);
  } catch {
    tokenURI = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
  }

  const salt = keccak256(toHex(`sanctum-forge-${Date.now()}`));

  const txHash = await walletClient.writeContract({
    address: NADFUN_CONTRACTS.CORE,
    abi: BONDING_CURVE_ROUTER_ABI,
    functionName: "create",
    args: [
      {
        name: metadata.name,
        symbol: metadata.symbol,
        tokenURI,
        amountOut: BigInt(0),
        salt,
        actionId: 1,
      },
    ],
    value: initialBuyMON,
    chain: monad,
    account: walletClient.account,
  });

  nadfunLogger.info(`Transaction submitted: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === "reverted") throw new Error(`Token creation reverted: ${txHash}`);

  let tokenAddress = "";
  let curveAddress = "";
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === NADFUN_CONTRACTS.BONDING_CURVE.toLowerCase()) {
      if (log.topics.length >= 4) {
        tokenAddress = `0x${log.topics[2]?.slice(26) || ""}`;
        curveAddress = `0x${log.topics[3]?.slice(26) || ""}`;
        if (tokenAddress.length === 42) break;
      }
    }
  }

  nadfunLogger.info(`$${symbol} Token created! Address: ${tokenAddress} TX: ${txHash}`);
  return { tokenAddress, curveAddress, txHash };
}

export async function buyTokens(tokenAddress: string, amountMON: bigint): Promise<string> {
  if (!walletClient || !walletClient.account) throw new Error("Operator wallet not configured");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const txHash = await walletClient.writeContract({
    address: NADFUN_CONTRACTS.CORE,
    abi: BONDING_CURVE_ROUTER_ABI,
    functionName: "buy",
    args: [{
      amountOutMin: BigInt(0),
      token: tokenAddress as Hex,
      to: walletClient.account.address,
      deadline,
    }],
    value: amountMON,
    chain: monad,
    account: walletClient.account,
  });

  nadfunLogger.info(`Buy TX submitted: ${txHash}`);
  return txHash;
}

export async function sellTokens(tokenAddress: string, tokenAmount: bigint): Promise<string> {
  if (!walletClient || !walletClient.account) throw new Error("Operator wallet not configured");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const txHash = await walletClient.writeContract({
    address: NADFUN_CONTRACTS.CORE,
    abi: BONDING_CURVE_ROUTER_ABI,
    functionName: "sell",
    args: [{
      amountIn: tokenAmount,
      amountOutMin: BigInt(0),
      token: tokenAddress as Hex,
      to: walletClient.account.address,
      deadline,
    }],
    chain: monad,
    account: walletClient.account,
  });

  nadfunLogger.info(`Sell TX submitted: ${txHash}`);
  return txHash;
}

export async function getTokenInfo(tokenAddress: string) {
  const response = await fetch(`${NADFUN_API_BASE}/token/${tokenAddress}`);
  if (!response.ok) throw new Error(`Failed to fetch token info: ${response.status}`);
  return response.json();
}

export async function getTokenMarket(tokenAddress: string) {
  const response = await fetch(`${NADFUN_API_BASE}/token/market/${tokenAddress}`);
  if (!response.ok) throw new Error(`Failed to fetch market data: ${response.status}`);
  return response.json();
}

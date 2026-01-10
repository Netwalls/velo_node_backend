import { rhinoSdk } from "../services/rhino-sdk";
import { SupportedChains, SupportedTokens } from "@rhino.fi/sdk";
import { getEvmChainAdapterFromPrivateKey } from "@rhino.fi/sdk/adapters/evm";

// Extract proper key types from the runtime objects
type SupportedChainKey = keyof typeof SupportedChains;
type SupportedTokenKey = keyof typeof SupportedTokens;

// tokenMap: only map supported tokens (use actual values from SDK)
// For unsupported ones, don't include them — we'll check later
const tokenMap: Record<string, typeof SupportedTokens[SupportedTokenKey]> = {
  USDC: SupportedTokens.USDC,
  USDT: SupportedTokens.USDT,
  ETH: SupportedTokens.ETH,
  // WBTC, GUD, BNB, TAIKO not in SupportedTokens → handle as unsupported
};

// chainMap: map your input keys to SDK values (string | undefined for unsupported)
const chainMap: Record<string, typeof SupportedChains[SupportedChainKey] | undefined> = {
  ETHEREUM: SupportedChains.ETHEREUM,
  ARBITRUM_ONE: SupportedChains.ARBITRUM_ONE,
  BASE: SupportedChains.BASE,
  OPTIMISM: SupportedChains.OPTIMISM,
  POLYGON: SupportedChains.POLYGON,
  SOLANA: SupportedChains.SOLANA,
  STARKNET: SupportedChains.STARKNET,
  TAIKO: undefined,
  AVALANCHE: undefined,
  BNB_SMART_CHAIN: undefined,
  CELO: undefined,
  GNOSIS: undefined,
  INK: undefined,
  KAIA: undefined,
  KATANA: undefined,
  LINEA: undefined,
  MANTLE: undefined,
  MORPH: undefined,
  OPBNB: undefined,
  PARADEX: undefined,
  PLASMA: undefined,
  PLUME: undefined,
  SCROLL: undefined,
  SONIC: undefined,
  TON: undefined,
  TRON: undefined,
  UNICHAIN: undefined,
  ZIRCUIT: undefined,
  ZKSYNC_ERA: undefined,
};

export const performRhinoSwap = async (params: {
  fromToken: string; // e.g., "USDC"
  toToken: string;   // e.g., "USDT" or "USDC" (informational only for now)
  amount: string;
  chainIn?: string;
  chainOut?: string;
  depositor: string;
  recipient: string;
  privateKey: string;
}) => {
  const {
    fromToken,
    toToken, // currently unused in basic bridge — kept for future swap support
    amount,
    chainIn = "ETHEREUM",
    chainOut = "BASE",
    depositor,
    recipient,
    privateKey,
  } = params;

  // Normalize and safely lookup token
  const tokenKey = fromToken.toUpperCase() as keyof typeof tokenMap;
  const token = tokenMap[tokenKey];
  if (!token) {
    throw new Error(
      `Unsupported fromToken: ${fromToken}. Supported: ${Object.keys(tokenMap).join(", ")}`
    );
  }

  // Normalize chain inputs (replace "-" with "_", uppercase)
  const sourceChainKey = chainIn.toUpperCase().replace(/-/g, "_");
  const destChainKey = chainOut.toUpperCase().replace(/-/g, "_");

  const sourceChain = chainMap[sourceChainKey];
  const destChain = chainMap[destChainKey];

  if (!sourceChain || !destChain) {
    const supportedChains = Object.keys(chainMap)
      .filter((k) => chainMap[k] !== undefined)
      .join(", ");
    throw new Error(
      `Unsupported chain pair: ${chainIn} → ${chainOut}. Supported chains: ${supportedChains}`
    );
  }

  const bridgeResult = await rhinoSdk.bridge(
    {
      type: "bridge",
      amount,
      token,
      chainIn: sourceChain,
      chainOut: destChain,
      depositor,
      recipient,
      mode: "pay", // or "receive" if you want gas boost on destination
    },
    {
      getChainAdapter: (chainConfig) =>
        getEvmChainAdapterFromPrivateKey(privateKey, chainConfig),
      hooks: {
        checkQuote: async (quote) => quote.fees.feeUsd < 10,
        onBridgeStatusChange: (status) => console.log("Status:", status),
      },
    }
  );

  if (bridgeResult.data) {
    return {
      success: true,
      depositTxHash: bridgeResult.data.depositTxHash,
      depositTxUrl: bridgeResult.data.depositTxUrl,
      withdrawTxHash: bridgeResult.data.withdrawTxHash,
      withdrawTxUrl: bridgeResult.data.withdrawTxUrl,
      receivedToken: toToken,
    };
  } else {
    let errorMsg = "Rhino bridge failed";
    if (bridgeResult.error && typeof bridgeResult.error === "object") {
      if ("type" in bridgeResult.error) {
        errorMsg = bridgeResult.error.type;
      } else if ("message" in bridgeResult.error) {
        errorMsg = (bridgeResult.error as any).message;
      } else {
        errorMsg = JSON.stringify(bridgeResult.error);
      }
    }
    throw new Error(errorMsg);
  }
};
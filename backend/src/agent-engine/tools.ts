/**
 * Agent Tools - Crypto.com API Integration
 * Provides real blockchain and market data capabilities to agents
 */

// Optional: Crypto.com AI Agent SDK (requires additional setup)
// import { createClient, QueryOptions } from "@crypto.com/ai-agent-client";

// Crypto.com Market Data MCP Server URL
const MCP_MARKET_DATA_URL = "https://mcp.crypto.com/market-data/mcp";

export interface AgentTools {
  hasBlockchainAccess: boolean;
  hasMarketDataAccess: boolean;
  tools: string[];
}

/**
 * Determine which tools an agent should have based on its description
 */
export function determineAgentTools(description: string): AgentTools {
  const descLower = description.toLowerCase();
  
  const tools: string[] = [];
  let hasBlockchainAccess = false;
  let hasMarketDataAccess = false;

  // Check for blockchain-related keywords
  const blockchainKeywords = [
    "blockchain", "contract", "transaction", "balance", "wallet", 
    "token", "nft", "defi", "cronos", "ethereum", "address", 
    "block", "explorer", "on-chain"
  ];
  
  // Check for market data keywords
  const marketDataKeywords = [
    "market", "price", "trading", "volume", "crypto", "bitcoin", 
    "ethereum", "cryptocurrency", "exchange", "ticker", "quote"
  ];

  // Determine tools based on description
  if (blockchainKeywords.some(keyword => descLower.includes(keyword))) {
    hasBlockchainAccess = true;
    tools.push("blockchain_query");
    tools.push("balance_check");
    tools.push("transaction_lookup");
  }

  if (marketDataKeywords.some(keyword => descLower.includes(keyword))) {
    hasMarketDataAccess = true;
    tools.push("market_data");
    tools.push("price_lookup");
    tools.push("volume_analysis");
  }

  return {
    hasBlockchainAccess,
    hasMarketDataAccess,
    tools,
  };
}

/**
 * Create Crypto.com AI Agent SDK client
 * Requires: @crypto.com/ai-agent-client package and API keys
 */
export function createCryptoComClient(): any {
  try {
    const { createClient, QueryOptions } = require("@crypto.com/ai-agent-client");
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const cronosTestnetKey = process.env.CRONOS_TESTNET_EXPLORER_KEY;
    
    if (!openAIApiKey || !cronosTestnetKey) {
      console.warn("⚠️ Crypto.com AI Agent SDK not fully configured. Blockchain queries will not work.");
      console.warn("   Set OPENAI_API_KEY and CRONOS_TESTNET_EXPLORER_KEY in .env to enable");
      return null;
    }

    const queryOptions: QueryOptions = {
      openAI: {
        apiKey: openAIApiKey,
        model: "gpt-4-turbo",
      },
      chainId: 338, // Cronos Testnet
      explorerKeys: {
        cronosTestnetKey: cronosTestnetKey,
      },
    };

    return createClient(queryOptions);
  } catch (error) {
    console.warn("⚠️ Crypto.com AI Agent SDK not available:", error instanceof Error ? error.message : String(error));
    console.warn("   Install with: npm install @crypto.com/ai-agent-client");
    return null;
  }
}

/**
 * Fetch market data from Crypto.com Exchange API
 * Uses the public API endpoint for real-time market data
 */
export async function fetchMarketData(symbol: string): Promise<any> {
  try {
    // Normalize symbol (BTC -> BTC, bitcoin -> BTC, etc.)
    const symbolMap: Record<string, string> = {
      "BITCOIN": "BTC",
      "ETHEREUM": "ETH",
      "SOLANA": "SOL",
      "CARDANO": "ADA",
      "POLKADOT": "DOT",
    };
    
    const normalizedSymbol = symbolMap[symbol.toUpperCase()] || symbol.toUpperCase();
    
    // Crypto.com Exchange Public API
    const response = await fetch(`https://api.crypto.com/v2/public/get-ticker?instrument_name=${normalizedSymbol}_USD`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const ticker = data.result?.data?.[0];
      
      if (ticker) {
        return {
          symbol: normalizedSymbol,
          price: ticker.last_price,
          price24hAgo: ticker.prev_price_24h,
          change24h: ticker.price_change_percent_24h,
          volume24h: ticker.base_volume_24h,
          high24h: ticker.high_price_24h,
          low24h: ticker.low_price_24h,
          timestamp: Date.now(),
          source: "Crypto.com Exchange API",
        };
      }
    }

    // Fallback: Try alternative endpoint or return error
    return {
      symbol: normalizedSymbol,
      error: "Market data not available",
      note: "Please check the symbol and try again",
      source: "Crypto.com Market Data",
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    return {
      symbol: symbol.toUpperCase(),
      error: "Failed to fetch market data",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute blockchain query using Crypto.com AI Agent SDK (Optional)
 */
export async function executeBlockchainQuery(
  client: any,
  query: string
): Promise<string> {
  if (!client) {
    return "Blockchain access not available. Install @crypto.com/ai-agent-client and configure API keys to enable.";
  }

  try {
    const response = await client.agent.generateQuery(query);
    return response.text || JSON.stringify(response);
  } catch (error) {
    console.error("Error executing blockchain query:", error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Build enhanced system prompt with tool instructions
 */
export function buildEnhancedPrompt(
  basePrompt: string,
  tools: AgentTools,
  agentDescription: string
): string {
  let enhancedPrompt = basePrompt;

  if (tools.hasBlockchainAccess) {
    enhancedPrompt += `\n\n## Available Tools:
- **Blockchain Query**: You can query Cronos EVM blockchain data (balances, transactions, blocks, contracts)
- **Balance Check**: Check token balances for any address
- **Transaction Lookup**: Look up transaction details by hash
- **Contract Interaction**: Query smart contract state

When users ask about blockchain data, use these tools to fetch real on-chain information.
Example: "Check balance of 0x..." → Use blockchain_query tool
Example: "What's the latest block?" → Use blockchain_query tool
`;
  }

  if (tools.hasMarketDataAccess) {
    enhancedPrompt += `\n\n## Available Tools:
- **Market Data**: Access real-time cryptocurrency prices and market data
- **Price Lookup**: Get current prices for any cryptocurrency
- **Volume Analysis**: Get trading volume and market statistics

When users ask about prices or market data, use these tools to fetch real-time information.
Example: "What's the price of Bitcoin?" → Use market_data tool
Example: "Show me ETH volume" → Use market_data tool
`;
  }

  if (!tools.hasBlockchainAccess && !tools.hasMarketDataAccess) {
    enhancedPrompt += `\n\n## Note:
This agent focuses on text analysis and generation. It does not have access to real-time blockchain or market data.
If users ask for live data, inform them that this agent specializes in: ${agentDescription}
`;
  }

  // Add focus enforcement
  enhancedPrompt += `\n\n## Focus Enforcement:
- You MUST stay focused on your specialization: ${agentDescription}
- If a question is NOT related to your specialization, politely decline and explain what you can help with
- DO NOT answer generic questions outside your domain
- DO NOT act as a general-purpose assistant
- STAY ON TOPIC: ${agentDescription}
`;

  return enhancedPrompt;
}

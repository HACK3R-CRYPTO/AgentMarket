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
 * Supports both OpenAI and Gemini (GoogleGenAI) providers
 * 
 * IMPORTANT: The AI Agent SDK requires the Developer Platform API key for authentication.
 * We initialize the Developer Platform Client SDK first, then create the AI Agent client.
 */
export function createCryptoComClient(): any {
  try {
    // First, initialize the Developer Platform Client SDK (required for authentication)
    const { Client } = require("@crypto.com/developer-platform-client");
    const { createClient, QueryOptions } = require("@crypto.com/ai-agent-client");
    
    // Check for Gemini API key first (preferred, since we're using Gemini for agents)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const cronosTestnetExplorerKey = process.env.CRONOS_TESTNET_EXPLORER_KEY;
    // Developer Platform API key (from https://developer.crypto.com) - required for authentication
    const developerPlatformApiKey = process.env.CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY;
    
    // Both keys are important but serve different purposes:
    // - Developer Platform API key: Required for endpoint authentication
    // - Explorer API key: Used for blockchain explorer queries (optional but recommended)
    
    if (!developerPlatformApiKey) {
      console.warn("⚠️ Crypto.com AI Agent SDK not fully configured. Blockchain queries will not work.");
      console.warn("   Set CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY in .env to enable");
      console.warn("   Get it from: https://developer.crypto.com (create a project)");
      return null;
    }
    
    if (!cronosTestnetExplorerKey) {
      console.warn("⚠️ CRONOS_TESTNET_EXPLORER_KEY not set - some blockchain queries may be limited");
      console.warn("   Get it from: https://explorer-api-doc.cronos.org");
    }
    
    // Initialize Developer Platform Client SDK first (required for authentication)
    try {
      Client.init({
        apiKey: developerPlatformApiKey,
        // provider is optional, SDK will use default
      });
      console.log("✅ Developer Platform Client SDK initialized with API key");
    } catch (initError) {
      console.warn("⚠️ Failed to initialize Developer Platform Client SDK:", initError);
      // Continue anyway - might still work
    }
    
    // Prefer Gemini if available, fallback to OpenAI
    let queryOptions: any; // Use 'any' to allow adding Developer Platform API key
    
    if (geminiApiKey) {
      console.log("✅ Using Gemini (GoogleGenAI) for Crypto.com AI Agent SDK");
      queryOptions = {
        googleGenAI: {
          apiKey: geminiApiKey,
          model: "gemini-2.0-flash", // or "gemini-2.5-flash" if available
        },
        chainId: 338, // Cronos Testnet
        explorerKeys: {
          cronosTestnetKey: cronosTestnetExplorerKey || undefined,
        },
      };
    } else if (openAIApiKey) {
      console.log("✅ Using OpenAI for Crypto.com AI Agent SDK");
      queryOptions = {
        openAI: {
          apiKey: openAIApiKey,
          model: "gpt-4-turbo",
        },
        chainId: 338, // Cronos Testnet
        explorerKeys: {
          cronosTestnetKey: cronosTestnetExplorerKey || undefined,
        },
      };
    } else {
      console.warn("⚠️ Crypto.com AI Agent SDK not fully configured. Blockchain queries will not work.");
      console.warn("   Set GEMINI_API_KEY (preferred) or OPENAI_API_KEY in .env to enable");
      console.warn("   Also set CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY");
      return null;
    }
    
    // Add Developer Platform API key to query options
    // The SDK sends the entire options object in the payload, so this will be included
    console.log("✅ Adding Developer Platform API key to AI Agent SDK options");
    // Add in various formats the SDK might expect
    queryOptions.developerPlatformApiKey = developerPlatformApiKey;
    queryOptions['api-key'] = developerPlatformApiKey;
    queryOptions.blockchainConfig = {
      'api-key': developerPlatformApiKey,
    };
    queryOptions.blockchain_config = {
      'api-key': developerPlatformApiKey,
    };
    // Also add as apiKey (common format)
    queryOptions.apiKey = developerPlatformApiKey;

    const client = createClient(queryOptions);
    console.log(`[SDK] ✅ Client created successfully`);
    console.log(`[SDK] Client structure:`, {
      hasAgent: !!client?.agent,
      hasGenerateQuery: !!(client?.agent?.generateQuery),
      clientKeys: client ? Object.keys(client) : [],
    });
    return client;
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
 * Query blockchain using direct RPC calls (final fallback)
 * Uses ethers.js to query Cronos RPC directly
 */
async function queryBlockchainViaRPC(query: string): Promise<string> {
  try {
    const { ethers } = require("ethers");
    const cronosRpcUrl = process.env.CRONOS_RPC_URL || "https://evm-t3.cronos.org";
    
    // Extract address from query (look for 0x... pattern)
    const addressMatch = query.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return "Could not find a valid Ethereum address in the query. Please provide an address starting with 0x.";
    }
    
    const address = addressMatch[0];
    console.log(`[SDK] Using direct RPC call to ${cronosRpcUrl} for address: ${address}`);
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(cronosRpcUrl);
    
    // Check if query is about balance
    if (query.toLowerCase().includes('balance')) {
      try {
        const balanceWei = await provider.getBalance(address);
        const balanceCro = ethers.formatEther(balanceWei);
        console.log(`[SDK] ✅ Balance fetched via RPC: ${balanceCro} CRO`);
        
        return `Balance for address ${address}: ${balanceCro} CRO (${balanceWei.toString()} wei)`;
      } catch (balanceError: any) {
        console.error("[SDK] ❌ Error fetching balance via RPC:", balanceError);
        return `Error fetching balance via RPC: ${balanceError?.message || String(balanceError)}`;
      }
    }
    
    // Default: return address info
    return `Address ${address} found in query. Query completed via direct RPC.`;
  } catch (error: any) {
    console.error("[SDK] ❌ Error in RPC blockchain query:", error);
    return `Error: ${error?.message || String(error)}`;
  }
}

/**
 * Query blockchain using Developer Platform API endpoint directly
 * Uses the REST API endpoint: https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/token/native-token-balance
 */
async function queryBlockchainViaAPI(query: string): Promise<string> {
  try {
    const developerPlatformApiKey = process.env.CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY || process.env.CRONOS_TESTNET_EXPLORER_KEY;
    
    if (!developerPlatformApiKey) {
      console.log("[SDK] No Developer Platform API key, falling back to RPC...");
      return await queryBlockchainViaRPC(query);
    }
    
    // Extract address from query (look for 0x... pattern)
    const addressMatch = query.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return "Could not find a valid Ethereum address in the query. Please provide an address starting with 0x.";
    }
    
    const address = addressMatch[0];
    console.log(`[SDK] Using Developer Platform API endpoint directly for address: ${address}`);
    
    // Check if query is about balance
    if (query.toLowerCase().includes('balance')) {
      try {
        const apiUrl = `https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/token/native-token-balance?walletAddress=${address}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${developerPlatformApiKey}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`[SDK] ✅ Balance fetched via Developer Platform API:`, data);
        
        if (data && data.status === 'Success' && data.data && data.data.balance) {
          return `Balance for address ${address}: ${data.data.balance}`;
        } else if (data && data.status === 'Success') {
          return `Balance query successful for ${address}. Response: ${JSON.stringify(data)}`;
        } else {
          return `Balance query completed. Status: ${data?.status || 'unknown'}, Data: ${JSON.stringify(data)}`;
        }
      } catch (apiError: any) {
        console.error("[SDK] ❌ Error fetching balance via Developer Platform API:", apiError);
        console.log("[SDK] Falling back to direct RPC call...");
        // Fallback to RPC
        return await queryBlockchainViaRPC(query);
      }
    }
    
    // Default: return address info
    return `Address ${address} found in query. Use Developer Platform API methods to query specific data.`;
  } catch (error: any) {
    console.error("[SDK] ❌ Error in API blockchain query:", error);
    console.log("[SDK] Falling back to direct RPC call...");
    // Fallback to RPC
    return await queryBlockchainViaRPC(query);
  }
}

/**
 * Execute blockchain query using Crypto.com Developer Platform Client SDK directly
 * Uses SDK methods (Wallet.balance()) which handle authentication internally
 * Falls back to RPC when SDK fails
 */
async function queryBlockchainDirectly(query: string): Promise<string> {
  try {
    // Ensure Client is initialized (should already be done in createCryptoComClient)
    const { Client, Wallet, Token } = require("@crypto.com/developer-platform-client");
    const developerPlatformApiKey = process.env.CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY || process.env.CRONOS_TESTNET_EXPLORER_KEY;
    
    if (!developerPlatformApiKey) {
      console.log("[SDK] No Developer Platform API key, falling back to RPC...");
      return await queryBlockchainViaRPC(query);
    }
    
    // Make sure Client is initialized (it should be, but double-check)
    try {
      // Client.init is idempotent, safe to call multiple times
      Client.init({
        apiKey: developerPlatformApiKey,
      });
    } catch (initError) {
      console.warn("[SDK] Client already initialized or init failed:", initError);
    }
    
    // Extract address from query (look for 0x... pattern)
    const addressMatch = query.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return "Could not find a valid Ethereum address in the query. Please provide an address starting with 0x.";
    }
    
    const address = addressMatch[0];
    console.log(`[SDK] Using Developer Platform Client SDK (Wallet.balance) for address: ${address}`);
    
    // Check if query is about balance
    if (query.toLowerCase().includes('balance')) {
      try {
        // Use SDK method - it handles authentication internally
        const balance = await Wallet.balance(address);
        console.log(`[SDK] ✅ Balance fetched via Developer Platform SDK:`, balance);
        
        if (balance && balance.data && balance.data.balance) {
          return `Balance for address ${address}: ${balance.data.balance}`;
        } else if (balance && balance.status === 'Success') {
          return `Balance query successful for ${address}. Response: ${JSON.stringify(balance)}`;
        } else if (balance && balance.status) {
          return `Balance query completed. Status: ${balance.status}, Response: ${JSON.stringify(balance)}`;
        } else {
          return `Balance query completed. Response: ${JSON.stringify(balance)}`;
        }
      } catch (balanceError: any) {
        console.error("[SDK] ❌ Error fetching balance via Developer Platform SDK:", balanceError);
        console.log("[SDK] Falling back to direct RPC call...");
        // Fallback to RPC
        return await queryBlockchainViaRPC(query);
      }
    }
    
    // Default: return address info
    return `Address ${address} found in query. Use Developer Platform SDK methods to query specific data.`;
  } catch (error: any) {
    console.error("[SDK] ❌ Error in direct blockchain query:", error);
    console.log("[SDK] Falling back to direct RPC call...");
    // Fallback to RPC
    return await queryBlockchainViaRPC(query);
  }
}

/**
 * Execute blockchain query using Crypto.com AI Agent SDK (Optional)
 * Falls back to RPC calls when all SDK endpoints are unreachable
 * 
 * Note: Since Crypto.com endpoints are unreachable (DNS issues), we prioritize RPC fallback
 */
export async function executeBlockchainQuery(
  client: any,
  query: string
): Promise<string> {
  // Extract address from query first
  const addressMatch = query.match(/0x[a-fA-F0-9]{40}/);
  if (!addressMatch) {
    return "Could not find a valid Ethereum address in the query. Please provide an address starting with 0x.";
  }

  // Try Developer Platform Client SDK first (now that DNS is fixed)
  // This uses Wallet.balance() which handles authentication internally
  if (query.toLowerCase().includes('balance')) {
    console.log("[SDK] Trying Developer Platform Client SDK (Wallet.balance)...");
    const sdkResult = await queryBlockchainDirectly(query);
    // If SDK worked (doesn't contain "Error" or "falling back"), return it
    if (!sdkResult.includes("Error") && !sdkResult.includes("falling back")) {
      return sdkResult;
    }
    // Otherwise continue to try other methods
  }

  // Try AI Agent SDK (might work now that DNS is fixed)
  if (!client) {
    console.log("[SDK] No AI Agent client, trying Developer Platform Client SDK...");
    return await queryBlockchainDirectly(query);
  }

  try {
    console.log(`[SDK] Attempting blockchain query via AI Agent SDK: "${query.substring(0, 50)}..."`);
    console.log(`[SDK] Client type: ${typeof client}, has agent: ${!!client.agent}`);
    
    // Check if client has the expected structure
    if (!client.agent || typeof client.agent.generateQuery !== 'function') {
      console.error("[SDK] ❌ Client structure invalid - missing agent.generateQuery method");
      console.log("[SDK] Falling back to direct RPC call...");
      return await queryBlockchainViaRPC(query);
    }
    
    const response = await client.agent.generateQuery(query);
    console.log(`[SDK] ✅ Query successful via AI Agent SDK, response type: ${typeof response}`);
    
    if (response && response.text) {
      return response.text;
    } else if (response && typeof response === 'string') {
      return response;
    } else {
      return JSON.stringify(response, null, 2);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error?.code || error?.errno || 'unknown';
    
    console.error("[SDK] ❌ Error executing blockchain query via AI Agent SDK:", {
      message: errorMessage,
      code: errorCode,
      name: error?.name,
      cause: error?.cause?.message,
    });
    
    // All Crypto.com endpoints are unreachable, use RPC directly
    if (errorCode === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND') || errorMessage.includes('fetch failed')) {
      console.log("[SDK] ⚠️ Crypto.com endpoints unreachable, using direct RPC call (most reliable)...");
      return await queryBlockchainViaRPC(query);
    } else {
      return `Error: ${errorMessage}`;
    }
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

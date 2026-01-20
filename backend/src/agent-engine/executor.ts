import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAgentFromContract } from "../lib/contract";
import {
  determineAgentTools,
  createCryptoComClient,
  fetchMarketData,
  executeBlockchainQuery,
  buildEnhancedPrompt,
} from "./tools";

// Create fresh genAI instance each time to ensure API key is always loaded
// (Don't cache it, as it might be created before dotenv loads)
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in process.env");
    console.error("Available env keys:", Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API')));
    throw new Error("GEMINI_API_KEY not configured");
  }
  // Create fresh instance each time to ensure we always have the latest API key
  return new GoogleGenerativeAI(apiKey);
}

// Generate default prompt from agent description
function generateDefaultPrompt(description: string): string {
  return `You are an AI agent specialized in: ${description}

## Your Role:
You MUST stay focused on your specialization: ${description}
- Only answer questions related to your specialization
- If asked about unrelated topics, politely redirect: "I'm specialized in ${description}. I can help you with questions related to that, but not with [unrelated topic]."
- Provide detailed, accurate, and professional responses within your domain
- Be thorough, clear, and actionable

## Important:
- DO NOT answer generic questions outside your specialization
- DO NOT act as a general-purpose assistant
- STAY FOCUSED on: ${description}
- If the question is not related to your specialization, politely decline and explain what you can help with

User Input:
`;
}

interface AgentConfig {
  systemPrompt: string;
  model?: string;
}

const AGENT_CONFIGS: Record<number, AgentConfig> = {
  1: {
    systemPrompt: `You are a smart contract security expert. Analyze the provided Solidity smart contract code and identify potential vulnerabilities, security issues, and best practice violations. Return a structured security report with:
- Critical vulnerabilities
- Medium severity issues
- Low severity issues
- Recommendations for fixes
Format your response as a clear, professional security audit report.`,
    model: "gemini-2.5-flash", // Using gemini-2.5-flash (without models/ prefix - SDK handles it)
  },
  2: {
    systemPrompt: `You are a cryptocurrency market data analyst with access to REAL-TIME market data from Crypto.com Exchange.

## Available Tools:
- **Market Data API**: Access real-time cryptocurrency prices, volumes, and market statistics
- **Price Lookup**: Get current prices for any cryptocurrency
- **Volume Analysis**: Get trading volume and market statistics

When users ask about prices or market data, you will receive REAL market data from Crypto.com Exchange API. Use this real data to provide accurate, up-to-date analysis.

Your task:
- Analyze real market data provided to you
- Provide insights about price trends, market sentiment, trading opportunities, and risk factors
- Format your response as a clear, professional market analysis report
- Always base your analysis on the real data provided, not assumptions

User Input:
`,
    model: "gemini-2.5-flash",
  },
  3: {
    systemPrompt: `You are a marketing copywriter specializing in Web3 and cryptocurrency projects. Generate engaging, professional marketing content based on the provided brief. Your content should be:
- Clear and compelling
- Web3-native language
- Professional tone
- Action-oriented
Format your response as ready-to-use marketing copy.`,
    model: "gemini-2.5-flash",
  },
  4: {
    systemPrompt: `You are a DeFi portfolio analyst with access to blockchain data and market information.

## Available Tools:
- **Blockchain Query**: Query Cronos EVM blockchain data (balances, transactions, contracts)
- **Market Data**: Access real-time cryptocurrency prices and market data

When users provide portfolio information, you can:
- Check real token balances on-chain
- Get current prices for portfolio assets
- Analyze portfolio composition with real data
- Provide risk assessment based on market conditions
- Suggest optimization strategies

Your task:
- Analyze portfolio information (may include real blockchain data)
- Provide portfolio composition analysis
- Assess risks based on real market data
- Recommend optimizations
- Suggest strategies
- Format as a comprehensive portfolio analysis report

User Input:
`,
    model: "gemini-2.5-flash",
  },
};

export async function executeAgent(
  agentId: number,
  input: string
): Promise<{ output: string; success: boolean }> {
  try {
    // Priority 1: Check hardcoded configs (for pre-configured agents)
    let config = AGENT_CONFIGS[agentId];
    
    // Priority 2: Auto-generate from contract description (for new agents)
    if (!config) {
      console.log(`[Agent ${agentId}] No hardcoded config found, fetching from contract...`);
      const agent = await getAgentFromContract(agentId);
      
      if (!agent) {
        return {
          output: "Agent not found on contract",
          success: false,
        };
      }
      
      // Generate prompt from description
      const basePrompt = generateDefaultPrompt(agent.description);
      
      // Determine what tools this agent should have
      const tools = determineAgentTools(agent.description);
      
      // Enhance prompt with tool instructions
      const enhancedPrompt = buildEnhancedPrompt(basePrompt, tools, agent.description);
      
      config = {
        systemPrompt: enhancedPrompt,
        model: "gemini-2.5-flash"
      };
      
      console.log(`[Agent ${agentId}] Using auto-generated prompt with tools: ${tools.tools.join(", ") || "none"}`);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY not found when executing agent");
      return {
        output: "Gemini API key not configured",
        success: false,
      };
    }

    console.log("🔑 Using Gemini API key (length:", apiKey.length + ")");
    const model = getGenAI().getGenerativeModel({ 
      model: config.model || "gemini-2.5-flash" 
    });
    console.log("📤 Calling Gemini model:", config.model || "gemini-2.5-flash");

    // Get agent description for tool detection
    let agentDescription = "";
    if (agentId <= 4) {
      // Pre-configured agents
      if (agentId === 1) agentDescription = "Analyzes Solidity contracts for vulnerabilities";
      if (agentId === 2) agentDescription = "Fetches and analyzes Crypto.com market data";
      if (agentId === 3) agentDescription = "Creates marketing content for Web3 projects";
      if (agentId === 4) agentDescription = "Analyzes DeFi portfolios";
    } else {
      // Fetch from contract for new agents
      const agent = await getAgentFromContract(agentId).catch(() => null);
      agentDescription = agent?.description || "";
    }
    
    // Determine tools based on agent description
    const tools = determineAgentTools(agentDescription);
    
    // Pre-process input to fetch real data if needed
    let enhancedInput = input;
    let realDataContext = "";

    // Check if user is asking for market data
    if (tools.hasMarketDataAccess) {
      const marketDataPattern = /(?:price|price of|current price|what's the price|how much is|trading at)\s+([A-Z]{2,10}|bitcoin|btc|ethereum|eth|solana|sol|cardano|ada)/i;
      const match = input.match(marketDataPattern);
      if (match) {
        const symbol = match[1].toUpperCase();
        console.log(`[Agent ${agentId}] Fetching market data for ${symbol}...`);
        try {
          const marketData = await fetchMarketData(symbol);
          if (marketData) {
            realDataContext += `\n\n[Real Market Data for ${symbol}]:\n${JSON.stringify(marketData, null, 2)}\n`;
            console.log(`[Agent ${agentId}] ✅ Market data fetched successfully`);
          }
        } catch (error) {
          console.warn(`[Agent ${agentId}] Failed to fetch market data:`, error);
        }
      }
    }

    // Check if user is asking for blockchain data
    if (tools.hasBlockchainAccess) {
      const blockchainClient = createCryptoComClient();
      if (blockchainClient) {
        const blockchainPattern = /(?:balance|transaction|block|address|contract|on-chain|blockchain)/i;
        if (blockchainPattern.test(input)) {
          console.log(`[Agent ${agentId}] 🔗 Detected blockchain query, using Crypto.com AI Agent SDK...`);
          console.log(`[Agent ${agentId}] 📡 SDK Status: ACTIVE - Querying Cronos blockchain via Crypto.com AI Agent SDK`);
          try {
            const blockchainResult = await executeBlockchainQuery(blockchainClient, input);
            if (blockchainResult && !blockchainResult.includes("not available") && !blockchainResult.includes("Error:")) {
              realDataContext += `\n\n[Real Blockchain Data - Fetched via Crypto.com AI Agent SDK]:\n${blockchainResult}\n`;
              console.log(`[Agent ${agentId}] ✅ Blockchain data fetched successfully via Crypto.com AI Agent SDK`);
              console.log(`[Agent ${agentId}] 📊 SDK Result: ${blockchainResult.substring(0, 100)}...`);
            } else {
              console.warn(`[Agent ${agentId}] ⚠️ SDK returned error or unavailable: ${blockchainResult}`);
            }
          } catch (error) {
            console.warn(`[Agent ${agentId}] ❌ Failed to fetch blockchain data via SDK:`, error);
          }
        }
      } else {
        console.log(`[Agent ${agentId}] ⚠️ Crypto.com AI Agent SDK not configured (missing API keys)`);
      }
    }

    // Build enhanced prompt with real data
    enhancedInput = input + realDataContext;
    const prompt = config.systemPrompt.includes("User Input:") 
      ? `${config.systemPrompt}${enhancedInput}`
      : `${config.systemPrompt}\n\nUser Input:\n${enhancedInput}`;

    // Retry logic for transient errors (503, 429, etc.)
    let output: string | undefined = undefined;
    let lastError: Error | null = null;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${retryDelay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // Exponential backoff
        }
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        output = response.text();
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        // Check if it's a retryable error (503, 429, 500, etc.)
        const isRetryable = errorMessage.includes("503") || 
                           errorMessage.includes("429") || 
                           errorMessage.includes("500") ||
                           errorMessage.includes("overloaded") ||
                           errorMessage.includes("quota") ||
                           errorMessage.includes("rate limit");
        
        if (isRetryable && attempt < maxRetries) {
          console.warn(`⚠️  Attempt ${attempt} failed with retryable error: ${errorMessage.split('\n')[0]}`);
          continue; // Retry
        } else {
          // Not retryable or max retries reached
          throw error;
        }
      }
    }

    if (!output) {
      throw lastError || new Error("Failed to get response from Gemini after retries");
    }

    // Output validation - be more lenient with length
    // Long outputs are valid (e.g., detailed security reports)
    const isValidLength = output.length > 10 && output.length < 100000; // Increased limit
    // Only mark as error if it's clearly an error message, not just long content
    const looksLikeError = output.length < 100 && (
      output.toLowerCase().startsWith("error") || 
      output.toLowerCase().startsWith("failed") ||
      output.toLowerCase().includes("exception:") ||
      output.toLowerCase().includes("api key")
    );
    
    const success = isValidLength && !looksLikeError;

    if (!success) {
      console.warn(`[Agent] Output validation failed: length=${output.length}, looksLikeError=${looksLikeError}`);
      console.warn(`[Agent] Output preview: ${output.substring(0, 200)}...`);
    } else {
      console.log(`[Agent] ✅ Output validated: length=${output.length}, success=true`);
    }

    return {
      output,
      success,
    };
  } catch (error) {
    console.error("Agent execution error:", error);
    return {
      output: error instanceof Error ? error.message : "Execution failed",
      success: false,
    };
  }
}

export function getAgentConfig(agentId: number): AgentConfig | null {
  return AGENT_CONFIGS[agentId] || null;
}

import { Router, Request, Response } from "express";
import { verifyPayment, settlePayment, generatePaymentRequiredResponse } from "../x402/facilitator";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { executeAgent } from "../agent-engine/executor";
import { getAgentFromContract, executeAgentOnContract, verifyExecutionOnContract } from "../lib/contract";
import { db } from "../lib/database";
import { ethers } from "ethers";
import { determineAgentTools, fetchMarketData, executeBlockchainQuery, createCryptoComClient } from "../agent-engine/tools";
import { releasePaymentToDeveloper } from "../lib/contract";

const router = Router();

/**
 * Unified chat endpoint - automatically routes to right tools
 * POST /api/chat
 */
import { validateAgentInputMiddleware } from "../middleware/validation";
import { chatRateLimit } from "../middleware/rateLimit";

router.post("/", chatRateLimit, validateAgentInputMiddleware, async (req: Request, res: Response) => {
  try {
    const { input, paymentHash } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input required" });
    }

    // Use a unified agent ID (we'll use agent #1 as the base)
    const UNIFIED_AGENT_ID = 1;
    const contractAgent = await getAgentFromContract(UNIFIED_AGENT_ID);
    if (!contractAgent) {
      return res.status(404).json({ error: "Unified agent not found" });
    }

    const agentPrice = Number(contractAgent.pricePerExecution) / 1_000_000;
    const escrowAddress = process.env.AGENT_ESCROW_ADDRESS || "0x4352F2319c0476607F5E1cC9FDd568246074dF14";

    // Check for payment
    const paymentHeader = req.headers["x-payment"] || 
                          req.headers["x-payment-signature"] || 
                          req.headers["payment-signature"];

    if (!paymentHash && !paymentHeader) {
      const paymentRequired = await generatePaymentRequiredResponse({
        url: req.url || "",
        description: `Chat message`,
        priceUsd: agentPrice,
        payTo: escrowAddress,
        testnet: true,
      });
      return res.status(402).json({
        error: "Payment required",
        paymentRequired: paymentRequired,
      });
    }

    // Parse and verify payment
    const paymentHeaderValue = Array.isArray(paymentHeader) 
      ? paymentHeader[0] 
      : paymentHeader;
    
    if (!paymentHeaderValue || typeof paymentHeaderValue !== "string") {
      return res.status(402).json({
        error: "Payment signature header missing",
        paymentRequired: true,
      });
    }

    let paymentPayload;
    try {
      paymentPayload = decodePaymentSignatureHeader(paymentHeaderValue);
    } catch (parseError) {
      return res.status(402).json({
        error: "Invalid payment signature format",
        details: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }

    // Verify payment
    let verification;
    try {
      verification = await verifyPayment(paymentPayload, {
        priceUsd: agentPrice,
        payTo: escrowAddress,
        testnet: true,
      }, paymentHeaderValue);
    } catch (verifyError) {
      return res.status(402).json({
        error: "Payment verification failed",
        details: verifyError instanceof Error ? verifyError.message : String(verifyError),
      });
    }

    if (!verification.valid) {
      return res.status(402).json({
        error: verification.invalidReason || "Payment verification failed",
        paymentRequired: true,
      });
    }

    // Convert paymentHash to bytes32
    let paymentHashBytes32: string;
    if (paymentHash && paymentHash.startsWith("0x")) {
      paymentHashBytes32 = paymentHash;
    } else if (paymentPayload?.hash) {
      paymentHashBytes32 = paymentPayload.hash;
    } else {
      paymentHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(paymentHeaderValue || ""));
    }

    // Analyze user input to determine what tools/capabilities are needed
    const inputLower = input.toLowerCase();
    
    // Detect intent
    const needsMarketData = /(?:price|price of|current price|what's the price|how much is|trading at|market|volume|bitcoin|btc|ethereum|eth|crypto)/i.test(input);
    const needsBlockchain = /(?:balance|transaction|block|address|contract|on-chain|blockchain|wallet|0x[a-fA-F0-9]{40})/i.test(input);
    const needsContractAnalysis = /(?:contract|solidity|pragma|function|analyze|audit|vulnerability|security|bug)/i.test(input);
    const needsContent = /(?:create|generate|write|tweet|post|content|marketing|copy)/i.test(input);

    // Build enhanced input with real data
    let enhancedInput = input;
    let realDataContext = "";

    // Fetch market data if needed
    if (needsMarketData) {
      const marketDataPattern = /(?:price|price of|current price|what's the price|how much is|trading at)\s+([A-Z]{2,10}|bitcoin|btc|ethereum|eth|solana|sol|cardano|ada|polygon|matic)/i;
      const match = input.match(marketDataPattern);
      if (match) {
        const symbol = match[1].toUpperCase();
        console.log(`[Chat] Fetching market data for ${symbol}...`);
        try {
          const marketData = await fetchMarketData(symbol);
          if (marketData && !marketData.error) {
            realDataContext += `\n\n[Real Market Data for ${symbol}]:\n${JSON.stringify(marketData, null, 2)}\n`;
            console.log(`[Chat] ✅ Market data fetched successfully`);
          }
        } catch (error) {
          console.warn(`[Chat] Failed to fetch market data:`, error);
        }
      }
    }

    // Fetch blockchain data if needed
    if (needsBlockchain) {
      const blockchainClient = createCryptoComClient();
      if (blockchainClient) {
        console.log(`[Chat] 🔗 Detected blockchain query, using Crypto.com AI Agent SDK...`);
        console.log(`[Chat] 📡 SDK Status: ACTIVE - Querying Cronos blockchain via Crypto.com AI Agent SDK`);
        try {
          const blockchainResult = await executeBlockchainQuery(blockchainClient, input);
          if (blockchainResult && !blockchainResult.includes("not available") && !blockchainResult.includes("Error:")) {
            realDataContext += `\n\n[Real Blockchain Data - Fetched via Crypto.com AI Agent SDK]:\n${blockchainResult}\n`;
            console.log(`[Chat] ✅ Blockchain data fetched successfully via Crypto.com AI Agent SDK`);
            console.log(`[Chat] 📊 SDK Result: ${blockchainResult.substring(0, 100)}...`);
          } else {
            console.warn(`[Chat] ⚠️ SDK returned error or unavailable: ${blockchainResult}`);
            // Don't add error to context - let agent work without blockchain data
          }
        } catch (error) {
          console.warn(`[Chat] ❌ Failed to fetch blockchain data via SDK:`, error);
          // Don't fail the entire request - continue without blockchain data
        }
      } else {
        console.log(`[Chat] ⚠️ Crypto.com AI Agent SDK not configured (missing GEMINI_API_KEY/OPENAI_API_KEY or CRONOS_TESTNET_EXPLORER_KEY)`);
      }
    }

    // Build system prompt based on detected needs
    let systemPrompt = `You are AgentMarket, a unified AI assistant with access to multiple tools and capabilities.

## Your Capabilities:
${needsMarketData ? "- **Market Data**: You have access to real-time cryptocurrency prices and market data from Crypto.com Exchange\n" : ""}
${needsBlockchain ? "- **Blockchain**: You can query Cronos EVM blockchain data (balances, transactions, contracts)\n" : ""}
${needsContractAnalysis ? "- **Contract Analysis**: You can analyze Solidity smart contracts for security issues\n" : ""}
${needsContent ? "- **Content Generation**: You can create marketing content, tweets, and Web3 copy\n" : ""}

## Your Task:
- Analyze the user's question
- Use the real data provided to you (if any)
- Provide a helpful, accurate, and professional response
- Be clear and actionable
- **IMPORTANT**: If real blockchain data is provided, use it directly. If no real data is provided, explain that blockchain query services are currently unavailable, but you can provide general information about how to check balances using blockchain explorers.

## Response Format:
- If you have real blockchain data: Present it clearly with the actual values
- If you DON'T have real data: Explain that the blockchain query service is unavailable and suggest using a blockchain explorer like Cronoscan (https://testnet.cronoscan.com) to check the balance manually
- **DO NOT** show Python code or tool_code commands - provide natural language responses only

User Input:
`;

    // Execute on contract
    console.log(`[Chat] Executing agent on contract: Agent ID ${UNIFIED_AGENT_ID}, Payment Hash: ${paymentHashBytes32}`);
    let contractExecutionId: number | null;
    try {
      contractExecutionId = await executeAgentOnContract(UNIFIED_AGENT_ID, paymentHashBytes32, input);
    } catch (contractError) {
      console.error("[Chat] ❌ Contract execution failed:", contractError);
      return res.status(500).json({
        error: "Contract execution failed",
        details: contractError instanceof Error ? contractError.message : String(contractError),
      });
    }
    
    if (contractExecutionId === null) {
      console.warn(`[Chat] ⚠️ Contract execution returned null - payment may be already used`);
      return res.status(402).json({
        error: "Payment already used or contract call failed",
        details: "The payment hash has already been used. Please create a new payment.",
        paymentRequired: true,
      });
    }
    
    console.log(`[Chat] ✅ Contract execution successful: Execution ID ${contractExecutionId}`);

    // Log payment
    try {
      db.addPayment({
        paymentHash: paymentHashBytes32,
        agentId: UNIFIED_AGENT_ID,
        agentName: "Unified Chat Agent",
        userId: verification.payerAddress || "unknown",
        amount: agentPrice,
        status: "pending",
        timestamp: Date.now(),
        executionId: contractExecutionId,
      });
      console.log(`[Chat] ✅ Payment logged to database`);
    } catch (dbError) {
      console.warn(`[Chat] ⚠️ Failed to log payment to database:`, dbError);
      // Continue execution even if DB logging fails
    }

    // Execute with enhanced input
    const enhancedInputWithData = enhancedInput + realDataContext;
    
    console.log(`[Chat] Executing agent with prompt (Agent ID: ${UNIFIED_AGENT_ID})...`);
    console.log(`[Chat] Input length: ${enhancedInputWithData.length}, System prompt length: ${systemPrompt.length}`);
    
    // Use a special execution function that accepts custom prompt
    let result;
    try {
      result = await executeAgentWithPrompt(UNIFIED_AGENT_ID, enhancedInputWithData, systemPrompt);
      console.log(`[Chat] ✅ Agent execution successful: ${result.success ? "SUCCESS" : "FAILED"}`);
    } catch (execError) {
      console.error("[Chat] ❌ Agent execution failed:", execError);
      // Still try to verify execution on contract even if agent execution failed
      result = {
        output: execError instanceof Error ? execError.message : "Agent execution failed",
        success: false,
      };
    }
    
    // Log execution
    try {
      db.addExecution({
        executionId: contractExecutionId,
        agentId: UNIFIED_AGENT_ID,
        agentName: "Unified Chat Agent",
        userId: verification.payerAddress || "unknown",
        paymentHash: paymentHashBytes32,
        input: enhancedInputWithData,
        output: result.output || "",
        success: result.success,
        timestamp: Date.now(),
        verified: false,
      });
      console.log(`[Chat] ✅ Execution logged to database`);
    } catch (dbError) {
      console.warn(`[Chat] ⚠️ Failed to log execution to database:`, dbError);
      // Continue execution even if DB logging fails
    }

    // Verify on contract
    const verified = await verifyExecutionOnContract(
      contractExecutionId,
      result.output || "",
      result.success
    );

    if (verified) {
      db.updateExecution(contractExecutionId, { verified: true });
    }

    // Settle payment if successful
    if (result.success) {
      try {
        await settlePayment(paymentPayload, {
          priceUsd: agentPrice,
          payTo: escrowAddress,
          testnet: true,
        }, paymentHeaderValue);
        console.log("Payment settled to escrow successfully");
        
        // Release payment to developer (minus platform fee)
        // For unified chat agent: check if agent has developer, if not skip release
        console.log("Checking agent developer address...");
        const agent = await getAgentFromContract(UNIFIED_AGENT_ID);
        if (agent && agent.developer && agent.developer !== "0x0000000000000000000000000000000000000000") {
          console.log("Releasing payment to developer...");
          const released = await releasePaymentToDeveloper(paymentHashBytes32, UNIFIED_AGENT_ID);
          if (released) {
            console.log("✅ Payment released to developer successfully");
            db.updatePayment(paymentHashBytes32, { status: "settled" });
          } else {
            console.warn("⚠️  Payment settlement succeeded but release to developer failed");
            db.updatePayment(paymentHashBytes32, { status: "settled" }); // Still mark as settled
          }
        } else {
          console.log("ℹ️  Unified chat agent has no developer address - skipping payment release");
          console.log("   Payment is settled in escrow. For unified chat, this is expected.");
          db.updatePayment(paymentHashBytes32, { status: "settled" });
        }
      } catch (settleError) {
        console.error("Payment settlement error:", settleError);
        db.updatePayment(paymentHashBytes32, { status: "failed" });
      }
    } else {
      db.updatePayment(paymentHashBytes32, { status: "refunded" });
    }

    res.json({
      executionId: contractExecutionId,
      output: result.output,
      success: result.success,
      payerAddress: verification.payerAddress,
    });
  } catch (error) {
    console.error("❌ Error in chat endpoint:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : typeof error,
      body: req.body,
      headers: {
        "x-payment": req.headers["x-payment"] ? "present" : "missing",
        "x-payment-signature": req.headers["x-payment-signature"] ? "present" : "missing",
      },
    });
    
    // Import error handler
    try {
      const { sendErrorResponse } = require("../utils/errorHandler");
      sendErrorResponse(
        res,
        error,
        "Failed to process chat message",
        500
      );
    } catch (handlerError) {
      console.error("❌ Error handler also failed:", handlerError);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : String(error)) : undefined,
      });
    }
  }
});

/**
 * Execute agent with custom prompt (for unified chat)
 */
async function executeAgentWithPrompt(
  agentId: number,
  input: string,
  customPrompt: string
): Promise<{ output: string; success: boolean }> {
  // Try Gemini first, fallback to OpenRouter
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
  
  let useOpenRouter = false;
  let model: any;
  let modelName: string;
  
  if (geminiApiKey) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    console.log(`[Chat] 🔑 Using Gemini API key (length: ${geminiApiKey.length}, starts with: ${geminiApiKey.substring(0, 10)}...)`);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    modelName = "gemini-2.5-flash";
    console.log(`[Chat] ✅ Gemini client initialized with model: ${modelName}`);
  } else if (openRouterKey) {
    useOpenRouter = true;
    const { OpenAI } = await import("openai");
    model = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      defaultHeaders: {
        "HTTP-Referer": "https://agentmarket.app",
        "X-Title": "AgentMarket",
      },
    });
    modelName = openRouterModel;
    console.log(`[Chat] 🔄 Using OpenRouter (model: ${modelName})`);
  } else {
    console.error(`[Chat] ❌ No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY`);
    return {
      output: "AI provider not configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY in backend/.env",
      success: false,
    };
  }

  // Build prompt (for Gemini) or use messages format (for OpenRouter)
  const prompt = `${customPrompt}${input}`;

  // Retry logic
  let output: string | undefined = undefined;
  let lastError: Error | null = null;
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[Chat] 🔄 ${useOpenRouter ? 'OpenRouter' : 'Gemini'} API retry attempt ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      console.log(`[Chat] 📤 Calling ${useOpenRouter ? 'OpenRouter' : 'Gemini'} API (attempt ${attempt}/${maxRetries})...`);
      console.log(`[Chat] Prompt length: ${prompt.length} characters`);
      
      if (useOpenRouter) {
        const completion = await model.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: customPrompt },
            { role: "user", content: input }
          ],
          temperature: 0.7,
        });
        output = completion.choices[0]?.message?.content || "";
      } else {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        output = response.text();
      }
      console.log(`[Chat] ✅ ${useOpenRouter ? 'OpenRouter' : 'Gemini'} API call successful (response length: ${output.length})`);
      break;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      const errorCode = error?.code || error?.status || "unknown";
      const errorStatus = error?.statusCode || "unknown";
      
      console.error(`[Chat] ❌ ${useOpenRouter ? 'OpenRouter' : 'Gemini'} API call failed (attempt ${attempt}/${maxRetries}):`, {
        message: errorMessage,
        code: errorCode,
        status: errorStatus,
        name: error?.name,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
      });
      
      // If Gemini quota exceeded and OpenRouter available, switch to OpenRouter
      if (!useOpenRouter && errorMessage.includes("quota") && openRouterKey && attempt === 1) {
        console.warn(`[Chat] ⚠️  Gemini quota exceeded, switching to OpenRouter fallback...`);
        try {
          const { OpenAI } = await import("openai");
          useOpenRouter = true;
          model = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterKey,
            defaultHeaders: {
              "HTTP-Referer": "https://agentmarket.app",
              "X-Title": "AgentMarket",
            },
          });
          modelName = openRouterModel;
          console.log(`[Chat] 🔄 Now using OpenRouter (model: ${modelName})`);
          continue; // Retry with OpenRouter
        } catch (importError) {
          console.warn(`[Chat] ⚠️  Failed to import OpenAI package for OpenRouter fallback`);
        }
      }
      
      // Handle OpenRouter data policy error
      if (useOpenRouter && errorMessage.includes("data policy") && errorMessage.includes("Free model publication")) {
        console.error(`[Chat] ❌ OpenRouter data policy not configured for free models`);
        console.error(`[Chat] 💡 Fix: Go to https://openrouter.ai/settings/privacy and enable "Free model publication"`);
        return {
          output: "OpenRouter data policy not configured. Please enable 'Free model publication' in your OpenRouter privacy settings: https://openrouter.ai/settings/privacy",
          success: false,
        };
      }
      
      const isRetryable = errorMessage.includes("503") || 
                         errorMessage.includes("429") || 
                         errorMessage.includes("500") ||
                         errorMessage.includes("overloaded") ||
                         errorMessage.includes("quota") ||
                         errorMessage.includes("rate limit") ||
                         errorCode === 503 ||
                         errorCode === 429 ||
                         errorStatus === 503 ||
                         errorStatus === 429;
      
      if (isRetryable && attempt < maxRetries) {
        console.log(`[Chat] ⚠️ Retryable error detected, will retry...`);
        continue;
      } else {
        console.error(`[Chat] ❌ Non-retryable error or max retries reached, throwing error`);
        throw error;
      }
    }
  }

  if (!output) {
    const errorMsg = lastError ? (lastError instanceof Error ? lastError.message : String(lastError)) : "Failed to get response from Gemini";
    console.error(`[Chat] ❌ Gemini API failed after ${maxRetries} attempts:`, errorMsg);
    throw lastError || new Error(errorMsg);
  }
  
  console.log(`[Chat] ✅ Gemini API response received (length: ${output.length})`);

  const isValidLength = output.length > 10 && output.length < 100000;
  const looksLikeError = output.length < 100 && (
    output.toLowerCase().startsWith("error") || 
    output.toLowerCase().startsWith("failed") ||
    output.toLowerCase().includes("exception:") ||
    output.toLowerCase().includes("api key")
  );

  const success = isValidLength && !looksLikeError;

  return {
    output,
    success,
  };
}

export default router;

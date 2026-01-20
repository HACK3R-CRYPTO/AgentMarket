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
router.post("/", async (req: Request, res: Response) => {
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
          }
        } catch (error) {
          console.warn(`[Chat] ❌ Failed to fetch blockchain data via SDK:`, error);
        }
      } else {
        console.log(`[Chat] ⚠️ Crypto.com AI Agent SDK not configured (missing OPENAI_API_KEY or CRONOS_TESTNET_EXPLORER_KEY)`);
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
- If you have real data, use it. If not, provide general guidance.

User Input:
`;

    // Execute on contract
    const contractExecutionId = await executeAgentOnContract(UNIFIED_AGENT_ID, paymentHashBytes32, input);
    
    if (contractExecutionId === null) {
      return res.status(402).json({
        error: "Payment already used or contract call failed",
        details: "The payment hash has already been used. Please create a new payment.",
        paymentRequired: true,
      });
    }

    // Log payment
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

    // Execute with enhanced input
    const enhancedInputWithData = enhancedInput + realDataContext;
    
    // Use a special execution function that accepts custom prompt
    const result = await executeAgentWithPrompt(UNIFIED_AGENT_ID, enhancedInputWithData, systemPrompt);
    
    // Log execution
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
        console.log("Releasing payment to developer...");
        const released = await releasePaymentToDeveloper(paymentHashBytes32, UNIFIED_AGENT_ID);
        if (released) {
          console.log("✅ Payment released to developer successfully");
          db.updatePayment(paymentHashBytes32, { status: "settled" });
        } else {
          console.warn("⚠️  Payment settlement succeeded but release to developer failed");
          db.updatePayment(paymentHashBytes32, { status: "settled" }); // Still mark as settled
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
    console.error("Error in chat:", error);
    res.status(500).json({ 
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : String(error)
    });
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
  // Import Gemini
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      output: "Gemini API key not configured",
      success: false,
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `${customPrompt}${input}`;

  // Retry logic
  let output: string | undefined = undefined;
  let lastError: Error | null = null;
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      output = response.text();
      break;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      const isRetryable = errorMessage.includes("503") || 
                         errorMessage.includes("429") || 
                         errorMessage.includes("500") ||
                         errorMessage.includes("overloaded") ||
                         errorMessage.includes("quota") ||
                         errorMessage.includes("rate limit");
      
      if (isRetryable && attempt < maxRetries) {
        continue;
      } else {
        throw error;
      }
    }
  }

  if (!output) {
    throw lastError || new Error("Failed to get response from Gemini");
  }

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

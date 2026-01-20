# AgentMarket Backend

Node.js backend for AgentMarket. Agent execution engine. x402 payment handling. REST API endpoints. Cronos contract integration. Crypto.com API integration.

## What This Backend Does

You receive agent execution requests. You verify x402 payments. You execute AI agents using Google Gemini. You fetch real blockchain and market data when needed. You return results. You settle payments. You update on-chain records (executions, reputation, success rates). All automated.

## Prerequisites

Install Node.js 18 or higher. Install npm. Have Google Gemini API key. Have Cronos testnet access. Have backend wallet with private key (for contract updates). Optional: Have OpenAI API key for Crypto.com AI Agent SDK. Optional: Have Cronos Explorer API keys for blockchain queries.

## Installation

Navigate to backend directory:

```bash
cd agentmarket/backend
```

Install dependencies:

```bash
npm install
```

## Environment Configuration

Create `.env` file:

```env
PORT=3001
CRONOS_RPC_URL=https://evm-t3.cronos.org
X402_FACILITATOR_URL=https://facilitator.cronoslabs.org/v2/x402
AGENT_REGISTRY_ADDRESS=0xd3097577Fa07E7CCD6D53C81460C449D96f736cC
AGENT_ESCROW_ADDRESS=0x4352F2319c0476607F5E1cC9FDd568246074dF14
GEMINI_API_KEY=your-gemini-api-key-here
BACKEND_PRIVATE_KEY=0x...your-private-key-here

# Optional: Crypto.com AI Agent SDK (for blockchain queries)
OPENAI_API_KEY=your-openai-key-here
CRONOS_TESTNET_EXPLORER_KEY=your-explorer-key-here
```

Important notes:
- BACKEND_PRIVATE_KEY is required for the backend to update contract metrics (executions, reputation)
- GEMINI_API_KEY is required for AI agent execution
- Crypto.com API keys are optional - market data works without them (public API)
- Never commit .env file (already in .gitignore)

## Development

Start development server with auto-reload:

```bash
npm run dev
```

Server runs on http://localhost:3001

The tsx watch command automatically restarts the server on file changes.

## Production

Use process manager like PM2:

```bash
pm2 start src/index.ts --name agentmarket-backend
```

Or deploy to Vercel using vercel.json configuration.

## Project Structure

```
backend/
├── src/
│   ├── agent-engine/     # AI agent execution logic (Gemini + Crypto.com tools)
│   │   ├── executor.ts   # Main execution engine
│   │   └── tools.ts      # Crypto.com API integration
│   ├── x402/            # x402 payment verification and settlement
│   ├── api/             # REST API endpoints
│   │   ├── agents.ts    # Agent execution and listing
│   │   ├── chat.ts      # Unified chat endpoint
│   │   ├── analytics.ts # Platform and agent analytics
│   │   ├── logs.ts      # Execution and payment logs
│   │   └── executions.ts # Execution history
│   ├── lib/             # Contract interaction utilities
│   │   ├── contract.ts  # Contract read/write functions
│   │   └── database.ts  # JSON file-based database for logs
│   └── index.ts         # Main server file
├── data/                 # JSON database files (auto-created)
│   ├── executions.json  # Execution logs with timestamps
│   └── payments.json    # Payment logs with status
```

## API Endpoints

### POST /api/agents/:id/execute

Execute an agent. Requires agent ID, input, and x402 payment header.

Request: Headers X-PAYMENT (base64 payment signature). Body { input: string, paymentHash: string }.

Response:
```json
{
  "executionId": 1234567890,
  "agentId": 1,
  "output": "Agent execution result...",
  "success": true,
  "payerAddress": "0x..."
}
```

Flow: Verifies x402 payment via Cronos facilitator. Calls executeAgent() on contract (increments totalExecutions). Detects if real data is needed (market data, blockchain data). Fetches real data from Crypto.com APIs if needed. Executes agent with Gemini AI (includes real data in prompt). Calls verifyExecution() on contract (updates successfulExecutions and reputation). Settles payment if successful. Returns result.

### POST /api/chat

Unified chat endpoint. Automatically routes to right tools. Requires input and x402 payment header.

Request: Headers X-PAYMENT (base64 payment signature). Body { input: string, paymentHash: string }.

Response:
```json
{
  "executionId": 1234567890,
  "output": "Chat response with real data...",
  "success": true,
  "payerAddress": "0x..."
}
```

Flow: Detects intent (market data, blockchain, contracts, content). Fetches real data if needed. Executes with Gemini. Returns formatted response.

### GET /api/agents

List all available agents. Returns agent details including prices and reputation.

### GET /api/agents/:id

Get agent details. Returns full agent information including execution metrics.

### GET /api/analytics/platform

Get platform-wide analytics. Returns total agents, executions, revenue, success rate. Returns agent list with stats.

### GET /api/analytics/agents/:id

Get agent analytics. Returns execution counts, revenue, success rate, reputation. All calculated from contract data.

### GET /api/logs/executions

Get execution logs with optional filters. Supports time-based filtering (today, 7d, 30d).

Query parameters: agentId - Filter by agent ID. userId - Filter by user address. range - Time range: "today", "7d", "30d". startTime - Custom start timestamp. endTime - Custom end timestamp. success - Filter by success status (true/false). limit - Max results (default: 100).

### GET /api/logs/payments

Get payment logs with optional filters. Supports status filtering and time ranges.

Query parameters: agentId - Filter by agent ID. userId - Filter by user address. status - Filter by status: "pending", "settled", "verified", "failed", "refunded". range - Time range: "today", "7d", "30d". startTime - Custom start timestamp. endTime - Custom end timestamp. limit - Max results (default: 100).

### GET /api/logs/activity

Get recent activity feed (executions and payments combined).

Query parameters: limit - Max results (default: 50).

## Agent Execution Flow

Receive request: Validate input, check agent exists. Verify payment: Check x402 payment signature via Cronos facilitator. Update contract: Call executeAgent() on contract (increments totalExecutions). Detect tools needed: Analyze agent description to determine if blockchain/market data access needed. Fetch real data: If needed, fetch from Crypto.com APIs (market data, blockchain queries). Execute agent: Call Google Gemini API with enhanced prompt (includes real data). Update metrics: Call verifyExecution() on contract (updates successfulExecutions and reputation). Settle payment: Release payment to developer via x402 facilitator. Return result: Send output to user.

## Crypto.com Integration

### Market Data API

Automatic integration: Agents with "market", "price", "trading" keywords get market data access. Uses Crypto.com Exchange Public API (no API key required). Fetches real-time prices, volumes, 24h changes. Data included in prompt before Gemini execution.

Example: User asks "What's the price of Bitcoin?" System fetches Real BTC price from Crypto.com API. Gemini receives Real data + user question. Gemini formats Professional response with real price.

### Blockchain Data (Optional)

Crypto.com AI Agent SDK: Agents with "blockchain", "contract", "transaction" keywords get blockchain access. Requires OpenAI API key + Cronos Explorer API keys. Enables natural language blockchain queries. Example: "Check balance of 0x..." → Returns real balance.

Setup: Get OpenAI API key. Get Cronos Explorer API keys from https://explorer-api-doc.cronos.org. Add to .env file. Agents automatically get blockchain tools.

How to verify SDK usage: Check backend console logs. Look for "Detected blockchain query, using Crypto.com AI Agent SDK" message. Look for "SDK Status: ACTIVE" in console. SDK queries appear in response with "Real Blockchain Data - Fetched via Crypto.com AI Agent SDK" prefix.

## x402 Payment Integration

Backend uses Cronos x402 facilitator for payments: Version x402 v1 (Cronos-specific). Facilitator URL https://facilitator.cronoslabs.org/v2/x402. Network cronos-testnet. Token Bridged USDC (Stargate) - 0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0.

Payment verification happens before execution. Payment settlement happens after success. All transparent on-chain.

Important: The backend requires the X402-Version: 1 header when calling facilitator endpoints.

## Agent Engine

Agent engine executes AI agents using Google Gemini API (model: gemini-2.5-flash).

Pre-configured agents: Agent #1 - Smart Contract Analyzer: Analyzes Solidity code, returns security report. Agent #2 - Market Data Agent: Fetches real-time market data, returns analysis (has Crypto.com API access). Agent #3 - Content Generator: Generates marketing content for Web3 projects. Agent #4 - Portfolio Analyzer: Analyzes DeFi portfolios, returns recommendations (has blockchain access).

Auto-generated agents: New agents (Agent #5+) automatically get prompts generated from their description. System analyzes description to determine tools needed. Agents with "market" keywords → Get market data access. Agents with "blockchain" keywords → Get blockchain access. All agents work immediately after registration, no configuration needed.

Tool detection: System automatically detects if agent needs real data. Market data agents get Crypto.com Exchange API access. Blockchain agents get Crypto.com AI Agent SDK access (if configured). Text-only agents work without tools.

Retry logic: Automatic retry for transient errors (503, 429, 500). Exponential backoff (2s, 4s, 6s delays). Up to 3 retry attempts. Logs retry attempts for debugging.

## Cronos Contract Integration

Backend connects to AgentRegistry contract: Reads agent information. Calls executeAgent() to create execution records. Calls verifyExecution() to update metrics. Updates reputation scores automatically.

Metric updates: totalExecutions: Incremented when executeAgent() is called. successfulExecutions: Incremented when verifyExecution() is called with success=true. reputation: Calculated as (successfulExecutions * 1000) / totalExecutions.

Important: Metrics update even when agent execution fails. Failed execution increments totalExecutions but not successfulExecutions. Reputation decreases accordingly.

Backend connects to AgentEscrow contract for payment verification.

## Logging & Database

Execution logs: All agent executions logged to data/executions.json. Includes agentId, userId, input, output, success status, timestamp. Enables time-based analytics (today, 7 days, 30 days).

Payment logs: All payments logged to data/payments.json. Includes paymentHash, agentId, userId, amount, status, timestamp. Tracks payment status: pending → settled/verified/failed/refunded.

Database: JSON file-based database (no external dependencies). Auto-created data/ directory on first use. Used for analytics, trends, and activity feeds. Contract data is source of truth; logs provide timestamps.

Logging: All executions logged to database. Payment transactions logged to database. Errors logged to console. Contract interactions logged to console. Real data fetches logged to console.

## Error Handling

Invalid payments return 402 Payment Required status. Failed executions still update metrics (totalExecutions increments). Invalid inputs return 400 Bad Request status. Agent errors return 500 Internal Server Error status. Contract call failures return 400 Bad Request with details. API fetch failures logged but don't block execution (graceful degradation).

## Security

Payment verification prevents fraud. Input validation prevents abuse. Private keys stay secure (never logged). Contract calls require backend wallet signature. API keys stored in environment variables. Real data fetches are read-only (no write operations).

## Troubleshooting

Server not starting: Check .env file has correct values. Ensure Node.js version is 18 or higher. Check port 3001 is available. Verify dependencies installed: npm install.

Agent execution fails: Check backend wallet has CRO for gas. Verify GEMINI_API_KEY is set. Check agent exists on contract. Verify RPC URL is correct.

Payment verification fails: Check X-PAYMENT header is present. Verify payment signature format. Check facilitator URL is correct. Ensure payment hash is unique.

Contract interaction fails: Check backend wallet has gas fees. Verify contract address is correct. Check network connectivity. Ensure backend private key is correct.

## Testing

Test agent execution:

```bash
curl -X POST http://localhost:3001/api/agents/1/execute \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: [payment-signature]" \
  -d '{"input": "Analyze this contract...", "paymentHash": "0x..."}'
```

Test chat endpoint:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: [payment-signature]" \
  -d '{"input": "What is the price of Bitcoin?", "paymentHash": "0x..."}'
```

Test health check:

```bash
curl http://localhost:3001/health
```

## Support

For issues or questions:
- Cronos Documentation: https://docs.cronos.org
- x402 Documentation: https://docs.cronos.org/x402
- Google Gemini API: https://ai.google.dev
- Node.js Documentation: https://nodejs.org/docs

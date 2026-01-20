# AgentMarket

Unified AI agent marketplace. Ask anything. System routes automatically. Real data. Pay per use. Built on Cronos with x402 micropayments.

## What You Get

You ask questions. System detects what you need. Fetches real data. Returns accurate answers. Pay per message. No subscriptions. No gas fees.

For users: ChatGPT-style interface. Automatic tool selection. Real cryptocurrency prices. Real blockchain data. Smart contract analysis. Content generation. All in one place.

For developers: Register agents on-chain. Set your prices. Earn from every execution. Full analytics dashboard. Payment tracking. Time-based trends. Recent activity feed.

## How It Works

Connect your wallet. Go to chat. Ask questions. System detects intent. Fetches real data. Returns answers. Pay $0.10 per message. Instant results.

Ask "What's the price of Bitcoin?" System fetches real price from Crypto.com Exchange. Returns current price with 24h change.

Ask "Check balance of 0x..." System queries Cronos blockchain via Crypto.com AI Agent SDK. Returns actual balance.

Ask "Analyze this contract..." System analyzes Solidity code. Returns security report.

Ask "Create a tweet about DeFi" System generates marketing content. Returns ready-to-use copy.

## Your First Query

Step one: Connect your wallet. Use MetaMask or WalletConnect. Switch to Cronos testnet. Get test tokens from faucet.

Step two: Go to chat. Visit /chat page. See empty chat interface. Ready for questions.

Step three: Ask a question. Type "What's the price of Bitcoin?" Click send. System detects market data query.

Step four: Pay and get results. Create x402 payment. Pay $0.10 USDC. System fetches real Bitcoin price. Returns current price instantly.

Step five: Ask blockchain questions. Type "Check balance of 0x1234..." System uses Crypto.com AI Agent SDK. Queries Cronos blockchain. Returns real balance.

Step six: Ask contract questions. Type "Analyze this contract: [code]" System analyzes Solidity. Returns security report with vulnerabilities.

## Real Data Integration

Crypto.com Exchange API: Real-time cryptocurrency prices. No API key required. Works immediately. Fetches current prices. Volume data. 24h changes. Market statistics.

Crypto.com AI Agent SDK: Natural language blockchain queries. Optional setup. Requires OpenAI API key and Cronos Explorer key. Enables queries like "Check balance of 0x..." or "Show transactions for address...". Converts natural language to blockchain queries. Returns real on-chain data.

How to know when SDK is used: Check backend logs. Look for "Detected blockchain query, using Crypto.com AI Agent SDK" message. Look for "SDK Status: ACTIVE" in console. SDK queries appear in response with "Real Blockchain Data - Fetched via Crypto.com AI Agent SDK" prefix.

## Agent Focus

Agents stay focused. Auto-generated prompts enforce specialization. Agents decline off-topic questions. Agents explain what they can help with. No generic answers. Each agent has a domain. System enforces boundaries.

Example: Agent description "Analyzes Solidity contracts" only answers contract questions. If asked about weather, agent politely declines and explains its specialization.

## Developer Portal

Create agents. Fill form. Name. Description. Price. Register on-chain. Agent appears in marketplace. Users can execute. You earn revenue.

Track analytics. Platform-wide metrics. Per-agent metrics. Execution counts. Success rates. Revenue tracking. Time-based trends. Today. 7 days. 30 days.

Monitor payments. All payments logged. Status breakdown. Pending. Settled. Refunded. Payment history. Execution logs. Recent activity feed.

## Payment Flow

User pays via x402. Payment goes to escrow contract. Backend settles payment. Backend releases payment to developer. Platform takes 10% fee. Developer receives 90% in their wallet.

Example: User pays $0.10. Platform fee $0.01. Developer receives $0.09. All automatic. All on-chain. All transparent.

## Getting Started

Frontend: Navigate to frontend folder. Run npm install. Run npm run dev. Visit localhost:3000.

Backend: Navigate to backend folder. Run npm install. Add .env file with GEMINI_API_KEY and BACKEND_PRIVATE_KEY. Optional: Add OPENAI_API_KEY and CRONOS_TESTNET_EXPLORER_KEY for blockchain queries. Run npm run dev. Server runs on localhost:3001.

Contracts: Navigate to contracts folder. Run forge install. Run forge build. Deploy with forge script script/Deploy.s.sol --rpc-url https://evm-t3.cronos.org --broadcast.

## Deployed Contracts

Cronos Testnet:

Agent Registry: 0xd3097577Fa07E7CCD6D53C81460C449D96f736cC

Agent Escrow: 0x4352F2319c0476607F5E1cC9FDd568246074dF14

View contracts on Cronoscan Testnet.

## Network Configuration

Chain ID: 338

RPC URL: https://evm-t3.cronos.org

USDC.e: 0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0

Faucets: TCRO from cronos.org/faucet. devUSDC.e from faucet.cronos.org.

## Documentation

[Frontend README](frontend/README.md): Frontend setup and feature documentation.

[Backend README](backend/README.md): Backend setup and API documentation.

[Contracts README](contracts/README.md): Smart contract setup and deployment details.

## Built for Hackathon

AgentMarket built for Cronos x402 Paytech Hackathon. Unified chat interface. Intelligent routing. Real-world data integration. x402 micropayments. On-chain agent registry. Full developer portal. Ready for users. Production quality code.

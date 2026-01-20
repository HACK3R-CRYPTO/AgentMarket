# AgentMarket

Unified AI agent marketplace. Ask anything. System routes automatically. Real data. Pay per use. Built on Cronos with x402 micropayments.

## What You Get

You ask questions. System detects what you need. Fetches real data. Returns accurate answers. Pay per message. No subscriptions. No gas fees.

For users: ChatGPT-style interface. Automatic tool selection. Real cryptocurrency prices. Real blockchain data. Smart contract analysis. Content generation. All in one place.

For developers: Register agents on-chain. Set your prices. Earn from every execution. Full analytics dashboard. Payment tracking. Time-based trends. Recent activity feed.

## How It Works

Connect your wallet. Go to chat. Ask questions. System detects intent. Fetches real data. Returns answers. Pay $0.10 per message. Instant results.

Ask "What's the price of Bitcoin?" System fetches real price from Crypto.com Exchange. Returns current price with 24h change.

Ask "Check balance of 0x..." System queries Cronos blockchain via Crypto.com Developer Platform SDK. Returns actual balance.

Ask "Analyze this contract..." System analyzes Solidity code. Returns security report.

Ask "Create a tweet about DeFi" System generates marketing content. Returns ready-to-use copy.

## Your First Query

Step one: Connect your wallet. Use MetaMask or WalletConnect. Switch to Cronos testnet. Get test tokens from faucet.

Step two: Go to chat. Visit /chat page. See empty chat interface. Ready for questions.

Step three: Ask a question. Type "What's the price of Bitcoin?" Click send. System detects market data query.

Step four: Pay and get results. Create x402 payment. Pay $0.10 USDC. System fetches real Bitcoin price. Returns current price instantly.

Step five: Ask blockchain questions. Type "Check balance of 0x1234..." System uses Crypto.com Developer Platform SDK. Queries Cronos blockchain. Returns real balance.

Step six: Ask contract questions. Type "Analyze this contract: [code]" System analyzes Solidity. Returns security report with vulnerabilities.

## Real Data Integration

Crypto.com Exchange API: Real-time cryptocurrency prices. No API key required. Works immediately. Fetches current prices. Volume data. 24h changes. Market statistics.

Crypto.com Developer Platform Client SDK: Natural language blockchain queries. Requires Developer Platform API key and Cronos Explorer key. Enables queries like "Check balance of 0x..." or "Show transactions for address...". Uses Wallet.balance() method to fetch real on-chain data. Returns actual blockchain balances. Fully integrated and working.

How to know when SDK is used: Check backend logs. Look for "Using Developer Platform Client SDK (Wallet.balance)" message. Look for "Balance fetched via Developer Platform SDK" in console. SDK queries return real blockchain data with status Success.

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

## Technical Achievements

Crypto.com Developer Platform Client SDK fully integrated. Real blockchain data queries working. Balance queries return actual on-chain data. DNS configuration fixed for endpoint access. Multi-layer fallback system implemented. SDK methods handle authentication internally. Wallet.balance() successfully fetches blockchain data.

## Getting Started

Frontend: Navigate to frontend folder. Run npm install. Run npm run dev. Visit localhost:3000.

Contracts: See contracts README for setup. Deploy to Cronos testnet. Update frontend addresses.

Backend: See backend README for setup. Run validation server. Configure contract addresses. Set Developer Platform API key. Set Cronos Explorer key. Configure DNS to use Google DNS (8.8.8.8, 8.8.4.4) for SDK endpoint access.

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

[Contracts README](contracts/README.md): Smart contract setup and deployment details.

[Frontend README](frontend/README.md): Frontend setup and feature documentation.

[Backend README](backend/README.md): Backend setup and API documentation.

## Built for Hackathon

AgentMarket built for Cronos x402 Paytech Hackathon. Unified chat interface. Intelligent routing. Real-world data integration. x402 micropayments. On-chain agent registry. Full developer portal. Crypto.com SDK integration complete. Ready for users. Production quality code.

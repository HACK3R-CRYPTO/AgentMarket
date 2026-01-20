#!/bin/bash
# Update .env.local with correct contract addresses

cat > .env.local << 'EOF'
NEXT_PUBLIC_CRONOS_RPC_URL=https://evm-t3.cronos.org
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xd3097577Fa07E7CCD6D53C81460C449D96f736cC
NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=0x4352F2319c0476607F5E1cC9FDd568246074dF14
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=338
EOF

echo "✅ Updated frontend/.env.local with correct contract addresses"

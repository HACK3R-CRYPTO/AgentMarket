#!/bin/bash
# Update all contract addresses from deployment file

# Confirmed addresses from broadcast/Deploy.s.sol/338/run-latest.json
AGENT_REGISTRY="0xd3097577Fa07E7CCD6D53C81460C449D96f736cC"
AGENT_ESCROW="0x4352F2319c0476607F5E1cC9FDd568246074dF14"

echo "📋 Updating contract addresses..."
echo "   Agent Registry: $AGENT_REGISTRY"
echo "   Agent Escrow: $AGENT_ESCROW"
echo ""

# Update frontend .env.local
if [ -f "frontend/.env.local" ]; then
  # Update or add AGENT_ESCROW_ADDRESS
  if grep -q "NEXT_PUBLIC_AGENT_ESCROW_ADDRESS" frontend/.env.local; then
    sed -i '' "s|NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=.*|NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=$AGENT_ESCROW|" frontend/.env.local
  else
    echo "NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=$AGENT_ESCROW" >> frontend/.env.local
  fi
  
  # Update or add AGENT_REGISTRY_ADDRESS
  if grep -q "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS" frontend/.env.local; then
    sed -i '' "s|NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=.*|NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY|" frontend/.env.local
  else
    echo "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY" >> frontend/.env.local
  fi
  echo "✅ Updated frontend/.env.local"
else
  # Create frontend/.env.local
  cat > frontend/.env.local << EOF
NEXT_PUBLIC_CRONOS_RPC_URL=https://evm-t3.cronos.org
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY
NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=$AGENT_ESCROW
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=338
EOF
  echo "✅ Created frontend/.env.local"
fi

# Update backend .env
if [ -f "backend/.env" ]; then
  # Update or add AGENT_ESCROW_ADDRESS
  if grep -q "AGENT_ESCROW_ADDRESS" backend/.env; then
    sed -i '' "s|AGENT_ESCROW_ADDRESS=.*|AGENT_ESCROW_ADDRESS=$AGENT_ESCROW|" backend/.env
  else
    echo "AGENT_ESCROW_ADDRESS=$AGENT_ESCROW" >> backend/.env
  fi
  
  # Update or add AGENT_REGISTRY_ADDRESS
  if grep -q "AGENT_REGISTRY_ADDRESS" backend/.env; then
    sed -i '' "s|AGENT_REGISTRY_ADDRESS=.*|AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY|" backend/.env
  else
    echo "AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY" >> backend/.env
  fi
  echo "✅ Updated backend/.env"
else
  echo "⚠️  backend/.env not found"
fi

echo ""
echo "✅ All addresses updated!"
echo ""
echo "🔄 Please restart your frontend and backend servers."

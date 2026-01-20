#!/usr/bin/env node
/**
 * Update all contract addresses across the project
 * Confirms addresses from contracts README and updates all .env files
 */

const fs = require('fs');
const path = require('path');

// Confirmed deployed addresses from contracts README
const CONTRACT_ADDRESSES = {
  AGENT_REGISTRY: '0xd3097577Fa07E7CCD6D53C81460C449D96f736cC',
  AGENT_ESCROW: '0x4352F2319c0476607F5E1cC9FDd568246074dF14',
};

console.log('📋 Confirmed Contract Addresses:');
console.log(`   Agent Registry: ${CONTRACT_ADDRESSES.AGENT_REGISTRY}`);
console.log(`   Agent Escrow: ${CONTRACT_ADDRESSES.AGENT_ESCROW}`);
console.log('');

// Update backend .env
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
  let updated = false;
  
  if (backendEnv.includes('AGENT_REGISTRY_ADDRESS=')) {
    backendEnv = backendEnv.replace(
      /AGENT_REGISTRY_ADDRESS=0x[a-fA-F0-9]{40}/,
      `AGENT_REGISTRY_ADDRESS=${CONTRACT_ADDRESSES.AGENT_REGISTRY}`
    );
    updated = true;
  } else {
    backendEnv += `\nAGENT_REGISTRY_ADDRESS=${CONTRACT_ADDRESSES.AGENT_REGISTRY}\n`;
    updated = true;
  }
  
  if (backendEnv.includes('AGENT_ESCROW_ADDRESS=')) {
    backendEnv = backendEnv.replace(
      /AGENT_ESCROW_ADDRESS=0x[a-fA-F0-9]{40}/,
      `AGENT_ESCROW_ADDRESS=${CONTRACT_ADDRESSES.AGENT_ESCROW}`
    );
    updated = true;
  } else {
    backendEnv += `AGENT_ESCROW_ADDRESS=${CONTRACT_ADDRESSES.AGENT_ESCROW}\n`;
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(backendEnvPath, backendEnv);
    console.log('✅ Updated backend/.env');
  }
} else {
  console.log('⚠️  backend/.env not found');
}

// Update frontend .env.local
const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');
let frontendEnv = '';

if (fs.existsSync(frontendEnvPath)) {
  frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
} else {
  // Create new .env.local with all required variables
  frontendEnv = `NEXT_PUBLIC_CRONOS_RPC_URL=https://evm-t3.cronos.org
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${CONTRACT_ADDRESSES.AGENT_REGISTRY}
NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=${CONTRACT_ADDRESSES.AGENT_ESCROW}
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=338
`;
  fs.writeFileSync(frontendEnvPath, frontendEnv);
  console.log('✅ Created frontend/.env.local');
} 

// Update existing frontend .env.local
if (fs.existsSync(frontendEnvPath)) {
  let updated = false;
  
  if (frontendEnv.includes('NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=')) {
    frontendEnv = frontendEnv.replace(
      /NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x[a-fA-F0-9]{40}/,
      `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${CONTRACT_ADDRESSES.AGENT_REGISTRY}`
    );
    updated = true;
  } else {
    frontendEnv += `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${CONTRACT_ADDRESSES.AGENT_REGISTRY}\n`;
    updated = true;
  }
  
  if (frontendEnv.includes('NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=')) {
    frontendEnv = frontendEnv.replace(
      /NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=0x[a-fA-F0-9]{40}/,
      `NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=${CONTRACT_ADDRESSES.AGENT_ESCROW}`
    );
    updated = true;
  } else {
    frontendEnv += `NEXT_PUBLIC_AGENT_ESCROW_ADDRESS=${CONTRACT_ADDRESSES.AGENT_ESCROW}\n`;
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(frontendEnvPath, frontendEnv);
    console.log('✅ Updated frontend/.env.local');
  }
}

// Update contracts .env (if exists)
const contractsEnvPath = path.join(__dirname, 'contracts', '.env');
if (fs.existsSync(contractsEnvPath)) {
  let contractsEnv = fs.readFileSync(contractsEnvPath, 'utf8');
  let updated = false;
  
  if (contractsEnv.includes('AGENT_REGISTRY_ADDRESS=')) {
    contractsEnv = contractsEnv.replace(
      /AGENT_REGISTRY_ADDRESS=0x[a-fA-F0-9]{40}/,
      `AGENT_REGISTRY_ADDRESS=${CONTRACT_ADDRESSES.AGENT_REGISTRY}`
    );
    updated = true;
  }
  
  if (contractsEnv.includes('AGENT_ESCROW_ADDRESS=')) {
    contractsEnv = contractsEnv.replace(
      /AGENT_ESCROW_ADDRESS=0x[a-fA-F0-9]{40}/,
      `AGENT_ESCROW_ADDRESS=${CONTRACT_ADDRESSES.AGENT_ESCROW}`
    );
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(contractsEnvPath, contractsEnv);
    console.log('✅ Updated contracts/.env');
  }
}

console.log('');
console.log('✅ All contract addresses updated!');
console.log('');
console.log('📝 Summary:');
console.log(`   Agent Registry: ${CONTRACT_ADDRESSES.AGENT_REGISTRY}`);
console.log(`   Agent Escrow: ${CONTRACT_ADDRESSES.AGENT_ESCROW}`);
console.log('');
console.log('🔄 Please restart your frontend and backend servers for changes to take effect.');

#!/bin/bash
# Test Crypto.com AI Agent SDK endpoint connectivity

echo "🔍 Testing Crypto.com AI Agent SDK Endpoint..."
echo ""

echo "1. Testing DNS resolution..."
nslookup ai-agent-api.crypto.com 2>&1 | head -10

echo ""
echo "2. Testing HTTP connectivity..."
curl -I --connect-timeout 5 https://ai-agent-api.crypto.com 2>&1 | head -5

echo ""
echo "3. Testing ping (3 attempts)..."
ping -c 3 ai-agent-api.crypto.com 2>&1 | head -5

echo ""
echo "✅ Test complete!"
echo ""
echo "If all tests fail, the endpoint might:"
echo "  - Require VPN/geographic access"
echo "  - Need Developer Platform account whitelisting"
echo "  - Be in private beta (not publicly accessible)"

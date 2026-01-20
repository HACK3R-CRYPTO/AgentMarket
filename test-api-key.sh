#!/bin/bash

# Test the Developer Platform API key with curl
# API Key from project created at https://developer.crypto.com

API_KEY="sk-proj-4c366b09d0f40ef1ed7d6fb18d633bda:681d8ebdeec60048047cede7da9a22bc4a5d3837ed5e43748ad07a4af8f616da4164e01df9a6211b8d07e55e2b5b8d62"
ADDRESS="0xd2df53D9791e98Db221842Dd085F4144014BBE2a"

echo "🔑 Testing Developer Platform API Key"
echo "   API Key: ${API_KEY:0:30}..."
echo "   Address: ${ADDRESS}"
echo ""

echo "📡 Test 1: Native Token Balance (with Bearer)"
echo "   Endpoint: /api/v1/cdc-developer-platform/token/native-token-balance"
curl -X GET \
  "https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/token/native-token-balance?walletAddress=${ADDRESS}" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${API_KEY}" \
  --silent \
  --show-error \
  --write-out "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "---"
echo ""

echo "📡 Test 2: Native Token Balance (without Bearer)"
echo "   Endpoint: /api/v1/cdc-developer-platform/token/native-token-balance"
curl -X GET \
  "https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/token/native-token-balance?walletAddress=${ADDRESS}" \
  --header "Content-Type: application/json" \
  --header "Authorization: ${API_KEY}" \
  --silent \
  --show-error \
  --write-out "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "---"
echo ""

echo "📡 Test 3: Wallet Balance (SDK endpoint)"
echo "   Endpoint: /api/v1/cdc-developer-platform/wallet/balance"
curl -X GET \
  "https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/wallet/balance?walletAddress=${ADDRESS}" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${API_KEY}" \
  --silent \
  --show-error \
  --write-out "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Tests complete!"

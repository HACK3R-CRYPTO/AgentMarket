#!/bin/bash

# Test Developer Platform API endpoint directly
# This tests the endpoint from the documentation

# Get API key from .env file
API_KEY=$(grep CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY backend/.env | cut -d '=' -f2)

if [ -z "$API_KEY" ]; then
  # Fallback to explorer key if developer platform key not set
  API_KEY=$(grep CRONOS_TESTNET_EXPLORER_KEY backend/.env | cut -d '=' -f2)
fi

if [ -z "$API_KEY" ]; then
  echo "❌ Error: No API key found in backend/.env"
  echo "   Set CRYPTO_COM_DEVELOPER_PLATFORM_API_KEY or CRONOS_TESTNET_EXPLORER_KEY"
  exit 1
fi

echo "🔑 Using API key: ${API_KEY:0:20}..."
echo ""
echo "📡 Testing Developer Platform API endpoint..."
echo "   Endpoint: https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/token/native-token-balance"
echo "   Address: 0xd2df53D9791e98Db221842Dd085F4144014BBE2a"
echo ""

# Test the endpoint
# Note: Authorization header should use "Bearer" format
curl -X GET \
  "https://developer-platform-api.crypto.com/api/v1/cdc-developer-platform/token/native-token-balance?walletAddress=0xd2df53D9791e98Db221842Dd085F4144014BBE2a" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${API_KEY}" \
  --silent \
  --show-error \
  --write-out "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Test complete!"

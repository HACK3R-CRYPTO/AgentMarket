#!/bin/bash

# Fix DNS settings to access Crypto.com endpoints
# This script sets Google DNS for Wi-Fi

echo "🔧 Setting DNS servers to Google DNS (8.8.8.8, 8.8.4.4)..."
echo "   You'll be asked for your password (for sudo)"
echo ""

# Set DNS for Wi-Fi
sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4

if [ $? -eq 0 ]; then
    echo "✅ DNS servers set successfully!"
    echo ""
    
    # Flush DNS cache
    echo "🔄 Flushing DNS cache..."
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder
    
    echo "✅ DNS cache flushed!"
    echo ""
    echo "🧪 Testing DNS resolution..."
    nslookup ai-agent-api.crypto.com
    
    echo ""
    echo "✅ Done! DNS settings updated."
    echo "   Restart your backend server and try the blockchain query again."
else
    echo "❌ Failed to set DNS servers. Please run manually:"
    echo "   sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4"
fi

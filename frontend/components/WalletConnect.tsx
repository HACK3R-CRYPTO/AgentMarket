'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { LogOut } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 rounded-lg bg-neutral-800/50 backdrop-blur-sm border border-neutral-700">
          <span className="text-sm font-medium text-neutral-50 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 hover:border-neutral-600 transition-colors flex items-center gap-2 text-sm text-neutral-300 hover:text-neutral-50"
          title="Disconnect wallet"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return <w3m-button />;
}

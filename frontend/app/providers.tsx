"use client";

import { wagmiAdapter, projectId } from './config'
import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode, useEffect } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

const queryClient = new QueryClient()

const metadata = {
  name: "AgentMarket",
  description: "AI Agent Marketplace on Cronos",
  url: typeof window !== 'undefined' ? window.location.origin : "https://agentmarket.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"]
}

// Initialize AppKit modal (only once on client side)
let appKitInitialized = false

function initializeAppKit() {
  if (typeof window === 'undefined' || appKitInitialized || !projectId) {
    return
  }
  
  try {
    createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: wagmiAdapter.networks,
      metadata: metadata,
      features: {
        analytics: true,
      },
      themeMode: 'dark'
    })
    appKitInitialized = true
  } catch (error) {
    console.error('Failed to initialize AppKit:', error)
  }
}

export function Providers({ children, cookies }: { children: ReactNode; cookies?: string | null }) {
  // Initialize AppKit on mount
  useEffect(() => {
    initializeAppKit()
  }, [])
  
  // Safely parse cookies - handle null or empty strings
  let initialState;
  try {
    initialState = cookies ? cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies) : undefined;
  } catch (error) {
    console.warn('Failed to parse cookies for wagmi initialState:', error);
    initialState = undefined;
  }
  
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

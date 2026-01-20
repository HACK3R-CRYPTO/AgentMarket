"use client";

import { useState, useEffect, useMemo } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { useAgents } from "@/hooks/useAgents";
import { SplineSceneBasic } from "@/components/ui/spline-demo";
import TetrisLoading from "@/components/ui/tetris-loader";
import { Bot, Search, Filter } from "lucide-react";

interface Agent {
  id: number;
  name: string;
  description: string;
  price: number;
  reputation: number;
}

export default function Home() {
  const { agents: contractAgents, loading: contractLoading } = useAgents();
  const [apiAgents, setApiAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      console.log("Fetching agents from API:", apiUrl);
      const response = await fetch(`${apiUrl}/api/agents`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      console.log("API response:", data);
      setApiAgents(data.agents || []);
    } catch (error) {
      console.error("Error fetching agents from API:", error);
      // Set empty array on error so we don't show loading forever
      setApiAgents([]);
    } finally {
      setLoading(false);
    }
  };

  // Use contract agents if available, otherwise fall back to API
  const allAgents = contractAgents.length > 0 
    ? contractAgents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price: Number(a.pricePerExecution) / 1_000_000, // Convert from 6 decimals
        reputation: Number(a.reputation),
      }))
    : apiAgents;

  // Filter agents based on search and category
  const agents = useMemo(() => {
    return allAgents.filter((agent) => {
      // Search filter
      const matchesSearch = !searchTerm || 
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter (based on description keywords)
      const desc = agent.description.toLowerCase();
      const matchesCategory = categoryFilter === "all" || 
        (categoryFilter === "market" && /market|price|trading|crypto|bitcoin|ethereum/i.test(desc)) ||
        (categoryFilter === "blockchain" && /blockchain|balance|transaction|on-chain|wallet/i.test(desc)) ||
        (categoryFilter === "contract" && /contract|solidity|security|audit|vulnerability/i.test(desc)) ||
        (categoryFilter === "content" && /content|generate|write|marketing|tweet|blog/i.test(desc));
      
      return matchesSearch && matchesCategory;
    });
  }, [allAgents, searchTerm, categoryFilter]);

  // Debug logging
  useEffect(() => {
    console.log("Contract agents:", contractAgents);
    console.log("API agents:", apiAgents);
    console.log("Final agents:", agents);
  }, [contractAgents, apiAgents, agents]);

  if (loading || contractLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <TetrisLoading size="md" speed="normal" loadingText="Loading agents..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-50">
      {/* Header at the top */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-neutral-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                AgentMarket
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                AI Agent Marketplace on Cronos
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="text-sm text-neutral-400 hover:text-neutral-50 transition-colors hidden md:block"
              >
                Dashboard
              </a>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Hero Section with 3D Spline */}
        <div className="mb-8 md:mb-12">
          <SplineSceneBasic />
        </div>

        {/* Chat CTA */}
        <div className="mb-8 p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Unified Chat Interface</h2>
              <p className="text-neutral-300 mb-1">
                Ask anything - I automatically use the right tools
              </p>
              <p className="text-sm text-neutral-400">
                Market data • Blockchain queries • Contract analysis • Content generation
              </p>
            </div>
            <a
              href="/chat"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/20 flex items-center gap-2"
            >
              <Bot className="h-5 w-5" />
              Start Chatting
            </a>
          </div>
        </div>

        {/* Section Header */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-2">
            Individual Agents
          </h2>
          <p className="text-sm md:text-base text-neutral-400 mb-4">
            Or select a specialized agent for specific tasks
          </p>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search agents by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent text-neutral-50 placeholder-neutral-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-neutral-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent text-neutral-50"
              >
                <option value="all">All Categories</option>
                <option value="market">Market Data</option>
                <option value="blockchain">Blockchain</option>
                <option value="contract">Smart Contracts</option>
                <option value="content">Content Generation</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          {searchTerm || categoryFilter !== "all" ? (
            <p className="mt-3 text-sm text-neutral-400">
              Showing {agents.length} of {allAgents.length} agents
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-lg hover:shadow-xl hover:border-neutral-700 transition-all duration-300 p-6 group"
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-neutral-50 mb-2 group-hover:text-neutral-100 transition-colors">
                  {agent.name}
                </h3>
                <p className="text-sm text-neutral-400 line-clamp-2">
                  {agent.description}
                </p>
              </div>
              
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-800">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Price</div>
                  <div className="text-lg font-bold text-neutral-50">
                    ${agent.price}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Reputation</div>
                  <div className="text-lg font-bold text-neutral-50">
                    {agent.reputation}/1000
                  </div>
                </div>
              </div>
              
              <a
                href={`/agents/${agent.id}`}
                className="block w-full text-center bg-neutral-800 hover:bg-neutral-700 text-neutral-50 py-2.5 rounded-lg font-medium transition-all duration-200 border border-neutral-700 hover:border-neutral-600"
              >
                View Agent →
              </a>
            </div>
          ))}
        </div>

        {agents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500">No agents available</p>
          </div>
        )}
      </div>
    </div>
  );
}

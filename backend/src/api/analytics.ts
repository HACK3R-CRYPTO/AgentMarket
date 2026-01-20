import { Router, Request, Response } from "express";
import { getAllAgentsFromContract, getAgentFromContract } from "../lib/contract";
import { ethers } from "ethers";

const router = Router();

/**
 * Get platform-wide analytics
 */
router.get("/platform", async (req: Request, res: Response) => {
  try {
    const agents = await getAllAgentsFromContract();
    
    // Calculate platform stats
    const totalAgents = agents.length;
    const totalExecutions = agents.reduce((sum, agent) => sum + Number(agent.totalExecutions), 0);
    const totalSuccessfulExecutions = agents.reduce((sum, agent) => sum + Number(agent.successfulExecutions), 0);
    const totalRevenue = agents.reduce((sum, agent) => {
      const price = Number(agent.pricePerExecution) / 1_000_000;
      const executions = Number(agent.successfulExecutions);
      return sum + (price * executions);
    }, 0);
    
    const successRate = totalExecutions > 0 
      ? (totalSuccessfulExecutions / totalExecutions) * 100 
      : 0;

    res.json({
      stats: {
        totalAgents,
        totalExecutions,
        totalSuccessfulExecutions,
        totalRevenue: totalRevenue.toFixed(2),
        successRate: successRate.toFixed(1),
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        executions: Number(agent.totalExecutions),
        successfulExecutions: Number(agent.successfulExecutions),
        reputation: Number(agent.reputation),
        price: Number(agent.pricePerExecution) / 1_000_000,
      })),
    });
  } catch (error) {
    console.error("Error fetching platform analytics:", error);
    res.status(500).json({ 
      error: "Failed to fetch platform analytics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get analytics for a specific agent
 */
router.get("/agents/:id", async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);
    const agent = await getAgentFromContract(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const totalExecutions = Number(agent.totalExecutions);
    const successfulExecutions = Number(agent.successfulExecutions);
    const price = Number(agent.pricePerExecution) / 1_000_000;
    const revenue = price * successfulExecutions;
    const successRate = totalExecutions > 0 
      ? (successfulExecutions / totalExecutions) * 100 
      : 0;

    res.json({
      agentId,
      agentName: agent.name,
      stats: {
        totalExecutions,
        successfulExecutions,
        failedExecutions: totalExecutions - successfulExecutions,
        revenue: revenue.toFixed(2),
        successRate: successRate.toFixed(1),
        reputation: Number(agent.reputation),
        price,
      },
    });
  } catch (error) {
    console.error("Error fetching agent analytics:", error);
    res.status(500).json({ 
      error: "Failed to fetch agent analytics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

/**
 * Health check endpoint
 */

import { Router, Request, Response } from "express";
import { getProvider, getAgentRegistry } from "../lib/contract";

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/", async (req: Request, res: Response) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: "healthy",
      database: "healthy",
      blockchain: "unknown",
      contracts: "unknown",
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  try {
    // Check blockchain connection
    try {
      const provider = getProvider();
      const blockNumber = await provider.getBlockNumber();
      health.services.blockchain = "healthy";
      (health as any).blockchain = {
        connected: true,
        latestBlock: blockNumber,
      };
    } catch (error) {
      health.services.blockchain = "unhealthy";
      (health as any).blockchain = {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check contract access
    try {
      const registry = getAgentRegistry();
      if (registry) {
        const nextAgentId = await registry.nextAgentId();
        health.services.contracts = "healthy";
        (health as any).contracts = {
          accessible: true,
          nextAgentId: nextAgentId.toString(),
        };
      } else {
        health.services.contracts = "not_configured";
      }
    } catch (error) {
      health.services.contracts = "unhealthy";
      (health as any).contracts = {
        accessible: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check database (JSON files)
    try {
      const fs = require("fs");
      const path = require("path");
      const dataDir = path.join(__dirname, "../../data");
      
      if (fs.existsSync(dataDir)) {
        health.services.database = "healthy";
      } else {
        health.services.database = "not_initialized";
      }
    } catch (error) {
      health.services.database = "unhealthy";
    }

    // Determine overall status
    const allHealthy = Object.values(health.services).every(
      (status) => status === "healthy" || status === "not_configured" || status === "not_initialized"
    );

    if (!allHealthy) {
      health.status = "degraded";
    }

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    health.status = "unhealthy";
    health.services.api = "unhealthy";
    (health as any).error = error instanceof Error ? error.message : "Unknown error";
    res.status(503).json(health);
  }
});

/**
 * GET /api/health/ready
 * Readiness check (for Kubernetes/Docker)
 */
router.get("/ready", async (req: Request, res: Response) => {
  try {
    // Check critical services
    const provider = getProvider();
    await provider.getBlockNumber();
    
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/live
 * Liveness check (for Kubernetes/Docker)
 */
router.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;

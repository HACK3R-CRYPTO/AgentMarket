import { Router, Request, Response } from "express";
import { db } from "../lib/database";

const router = Router();

/**
 * Get execution logs with optional filters
 * Query params: agentId, userId, startTime, endTime, success, limit
 */
router.get("/executions", async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId ? parseInt(req.query.agentId as string) : undefined;
    const userId = req.query.userId as string | undefined;
    const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;
    const success = req.query.success === "true" ? true : req.query.success === "false" ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    // Calculate time ranges
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    let timeStart: number | undefined = startTime;
    let timeEnd: number | undefined = endTime;

    // Support time range shortcuts
    if (req.query.range === "today") {
      timeStart = now - oneDay;
      timeEnd = now;
    } else if (req.query.range === "7d") {
      timeStart = now - sevenDays;
      timeEnd = now;
    } else if (req.query.range === "30d") {
      timeStart = now - thirtyDays;
      timeEnd = now;
    }

    const executions = db.getExecutions({
      agentId,
      userId,
      startTime: timeStart,
      endTime: timeEnd,
      success,
    });

    res.json({
      executions: executions.slice(0, limit),
      total: executions.length,
    });
  } catch (error) {
    console.error("Error fetching execution logs:", error);
    res.status(500).json({ error: "Failed to fetch execution logs" });
  }
});

/**
 * Get payment logs with optional filters
 * Query params: agentId, userId, status, startTime, endTime, limit
 */
router.get("/payments", async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId ? parseInt(req.query.agentId as string) : undefined;
    const userId = req.query.userId as string | undefined;
    const status = req.query.status as "pending" | "settled" | "verified" | "failed" | "refunded" | undefined;
    const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    // Calculate time ranges
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    let timeStart: number | undefined = startTime;
    let timeEnd: number | undefined = endTime;

    if (req.query.range === "today") {
      timeStart = now - oneDay;
      timeEnd = now;
    } else if (req.query.range === "7d") {
      timeStart = now - sevenDays;
      timeEnd = now;
    } else if (req.query.range === "30d") {
      timeStart = now - thirtyDays;
      timeEnd = now;
    }

    const payments = db.getPayments({
      agentId,
      userId,
      status,
      startTime: timeStart,
      endTime: timeEnd,
    });

    res.json({
      payments: payments.slice(0, limit),
      total: payments.length,
    });
  } catch (error) {
    console.error("Error fetching payment logs:", error);
    res.status(500).json({ error: "Failed to fetch payment logs" });
  }
});

/**
 * Get recent activity (executions and payments combined)
 */
router.get("/activity", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const executions = db.getExecutions({}).slice(0, limit);
    const payments = db.getPayments({}).slice(0, limit);
    
    // Combine and sort by timestamp
    const activities = [
      ...executions.map((e) => ({
        type: "execution" as const,
        id: e.executionId,
        agentId: e.agentId,
        agentName: e.agentName,
        userId: e.userId,
        success: e.success,
        timestamp: e.timestamp,
      })),
      ...payments.map((p) => ({
        type: "payment" as const,
        id: p.paymentHash,
        agentId: p.agentId,
        agentName: p.agentName,
        userId: p.userId,
        status: p.status,
        amount: p.amount,
        timestamp: p.timestamp,
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    res.json({ activities });
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;

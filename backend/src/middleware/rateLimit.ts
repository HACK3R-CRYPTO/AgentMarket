/**
 * Rate limiting middleware
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for production, use Redis)
const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client identifier (IP address or wallet address)
 */
function getClientId(req: Request): string {
  // Try to get wallet address from payment header first
  const paymentHeader = req.headers["x-payment"] || 
                        req.headers["x-payment-signature"] || 
                        req.headers["payment-signature"];
  
  if (paymentHeader && typeof paymentHeader === "string") {
    try {
      // Try to extract address from payment header
      const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed.payload?.from) {
        return `wallet:${parsed.payload.from.toLowerCase()}`;
      }
    } catch (e) {
      // Fall back to IP
    }
  }
  
  // Fall back to IP address
  const ip = req.ip || 
             req.socket.remoteAddress || 
             (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
             "unknown";
  
  return `ip:${ip}`;
}

/**
 * Create rate limit middleware
 */
export function createRateLimit(options: {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientId(req);
    const now = Date.now();
    
    // Get or create entry
    let entry = store[clientId];
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + options.windowMs,
      };
      store[clientId] = entry;
    }
    
    // Increment count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > options.max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      res.status(429).json({
        error: options.message || "Too many requests",
        retryAfter,
        limit: options.max,
        windowMs: options.windowMs,
      });
      
      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", options.max.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", new Date(entry.resetTime).toISOString());
      res.setHeader("Retry-After", retryAfter.toString());
      
      return;
    }
    
    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", options.max.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - entry.count).toString());
    res.setHeader("X-RateLimit-Reset", new Date(entry.resetTime).toISOString());
    
    next();
  };
}

// Pre-configured rate limiters
export const agentExecutionRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many agent execution requests. Please wait before trying again.",
});

export const chatRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: "Too many chat messages. Please wait before trying again.",
});

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many API requests. Please wait before trying again.",
});

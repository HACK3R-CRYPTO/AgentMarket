/**
 * Input validation and sanitization middleware
 */

import { Request, Response, NextFunction } from "express";

/**
 * Sanitize string input - remove dangerous characters and limit length
 */
export function sanitizeString(input: string, maxLength: number = 10000): string {
  if (typeof input !== "string") {
    return "";
  }
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate agent input
 */
export function validateAgentInput(input: string): { valid: boolean; error?: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Input must be a non-empty string" };
  }
  
  if (input.trim().length === 0) {
    return { valid: false, error: "Input cannot be empty" };
  }
  
  if (input.length > 10000) {
    return { valid: false, error: "Input exceeds maximum length of 10,000 characters" };
  }
  
  // Check for potential injection attempts (basic)
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: "Input contains potentially dangerous content" };
    }
  }
  
  return { valid: true };
}

/**
 * Validate agent creation data
 */
export function validateAgentCreation(data: {
  name?: string;
  description?: string;
  price?: string | number;
}): { valid: boolean; error?: string; sanitized?: any } {
  // Validate name
  if (!data.name || typeof data.name !== "string") {
    return { valid: false, error: "Agent name is required" };
  }
  
  const sanitizedName = sanitizeString(data.name, 100);
  if (sanitizedName.length < 3) {
    return { valid: false, error: "Agent name must be at least 3 characters" };
  }
  
  if (sanitizedName.length > 100) {
    return { valid: false, error: "Agent name exceeds maximum length of 100 characters" };
  }
  
  // Validate description
  if (!data.description || typeof data.description !== "string") {
    return { valid: false, error: "Agent description is required" };
  }
  
  const sanitizedDescription = sanitizeString(data.description, 500);
  if (sanitizedDescription.length < 10) {
    return { valid: false, error: "Agent description must be at least 10 characters" };
  }
  
  if (sanitizedDescription.length > 500) {
    return { valid: false, error: "Agent description exceeds maximum length of 500 characters" };
  }
  
  // Validate price
  let price: number;
  if (typeof data.price === "string") {
    price = parseFloat(data.price);
  } else if (typeof data.price === "number") {
    price = data.price;
  } else {
    return { valid: false, error: "Price must be a number" };
  }
  
  if (isNaN(price) || price <= 0) {
    return { valid: false, error: "Price must be a positive number" };
  }
  
  if (price > 1000) {
    return { valid: false, error: "Price cannot exceed $1000 per execution" };
  }
  
  return {
    valid: true,
    sanitized: {
      name: sanitizedName,
      description: sanitizedDescription,
      price: price,
    },
  };
}

/**
 * Middleware to validate agent input
 */
export function validateAgentInputMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { input } = req.body;
  
  const validation = validateAgentInput(input);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error || "Invalid input",
    });
  }
  
  // Sanitize and replace input
  req.body.input = sanitizeString(input, 10000);
  next();
}

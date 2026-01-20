/**
 * Centralized error handling utilities
 */

import { Response } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = "An error occurred",
  defaultStatusCode: number = 500
): { error: string; details?: string; code?: string; statusCode: number } {
  if (error instanceof Error) {
    const appError = error as AppError;
    return {
      error: appError.message || defaultMessage,
      details: appError.details ? String(appError.details) : undefined,
      code: appError.code,
      statusCode: appError.statusCode || defaultStatusCode,
    };
  }

  return {
    error: typeof error === "string" ? error : defaultMessage,
    statusCode: defaultStatusCode,
  };
}

/**
 * Send error response
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  defaultMessage: string = "An error occurred",
  defaultStatusCode: number = 500
) {
  const errorResponse = createErrorResponse(error, defaultMessage, defaultStatusCode);
  res.status(errorResponse.statusCode).json({
    error: errorResponse.error,
    ...(errorResponse.details && { details: errorResponse.details }),
    ...(errorResponse.code && { code: errorResponse.code }),
  });
}

/**
 * Create AppError
 */
export function createAppError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Handle async route errors
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error("Async handler error:", error);
      sendErrorResponse(res, error);
    });
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, lastError.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Retry failed");
}

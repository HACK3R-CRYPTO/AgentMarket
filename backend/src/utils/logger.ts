/**
 * Centralized logging utility
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level from environment or default to INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.level = envLevel
      ? (LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO)
      : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage("DEBUG", message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage("INFO", message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, data));
    }
  }

  error(message: string, error?: any, data?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            ...(data || {}),
          }
        : { error, ...(data || {}) };
      
      console.error(this.formatMessage("ERROR", message, errorData));
    }
  }

  // Structured logging for specific events
  logAgentExecution(agentId: number, input: string, success: boolean, duration?: number) {
    this.info("Agent execution", {
      agentId,
      inputLength: input.length,
      success,
      duration,
    });
  }

  logPayment(paymentHash: string, status: string, amount?: number) {
    this.info("Payment event", {
      paymentHash,
      status,
      amount,
    });
  }

  logApiRequest(method: string, path: string, statusCode: number, duration?: number) {
    this.debug("API request", {
      method,
      path,
      statusCode,
      duration,
    });
  }
}

export const logger = new Logger();

/**
 * Centralized logging utility for consistent log formatting
 * Provides structured logging with service context
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  constructor(private service: string) {}

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    return `[${this.service}] ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message), context || '');
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message), context || '');
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message), context || '');
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      ...context
    } : context;
    
    console.error(this.formatMessage(LogLevel.ERROR, message), errorInfo || '');
  }
}

/**
 * Create a logger instance for a specific service
 * 
 * @param service - Service name for log context
 * @returns Logger instance
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}
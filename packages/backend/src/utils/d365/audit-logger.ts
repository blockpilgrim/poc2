/**
 * Audit Logger for D365 Security Events
 * Provides structured logging for security-sensitive operations
 * Tracks access patterns, cross-initiative attempts, and data filtering
 */

/**
 * Security event types
 */
export enum SecurityEventType {
  // Access control events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  CROSS_INITIATIVE_ATTEMPT = 'CROSS_INITIATIVE_ATTEMPT',
  
  // Data filtering events
  D365_FILTER_APPLIED = 'D365_FILTER_APPLIED',
  ORGANIZATION_FILTER_APPLIED = 'ORGANIZATION_FILTER_APPLIED',
  MISSING_ORGANIZATION_DATA = 'MISSING_ORGANIZATION_DATA',
  INVALID_ORGANIZATION_TYPE = 'INVALID_ORGANIZATION_TYPE',
  
  // Query events
  D365_QUERY_EXECUTED = 'D365_QUERY_EXECUTED',
  D365_QUERY_FAILED = 'D365_QUERY_FAILED',
  EMPTY_RESULT_SECURITY = 'EMPTY_RESULT_SECURITY',
  
  // Configuration events
  INITIATIVE_MAPPING_FAILED = 'INITIATIVE_MAPPING_FAILED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
}

/**
 * Log levels for audit events
 */
export enum AuditLogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Structure for audit log entries
 */
export interface AuditLogEntry {
  timestamp: string;
  eventType: SecurityEventType;
  level: AuditLogLevel;
  userId?: string;
  userEmail?: string;
  initiative?: string;
  organizationId?: string;
  resource?: string;
  action?: string;
  result?: 'success' | 'failure';
  details?: Record<string, any>;
  errorMessage?: string;
  stackTrace?: string;
}

/**
 * Logger configuration
 */
export interface AuditLoggerConfig {
  /** Whether to log to console (default: true) */
  consoleEnabled?: boolean;
  /** Whether to include stack traces in error logs (default: false in production) */
  includeStackTrace?: boolean;
  /** Minimum log level to output (default: INFO) */
  minLevel?: AuditLogLevel;
  /** Custom log handler for external logging services */
  customHandler?: (entry: AuditLogEntry) => void | Promise<void>;
  /** Fields to redact from log output */
  redactFields?: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<AuditLoggerConfig> = {
  consoleEnabled: true,
  includeStackTrace: process.env.NODE_ENV !== 'production',
  minLevel: AuditLogLevel.INFO,
  customHandler: () => {},
  redactFields: ['password', 'token', 'secret', 'authorization'],
};

/**
 * Audit Logger Class
 * Handles structured security event logging
 */
export class AuditLogger {
  private config: Required<AuditLoggerConfig>;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    data: Partial<Omit<AuditLogEntry, 'timestamp' | 'eventType'>>
  ): Promise<void> {
    const level = this.determineLogLevel(eventType, data);
    
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      level,
      ...data,
    };

    // Add stack trace for errors if configured
    if (level === AuditLogLevel.ERROR && this.config.includeStackTrace && !entry.stackTrace) {
      entry.stackTrace = new Error().stack;
    }

    // Redact sensitive fields
    this.redactSensitiveData(entry);

    // Check if we should log based on level
    if (!this.shouldLog(level)) {
      return;
    }

    // Log to console if enabled
    if (this.config.consoleEnabled) {
      this.logToConsole(entry);
    }

    // Call custom handler
    try {
      await this.config.customHandler(entry);
    } catch (error) {
      console.error('[AuditLogger] Custom handler error:', error);
    }
  }

  /**
   * Convenience methods for common security events
   */
  
  async logAccessGranted(userId: string, resource: string, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
      userId,
      resource,
      result: 'success',
      details,
    });
  }

  async logAccessDenied(userId: string, resource: string, reason: string, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.ACCESS_DENIED, {
      userId,
      resource,
      result: 'failure',
      errorMessage: reason,
      details,
    });
  }

  async logCrossInitiativeAttempt(
    userId: string,
    userInitiative: string,
    targetResource: string,
    targetInitiative: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.CROSS_INITIATIVE_ATTEMPT, {
      userId,
      initiative: userInitiative,
      resource: targetResource,
      result: 'failure',
      details: {
        userInitiative,
        targetInitiative,
        blocked: true,
      },
    });
  }

  async logD365FilterApplied(
    userId: string,
    initiative: string,
    filters: Record<string, any>,
    endpoint: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.D365_FILTER_APPLIED, {
      userId,
      initiative,
      action: endpoint,
      details: {
        filters,
        endpoint,
      },
    });
  }

  async logD365QueryExecuted(
    userId: string,
    entity: string,
    filters: string,
    resultCount?: number
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.D365_QUERY_EXECUTED, {
      userId,
      resource: entity,
      result: 'success',
      details: {
        entity,
        filters,
        resultCount,
      },
    });
  }

  async logD365QueryFailed(
    userId: string,
    entity: string,
    error: Error,
    filters?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.D365_QUERY_FAILED, {
      userId,
      resource: entity,
      result: 'failure',
      errorMessage: error.message,
      stackTrace: this.config.includeStackTrace ? error.stack : undefined,
      details: {
        entity,
        filters,
      },
    });
  }

  /**
   * Determine appropriate log level based on event type
   */
  private determineLogLevel(eventType: SecurityEventType, data: Partial<AuditLogEntry>): AuditLogLevel {
    // Critical events
    if (eventType === SecurityEventType.CROSS_INITIATIVE_ATTEMPT) {
      return AuditLogLevel.CRITICAL;
    }

    // Error events
    if (
      eventType === SecurityEventType.ACCESS_DENIED ||
      eventType === SecurityEventType.D365_QUERY_FAILED ||
      eventType === SecurityEventType.INITIATIVE_MAPPING_FAILED ||
      eventType === SecurityEventType.INVALID_CONFIGURATION ||
      data.result === 'failure'
    ) {
      return AuditLogLevel.ERROR;
    }

    // Warning events
    if (
      eventType === SecurityEventType.MISSING_ORGANIZATION_DATA ||
      eventType === SecurityEventType.INVALID_ORGANIZATION_TYPE ||
      eventType === SecurityEventType.EMPTY_RESULT_SECURITY
    ) {
      return AuditLogLevel.WARNING;
    }

    // Default to info
    return AuditLogLevel.INFO;
  }

  /**
   * Check if we should log based on configured minimum level
   */
  private shouldLog(level: AuditLogLevel): boolean {
    const levels = [AuditLogLevel.INFO, AuditLogLevel.WARNING, AuditLogLevel.ERROR, AuditLogLevel.CRITICAL];
    const minIndex = levels.indexOf(this.config.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  /**
   * Redact sensitive data from log entries
   */
  private redactSensitiveData(entry: AuditLogEntry): void {
    const redact = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      const result = Array.isArray(obj) ? [...obj] : { ...obj };

      for (const key in result) {
        if (this.config.redactFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof result[key] === 'object') {
          result[key] = redact(result[key]);
        }
      }

      return result;
    };

    if (entry.details) {
      entry.details = redact(entry.details);
    }
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: AuditLogEntry): void {
    const prefix = `[AUDIT:${entry.level}] ${entry.eventType}`;
    const message = this.formatLogMessage(entry);

    switch (entry.level) {
      case AuditLogLevel.ERROR:
      case AuditLogLevel.CRITICAL:
        console.error(prefix, message);
        break;
      case AuditLogLevel.WARNING:
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * Format log message for console output
   */
  private formatLogMessage(entry: AuditLogEntry): string {
    const parts: string[] = [];

    if (entry.userId) parts.push(`User: ${entry.userId}`);
    if (entry.userEmail) parts.push(`Email: ${entry.userEmail}`);
    if (entry.initiative) parts.push(`Initiative: ${entry.initiative}`);
    if (entry.resource) parts.push(`Resource: ${entry.resource}`);
    if (entry.action) parts.push(`Action: ${entry.action}`);
    if (entry.result) parts.push(`Result: ${entry.result}`);
    if (entry.errorMessage) parts.push(`Error: ${entry.errorMessage}`);

    if (entry.details && Object.keys(entry.details).length > 0) {
      parts.push(`Details: ${JSON.stringify(entry.details, null, 2)}`);
    }

    if (entry.stackTrace) {
      parts.push(`\nStack: ${entry.stackTrace}`);
    }

    return parts.join(' | ');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AuditLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create a singleton instance for the application
 */
export const auditLogger = new AuditLogger();

/**
 * Convenience function for logging security events
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  data: Partial<Omit<AuditLogEntry, 'timestamp' | 'eventType'>>
): Promise<void> {
  return auditLogger.logSecurityEvent(eventType, data);
}
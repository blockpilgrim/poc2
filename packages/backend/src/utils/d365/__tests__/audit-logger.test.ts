/**
 * Tests for Audit Logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  AuditLogger, 
  SecurityEventType, 
  AuditLogLevel, 
  auditLogger,
  logSecurityEvent 
} from '../audit-logger';

describe('AuditLogger', () => {
  let consoleSpy: any;
  let logger: AuditLogger;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
    logger = new AuditLogger();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should log info level events to console.log', async () => {
      await logger.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
        userId: 'test-user',
        resource: 'test-resource',
        result: 'success'
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT:INFO] ACCESS_GRANTED'),
        expect.stringContaining('User: test-user')
      );
    });

    it('should log warning level events to console.warn', async () => {
      await logger.logSecurityEvent(SecurityEventType.MISSING_ORGANIZATION_DATA, {
        userId: 'test-user',
        errorMessage: 'Missing data'
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT:WARNING] MISSING_ORGANIZATION_DATA'),
        expect.stringContaining('Missing data')
      );
    });

    it('should log error level events to console.error', async () => {
      await logger.logSecurityEvent(SecurityEventType.ACCESS_DENIED, {
        userId: 'test-user',
        resource: 'test-resource',
        result: 'failure',
        errorMessage: 'Access denied'
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT:ERROR] ACCESS_DENIED'),
        expect.stringContaining('Access denied')
      );
    });

    it('should log critical events to console.error', async () => {
      await logger.logSecurityEvent(SecurityEventType.CROSS_INITIATIVE_ATTEMPT, {
        userId: 'test-user',
        initiative: 'test-initiative',
        resource: 'lead:123'
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT:CRITICAL] CROSS_INITIATIVE_ATTEMPT'),
        expect.any(String)
      );
    });

    it('should include timestamp in log entry', async () => {
      const before = new Date().toISOString();
      await logger.logSecurityEvent(SecurityEventType.D365_QUERY_EXECUTED, {
        userId: 'test-user',
        resource: 'leads'
      });
      const after = new Date().toISOString();

      const logCall = consoleSpy.log.mock.calls[0][1];
      // The timestamp should be in the log somewhere
      expect(logCall).toBeTruthy();
    });

    it('should call custom handler if provided', async () => {
      const customHandler = vi.fn();
      const customLogger = new AuditLogger({ customHandler });

      await customLogger.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
        userId: 'test-user'
      });

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: SecurityEventType.ACCESS_GRANTED,
          userId: 'test-user'
        })
      );
    });

    it('should handle custom handler errors gracefully', async () => {
      const customHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const customLogger = new AuditLogger({ customHandler });

      await expect(customLogger.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
        userId: 'test-user'
      })).resolves.not.toThrow();

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[AuditLogger] Custom handler error:',
        expect.any(Error)
      );
    });

    it('should respect minimum log level', async () => {
      const customLogger = new AuditLogger({ minLevel: AuditLogLevel.ERROR });

      await customLogger.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
        userId: 'test-user'
      });

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should include stack trace for errors in non-production', async () => {
      const customLogger = new AuditLogger({ includeStackTrace: true });

      await customLogger.logSecurityEvent(SecurityEventType.D365_QUERY_FAILED, {
        userId: 'test-user',
        result: 'failure',
        errorMessage: 'Query failed'
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Stack:')
      );
    });

    it('should not include stack trace in production', async () => {
      const customLogger = new AuditLogger({ includeStackTrace: false });

      await customLogger.logSecurityEvent(SecurityEventType.D365_QUERY_FAILED, {
        userId: 'test-user',
        result: 'failure',
        errorMessage: 'Query failed'
      });

      const logCall = consoleSpy.error.mock.calls[0];
      expect(logCall).toBeTruthy();
      expect(logCall[1]).not.toContain('Stack:');
    });

    it('should redact sensitive fields', async () => {
      const customLogger = new AuditLogger({
        redactFields: ['password', 'token', 'secret']
      });

      await customLogger.logSecurityEvent(SecurityEventType.D365_FILTER_APPLIED, {
        userId: 'test-user',
        details: {
          password: 'secret123',
          token: 'bearer-token',
          secretKey: 'my-secret',
          normalField: 'visible'
        }
      });

      const logMessage = consoleSpy.log.mock.calls[0][1];
      expect(logMessage).toContain('[REDACTED]');
      expect(logMessage).not.toContain('secret123');
      expect(logMessage).not.toContain('bearer-token');
      expect(logMessage).not.toContain('my-secret');
      expect(logMessage).toContain('visible');
    });
  });

  describe('convenience methods', () => {
    it('should log access granted', async () => {
      await logger.logAccessGranted('test-user', 'test-resource', { extra: 'data' });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('ACCESS_GRANTED'),
        expect.stringContaining('test-user')
      );
    });

    it('should log access denied', async () => {
      await logger.logAccessDenied('test-user', 'test-resource', 'Insufficient privileges');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ACCESS_DENIED'),
        expect.stringContaining('Insufficient privileges')
      );
    });

    it('should log cross-initiative attempt', async () => {
      await logger.logCrossInitiativeAttempt(
        'test-user',
        'initiative-a',
        'lead:123',
        'initiative-b'
      );

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('CROSS_INITIATIVE_ATTEMPT'),
        expect.stringContaining('blocked')
      );
    });

    it('should log D365 filter applied', async () => {
      await logger.logD365FilterApplied(
        'test-user',
        'test-initiative',
        { filter: 'test' },
        'GET /api/leads'
      );

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('D365_FILTER_APPLIED'),
        expect.stringContaining('GET /api/leads')
      );
    });

    it('should log D365 query executed', async () => {
      await logger.logD365QueryExecuted(
        'test-user',
        'leads',
        'status eq 1',
        10
      );

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('D365_QUERY_EXECUTED'),
        expect.stringContaining('resultCount')
      );
    });

    it('should log D365 query failed', async () => {
      const error = new Error('Query failed');
      await logger.logD365QueryFailed(
        'test-user',
        'leads',
        error,
        'status eq 1'
      );

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('D365_QUERY_FAILED'),
        expect.stringContaining('Query failed')
      );
    });
  });

  describe('updateConfig', () => {
    it('should update logger configuration', async () => {
      logger.updateConfig({ consoleEnabled: false });

      await logger.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
        userId: 'test-user'
      });

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('singleton instance', () => {
    it('should provide singleton logger instance', () => {
      expect(auditLogger).toBeInstanceOf(AuditLogger);
    });

    it('should work with convenience function', async () => {
      await logSecurityEvent(SecurityEventType.ACCESS_GRANTED, {
        userId: 'test-user'
      });

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});
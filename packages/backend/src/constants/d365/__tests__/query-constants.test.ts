/**
 * Tests for D365 Query Constants
 */

import { describe, it, expect } from 'vitest';
import {
  D365_QUERY_DEFAULTS,
  D365_STATE_CODES,
  LEAD_STATUS_VALUES,
  LEAD_STATUS_MAP,
  ENGAGEMENT_INTEREST_VALUES,
  ENGAGEMENT_INTEREST_MAP,
  ORGANIZATION_LEAD_TYPE,
  LEAD_DEFAULTS,
  D365_API_CONFIG,
  D365_HEADERS,
  QUERY_ERROR_MESSAGES,
  SECURITY_PATTERNS,
  isValidOptionSetValue,
  hasOrganizationType,
  isValidOrganizationLeadType,
  isValidGuid
} from '../query-constants';

describe('D365 Query Constants', () => {
  describe('Query Defaults', () => {
    it('should have reasonable defaults', () => {
      expect(D365_QUERY_DEFAULTS.PAGE_SIZE).toBe(25);
      expect(D365_QUERY_DEFAULTS.MAX_PAGE_SIZE).toBe(100);
      expect(D365_QUERY_DEFAULTS.SORT_FIELD).toBe('modifiedon');
      expect(D365_QUERY_DEFAULTS.SORT_ORDER).toBe('desc');
      expect(D365_QUERY_DEFAULTS.QUERY_TIMEOUT).toBe(30000);
      expect(D365_QUERY_DEFAULTS.MAX_EXPAND_DEPTH).toBe(2);
    });
  });

  describe('State Codes', () => {
    it('should have standard state codes', () => {
      expect(D365_STATE_CODES.ACTIVE).toBe(0);
      expect(D365_STATE_CODES.INACTIVE).toBe(1);
    });
  });

  describe('Lead Status Values', () => {
    it('should have all lead status values', () => {
      expect(LEAD_STATUS_VALUES.ASSIGNED).toBe(948010000);
      expect(LEAD_STATUS_VALUES.IN_PROGRESS).toBe(948010001);
      expect(LEAD_STATUS_VALUES.CERTIFIED).toBe(948010002);
      expect(LEAD_STATUS_VALUES.ON_HOLD).toBe(948010003);
      expect(LEAD_STATUS_VALUES.CLOSED).toBe(948010004);
    });

    it('should map status values to strings', () => {
      expect(LEAD_STATUS_MAP[948010000]).toBe('assigned');
      expect(LEAD_STATUS_MAP[948010001]).toBe('in-progress');
      expect(LEAD_STATUS_MAP[948010002]).toBe('certified');
      expect(LEAD_STATUS_MAP[948010003]).toBe('on-hold');
      expect(LEAD_STATUS_MAP[948010004]).toBe('closed');
    });
  });

  describe('Engagement Interest Values', () => {
    it('should have engagement interest values', () => {
      expect(ENGAGEMENT_INTEREST_VALUES.FOSTER).toBe(948010000);
      expect(ENGAGEMENT_INTEREST_VALUES.VOLUNTEER).toBe(948010001);
    });

    it('should map engagement values to types', () => {
      expect(ENGAGEMENT_INTEREST_MAP[948010000]).toBe('foster');
      expect(ENGAGEMENT_INTEREST_MAP[948010001]).toBe('volunteer');
    });
  });

  describe('Organization Lead Type', () => {
    it('should have organization type constants', () => {
      expect(ORGANIZATION_LEAD_TYPE.FOSTER).toBe('948010000');
      expect(ORGANIZATION_LEAD_TYPE.VOLUNTEER).toBe('948010001');
    });
  });

  describe('Lead Defaults', () => {
    it('should have default values', () => {
      expect(LEAD_DEFAULTS.STATUS).toBe('other');
      expect(LEAD_DEFAULTS.TYPE).toBe('other');
    });
  });

  describe('D365 API Configuration', () => {
    it('should have API configuration', () => {
      expect(D365_API_CONFIG.VERSION).toBe('v9.2');
      expect(D365_API_CONFIG.ODATA_MAX_VERSION).toBe('4.0');
      expect(D365_API_CONFIG.ODATA_VERSION).toBe('4.0');
      expect(D365_API_CONFIG.ACCEPT).toBe('application/json');
      expect(D365_API_CONFIG.PREFER_ANNOTATIONS).toBe('odata.include-annotations="*"');
      expect(D365_API_CONFIG.PREFER_REPRESENTATION).toBe('return=representation');
    });

    it('should have D365 headers', () => {
      expect(D365_HEADERS['OData-MaxVersion']).toBe('4.0');
      expect(D365_HEADERS['OData-Version']).toBe('4.0');
      expect(D365_HEADERS['Accept']).toBe('application/json');
      expect(D365_HEADERS['Content-Type']).toBe('application/json');
    });
  });

  describe('Error Messages', () => {
    it('should have query error messages', () => {
      expect(QUERY_ERROR_MESSAGES.MISSING_INITIATIVE).toContain('Initiative filter is required');
      expect(QUERY_ERROR_MESSAGES.INVALID_PAGE_SIZE).toContain('Page size must be between');
      expect(QUERY_ERROR_MESSAGES.INVALID_SORT_FIELD).toContain('Invalid sort field');
      expect(QUERY_ERROR_MESSAGES.MISSING_ORGANIZATION).toContain('Organization filter is required');
      expect(QUERY_ERROR_MESSAGES.INVALID_ORGANIZATION_TYPE).toContain('Invalid organization type');
    });
  });

  describe('Security Patterns', () => {
    it('should have validation patterns', () => {
      expect(SECURITY_PATTERNS.ORGANIZATION_TYPE_PATTERN).toBeInstanceOf(RegExp);
      expect(SECURITY_PATTERNS.GUID_PATTERN).toBeInstanceOf(RegExp);
    });
  });

  describe('Helper Functions', () => {
    describe('isValidOptionSetValue', () => {
      it('should validate option set values', () => {
        const validValues = {
          OPTION1: 100,
          OPTION2: 200,
          OPTION3: 300
        };

        expect(isValidOptionSetValue(100, validValues)).toBe(true);
        expect(isValidOptionSetValue(200, validValues)).toBe(true);
        expect(isValidOptionSetValue(400, validValues)).toBe(false);
      });
    });

    describe('hasOrganizationType', () => {
      it('should check for organization type', () => {
        expect(hasOrganizationType('948010000', '948010000')).toBe(true);
        expect(hasOrganizationType('948010000,948010001', '948010001')).toBe(true);
        expect(hasOrganizationType('948010000', '948010001')).toBe(false);
      });

      it('should handle undefined organization type', () => {
        expect(hasOrganizationType(undefined, '948010000')).toBe(false);
        expect(hasOrganizationType('', '948010000')).toBe(false);
      });
    });

    describe('isValidOrganizationLeadType', () => {
      it('should validate organization lead type format', () => {
        expect(isValidOrganizationLeadType('948010000')).toBe(true);
        expect(isValidOrganizationLeadType('948010000,948010001')).toBe(true);
        expect(isValidOrganizationLeadType('948010000,948010001,948010002')).toBe(true);
      });

      it('should reject invalid formats', () => {
        expect(isValidOrganizationLeadType('invalid')).toBe(false);
        expect(isValidOrganizationLeadType('948010000,')).toBe(false);
        expect(isValidOrganizationLeadType(',948010000')).toBe(false);
        expect(isValidOrganizationLeadType('948010000, 948010001')).toBe(false); // No spaces
        expect(isValidOrganizationLeadType('abc,123')).toBe(false);
      });
    });

    describe('isValidGuid', () => {
      it('should validate GUID format', () => {
        expect(isValidGuid('12345678-1234-1234-1234-123456789012')).toBe(true);
        expect(isValidGuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
        expect(isValidGuid('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true); // Case insensitive
      });

      it('should reject invalid GUIDs', () => {
        expect(isValidGuid('not-a-guid')).toBe(false);
        expect(isValidGuid('12345678-1234-1234-1234')).toBe(false); // Too short
        expect(isValidGuid('12345678-1234-1234-1234-123456789012-extra')).toBe(false); // Too long
        expect(isValidGuid('{12345678-1234-1234-1234-123456789012}')).toBe(false); // With braces
        expect(isValidGuid('')).toBe(false);
      });
    });
  });
});
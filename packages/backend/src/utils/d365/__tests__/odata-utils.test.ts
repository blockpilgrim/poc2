/**
 * Tests for OData Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  escapeODataString,
  quoteODataString,
  formatODataGuid,
  formatODataDate,
  buildFilterExpression,
  combineFilters,
  buildContainsExpression,
  buildInExpression,
  buildDateRangeFilter,
  buildQueryString,
  parseNextLink,
  buildAnyExpression,
  buildOrderBy,
  validateFieldName,
  buildComplexFilter,
  ODATA_OPERATORS
} from '../odata-utils';

describe('OData Utilities', () => {
  describe('escapeODataString', () => {
    it('should escape single quotes', () => {
      expect(escapeODataString("O'Brien")).toBe("O''Brien");
      expect(escapeODataString("It's a test")).toBe("It''s a test");
      expect(escapeODataString("Multiple '' quotes")).toBe("Multiple '''' quotes");
    });

    it('should handle strings without quotes', () => {
      expect(escapeODataString('No quotes here')).toBe('No quotes here');
    });

    it('should handle empty strings', () => {
      expect(escapeODataString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeODataString(null as any)).toBe('');
      expect(escapeODataString(undefined as any)).toBe('');
      expect(escapeODataString(123 as any)).toBe('');
    });
  });

  describe('quoteODataString', () => {
    it('should quote and escape strings', () => {
      expect(quoteODataString('test')).toBe("'test'");
      expect(quoteODataString("O'Brien")).toBe("'O''Brien'");
    });
  });

  describe('formatODataGuid', () => {
    it('should remove braces from GUIDs', () => {
      expect(formatODataGuid('{12345678-1234-1234-1234-123456789012}'))
        .toBe('12345678-1234-1234-1234-123456789012');
    });

    it('should handle GUIDs without braces', () => {
      expect(formatODataGuid('12345678-1234-1234-1234-123456789012'))
        .toBe('12345678-1234-1234-1234-123456789012');
    });

    it('should handle empty input', () => {
      expect(formatODataGuid('')).toBe('');
      expect(formatODataGuid(null as any)).toBe('');
    });
  });

  describe('formatODataDate', () => {
    it('should format Date objects', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatODataDate(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should format date strings', () => {
      expect(formatODataDate('2024-01-15')).toMatch(/2024-01-15T\d{2}:\d{2}:\d{2}.\d{3}Z/);
    });
  });

  describe('buildFilterExpression', () => {
    it('should build string expressions', () => {
      expect(buildFilterExpression('name', 'EQUALS', 'John'))
        .toBe("name eq 'John'");
    });

    it('should build number expressions', () => {
      expect(buildFilterExpression('age', 'GREATER_THAN', 18))
        .toBe('age gt 18');
    });

    it('should build boolean expressions', () => {
      expect(buildFilterExpression('isActive', 'EQUALS', true))
        .toBe('isActive eq true');
    });

    it('should build date expressions', () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      expect(buildFilterExpression('createdOn', 'GREATER_THAN_OR_EQUAL', date))
        .toBe('createdOn ge 2024-01-15T00:00:00.000Z');
    });

    it('should escape string values', () => {
      expect(buildFilterExpression('name', 'EQUALS', "O'Brien"))
        .toBe("name eq 'O''Brien'");
    });
  });

  describe('combineFilters', () => {
    it('should combine filters with AND', () => {
      const filters = ['status eq 1', 'name eq \'Test\''];
      expect(combineFilters(filters, 'and'))
        .toBe('(status eq 1) and (name eq \'Test\')');
    });

    it('should combine filters with OR', () => {
      const filters = ['status eq 1', 'status eq 2'];
      expect(combineFilters(filters, 'or'))
        .toBe('(status eq 1) or (status eq 2)');
    });

    it('should handle single filter', () => {
      expect(combineFilters(['status eq 1'])).toBe('status eq 1');
    });

    it('should handle empty filters', () => {
      expect(combineFilters([])).toBe('');
      expect(combineFilters(['', '  ', null as any])).toBe('');
    });
  });

  describe('buildContainsExpression', () => {
    it('should build case-insensitive contains by default', () => {
      expect(buildContainsExpression('name', 'john'))
        .toBe("contains(tolower(name), 'john')");
    });

    it('should build case-sensitive contains', () => {
      expect(buildContainsExpression('name', 'John', true))
        .toBe("contains(name, 'John')");
    });

    it('should escape search terms', () => {
      expect(buildContainsExpression('name', "O'Brien"))
        .toBe("contains(tolower(name), 'o''brien')");
    });
  });

  describe('buildInExpression', () => {
    it('should build IN expression for multiple values', () => {
      const result = buildInExpression('status', [1, 2, 3]);
      expect(result).toBe('(status eq 1) or (status eq 2) or (status eq 3)');
    });

    it('should handle single value', () => {
      expect(buildInExpression('status', [1]))
        .toBe('status eq 1');
    });

    it('should handle empty array', () => {
      expect(buildInExpression('status', []))
        .toBe('false');
    });

    it('should handle string values', () => {
      const result = buildInExpression('type', ['foster', 'volunteer']);
      expect(result).toBe("(type eq 'foster') or (type eq 'volunteer')");
    });
  });

  describe('buildDateRangeFilter', () => {
    it('should build date range with both dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const result = buildDateRangeFilter('createdOn', start, end);
      expect(result).toContain('createdOn ge');
      expect(result).toContain('and');
      expect(result).toContain('createdOn le');
    });

    it('should handle only start date', () => {
      const start = new Date('2024-01-01');
      const result = buildDateRangeFilter('createdOn', start);
      expect(result).toContain('createdOn ge');
      expect(result).not.toContain('and');
    });

    it('should handle only end date', () => {
      const end = new Date('2024-12-31');
      const result = buildDateRangeFilter('createdOn', undefined, end);
      expect(result).toContain('createdOn le');
      expect(result).not.toContain('and');
    });

    it('should handle no dates', () => {
      expect(buildDateRangeFilter('createdOn')).toBe('');
    });
  });

  describe('buildQueryString', () => {
    it('should build query string from params', () => {
      const params = {
        $filter: 'status eq 1',
        $select: 'id,name',
        $top: 10
      };
      const result = buildQueryString(params);
      expect(result).toBe('$filter=status%20eq%201&$select=id%2Cname&$top=10');
    });

    it('should handle arrays', () => {
      const params = {
        $select: ['id', 'name', 'status']
      };
      expect(buildQueryString(params)).toBe('$select=id%2Cname%2Cstatus');
    });

    it('should skip null/undefined values', () => {
      const params = {
        $filter: 'status eq 1',
        $select: null,
        $top: undefined,
        $orderby: ''
      };
      expect(buildQueryString(params)).toBe('$filter=status%20eq%201');
    });
  });

  describe('parseNextLink', () => {
    it('should parse OData next link', () => {
      const nextLink = 'https://api.example.com/data?$skip=100&$top=50&$filter=status%20eq%201';
      const result = parseNextLink(nextLink);
      expect(result).toEqual({
        '$skip': '100',
        '$top': '50',
        '$filter': 'status eq 1'
      });
    });

    it('should handle invalid URLs', () => {
      expect(parseNextLink('invalid-url')).toEqual({});
    });
  });

  describe('buildAnyExpression', () => {
    it('should build ANY expression for collections', () => {
      const result = buildAnyExpression(
        'contacts',
        'c',
        'c/status eq 1'
      );
      expect(result).toBe('contacts/any(c:c/status eq 1)');
    });
  });

  describe('buildOrderBy', () => {
    it('should build order by clause', () => {
      const fields = [
        { field: 'name', direction: 'asc' as const },
        { field: 'createdOn', direction: 'desc' as const }
      ];
      expect(buildOrderBy(fields)).toBe('name,createdOn desc');
    });

    it('should handle default ascending order', () => {
      const fields = [{ field: 'name' }];
      expect(buildOrderBy(fields)).toBe('name');
    });

    it('should handle empty array', () => {
      expect(buildOrderBy([])).toBe('');
    });
  });

  describe('validateFieldName', () => {
    it('should validate valid field names', () => {
      expect(validateFieldName('fieldName')).toBe('fieldName');
      expect(validateFieldName('field_name')).toBe('field_name');
      expect(validateFieldName('field123')).toBe('field123');
      expect(validateFieldName('namespace/field')).toBe('namespace/field');
      expect(validateFieldName('field.property')).toBe('field.property');
    });

    it('should reject invalid field names', () => {
      expect(() => validateFieldName('field name')).toThrow('Invalid field name');
      expect(() => validateFieldName('field-name')).toThrow('Invalid field name');
      expect(() => validateFieldName('123field')).toThrow('Invalid field name');
      expect(() => validateFieldName('field!')).toThrow('Invalid field name');
    });
  });

  describe('buildComplexFilter', () => {
    it('should build complex nested filters', () => {
      const condition = {
        and: [
          { field: 'status', operator: 'EQUALS' as const, value: 'active' },
          {
            or: [
              { field: 'priority', operator: 'EQUALS' as const, value: 'high' },
              { field: 'dueDate', operator: 'LESS_THAN' as const, value: new Date('2024-12-31') }
            ]
          }
        ]
      };
      const result = buildComplexFilter(condition);
      expect(result).toContain('status eq');
      expect(result).toContain('and');
      expect(result).toContain('or');
      expect(result).toContain('priority eq');
      expect(result).toContain('dueDate lt');
    });

    it('should handle empty conditions', () => {
      expect(buildComplexFilter({})).toBe('');
    });
  });
});
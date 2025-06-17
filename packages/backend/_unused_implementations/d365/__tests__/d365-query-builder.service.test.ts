/**
 * D365 Query Builder Service Tests
 */

import { D365QueryBuilder } from '../d365-query-builder.service';
import { AppError } from '../../../utils/errors';
import type { D365Filter } from '../../../types/d365.types';
import type { LeadFilters } from '@partner-portal/shared';

describe('D365QueryBuilder', () => {
  let queryBuilder: D365QueryBuilder;

  beforeEach(() => {
    queryBuilder = new D365QueryBuilder({
      requireInitiative: true,
      defaultPageSize: 25,
      maxPageSize: 100,
    });
  });

  describe('buildSecureFilter', () => {
    it('should always include initiative filter', () => {
      const initiativeFilter: D365Filter = {
        initiative: 'ec-arkansas',
      };

      const filter = queryBuilder.buildSecureFilter(initiativeFilter);
      
      expect(filter).toContain("tc_initiative eq 'ec-arkansas'");
    });

    it('should throw error if initiative is missing when required', () => {
      const initiativeFilter: D365Filter = {} as any;

      expect(() => {
        queryBuilder.buildSecureFilter(initiativeFilter);
      }).toThrow(AppError);
    });

    it('should include organization filter when provided', () => {
      const initiativeFilter: D365Filter = {
        initiative: 'ec-arkansas',
        organizationId: 'org-123',
      };

      const filter = queryBuilder.buildSecureFilter(initiativeFilter);
      
      expect(filter).toContain("tc_initiative eq 'ec-arkansas'");
      expect(filter).toContain("_tc_assignedorganization_value eq 'org-123'");
    });

    it('should combine multiple status filters with OR', () => {
      const initiativeFilter: D365Filter = {
        initiative: 'ec-arkansas',
      };
      const userFilters: LeadFilters = {
        status: ['new', 'contacted'],
      };

      const filter = queryBuilder.buildSecureFilter(initiativeFilter, userFilters);
      
      expect(filter).toContain("(tc_leadstatus eq 'new' or tc_leadstatus eq 'contacted')");
    });

    it('should escape special characters in filter values', () => {
      const initiativeFilter: D365Filter = {
        initiative: "ec-arkansas' or 1=1--",
      };

      const filter = queryBuilder.buildSecureFilter(initiativeFilter);
      
      expect(filter).toContain("tc_initiative eq 'ec-arkansas'' or 1=1--'");
    });

    it('should build search filter across multiple fields', () => {
      const initiativeFilter: D365Filter = {
        initiative: 'ec-arkansas',
      };
      const userFilters: LeadFilters = {
        search: 'john',
      };

      const filter = queryBuilder.buildSecureFilter(initiativeFilter, userFilters);
      
      expect(filter).toContain("contains(firstname, 'john')");
      expect(filter).toContain("contains(lastname, 'john')");
      expect(filter).toContain("contains(emailaddress1, 'john')");
    });
  });

  describe('buildQueryParams', () => {
    it('should build basic query parameters', () => {
      const filter = "tc_initiative eq 'ec-arkansas'";
      const params = queryBuilder.buildQueryParams(filter);
      
      expect(params).toContain('$filter=tc_initiative');
      expect(params).toContain('$top=25');
      expect(params).toContain('$orderby=modifiedon desc');
      expect(params).toContain('$count=true');
    });

    it('should respect custom page size within limits', () => {
      const filter = '';
      const params = queryBuilder.buildQueryParams(filter, { limit: 50 });
      
      expect(params).toContain('$top=50');
    });

    it('should throw error for invalid page size', () => {
      const filter = '';
      
      expect(() => {
        queryBuilder.buildQueryParams(filter, { limit: 200 });
      }).toThrow('Page size must be between 1 and 100');
    });

    it('should add offset for pagination', () => {
      const filter = '';
      const params = queryBuilder.buildQueryParams(filter, { 
        limit: 25,
        offset: 50 
      });
      
      expect(params).toContain('$skip=50');
    });

    it('should map user-friendly sort fields to D365 fields', () => {
      const filter = '';
      const params = queryBuilder.buildQueryParams(filter, {
        orderBy: 'createdAt',
        orderDirection: 'asc'
      });
      
      expect(params).toContain('$orderby=createdon');
      expect(params).not.toContain('desc');
    });

    it('should include select fields when provided', () => {
      const filter = '';
      const params = queryBuilder.buildQueryParams(filter, {
        select: ['contactid', 'firstname', 'lastname']
      });
      
      expect(params).toContain('$select=contactid,firstname,lastname');
    });
  });

  describe('parseNextLink', () => {
    it('should extract pagination parameters from OData next link', () => {
      const nextLink = 'https://example.crm.dynamics.com/api/data/v9.2/contacts?$skip=50&$top=25&$filter=tc_initiative%20eq%20%27ec-arkansas%27';
      
      const result = queryBuilder.parseNextLink(nextLink);
      
      expect(result.skip).toBe(50);
      expect(result.top).toBe(25);
      expect(result.filter).toBe("tc_initiative eq 'ec-arkansas'");
    });
  });

  describe('configuration options', () => {
    it('should allow disabling initiative requirement', () => {
      const customBuilder = new D365QueryBuilder({
        requireInitiative: false,
      });

      const filter = customBuilder.buildSecureFilter({} as any);
      
      expect(filter).toBe('');
    });

    it('should use custom defaults', () => {
      const customBuilder = new D365QueryBuilder({
        defaultPageSize: 50,
        defaultSortField: 'firstname',
        defaultSortOrder: 'asc',
      });

      const params = customBuilder.buildQueryParams('');
      
      expect(params).toContain('$top=50');
      expect(params).toContain('$orderby=firstname');
      expect(params).not.toContain('desc');
    });
  });
});
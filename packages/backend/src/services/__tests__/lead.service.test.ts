import { describe, it, expect, beforeEach, vi } from 'vitest';
import { leadService } from '../lead.service';
import { d365Service } from '../d365.service';
import { initiativeMappingService } from '../initiative-mapping.service';
import { getInitiativeIdFromGuid } from '../../config/initiatives.config';
import { AppError } from '../../utils/errors';
import type { D365Filter } from '../../types/d365.types';

// Mock d365Service
vi.mock('../d365.service', () => ({
  d365Service: {
    getAccessToken: vi.fn()
  }
}));

// Mock initiativeMappingService
vi.mock('../initiative-mapping.service', () => ({
  initiativeMappingService: {
    getD365InitiativeGuid: vi.fn()
  }
}));

// Mock initiatives config
vi.mock('../../config/initiatives.config', () => ({
  getInitiativeIdFromGuid: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn();

// Test GUIDs (realistic format)
const TEST_INITIATIVE_GUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TEST_ORG_GUID = 'f1e2d3c4-b5a6-9870-dcba-fe4321567890';

describe('LeadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up required environment variables
    process.env.D365_URL = 'https://test.dynamics.com';
  });

  describe('getLeads', () => {
    it('should return empty array when organizationId is missing', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user'
        // organizationId is missing
      };

      const result = await leadService.getLeads(filter);

      expect(result).toEqual({ value: [], totalCount: 0 });
      expect(d365Service.getAccessToken).not.toHaveBeenCalled();
      expect(initiativeMappingService.getD365InitiativeGuid).not.toHaveBeenCalled();
    });

    it('should build correct filter for foster organization', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000' // Foster only
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      expect(initiativeMappingService.getD365InitiativeGuid).toHaveBeenCalledWith('test-initiative');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tc_everychildleads'),
        expect.any(Object)
      );
      
      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('statecode eq 0');
      expect(decodedUrl).toContain(`_tc_initiative_value eq '${TEST_INITIATIVE_GUID}'`);
      expect(decodedUrl).toContain(`_tc_fosterorganization_value eq '${TEST_ORG_GUID}'`);
      expect(decodedUrl).not.toContain('tc_eclead_tc_ecleadsvolunteerorg');
    });

    it('should build correct filter for volunteer organization', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010001' // Volunteer only
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain(`tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi/any(o:o/_tc_volunteerorganization_value eq '${TEST_ORG_GUID}')`);
      // Note: _tc_fosterorganization_value appears in $select but not in $filter for volunteer-only orgs
      expect(decodedUrl).toContain('$filter=');
      const filterPart = decodedUrl.split('$filter=')[1].split('&')[0];
      expect(filterPart).not.toContain('_tc_fosterorganization_value eq');
    });

    it('should build correct filter for both foster and volunteer organization', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000,948010001' // Both types
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      // Should have OR condition with both filters
      expect(decodedUrl).toMatch(/\(.*_tc_fosterorganization_value.*or.*tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi.*\)/);
    });

    it('should include expand clause for related entities', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('$expand=tc_Contact($select=fullname,emailaddress1),tc_LeadOwner($select=fullname)');
    });

    it('should map tc_everychildlead to Lead interface correctly', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationName: 'Test Organization',
        organizationLeadType: '948010000'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'c1d2e3f4-a5b6-7890-abcd-ef9876543210',
        tc_name: 'Test Lead Title',
        tc_ecleadlifecyclestatus: 948010000, // assigned
        tc_engagementinterest: 948010000, // foster
        tc_leadscore2: 85,
        _tc_initiative_value: TEST_INITIATIVE_GUID, // Using D365 GUID
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z',
        tc_Contact: {
          fullname: 'John Doe',
          emailaddress1: 'john@example.com'
        },
        tc_LeadOwner: {
          fullname: 'Jane Smith'
        }
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(getInitiativeIdFromGuid).mockReturnValue('test-initiative');
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [mockD365Lead], '@odata.count': 1 })
      } as Response);

      const result = await leadService.getLeads(filter);

      expect(result.value).toHaveLength(1);
      const lead = result.value[0];
      
      expect(lead.id).toBe('c1d2e3f4-a5b6-7890-abcd-ef9876543210');
      expect(lead.name).toBe('Test Lead Title');
      expect(lead.subjectName).toBe('John Doe');
      expect(lead.subjectEmail).toBe('john@example.com');
      expect(lead.status).toBe('assigned');
      expect(lead.type).toBe('foster');
      expect(lead.leadOwnerName).toBe('Jane Smith');
      expect(lead.assignedOrganizationId).toBe(TEST_ORG_GUID);
      expect(lead.assignedOrganizationName).toBe('Test Organization');
    });

    it('should handle null expanded entities gracefully', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
        tc_name: 'Test Lead',
        _tc_initiative_value: TEST_INITIATIVE_GUID,
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z',
        // tc_contact and tc_leadowner are null/undefined
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(getInitiativeIdFromGuid).mockReturnValue('test-initiative');
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [mockD365Lead], '@odata.count': 1 })
      } as Response);

      const result = await leadService.getLeads(filter);

      expect(result.value).toHaveLength(1);
      const lead = result.value[0];
      
      expect(lead.name).toBe('Test Lead'); // tc_name field
      expect(lead.subjectName).toBeUndefined();
      expect(lead.subjectEmail).toBeUndefined();
      expect(lead.leadOwnerName).toBeUndefined();
    });

    it('should throw AppError when D365 token is unavailable', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue(null);

      await expect(leadService.getLeads(filter)).rejects.toThrow(AppError);
      await expect(leadService.getLeads(filter)).rejects.toThrow('Unable to authenticate with D365');
    });

    it('should handle initiative GUID mapping errors gracefully', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockImplementation(() => {
        throw new AppError('Initiative configuration error', 500);
      });
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');

      await expect(leadService.getLeads(filter)).rejects.toThrowError(
        new AppError('Invalid initiative configuration', 500)
      );
    });

    it('should log warning for unknown initiative GUIDs in results', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'e1f2a3b4-c5d6-7890-abcd-ef1234567890',
        tc_name: 'Test Lead',
        _tc_initiative_value: 'unknown-guid-9999-9999-9999-999999999999',
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(getInitiativeIdFromGuid).mockReturnValue(undefined); // Unknown GUID
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [mockD365Lead], '@odata.count': 1 })
      } as Response);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await leadService.getLeads(filter);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[LeadService] Unknown D365 initiative GUID',
        {
          leadId: 'e1f2a3b4-c5d6-7890-abcd-ef1234567890',
          unknownGuid: 'unknown-guid-9999-9999-9999-999999999999'
        }
      );
      expect(result.value[0].initiativeId).toBe(''); // Empty string for unknown
      
      consoleSpy.mockRestore();
    });
  });

  describe('getLeadById', () => {
    it('should verify initiative before returning lead', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID
      };

      const mockD365Lead = {
        tc_everychildleadid: 'e1f2a3b4-c5d6-7890-abcd-ef9876543210',
        tc_name: 'Test Lead',
        _tc_initiative_value: 'b1c2d3e4-f5a6-7890-dcba-fe1234567890', // Wrong initiative GUID
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockD365Lead
      } as Response);

      const result = await leadService.getLeadById(filter, 'e1f2a3b4-c5d6-7890-abcd-ef9876543210');

      expect(result).toBeNull(); // Should return null for cross-initiative access
    });

    it('should return lead when initiative matches', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationName: 'Test Org'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
        tc_name: 'Test Lead',
        _tc_initiative_value: TEST_INITIATIVE_GUID, // Correct initiative GUID
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(getInitiativeIdFromGuid).mockReturnValue('test-initiative');
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockD365Lead
      } as Response);

      const result = await leadService.getLeadById(filter, 'f1a2b3c4-d5e6-7890-abcd-ef1234567890');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('f1a2b3c4-d5e6-7890-abcd-ef1234567890');
    });

    it('should return null when initiative GUID mapping fails during security check', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockImplementation(() => {
        throw new AppError('Initiative configuration error', 500);
      });
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ tc_everychildleadid: 'lead-123' })
      } as Response);

      const result = await leadService.getLeadById(filter, 'lead-123');

      expect(result).toBeNull(); // Fail secure - deny access
    });
  });

  describe('sorting field mapping', () => {
    it('should map updatedAt to modifiedon in orderBy clause', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter, {}, { orderBy: 'updatedAt', orderDirection: 'desc' });

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('$orderby=modifiedon desc');
      expect(decodedUrl).not.toContain('updatedAt');
    });

    it('should map createdAt to createdon in orderBy clause', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter, {}, { orderBy: 'createdAt', orderDirection: 'asc' });

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('$orderby=createdon asc');
    });

    it('should handle unknown sort fields with default fallback', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await leadService.getLeads(filter, {}, { orderBy: 'unknownField' });

      expect(consoleSpy).toHaveBeenCalledWith('[LeadService] Unknown sort field, using default', { field: 'unknownField' });
      
      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('$orderby=modifiedon desc');
      
      consoleSpy.mockRestore();
    });

    it('should ignore expanded fields for sorting', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: '948010000'
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to sort by an expanded field (which isn't supported by OData)
      await leadService.getLeads(filter, {}, { orderBy: 'subjectName' });

      expect(consoleSpy).toHaveBeenCalledWith('[LeadService] Unknown sort field, using default', { field: 'subjectName' });
      
      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('$orderby=modifiedon desc');
      expect(decodedUrl).not.toContain('tc_Contact/fullname');
      
      consoleSpy.mockRestore();
    });
  });

  describe('security validation', () => {
    it('should return empty results when organizationLeadType is missing', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID
        // organizationLeadType is missing
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await leadService.getLeads(filter);

      expect(consoleSpy).toHaveBeenCalledWith('[LeadService] Missing organizationLeadType in JWT', {
        organizationId: TEST_ORG_GUID,
        organizationLeadType: undefined,
        userId: 'test-user'
      });
      expect(result).toEqual({ value: [], totalCount: 0 });
      expect(fetch).not.toHaveBeenCalled(); // Should not make D365 call
      
      consoleSpy.mockRestore();
    });

    it('should return empty results for invalid organizationLeadType format', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: TEST_ORG_GUID,
        organizationLeadType: 'invalid,format,abc' // Invalid format
      };

      vi.mocked(initiativeMappingService.getD365InitiativeGuid).mockReturnValue(TEST_INITIATIVE_GUID);
      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await leadService.getLeads(filter);

      expect(consoleSpy).toHaveBeenCalledWith('[LeadService] Invalid organizationLeadType format', {
        organizationLeadType: 'invalid,format,abc',
        organizationId: TEST_ORG_GUID,
        userId: 'test-user'
      });
      expect(result).toEqual({ value: [], totalCount: 0 });
      expect(fetch).not.toHaveBeenCalled(); // Should not make D365 call
      
      consoleSpy.mockRestore();
    });
  });
});
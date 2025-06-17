import { describe, it, expect, beforeEach, vi } from 'vitest';
import { leadService } from '../lead.service';
import { d365Service } from '../d365.service';
import { AppError } from '../../utils/errors';
import type { D365Filter } from '../../types/d365.types';

// Mock d365Service
vi.mock('../d365.service', () => ({
  d365Service: {
    getAccessToken: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('LeadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });

    it('should build correct filter for foster organization', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationLeadType: '948010000' // Foster only
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tc_everychildleads'),
        expect.any(Object)
      );
      
      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(url).toContain('statecode eq 0');
      expect(url).toContain('_tc_initiative_value eq \'test-initiative\'');
      expect(url).toContain('_tc_fosterorganization_value eq \'org-123\'');
      expect(url).not.toContain('tc_eclead_tc_ecleadsvolunteerorg_eclead');
    });

    it('should build correct filter for volunteer organization', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationLeadType: '948010001' // Volunteer only
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(url).toContain('tc_eclead_tc_ecleadsvolunteerorg_eclead/any(o:o/_tc_volunteerorganization_value eq \'org-123\')');
      // Note: _tc_fosterorganization_value appears in $select but not in $filter for volunteer-only orgs
      expect(url).toContain('$filter=');
      const filterPart = url.split('$filter=')[1].split('&')[0];
      expect(filterPart).not.toContain('_tc_fosterorganization_value eq');
    });

    it('should build correct filter for both foster and volunteer organization', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationLeadType: '948010000,948010001' // Both types
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      // Should have OR condition with both filters
      expect(url).toMatch(/\(.*_tc_fosterorganization_value.*or.*tc_eclead_tc_ecleadsvolunteerorg_eclead.*\)/);
    });

    it('should include expand clause for related entities', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationLeadType: '948010000'
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [], '@odata.count': 0 })
      } as Response);

      await leadService.getLeads(filter);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(url).toContain('$expand=tc_contact($select=fullname,emailaddress1),tc_leadowner($select=fullname)');
    });

    it('should map tc_everychildlead to Lead interface correctly', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        organizationLeadType: '948010000'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'lead-123',
        tc_name: 'Test Lead',
        tc_ecleadlifecyclestatus: 948010000, // assigned
        tc_engagementinterest: 948010000, // foster
        tc_leadscore2: 85,
        _tc_initiative_value: 'test-initiative',
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z',
        tc_contact: {
          fullname: 'John Doe',
          emailaddress1: 'john@example.com'
        },
        tc_leadowner: {
          fullname: 'Jane Smith'
        }
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [mockD365Lead], '@odata.count': 1 })
      } as Response);

      const result = await leadService.getLeads(filter);

      expect(result.value).toHaveLength(1);
      const lead = result.value[0];
      
      expect(lead.id).toBe('lead-123');
      expect(lead.displayName).toBe('John Doe');
      expect(lead.email).toBe('john@example.com');
      expect(lead.status).toBe('assigned');
      expect(lead.type).toBe('foster');
      expect(lead.assignedToName).toBe('Jane Smith');
      expect(lead.assignedOrganizationId).toBe('org-123');
      expect(lead.assignedOrganizationName).toBe('Test Organization');
    });

    it('should handle null expanded entities gracefully', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationLeadType: '948010000'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'lead-123',
        tc_name: 'Test Lead',
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z',
        // tc_contact and tc_leadowner are null/undefined
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [mockD365Lead], '@odata.count': 1 })
      } as Response);

      const result = await leadService.getLeads(filter);

      expect(result.value).toHaveLength(1);
      const lead = result.value[0];
      
      expect(lead.displayName).toBe('Test Lead'); // Falls back to tc_name
      expect(lead.email).toBeUndefined();
      expect(lead.assignedToName).toBeUndefined();
    });

    it('should throw AppError when D365 token is unavailable', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationLeadType: '948010000'
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue(null);

      await expect(leadService.getLeads(filter)).rejects.toThrow(AppError);
      await expect(leadService.getLeads(filter)).rejects.toThrow('Unable to authenticate with D365');
    });
  });

  describe('getLeadById', () => {
    it('should verify initiative before returning lead', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'lead-123',
        tc_name: 'Test Lead',
        _tc_initiative_value: 'different-initiative', // Wrong initiative
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z'
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockD365Lead
      } as Response);

      const result = await leadService.getLeadById(filter, 'lead-123');

      expect(result).toBeNull(); // Should return null for cross-initiative access
    });

    it('should return lead when initiative matches', async () => {
      const filter: D365Filter = {
        initiative: 'test-initiative',
        userId: 'test-user',
        organizationId: 'org-123',
        organizationName: 'Test Org'
      };

      const mockD365Lead = {
        tc_everychildleadid: 'lead-123',
        tc_name: 'Test Lead',
        _tc_initiative_value: 'test-initiative', // Correct initiative
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z'
      };

      vi.mocked(d365Service.getAccessToken).mockResolvedValue('test-token');
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockD365Lead
      } as Response);

      const result = await leadService.getLeadById(filter, 'lead-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('lead-123');
    });
  });
});
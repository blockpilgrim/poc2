import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { d365Service } from '../d365.service';
import { authService } from '../auth.service';
import { config } from '../../config';

// Mock the entire auth.service module to avoid initialization
vi.mock('../auth.service', () => ({
  authService: {
    getD365AccessToken: vi.fn()
  }
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    D365_URL: '',
    D365_CLIENT_ID: '',
    D365_CLIENT_SECRET: ''
  }
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('D365Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config to default state
    config.D365_URL = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserOrganization', () => {
    const mockEmail = 'test@example.com';
    const mockD365Token = 'mock-d365-token';

    it('should return undefined in stub mode (no D365_URL)', async () => {
      // Arrange
      config.D365_URL = '';

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return organization data when contact and account exist', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      const mockContact = {
        contactid: 'contact-123',
        firstname: 'Test',
        lastname: 'User',
        emailaddress1: mockEmail,
        _parentcustomerid_value: 'account-456'
      };

      const mockAccount = {
        accountid: 'account-456',
        name: 'Test Organization',
        tc_organizationleadtype: 'Foster',
        createdon: '2024-01-01T00:00:00Z',
        modifiedon: '2024-01-02T00:00:00Z'
      };

      // Mock contact query
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [mockContact] })
      } as Response);

      // Mock account query
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccount
      } as Response);

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toEqual({
        id: 'account-456',
        name: 'Test Organization',
        type: 'Foster',
        attributes: {
          leadType: 'Foster',
          createdOn: '2024-01-01T00:00:00Z',
          modifiedOn: '2024-01-02T00:00:00Z'
        }
      });
      
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Verify contact query - note: we're using OData escaping, not URL encoding
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`/contacts?$filter=emailaddress1 eq '${mockEmail}'`),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockD365Token}`
          })
        })
      );
      
      // Verify account query
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`/accounts(${mockAccount.accountid})`),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockD365Token}`
          })
        })
      );
    });

    it('should return undefined when contact is not found', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [] })
      } as Response);

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when contact has no parent account', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      const mockContact = {
        contactid: 'contact-123',
        firstname: 'Test',
        lastname: 'User',
        emailaddress1: mockEmail,
        _parentcustomerid_value: null
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [mockContact] })
      } as Response);

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when account is not found', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      const mockContact = {
        contactid: 'contact-123',
        emailaddress1: mockEmail,
        _parentcustomerid_value: 'account-456'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [mockContact] })
      } as Response);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      } as Response);

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle D365 API errors gracefully', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      } as Response);

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should properly escape emails with special characters', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      const emailWithQuote = "test.o'connor@example.com";
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [] })
      } as Response);

      // Act
      await d365Service.getUserOrganization(emailWithQuote, mockD365Token);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("emailaddress1 eq 'test.o''connor@example.com'"),
        expect.any(Object)
      );
    });

    it('should use correct OData headers and API version', async () => {
      // Arrange
      config.D365_URL = 'https://test.crm.dynamics.com';
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [] })
      } as Response);

      // Act
      await d365Service.getUserOrganization(mockEmail, mockD365Token);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/data/v9.2/contacts'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            'Prefer': 'odata.include-annotations="*"',
            'Authorization': `Bearer ${mockD365Token}`
          })
        })
      );
    });
  });

  describe('getUserWithInitiative (deprecated)', () => {
    const mockEmail = 'test@example.com';
    const mockD365Token = 'mock-d365-token';

    it('should be marked as deprecated', () => {
      // Check that the method exists but is deprecated
      expect(d365Service.getUserWithInitiative).toBeDefined();
      expect(typeof d365Service.getUserWithInitiative).toBe('function');
    });

    it('should return Arkansas initiative for emails containing "arkansas"', async () => {
      // Arrange
      const arkansasEmail = 'user@arkansas.test';

      // Act
      const result = await d365Service.getUserWithInitiative(arkansasEmail, mockD365Token);

      // Assert
      expect(result.initiative.id).toBe('ec-arkansas');
      expect(result.initiative.name).toBe('EC Arkansas');
      expect(result.user.initiativeId).toBe('ec-arkansas');
      expect(result.user.email).toBe(arkansasEmail);
    });

    it('should return Kentucky initiative for emails containing "kentucky"', async () => {
      // Arrange
      const kentuckyEmail = 'user@kentucky.test';

      // Act
      const result = await d365Service.getUserWithInitiative(kentuckyEmail, mockD365Token);

      // Assert
      expect(result.initiative.id).toBe('ec-kentucky');
      expect(result.initiative.name).toBe('EC Kentucky');
      expect(result.user.initiativeId).toBe('ec-kentucky');
    });

    it('should add admin role for emails containing "admin"', async () => {
      // Arrange
      const adminEmail = 'admin@example.com';

      // Act
      const result = await d365Service.getUserWithInitiative(adminEmail, mockD365Token);

      // Assert
      expect(result.user.roles).toHaveLength(2);
      expect(result.user.roles.map(r => r.name)).toContain('admin');
      expect(result.user.roles.map(r => r.name)).toContain('partner');
    });

    it('should default to Arkansas initiative for unmatched emails', async () => {
      // Arrange
      const genericEmail = 'user@example.com';

      // Act
      const result = await d365Service.getUserWithInitiative(genericEmail, mockD365Token);

      // Assert
      expect(result.initiative.id).toBe('ec-arkansas');
      expect(result.user.roles).toHaveLength(1);
      expect(result.user.roles[0].name).toBe('partner');
    });
  });

  describe('validateInitiative', () => {
    it('should return true for valid initiatives', async () => {
      expect(await d365Service.validateInitiative('ec-arkansas')).toBe(true);
      expect(await d365Service.validateInitiative('ec-kentucky')).toBe(true);
    });

    it('should return false for invalid initiatives', async () => {
      expect(await d365Service.validateInitiative('ec-invalid')).toBe(false);
      expect(await d365Service.validateInitiative('')).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should delegate to authService', async () => {
      // Arrange
      const mockToken = 'mock-access-token';
      vi.mocked(authService.getD365AccessToken).mockResolvedValueOnce(mockToken);

      // Act
      const result = await d365Service.getAccessToken();

      // Assert
      expect(result).toBe(mockToken);
      expect(authService.getD365AccessToken).toHaveBeenCalledOnce();
    });
  });
});
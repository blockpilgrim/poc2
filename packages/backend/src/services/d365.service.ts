import { config } from '../config';
import type { User, Initiative, OrganizationData } from '@partner-portal/shared';
import { authService } from './auth.service';

/**
 * D365 Service for fetching organization and business data
 * 
 * CURRENT STATE: Stub implementation with simulated data
 * - Organization data queries return undefined (optional data)
 * - Ready for production D365 Web API integration
 * 
 * ARCHITECTURE UPDATE (Phase 4):
 * - D365 is now used ONLY for organization/business data
 * - Identity and RBAC come from Microsoft Entra ID
 * - Initiative assignment via Entra ID security groups
 * - Roles via Entra ID app roles
 * 
 * PRODUCTION IMPLEMENTATION:
 * 1. Configure D365 environment variables (D365_URL, D365_CLIENT_ID, D365_CLIENT_SECRET)
 * 2. Implement Contact lookup by email address
 * 3. Query related Account (organization) via _parentcustomerid_value
 * 4. Return organization attributes (type, name, etc.)
 * 5. Handle failures gracefully - org data is optional
 */
export class D365Service {
  private readonly apiVersion = 'v9.2';
  private readonly baseHeaders = {
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    'Prefer': 'odata.include-annotations="*"'
  };

  constructor() {
    if (config.D365_URL) {
      try {
        // Don't log full URL for security - could contain sensitive info
        const urlDomain = new URL(config.D365_URL).hostname;
        console.log(`[D365] Service initialized with domain: ${urlDomain}`);
      } catch (error) {
        console.error('[D365] Invalid D365_URL provided:', error instanceof Error ? error.message : 'Unknown error');
        // Continue in stub mode if URL is invalid
      }
    } else {
      console.log('[D365] Service initialized in stub mode - no D365_URL configured');
    }
  }

  /**
   * @deprecated Use Microsoft Entra ID groups/roles for identity and RBAC
   * This method is maintained for backward compatibility only.
   * Will be removed once all deployments have migrated to Entra ID auth.
   * 
   * Legacy method that fetched user's Contact record from D365 and extracted initiative.
   * Initiative assignment now comes from Entra ID security groups.
   * Roles now come from Entra ID app roles.
   */
  async getUserWithInitiative(email: string, _d365Token: string): Promise<{
    user: User;
    initiative: Initiative;
  }> {
    console.log(`[STUB] Fetching D365 Contact for email: ${email}`);
    console.log(`[STUB] In production: Query Contact by msevtmgt_aadobjectid`);
    
    // STUB: Hardcoded initiative assignments for development testing
    // PRODUCTION: Extract from contact.tc_initiative field
    let initiativeData: Initiative;
    let userRoles: string[] = ['partner'];
    
    if (email.includes('arkansas') || email.endsWith('@ar.test')) {
      initiativeData = {
        id: 'ec-arkansas',
        name: 'EC Arkansas',
        stateCode: 'AR',
        displayName: 'Arkansas Partner Portal',
        theme: {
          primaryColor: '#DA291C',
          secondaryColor: '#FFFFFF',
          logo: '/logos/arkansas.svg',
          favicon: '/favicons/arkansas.ico'
        },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else if (email.includes('kentucky') || email.endsWith('@ky.test')) {
      initiativeData = {
        id: 'ec-kentucky',
        name: 'EC Kentucky',
        stateCode: 'KY',
        displayName: 'Kentucky Partner Portal',
        theme: {
          primaryColor: '#003F87',
          secondaryColor: '#FFD700',
          logo: '/logos/kentucky.svg',
          favicon: '/favicons/kentucky.ico'
        },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else {
      // STUB: Default to Arkansas for any unmatched email during development
      // PRODUCTION: Throw error if no initiative found - security requirement
      console.log(`[STUB] No specific initiative mapping, defaulting to Arkansas`);
      initiativeData = {
        id: 'ec-arkansas',
        name: 'EC Arkansas',
        stateCode: 'AR',
        displayName: 'Arkansas Partner Portal',
        theme: {
          primaryColor: '#DA291C',
          secondaryColor: '#FFFFFF',
          logo: '/logos/arkansas.svg',
          favicon: '/favicons/arkansas.ico'
        },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // STUB: Simple admin detection for development
    // PRODUCTION: Parse contact.crda6_portalroles field (multi-select picklist)
    if (email.includes('admin')) {
      console.log(`[STUB] Detected admin user pattern, adding admin role`);
      userRoles = ['partner', 'admin'];
    }

    const nameParts = email.split('@')[0].replace(/[._-]/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1));
    const firstName = nameParts[0] || 'Test';
    const lastName = nameParts[1] || 'User';
    
    const user: User = {
      id: `user-${email.split('@')[0]}`,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      initiativeId: initiativeData.id,
      roles: userRoles.map(r => ({
        id: `role-${r}`,
        name: r as any,
        permissions: this.getRolePermissions([r]).map(p => ({
          id: `perm-${p}`,
          resource: p.split('.')[0],
          action: p.split('.')[1],
          scope: 'initiative' as const
        }))
      })),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { user, initiative: initiativeData };
  }

  /**
   * Get permissions based on roles
   */
  private getRolePermissions(roles: string[]): string[] {
    const permissions: Set<string> = new Set();

    for (const role of roles) {
      switch (role) {
        case 'partner':
          permissions.add('leads.view');
          permissions.add('leads.update');
          permissions.add('dashboard.view');
          break;
        case 'admin':
          permissions.add('leads.view');
          permissions.add('leads.update');
          permissions.add('leads.delete');
          permissions.add('dashboard.view');
          permissions.add('reports.view');
          permissions.add('settings.manage');
          break;
      }
    }

    return Array.from(permissions);
  }

  /**
   * Validate that initiative exists and is active
   */
  async validateInitiative(initiativeId: string): Promise<boolean> {
    // TODO: Query D365 to validate initiative
    // For now, accept our test initiatives
    const validInitiatives = ['ec-arkansas', 'ec-kentucky'];
    return validInitiatives.includes(initiativeId);
  }

  /**
   * Get D365 access token
   */
  async getAccessToken(): Promise<string | null> {
    return authService.getD365AccessToken();
  }

  /**
   * Get user's organization data from D365
   * This is the primary method for fetching business data from D365.
   * Organization data is OPTIONAL - auth should not fail if this returns undefined.
   * 
   * @param azureObjectId User's Azure AD Object ID
   * @param d365Token D365 access token
   * @returns Organization data or undefined if not found/error
   */
  async getUserOrganization(
    azureObjectId: string,
    d365Token: string
  ): Promise<OrganizationData | undefined> {
    try {
      // Validate inputs
      if (!azureObjectId || typeof azureObjectId !== 'string') {
        console.warn('[D365] Invalid Azure Object ID parameter provided');
        return undefined;
      }
      
      if (!d365Token || typeof d365Token !== 'string') {
        console.warn('[D365] Invalid D365 token provided');
        return undefined;
      }
      
      console.log(`[D365] Fetching organization data for Azure ID: ${azureObjectId}`);
      
      // STUB MODE - Return undefined to simulate optional org data
      if (!config.D365_URL) {
        console.log('[D365] Running in stub mode - returning undefined for org data');
        return undefined;
      }
      
      // PRODUCTION IMPLEMENTATION
      // Step 1: Query Contact by Azure AD Object ID
      const contact = await this.queryContactByAzureId(azureObjectId, d365Token);
      if (!contact) {
        console.log(`[D365] No contact found for Azure ID: ${azureObjectId}`);
        return undefined;
      }
      
      // Step 2: Get related Account ID
      const accountId = contact._parentcustomerid_value;
      if (!accountId) {
        console.log(`[D365] Contact ${contact.contactid} has no parent account`);
        return undefined;
      }
      
      // Step 3: Query Account for organization details
      const account = await this.queryAccount(accountId, d365Token);
      if (!account) {
        console.log(`[D365] Account ${accountId} not found`);
        return undefined;
      }
      
      // Step 4: Return organization data
      return {
        id: account.accountid,
        name: account.name,
        type: account.tc_organizationleadtype || 'Unknown', // Legacy field
        organizationLeadType: account.tc_organizationleadtype, // New field for lead filtering
        attributes: {
          leadType: account.tc_organizationleadtype,
          // Add other relevant attributes as needed
          createdOn: account.createdon,
          modifiedOn: account.modifiedon,
        }
      };
    } catch (error) {
      // Log error but don't throw - org data is optional
      console.error('[D365] Error fetching organization data:', error);
      return undefined;
    }
  }

  /**
   * PRODUCTION D365 WEB API METHODS
   */

  /**
   * Query Contact by Azure AD Object ID
   * Used to find the user's Contact record and related organization
   * 
   * @param azureObjectId User's Azure AD Object ID
   * @param d365Token D365 access token
   * @returns Contact record or null if not found
   */
  private async queryContactByAzureId(
    azureObjectId: string, 
    d365Token: string
  ): Promise<any | null> {
    if (!config.D365_URL) {
      // Stub mode - return null
      return null;
    }

    try {
      // Azure Object IDs don't need escaping like emails do
      const url = `${config.D365_URL}/api/data/${this.apiVersion}/contacts`;
      const query = `?$filter=msevtmgt_aadobjectid eq '${azureObjectId}'&$select=contactid,firstname,lastname,emailaddress1,msevtmgt_aadobjectid,_parentcustomerid_value&$top=1`;
      
      const response = await fetch(url + query, {
        method: 'GET',
        headers: {
          ...this.baseHeaders,
          'Authorization': `Bearer ${d365Token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[D365] Contact query failed: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json() as { value: any[] };
      return data.value && data.value.length > 0 ? data.value[0] : null;
    } catch (error) {
      console.error('[D365] Error querying contact by Azure ID:', error);
      return null;
    }
  }

  /**
   * Query Account by ID
   * Used to fetch organization details for a Contact
   * 
   * @param accountId D365 Account ID
   * @param d365Token D365 access token
   * @returns Account record or null if not found
   */
  private async queryAccount(
    accountId: string,
    d365Token: string
  ): Promise<any | null> {
    if (!config.D365_URL) {
      // Stub mode - return null
      return null;
    }

    try {
      const url = `${config.D365_URL}/api/data/${this.apiVersion}/accounts(${accountId})`;
      const query = `?$select=accountid,name,tc_organizationleadtype,createdon,modifiedon`;
      
      const response = await fetch(url + query, {
        method: 'GET',
        headers: {
          ...this.baseHeaders,
          'Authorization': `Bearer ${d365Token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        console.error(`[D365] Account query failed: ${response.status} - ${errorText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[D365] Error querying account:', error);
      return null;
    }
  }

}

// Export singleton instance
export const d365Service = new D365Service();
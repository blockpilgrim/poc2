// import { config } from '../config';  // Will be used when D365 integration is implemented
import type { User, Initiative, OrganizationData } from '@partner-portal/shared';
import { authService } from './auth.service';

/**
 * D365 Service for fetching user and initiative data
 * 
 * CURRENT STATE: Stub implementation with simulated data
 * - Uses hardcoded initiative assignments and roles
 * - Returns test theme configurations
 * - Simulates user permissions based on email patterns
 * 
 * PRODUCTION TRANSITION STEPS:
 * 1. Configure D365 environment variables (D365_URL, D365_CLIENT_ID, D365_CLIENT_SECRET)
 * 2. Implement Contact lookup by msevtmgt_aadobjectid (Azure AD Object ID)
 * 3. Extract tc_initiative field from Contact record
 * 4. Parse crda6_portalroles field (may be multi-select)
 * 5. Query Initiative entity for theme configuration
 * 6. Map D365 roles to application permissions
 * 7. Replace stub data with actual D365 queries
 */
export class D365Service {
  constructor() {
    // D365 URL will be used when actual implementation is added
    // config.D365_URL is available when needed
  }

  /**
   * Fetch user's Contact record from D365 and extract initiative
   * CRITICAL: This is where we determine the user's security boundary
   * 
   * REAL DATA: email parameter (from Azure AD authentication)
   * SIMULATED DATA: initiative assignment, roles, permissions, theme config
   * 
   * PRODUCTION IMPLEMENTATION:
   * const contact = await this.queryContactByAzureId(azureObjectId, d365Token);
   * const initiative = await this.queryInitiative(contact.tc_initiative, d365Token);
   * const roles = this.parsePortalRoles(contact.crda6_portalroles);
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
   * @param email User's email address
   * @param d365Token D365 access token
   * @returns Organization data or undefined if not found
   */
  async getUserOrganization(
    email: string,
    d365Token: string
  ): Promise<OrganizationData | undefined> {
    console.log(`[D365] Fetching organization data for: ${email}`);
    
    // STUB IMPLEMENTATION
    // In production, this would:
    // 1. Query Contact by email
    // 2. Get related Account (organization) via _parentcustomerid_value
    // 3. Return organization attributes
    
    // For now, return undefined to indicate org data is optional
    return undefined;
    
    /* PRODUCTION IMPLEMENTATION:
    try {
      const contactResponse = await this.queryContactByEmail(email, d365Token);
      if (!contactResponse || !contactResponse.value || contactResponse.value.length === 0) {
        return undefined;
      }
      
      const contact = contactResponse.value[0];
      const accountId = contact._parentcustomerid_value;
      
      if (!accountId) {
        return undefined;
      }
      
      const accountResponse = await this.queryAccount(accountId, d365Token);
      return {
        id: accountResponse.accountid,
        name: accountResponse.name,
        type: accountResponse.tc_organizationleadtype,
        attributes: {
          leadType: accountResponse.tc_organizationleadtype,
          // Add other relevant attributes
        }
      };
    } catch (error) {
      console.error('[D365] Error fetching organization data:', error);
      return undefined;
    }
    */
  }

  /**
   * PRODUCTION READY METHODS - Implement these to replace stub data
   */

  /**
   * Query Contact record by Azure AD Object ID
   * FIELD MAPPING: msevtmgt_aadobjectid = Azure AD user.oid
   */
  private async queryContactByAzureId(azureObjectId: string, d365Token: string): Promise<any> {
    // TODO: Implement D365 Web API call
    // GET /api/data/v9.1/contacts?$filter=msevtmgt_aadobjectid eq '${azureObjectId}'
    // &$select=contactid,emailaddress1,firstname,lastname,tc_initiative,crda6_portalroles
    throw new Error('Production method not implemented - currently using stub data');
  }

  /**
   * Query Initiative entity for theme configuration
   * FIELD MAPPING: tc_initiative field references Initiative entity
   */
  private async queryInitiative(initiativeId: string, d365Token: string): Promise<Initiative> {
    // TODO: Implement D365 Web API call for Initiative entity
    // GET /api/data/v9.1/tc_initiatives(${initiativeId})
    // Map D365 fields to Initiative interface
    throw new Error('Production method not implemented - currently using stub data');
  }

  /**
   * Parse portal roles from D365 multi-select picklist
   * FIELD MAPPING: crda6_portalroles may contain multiple values
   */
  private parsePortalRoles(portalRolesValue: string | null): string[] {
    // TODO: Parse D365 multi-select picklist format
    // Handle comma-separated values or numeric option set values
    if (!portalRolesValue) return ['partner']; // Default role
    return portalRolesValue.split(',').map(r => r.trim().toLowerCase());
  }
}

// Export singleton instance
export const d365Service = new D365Service();
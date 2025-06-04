// import { config } from '../config';  // Will be used when D365 integration is implemented
import type { User, Initiative } from '@partner-portal/shared';
import { authService } from './auth.service';

/**
 * D365 Service for fetching user and initiative data
 * This is a stub implementation - will be replaced with actual D365 integration
 */
export class D365Service {
  constructor() {
    // D365 URL will be used when actual implementation is added
    // config.D365_URL is available when needed
  }

  /**
   * Fetch user's Contact record from D365 and extract initiative
   * CRITICAL: This is where we determine the user's security boundary
   */
  async getUserWithInitiative(email: string, _d365Token: string): Promise<{
    user: User;
    initiative: Initiative;
  }> {
    // TODO: Implement actual D365 query
    // This would typically:
    // 1. Query contacts by email
    // 2. Extract initiative field
    // 3. Query initiative details
    // 4. Build user object with roles and permissions

    console.log(`Fetching D365 Contact for email: ${email}`);
    
    // Stub implementation for development
    // Maps specific test emails to initiatives
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
      // Default to Arkansas for development
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

    // Check for admin users
    if (email.includes('admin')) {
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
}

// Export singleton instance
export const d365Service = new D365Service();
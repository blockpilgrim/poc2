import { config } from '../config';
import type { User, Initiative } from '@partner-portal/shared';
import { authService } from './auth.service';

/**
 * D365 Service for fetching user and initiative data
 * This is a stub implementation - will be replaced with actual D365 integration
 */
export class D365Service {
  private baseUrl: string | undefined;

  constructor() {
    this.baseUrl = config.D365_URL;
  }

  /**
   * Fetch user's Contact record from D365 and extract initiative
   * CRITICAL: This is where we determine the user's security boundary
   */
  async getUserWithInitiative(email: string, d365Token: string): Promise<{
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
        code: 'EC_AR',
        theme: {
          primaryColor: '#DA291C',
          secondaryColor: '#FFFFFF',
          logoUrl: '/logos/arkansas.svg',
          faviconUrl: '/favicons/arkansas.ico'
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (email.includes('kentucky') || email.endsWith('@ky.test')) {
      initiativeData = {
        id: 'ec-kentucky',
        name: 'EC Kentucky',
        code: 'EC_KY',
        theme: {
          primaryColor: '#003F87',
          secondaryColor: '#FFD700',
          logoUrl: '/logos/kentucky.svg',
          faviconUrl: '/favicons/kentucky.ico'
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Default to Arkansas for development
      initiativeData = {
        id: 'ec-arkansas',
        name: 'EC Arkansas',
        code: 'EC_AR',
        theme: {
          primaryColor: '#DA291C',
          secondaryColor: '#FFFFFF',
          logoUrl: '/logos/arkansas.svg',
          faviconUrl: '/favicons/arkansas.ico'
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Check for admin users
    if (email.includes('admin')) {
      userRoles = ['partner', 'admin'];
    }

    const user: User = {
      id: `user-${email.split('@')[0]}`,
      email,
      name: email.split('@')[0].replace(/[._-]/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      roles: userRoles,
      permissions: this.getRolePermissions(userRoles),
      initiativeId: initiativeData.id,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
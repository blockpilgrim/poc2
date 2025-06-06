import { AppError } from '../utils/errors';

export interface InitiativeMapping {
  groupName: string;
  initiativeId: string;
  displayName: string;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  favicon: string;
  name: string;
}

export class InitiativeMappingService {
  private static instance: InitiativeMappingService;

  // Map of Entra ID group names to initiative configurations
  private readonly initiativeMappings: Map<string, InitiativeMapping> = new Map([
    ['EC Arkansas', { groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' }],
    ['EC Oregon', { groupName: 'EC Oregon', initiativeId: 'ec-oregon', displayName: 'Oregon' }],
    ['EC Tennessee', { groupName: 'EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee' }],
    ['EC Kentucky', { groupName: 'EC Kentucky', initiativeId: 'ec-kentucky', displayName: 'Kentucky' }],
    ['EC Oklahoma', { groupName: 'EC Oklahoma', initiativeId: 'ec-oklahoma', displayName: 'Oklahoma' }],
  ]);

  // Theme configurations per initiative
  private readonly initiativeThemes: Map<string, ThemeConfig> = new Map([
    ['ec-arkansas', {
      primaryColor: '#00B274',
      secondaryColor: '#313E48',
      logo: '/logos/arkansas.svg',
      favicon: '/favicons/arkansas.ico',
      name: 'Arkansas Partner Portal',
    }],
    ['ec-oregon', {
      primaryColor: '#0078D4',
      secondaryColor: '#313E48',
      logo: '/logos/oregon.svg',
      favicon: '/favicons/oregon.ico',
      name: 'Oregon Partner Portal',
    }],
    ['ec-tennessee', {
      primaryColor: '#F38359',
      secondaryColor: '#313E48',
      logo: '/logos/tennessee.svg',
      favicon: '/favicons/tennessee.ico',
      name: 'Tennessee Partner Portal',
    }],
    ['ec-kentucky', {
      primaryColor: '#7B68EE',
      secondaryColor: '#313E48',
      logo: '/logos/kentucky.svg',
      favicon: '/favicons/kentucky.ico',
      name: 'Kentucky Partner Portal',
    }],
    ['ec-oklahoma', {
      primaryColor: '#DC143C',
      secondaryColor: '#313E48',
      logo: '/logos/oklahoma.svg',
      favicon: '/favicons/oklahoma.ico',
      name: 'Oklahoma Partner Portal',
    }],
  ]);

  private constructor() {}

  static getInstance(): InitiativeMappingService {
    if (!InitiativeMappingService.instance) {
      InitiativeMappingService.instance = new InitiativeMappingService();
    }
    return InitiativeMappingService.instance;
  }

  /**
   * Extract initiative from user's Entra ID groups
   * @param groups Array of group names from Entra ID
   * @returns Primary initiative ID
   * @throws AppError if no valid initiative group is found
   */
  extractInitiativeFromGroups(groups: string[]): string {
    if (!groups || groups.length === 0) {
      throw new AppError('No groups provided', 400);
    }

    // Find the first matching EC group
    const initiativeGroup = groups.find(group => 
      group.startsWith('EC ') && this.initiativeMappings.has(group)
    );

    if (!initiativeGroup) {
      throw new AppError(
        'User is not assigned to any initiative. Please contact your administrator.',
        403
      );
    }

    const mapping = this.initiativeMappings.get(initiativeGroup)!;
    return mapping.initiativeId;
  }

  /**
   * Get initiative mapping by group name
   */
  getInitiativeByGroupName(groupName: string): InitiativeMapping | undefined {
    return this.initiativeMappings.get(groupName);
  }

  /**
   * Get theme configuration for an initiative
   */
  getThemeForInitiative(initiativeId: string): ThemeConfig | undefined {
    return this.initiativeThemes.get(initiativeId);
  }

  /**
   * Get all initiative groups for a user
   * Useful for users with multiple initiative access
   */
  getAllUserInitiatives(groups: string[]): InitiativeMapping[] {
    return groups
      .filter(group => this.initiativeMappings.has(group))
      .map(group => this.initiativeMappings.get(group)!)
      .filter(Boolean);
  }

  /**
   * Validate if a user has access to a specific initiative
   */
  hasAccessToInitiative(groups: string[], initiativeId: string): boolean {
    const userInitiatives = this.getAllUserInitiatives(groups);
    return userInitiatives.some(init => init.initiativeId === initiativeId);
  }

  /**
   * Get display name for an initiative
   */
  getInitiativeDisplayName(initiativeId: string): string {
    for (const mapping of this.initiativeMappings.values()) {
      if (mapping.initiativeId === initiativeId) {
        return mapping.displayName;
      }
    }
    return initiativeId;
  }

  /**
   * Handle edge cases for multiple groups
   * Returns primary initiative based on priority or first match
   * 
   * Priority rules:
   * 1. If user has only one initiative group, use it
   * 2. If user has multiple groups, use alphabetical order for consistency
   * 3. Log when multiple initiatives are found for audit purposes
   */
  resolvePrimaryInitiative(groups: string[]): {
    primary: string;
    additional: string[];
  } {
    const userInitiatives = this.getAllUserInitiatives(groups);
    
    if (userInitiatives.length === 0) {
      throw new AppError('No valid initiative groups found', 403);
    }

    // Sort initiatives alphabetically for consistent behavior
    const sortedInitiatives = userInitiatives.sort((a, b) => 
      a.initiativeId.localeCompare(b.initiativeId)
    );

    const primary = sortedInitiatives[0].initiativeId;
    const additional = sortedInitiatives
      .slice(1)
      .map(init => init.initiativeId);

    // Log when user has multiple initiatives for security audit
    if (additional.length > 0) {
      console.warn('[INITIATIVE] User has multiple initiative groups:', {
        groups: groups.filter(g => g.startsWith('EC ')),
        primary,
        additional,
        timestamp: new Date().toISOString()
      });
    }

    return { primary, additional };
  }
}

// Export singleton instance
export const initiativeMappingService = InitiativeMappingService.getInstance();
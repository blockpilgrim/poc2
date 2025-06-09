import { AppError } from '../utils/errors';
import { 
  isValidInitiativeGroup, 
  findBestInitiativeGroup
} from '../utils/group-naming.utils';

export interface InitiativeMapping {
  groupName: string;
  initiativeId: string;
  displayName: string;
  isLegacy?: boolean;
  isTesting?: boolean;
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
  // Supports both legacy ("EC State") and new ("Partner Portal - EC State") formats
  private readonly initiativeMappings: Map<string, InitiativeMapping> = new Map([
    // Legacy format groups (for backward compatibility)
    ['EC Arkansas', { groupName: 'EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas', isLegacy: true }],
    ['EC Oregon', { groupName: 'EC Oregon', initiativeId: 'ec-oregon', displayName: 'Oregon', isLegacy: true }],
    ['EC Tennessee', { groupName: 'EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee', isLegacy: true }],
    ['EC Kentucky', { groupName: 'EC Kentucky', initiativeId: 'ec-kentucky', displayName: 'Kentucky', isLegacy: true }],
    ['EC Oklahoma', { groupName: 'EC Oklahoma', initiativeId: 'ec-oklahoma', displayName: 'Oklahoma', isLegacy: true }],
    
    // New format groups - Production
    ['Partner Portal - EC Arkansas', { groupName: 'Partner Portal - EC Arkansas', initiativeId: 'ec-arkansas', displayName: 'Arkansas' }],
    ['Partner Portal - EC Oregon', { groupName: 'Partner Portal - EC Oregon', initiativeId: 'ec-oregon', displayName: 'Oregon' }],
    ['Partner Portal - EC Tennessee', { groupName: 'Partner Portal - EC Tennessee', initiativeId: 'ec-tennessee', displayName: 'Tennessee' }],
    ['Partner Portal - EC Kentucky', { groupName: 'Partner Portal - EC Kentucky', initiativeId: 'ec-kentucky', displayName: 'Kentucky' }],
    ['Partner Portal - EC Oklahoma', { groupName: 'Partner Portal - EC Oklahoma', initiativeId: 'ec-oklahoma', displayName: 'Oklahoma' }],
    
    // New format groups - Testing
    ['Partner Portal - EC Arkansas - Testing', { groupName: 'Partner Portal - EC Arkansas - Testing', initiativeId: 'ec-arkansas', displayName: 'Arkansas', isTesting: true }],
    ['Partner Portal - EC Oregon - Testing', { groupName: 'Partner Portal - EC Oregon - Testing', initiativeId: 'ec-oregon', displayName: 'Oregon', isTesting: true }],
    ['Partner Portal - EC Tennessee - Testing', { groupName: 'Partner Portal - EC Tennessee - Testing', initiativeId: 'ec-tennessee', displayName: 'Tennessee', isTesting: true }],
    ['Partner Portal - EC Kentucky - Testing', { groupName: 'Partner Portal - EC Kentucky - Testing', initiativeId: 'ec-kentucky', displayName: 'Kentucky', isTesting: true }],
    ['Partner Portal - EC Oklahoma - Testing', { groupName: 'Partner Portal - EC Oklahoma - Testing', initiativeId: 'ec-oklahoma', displayName: 'Oklahoma', isTesting: true }],
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
   * Supports both legacy ("EC State") and new ("Partner Portal - EC State") formats
   * @param groups Array of group names from Entra ID
   * @returns Primary initiative ID
   * @throws AppError if no valid initiative group is found
   */
  extractInitiativeFromGroups(groups: string[]): string {
    if (!groups || groups.length === 0) {
      throw new AppError('No groups provided', 400);
    }

    // Find the best matching initiative group using new utility
    const initiativeGroup = findBestInitiativeGroup(groups);

    if (!initiativeGroup || !this.initiativeMappings.has(initiativeGroup)) {
      throw new AppError(
        'User is not assigned to any initiative group. Please contact your administrator.',
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
   * Supports both legacy and new group naming conventions
   */
  getAllUserInitiatives(groups: string[]): InitiativeMapping[] {
    return groups
      .filter(group => isValidInitiativeGroup(group) && this.initiativeMappings.has(group))
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
   * 2. If user has multiple groups, prefer new format over legacy
   * 3. Prefer production over testing groups
   * 4. Use alphabetical order for final consistency
   * 5. Log when multiple initiatives are found for audit purposes
   */
  resolvePrimaryInitiative(groups: string[]): {
    primary: string;
    additional: string[];
  } {
    const userInitiatives = this.getAllUserInitiatives(groups);
    
    if (userInitiatives.length === 0) {
      throw new AppError('No valid initiative groups found', 403);
    }

    // Sort initiatives by preference: new format first, production over testing, then alphabetical
    const sortedInitiatives = userInitiatives.sort((a, b) => {
      // Prefer new format over legacy
      if (!a.isLegacy && b.isLegacy) return -1;
      if (a.isLegacy && !b.isLegacy) return 1;
      
      // Prefer production over testing
      if (!a.isTesting && b.isTesting) return -1;
      if (a.isTesting && !b.isTesting) return 1;
      
      // Alphabetical order for consistency
      return a.initiativeId.localeCompare(b.initiativeId);
    });

    const primary = sortedInitiatives[0].initiativeId;
    const additional = sortedInitiatives
      .slice(1)
      .map(init => init.initiativeId);

    // Log when user has multiple initiatives for security audit
    if (additional.length > 0) {
      const validInitiativeGroups = groups.filter(isValidInitiativeGroup);
      console.warn('[INITIATIVE] User has multiple initiative groups:', {
        groups: validInitiativeGroups,
        primary,
        additional,
        selectedGroup: sortedInitiatives[0].groupName,
        timestamp: new Date().toISOString()
      });
    }

    return { primary, additional };
  }
}

// Export singleton instance
export const initiativeMappingService = InitiativeMappingService.getInstance();
import { AppError } from '../utils/errors';
import { 
  isValidInitiativeGroup
} from '../utils/group-naming.utils';
import { getD365GuidForInitiative } from '../config/initiatives.config';

export interface InitiativeMapping {
  groupName: string;
  initiativeId: string;
  displayName: string;
  groupType?: 'all-users' | 'role' | 'standard';
  role?: string;
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

  // Map of Entra ID group GUIDs to initiative configurations
  // This is the primary source of truth as GUIDs are immutable
  private readonly guidToInitiative: Map<string, InitiativeMapping> = new Map([
    // Oregon groups
    ['e6ae3a86-446e-40f0-a2fb-e1b83f11cd3b', { 
      groupName: 'Partner Portal - EC Oregon - All Users',
      initiativeId: 'ec-oregon',
      displayName: 'Oregon',
      groupType: 'all-users'
    }],
    ['b25d4508-8b32-4e7f-bc90-d2699adb12a7', {
      groupName: 'Partner Portal - EC Oregon - Foster Only',
      initiativeId: 'ec-oregon',
      displayName: 'Oregon',
      groupType: 'role',
      role: 'Foster-Partner'
    }],
    ['f24c7dc3-3844-4037-90b8-c73c59b0ea30', {
      groupName: 'Partner Portal - EC Oregon - Volunteer Only',
      initiativeId: 'ec-oregon',
      displayName: 'Oregon',
      groupType: 'role',
      role: 'Volunteer'
    }],
    ['6d252fee-1df8-4ba1-acf1-18c1c704f3bd', {
      groupName: 'Partner Portal - EC Oregon - Foster & Volunteer',
      initiativeId: 'ec-oregon',
      displayName: 'Oregon',
      groupType: 'role',
      role: 'Foster-Partner,Volunteer'
    }],
    
    // Kentucky groups
    ['61f913cc-0360-482d-8373-7a7cac826eb2', {
      groupName: 'Partner Portal - EC Kentucky - All Users',
      initiativeId: 'ec-kentucky',
      displayName: 'Kentucky',
      groupType: 'all-users'
    }],
    ['cb535635-98ee-4c38-a4f6-5a81ffba2f87', {
      groupName: 'Partner Portal - EC Kentucky - Foster Only',
      initiativeId: 'ec-kentucky',
      displayName: 'Kentucky',
      groupType: 'role',
      role: 'Foster-Partner'
    }],
  ]);

  // Map of Entra ID group names to initiative configurations
  // This is kept for reference but should not be used for new implementations
  // Use guidToInitiative instead
  private readonly initiativeMappings: Map<string, InitiativeMapping> = new Map();

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
      primaryColor: '#00843D',
      secondaryColor: '#FFC72C',
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
   * Only supports GUIDs as they are immutable and secure
   * @param groups Array of group GUIDs from Entra ID
   * @returns Primary initiative ID
   * @throws AppError if no valid initiative group is found
   */
  extractInitiativeFromGroups(groups: string[]): string {
    
    if (!groups || groups.length === 0) {
      throw new AppError('No groups provided', 400);
    }

    // Check if any groups are GUIDs and map them
    for (const group of groups) {
      // Check GUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      if (group.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const guidMapping = this.guidToInitiative.get(group.toLowerCase());
        if (guidMapping) {
          // Found a valid GUID mapping
          return guidMapping.initiativeId;
        }
      }
    }

    console.error('[INITIATIVE-MAPPING] No valid initiative group found:', {
      groups,
      isGuid: groups.some(g => g.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)),
      availableGuidMappings: this.guidToInitiative.size
    });
    throw new AppError(
      'User is not assigned to any initiative group. Please contact your administrator.',
      403
    );
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
    const theme = this.initiativeThemes.get(initiativeId);
    
    
    return theme;
  }

  /**
   * Get all initiative groups for a user
   * Only processes GUID-based groups
   */
  getAllUserInitiatives(groups: string[]): InitiativeMapping[] {
    const mappings: InitiativeMapping[] = [];
    const seenInitiatives = new Set<string>();
    
    // Only check GUIDs
    for (const group of groups) {
      if (group.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const guidMapping = this.guidToInitiative.get(group.toLowerCase());
        if (guidMapping && !seenInitiatives.has(guidMapping.initiativeId)) {
          mappings.push(guidMapping);
          seenInitiatives.add(guidMapping.initiativeId);
        }
      }
    }
    
    return mappings;
  }

  /**
   * Validate if a user has access to a specific initiative
   * Only checks GUID-based groups
   */
  hasAccessToInitiative(groups: string[], initiativeId: string): boolean {
    for (const group of groups) {
      if (group.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const guidMapping = this.guidToInitiative.get(group.toLowerCase());
        if (guidMapping && guidMapping.initiativeId === initiativeId) {
          return true;
        }
      }
    }
    return false;
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
   * Get D365 GUID for an initiative
   * This is used to map application initiative IDs to D365 Initiative entity GUIDs
   * 
   * @param initiativeId - The initiative ID (e.g., 'ec-oregon')
   * @returns The D365 GUID for the initiative
   * @throws AppError if no mapping exists
   */
  getD365InitiativeGuid(initiativeId: string): string {
    const guid = getD365GuidForInitiative(initiativeId);
    
    if (!guid) {
      console.error('[InitiativeMappingService] No D365 GUID mapping found:', {
        initiativeId,
        availableInitiatives: Object.keys(this.initiativeThemes),
      });
      throw new AppError(
        `Initiative configuration error. Please contact your administrator.`,
        500
      );
    }
    
    return guid;
  }

  /**
   * Validate if a D365 GUID is valid format
   * @param guid - The GUID to validate
   * @returns true if valid GUID format
   */
  private isValidGuid(guid: string): boolean {
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidPattern.test(guid);
  }

  /**
   * Extract role information from user's groups
   * Returns unique roles across all initiative groups
   */
  extractRolesFromGroups(groups: string[]): string[] {
    const roles = new Set<string>();
    
    // Check GUIDs first
    for (const group of groups) {
      if (this.isValidGuid(group)) {
        const guidMapping = this.guidToInitiative.get(group.toLowerCase());
        if (guidMapping && guidMapping.role) {
          // Handle comma-separated roles like "Foster-Partner,Volunteer"
          guidMapping.role.split(',').forEach(role => roles.add(role.trim()));
        }
      }
    }
    
    // Note: Name-based groups don't have role info in current implementation
    // This could be extended if needed
    
    return Array.from(roles);
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

    // Sort initiatives by preference: All Users first, then role groups, then alphabetical
    const sortedInitiatives = userInitiatives.sort((a, b) => {
      // Prefer All Users groups
      if (a.groupType === 'all-users' && b.groupType !== 'all-users') return -1;
      if (a.groupType !== 'all-users' && b.groupType === 'all-users') return 1;
      
      // Then prefer role groups over standard
      if (a.groupType === 'role' && b.groupType === 'standard') return -1;
      if (a.groupType === 'standard' && b.groupType === 'role') return 1;
      
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
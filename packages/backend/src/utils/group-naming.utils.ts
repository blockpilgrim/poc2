/**
 * Utilities for handling Partner Portal group naming conventions
 * 
 * New convention: "Partner Portal - EC {State}" with optional "- Testing"
 * Examples:
 * - "Partner Portal - EC Arkansas"
 * - "Partner Portal - EC Oregon - Testing"
 * 
 * Legacy convention: "EC {State}"
 * Examples:
 * - "EC Arkansas"
 * - "EC Oregon"
 */

import { config } from '../config';

export const GROUP_PREFIX = config.PARTNER_PORTAL_GROUP_PREFIX;
export const LEGACY_PREFIX = config.LEGACY_GROUP_PREFIX;
export const TESTING_SUFFIX = config.TESTING_GROUP_SUFFIX;

/**
 * Check if a group follows the new Partner Portal naming convention
 */
export function isPartnerPortalGroup(groupName: string): boolean {
  if (!groupName.startsWith(GROUP_PREFIX)) {
    return false;
  }
  
  const afterPrefix = groupName.substring(GROUP_PREFIX.length);
  const parts = afterPrefix.split(' - ');
  
  // Must have at least the state name
  if (parts.length === 0 || parts[0].trim() === '') {
    return false;
  }
  
  // Can optionally have "Testing" as the last part
  if (parts.length === 2 && parts[1] !== 'Testing') {
    return false;
  }
  
  // Should have exactly 1 or 2 parts (state name, optionally "Testing")
  return parts.length <= 2;
}

/**
 * Check if legacy group support is enabled
 */
export function isLegacyGroupSupportEnabled(): boolean {
  return config.ENABLE_LEGACY_GROUP_SUPPORT;
}

/**
 * Check if a group follows the legacy naming convention
 */
export function isLegacyGroup(groupName: string): boolean {
  return isLegacyGroupSupportEnabled() &&
         groupName.startsWith(LEGACY_PREFIX) && 
         !groupName.startsWith(GROUP_PREFIX) && // Not the new format
         groupName.length > LEGACY_PREFIX.length; // Has state name
}

/**
 * Check if a group is any valid initiative group (new or legacy)
 */
export function isValidInitiativeGroup(groupName: string): boolean {
  return isPartnerPortalGroup(groupName) || isLegacyGroup(groupName);
}

/**
 * Extract state name from Partner Portal group (new or legacy format)
 */
export function extractStateFromGroup(groupName: string): string | null {
  if (isPartnerPortalGroup(groupName)) {
    const afterPrefix = groupName.substring(GROUP_PREFIX.length);
    const stateName = afterPrefix.split(' - ')[0];
    return stateName.trim();
  }
  
  if (isLegacyGroup(groupName)) {
    return groupName.substring(LEGACY_PREFIX.length).trim();
  }
  
  return null;
}

/**
 * Check if group is a testing group
 * Must be both a valid initiative group AND end with testing suffix
 */
export function isTestingGroup(groupName: string): boolean {
  return groupName.endsWith(TESTING_SUFFIX) && isValidInitiativeGroup(groupName);
}

/**
 * Generate group names for a state (new convention)
 */
export function generateGroupNames(stateName: string): {
  production: string;
  testing: string;
} {
  return {
    production: `${GROUP_PREFIX}${stateName}`,
    testing: `${GROUP_PREFIX}${stateName}${TESTING_SUFFIX}`,
  };
}

/**
 * Normalize group name to extract the canonical state identifier
 * This helps map both old and new group formats to the same state
 */
export function normalizeGroupToState(groupName: string): string | null {
  const state = extractStateFromGroup(groupName);
  if (!state) {
    return null;
  }
  
  // Return lowercase, hyphenated version for consistent mapping
  return state.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Get all valid initiative groups from a list of groups
 * Filters and returns only groups that match initiative patterns
 */
export function filterInitiativeGroups(groups: string[]): string[] {
  return groups.filter(isValidInitiativeGroup);
}

/**
 * Group classification result
 */
export interface GroupClassification {
  isValid: boolean;
  isLegacy: boolean;
  isTesting: boolean;
  stateName: string | null;
  normalizedState: string | null;
}

/**
 * Classify a group name and extract all relevant information
 */
export function classifyGroup(groupName: string): GroupClassification {
  const isValid = isValidInitiativeGroup(groupName);
  const isLegacy = isLegacyGroup(groupName);
  const isTesting = isTestingGroup(groupName);
  const stateName = extractStateFromGroup(groupName);
  const normalizedState = normalizeGroupToState(groupName);
  
  return {
    isValid,
    isLegacy,
    isTesting,
    stateName,
    normalizedState,
  };
}

/**
 * Convert legacy group name to new format
 */
export function convertLegacyToNewFormat(legacyGroupName: string): {
  production: string;
  testing: string;
} | null {
  if (!isLegacyGroup(legacyGroupName)) {
    return null;
  }
  
  const stateName = extractStateFromGroup(legacyGroupName);
  if (!stateName) {
    return null;
  }
  
  return generateGroupNames(stateName);
}

/**
 * Find the best matching group from a list
 * Prioritizes new format over legacy, production over testing
 */
export function findBestInitiativeGroup(groups: string[]): string | null {
  const validGroups = filterInitiativeGroups(groups);
  
  if (validGroups.length === 0) {
    return null;
  }
  
  // Sort by preference: new format first, then production over testing
  const sortedGroups = validGroups.sort((a, b) => {
    const aInfo = classifyGroup(a);
    const bInfo = classifyGroup(b);
    
    // Prefer new format over legacy
    if (!aInfo.isLegacy && bInfo.isLegacy) return -1;
    if (aInfo.isLegacy && !bInfo.isLegacy) return 1;
    
    // Prefer production over testing
    if (!aInfo.isTesting && bInfo.isTesting) return -1;
    if (aInfo.isTesting && !bInfo.isTesting) return 1;
    
    // Alphabetical order for consistency
    return a.localeCompare(b);
  });
  
  return sortedGroups[0];
}
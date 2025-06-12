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
export const TESTING_SUFFIX = config.TESTING_GROUP_SUFFIX;

/**
 * Check if a group follows the new Partner Portal naming convention
 * Supports patterns like:
 * - "Partner Portal - EC Oregon"
 * - "Partner Portal - EC Oregon - Testing"
 * - "Partner Portal - EC Oregon - All Users"
 * - "Partner Portal - EC Oregon - Foster Only"
 * - "Partner Portal - EC Oregon - Foster & Volunteer"
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
  
  // State name should start with a known state identifier
  const statePart = parts[0].trim();
  const validStates = ['Arkansas', 'Oregon', 'Tennessee', 'Kentucky', 'Oklahoma'];
  if (!validStates.some(state => statePart.includes(state))) {
    return false;
  }
  
  // Can have optional suffixes (Testing, All Users, Foster Only, etc.)
  if (parts.length > 1) {
    const validSuffixes = [
      'Testing',
      'All Users',
      'Foster Only',
      'Volunteer Only',
      'Foster & Volunteer'
    ];
    
    // Check if the last part is a valid suffix
    const lastPart = parts[parts.length - 1].trim();
    return validSuffixes.includes(lastPart);
  }
  
  return true;
}

/**
 * Check if a group is any valid initiative group
 * Only supports GUIDs and Partner Portal format
 */
export function isValidInitiativeGroup(groupName: string): boolean {
  // Check if it's a GUID
  if (groupName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return true;
  }
  
  return isPartnerPortalGroup(groupName);
}

/**
 * Extract state name from Partner Portal group
 * Handles patterns like "EC Oregon - All Users" -> "Oregon"
 */
export function extractStateFromGroup(groupName: string): string | null {
  if (isPartnerPortalGroup(groupName)) {
    const afterPrefix = groupName.substring(GROUP_PREFIX.length);
    const parts = afterPrefix.split(' - ');
    const statePart = parts[0];
    
    // Extract just the state name (e.g., "EC Oregon" -> "Oregon")
    const stateMatch = statePart.match(/^EC\s+(\w+)/);
    if (stateMatch) {
      return stateMatch[1];
    }
    return statePart.trim();
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
  isTesting: boolean;
  stateName: string | null;
  normalizedState: string | null;
  groupType?: 'all-users' | 'role' | 'standard';
}

/**
 * Classify a group name and extract all relevant information
 */
export function classifyGroup(groupName: string): GroupClassification {
  const isValid = isValidInitiativeGroup(groupName);
  const isTesting = isTestingGroup(groupName);
  const stateName = extractStateFromGroup(groupName);
  const normalizedState = normalizeGroupToState(groupName);
  
  let groupType: 'all-users' | 'role' | 'standard' | undefined;
  if (groupName.includes('All Users')) {
    groupType = 'all-users';
  } else if (groupName.includes('Foster') || groupName.includes('Volunteer')) {
    groupType = 'role';
  } else if (isPartnerPortalGroup(groupName)) {
    groupType = 'standard';
  }
  
  return {
    isValid,
    isTesting,
    stateName,
    normalizedState,
    groupType,
  };
}


/**
 * Find the best matching group from a list
 * Note: This function is deprecated. Use GUID-based matching instead.
 * Kept only for reference during migration.
 */
export function findBestInitiativeGroup(_groups: string[]): string | null {
  // This function should not be used in production
  // All group matching should be done via GUIDs
  console.warn('[DEPRECATED] findBestInitiativeGroup is deprecated. Use GUID-based matching.');
  return null;
}
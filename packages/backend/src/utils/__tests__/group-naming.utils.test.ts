import { describe, it, expect } from 'vitest';
import {
  GROUP_PREFIX,
  LEGACY_PREFIX,
  TESTING_SUFFIX,
  isPartnerPortalGroup,
  isLegacyGroup,
  isValidInitiativeGroup,
  extractStateFromGroup,
  isTestingGroup,
  generateGroupNames,
  normalizeGroupToState,
  filterInitiativeGroups,
  classifyGroup,
  convertLegacyToNewFormat,
  findBestInitiativeGroup,
} from '../group-naming.utils';

describe('Group Naming Utilities', () => {
  describe('Constants', () => {
    it('should have correct prefixes and suffixes', () => {
      expect(GROUP_PREFIX).toBe('Partner Portal - EC ');
      expect(LEGACY_PREFIX).toBe('EC ');
      expect(TESTING_SUFFIX).toBe(' - Testing');
    });
  });

  describe('isPartnerPortalGroup', () => {
    it('should return true for valid new format groups', () => {
      expect(isPartnerPortalGroup('Partner Portal - EC Arkansas')).toBe(true);
      expect(isPartnerPortalGroup('Partner Portal - EC Oregon - Testing')).toBe(true);
      expect(isPartnerPortalGroup('Partner Portal - EC Tennessee')).toBe(true);
    });

    it('should return false for invalid new format groups', () => {
      expect(isPartnerPortalGroup('EC Arkansas')).toBe(false);
      expect(isPartnerPortalGroup('Partner Portal - EC')).toBe(false);
      expect(isPartnerPortalGroup('Partner Portal - EC Arkansas - Invalid')).toBe(false);
      expect(isPartnerPortalGroup('Partner Portal - EC Arkansas - Testing - Extra')).toBe(false);
      expect(isPartnerPortalGroup('Some Other Group')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isPartnerPortalGroup('')).toBe(false);
      expect(isPartnerPortalGroup('Partner Portal - EC ')).toBe(false);
      expect(isPartnerPortalGroup('Partner Portal - EC  - Testing')).toBe(false); // Extra space makes state name empty
    });
  });

  describe('isLegacyGroup', () => {
    it('should return true for valid legacy format groups', () => {
      expect(isLegacyGroup('EC Arkansas')).toBe(true);
      expect(isLegacyGroup('EC Oregon')).toBe(true);
      expect(isLegacyGroup('EC Tennessee')).toBe(true);
    });

    it('should return false for new format groups', () => {
      expect(isLegacyGroup('Partner Portal - EC Arkansas')).toBe(false);
      expect(isLegacyGroup('Partner Portal - EC Oregon - Testing')).toBe(false);
    });

    it('should return false for invalid legacy groups', () => {
      expect(isLegacyGroup('EC')).toBe(false);
      expect(isLegacyGroup('EC ')).toBe(false);
      expect(isLegacyGroup('Some Other Group')).toBe(false);
    });
  });

  describe('isValidInitiativeGroup', () => {
    it('should return true for both new and legacy valid groups', () => {
      expect(isValidInitiativeGroup('Partner Portal - EC Arkansas')).toBe(true);
      expect(isValidInitiativeGroup('Partner Portal - EC Oregon - Testing')).toBe(true);
      expect(isValidInitiativeGroup('EC Arkansas')).toBe(true);
      expect(isValidInitiativeGroup('EC Oregon')).toBe(true);
    });

    it('should return false for invalid groups', () => {
      expect(isValidInitiativeGroup('Some Other Group')).toBe(false);
      expect(isValidInitiativeGroup('Random Group')).toBe(false);
      expect(isValidInitiativeGroup('')).toBe(false);
    });
  });

  describe('extractStateFromGroup', () => {
    it('should extract state from new format groups', () => {
      expect(extractStateFromGroup('Partner Portal - EC Arkansas')).toBe('Arkansas');
      expect(extractStateFromGroup('Partner Portal - EC Oregon - Testing')).toBe('Oregon');
      expect(extractStateFromGroup('Partner Portal - EC Tennessee')).toBe('Tennessee');
    });

    it('should extract state from legacy format groups', () => {
      expect(extractStateFromGroup('EC Arkansas')).toBe('Arkansas');
      expect(extractStateFromGroup('EC Oregon')).toBe('Oregon');
      expect(extractStateFromGroup('EC Tennessee')).toBe('Tennessee');
    });

    it('should return null for invalid groups', () => {
      expect(extractStateFromGroup('Some Other Group')).toBe(null);
      expect(extractStateFromGroup('Random Group')).toBe(null);
      expect(extractStateFromGroup('')).toBe(null);
    });

    it('should handle whitespace properly', () => {
      expect(extractStateFromGroup('Partner Portal - EC  Arkansas  ')).toBe('Arkansas');
      expect(extractStateFromGroup('EC  Oregon  ')).toBe('Oregon');
    });
  });

  describe('isTestingGroup', () => {
    it('should return true for testing groups', () => {
      expect(isTestingGroup('Partner Portal - EC Arkansas - Testing')).toBe(true);
      expect(isTestingGroup('Partner Portal - EC Oregon - Testing')).toBe(true);
    });

    it('should return false for production groups', () => {
      expect(isTestingGroup('Partner Portal - EC Arkansas')).toBe(false);
      expect(isTestingGroup('EC Arkansas')).toBe(false);
    });

    it('should return false for invalid groups', () => {
      expect(isTestingGroup('Some Other Group - Testing')).toBe(false);
    });
  });

  describe('generateGroupNames', () => {
    it('should generate correct group names', () => {
      const result = generateGroupNames('Arkansas');
      expect(result.production).toBe('Partner Portal - EC Arkansas');
      expect(result.testing).toBe('Partner Portal - EC Arkansas - Testing');
    });

    it('should handle different state names', () => {
      const result = generateGroupNames('Oregon');
      expect(result.production).toBe('Partner Portal - EC Oregon');
      expect(result.testing).toBe('Partner Portal - EC Oregon - Testing');
    });
  });

  describe('normalizeGroupToState', () => {
    it('should normalize group names to consistent state identifiers', () => {
      expect(normalizeGroupToState('Partner Portal - EC Arkansas')).toBe('arkansas');
      expect(normalizeGroupToState('EC Arkansas')).toBe('arkansas');
      expect(normalizeGroupToState('Partner Portal - EC New Mexico')).toBe('new-mexico');
    });

    it('should return null for invalid groups', () => {
      expect(normalizeGroupToState('Some Other Group')).toBe(null);
      expect(normalizeGroupToState('')).toBe(null);
    });
  });

  describe('filterInitiativeGroups', () => {
    it('should filter to only valid initiative groups', () => {
      const groups = [
        'Partner Portal - EC Arkansas',
        'EC Oregon',
        'Some Other Group',
        'Partner Portal - EC Tennessee - Testing',
        'Random Group',
        'EC Kentucky'
      ];

      const filtered = filterInitiativeGroups(groups);
      expect(filtered).toEqual([
        'Partner Portal - EC Arkansas',
        'EC Oregon',
        'Partner Portal - EC Tennessee - Testing',
        'EC Kentucky'
      ]);
    });

    it('should return empty array for no valid groups', () => {
      const groups = ['Some Group', 'Another Group', 'Random Group'];
      const filtered = filterInitiativeGroups(groups);
      expect(filtered).toEqual([]);
    });
  });

  describe('classifyGroup', () => {
    it('should classify new format production groups correctly', () => {
      const result = classifyGroup('Partner Portal - EC Arkansas');
      expect(result.isValid).toBe(true);
      expect(result.isLegacy).toBe(false);
      expect(result.isTesting).toBe(false);
      expect(result.stateName).toBe('Arkansas');
      expect(result.normalizedState).toBe('arkansas');
    });

    it('should classify new format testing groups correctly', () => {
      const result = classifyGroup('Partner Portal - EC Oregon - Testing');
      expect(result.isValid).toBe(true);
      expect(result.isLegacy).toBe(false);
      expect(result.isTesting).toBe(true);
      expect(result.stateName).toBe('Oregon');
      expect(result.normalizedState).toBe('oregon');
    });

    it('should classify legacy groups correctly', () => {
      const result = classifyGroup('EC Tennessee');
      expect(result.isValid).toBe(true);
      expect(result.isLegacy).toBe(true);
      expect(result.isTesting).toBe(false);
      expect(result.stateName).toBe('Tennessee');
      expect(result.normalizedState).toBe('tennessee');
    });

    it('should classify invalid groups correctly', () => {
      const result = classifyGroup('Some Other Group');
      expect(result.isValid).toBe(false);
      expect(result.isLegacy).toBe(false);
      expect(result.isTesting).toBe(false);
      expect(result.stateName).toBe(null);
      expect(result.normalizedState).toBe(null);
    });
  });

  describe('convertLegacyToNewFormat', () => {
    it('should convert legacy groups to new format', () => {
      const result = convertLegacyToNewFormat('EC Arkansas');
      expect(result).toEqual({
        production: 'Partner Portal - EC Arkansas',
        testing: 'Partner Portal - EC Arkansas - Testing'
      });
    });

    it('should return null for non-legacy groups', () => {
      expect(convertLegacyToNewFormat('Partner Portal - EC Arkansas')).toBe(null);
      expect(convertLegacyToNewFormat('Some Other Group')).toBe(null);
    });
  });

  describe('findBestInitiativeGroup', () => {
    it('should prefer new format over legacy', () => {
      const groups = ['EC Arkansas', 'Partner Portal - EC Arkansas'];
      const best = findBestInitiativeGroup(groups);
      expect(best).toBe('Partner Portal - EC Arkansas');
    });

    it('should prefer production over testing', () => {
      const groups = ['Partner Portal - EC Arkansas - Testing', 'Partner Portal - EC Arkansas'];
      const best = findBestInitiativeGroup(groups);
      expect(best).toBe('Partner Portal - EC Arkansas');
    });

    it('should return null for no valid groups', () => {
      const groups = ['Some Group', 'Another Group'];
      const best = findBestInitiativeGroup(groups);
      expect(best).toBe(null);
    });

    it('should handle complex priority scenarios', () => {
      const groups = [
        'EC Oregon',
        'Partner Portal - EC Arkansas - Testing',
        'Some Other Group',
        'Partner Portal - EC Tennessee',
        'EC Kentucky'
      ];
      
      // Should prefer new format production group
      const best = findBestInitiativeGroup(groups);
      expect(best).toBe('Partner Portal - EC Tennessee');
    });

    it('should use alphabetical order as final tiebreaker', () => {
      const groups = ['EC Oregon', 'EC Arkansas'];
      const best = findBestInitiativeGroup(groups);
      expect(best).toBe('EC Arkansas'); // Arkansas comes before Oregon alphabetically
    });
  });
});
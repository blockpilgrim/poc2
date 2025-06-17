import { describe, it, expect, vi } from 'vitest';
import { 
  getD365GuidForInitiative, 
  getInitiativeIdFromGuid,
  validateInitiativesConfig 
} from '../initiatives.config';

describe('initiatives.config', () => {
  describe('getD365GuidForInitiative', () => {
    it('should return GUID for enabled initiative', () => {
      const guid = getD365GuidForInitiative('ec-oregon');
      expect(guid).toBe('b6ced3de-2993-ed11-aad1-6045bd006a3a');
    });

    it('should return undefined for unknown initiative', () => {
      const guid = getD365GuidForInitiative('ec-unknown');
      expect(guid).toBeUndefined();
    });
  });

  describe('getInitiativeIdFromGuid', () => {
    it('should return initiative ID for known GUID', () => {
      const id = getInitiativeIdFromGuid('b6ced3de-2993-ed11-aad1-6045bd006a3a');
      expect(id).toBe('ec-oregon');
    });

    it('should return undefined for unknown GUID', () => {
      const id = getInitiativeIdFromGuid('unknown-guid-0000-0000-0000-000000000000');
      expect(id).toBeUndefined();
    });

    it('should handle case insensitive GUID lookup', () => {
      // Oregon GUID in uppercase
      const id = getInitiativeIdFromGuid('B6CED3DE-2993-ED11-AAD1-6045BD006A3A');
      expect(id).toBe('ec-oregon');
    });
  });

  describe('validateInitiativesConfig', () => {
    it('should warn about placeholder GUIDs in default config', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const isValid = validateInitiativesConfig();
      
      // Should warn about placeholder GUIDs
      expect(consoleSpy).toHaveBeenCalled();
      
      // Check that warnings were issued for placeholder GUIDs
      const warnCalls = consoleSpy.mock.calls.map(call => call[0]);
      const placeholderWarnings = warnCalls.filter(msg => 
        msg.includes('placeholder GUID')
      );
      expect(placeholderWarnings.length).toBeGreaterThan(0);
      
      // Should error about enabled initiatives with placeholder GUIDs
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      const errorCalls = consoleErrorSpy.mock.calls.map(call => call[0]);
      const placeholderErrors = errorCalls.filter(msg => 
        msg.includes('must have valid D365 GUID')
      );
      expect(placeholderErrors.length).toBeGreaterThan(0);
      
      expect(isValid).toBe(false); // Invalid due to placeholder GUIDs
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('GUID validation', () => {
    it('should recognize valid GUID formats', () => {
      // These are the actual placeholder GUIDs used
      const placeholderPattern = /^00000000-0000-0000-0000-00000000000[0-9]$/;
      
      expect(placeholderPattern.test('00000000-0000-0000-0000-000000000001')).toBe(true);
      expect(placeholderPattern.test('00000000-0000-0000-0000-000000000002')).toBe(true);
      expect(placeholderPattern.test('00000000-0000-0000-0000-000000000003')).toBe(true);
      expect(placeholderPattern.test('00000000-0000-0000-0000-000000000004')).toBe(true);
      
      // Real GUIDs should not match placeholder pattern
      expect(placeholderPattern.test('b6ced3de-2993-ed11-aad1-6045bd006a3a')).toBe(false);
    });
  });
});
import { z } from 'zod';
import { config } from './index';

/**
 * Initiative Configuration
 * 
 * This configuration maps application initiative IDs (e.g., 'ec-oregon') to their
 * corresponding D365 Initiative entity GUIDs. This is critical for security filtering
 * in D365 queries.
 * 
 * IMPORTANT: In production, these GUIDs should come from environment variables
 * or a configuration service to support 50+ state scalability without code changes.
 */

// Schema for a single initiative configuration
const initiativeSchema = z.object({
  d365Guid: z.string().uuid('Invalid D365 GUID format'),
  displayName: z.string(),
  enabled: z.boolean().default(true),
});

// Schema for the full initiatives configuration
const initiativesConfigSchema = z.object({
  initiatives: z.record(z.string(), initiativeSchema),
});

export type InitiativeConfig = z.infer<typeof initiativeSchema>;
export type InitiativesConfig = z.infer<typeof initiativesConfigSchema>;

// Default configuration for development
// In production, this should be loaded from environment variables
const defaultConfig: InitiativesConfig = {
  initiatives: {
    'ec-oregon': {
      d365Guid: 'b6ced3de-2993-ed11-aad1-6045bd006a3a',
      displayName: 'Oregon',
      enabled: true,
    },
    'ec-kentucky': {
      d365Guid: '00000000-0000-0000-0000-000000000001', // TODO: Replace with actual GUID
      displayName: 'Kentucky',
      enabled: true,
    },
    'ec-arkansas': {
      d365Guid: '00000000-0000-0000-0000-000000000002', // TODO: Replace with actual GUID
      displayName: 'Arkansas',
      enabled: true,
    },
    'ec-tennessee': {
      d365Guid: '00000000-0000-0000-0000-000000000003', // TODO: Replace with actual GUID
      displayName: 'Tennessee',
      enabled: true,
    },
    'ec-oklahoma': {
      d365Guid: '00000000-0000-0000-0000-000000000004', // TODO: Replace with actual GUID
      displayName: 'Oklahoma',
      enabled: true,
    },
  },
};

/**
 * Load initiatives configuration from environment or use defaults
 * 
 * In production, this should load from:
 * 1. Environment variable INITIATIVES_CONFIG_JSON
 * 2. Configuration service endpoint
 * 3. Azure App Configuration
 * 
 * This allows adding new states without code changes.
 */
export function loadInitiativesConfig(): InitiativesConfig {
  try {
    // Check for environment variable configuration
    const configJson = process.env.INITIATIVES_CONFIG_JSON;
    if (configJson) {
      const parsed = JSON.parse(configJson);
      const validated = initiativesConfigSchema.parse(parsed);
      console.log('[InitiativesConfig] Loaded from environment variable');
      return validated;
    }

    // In production, you might fetch from a configuration service here
    // const remoteConfig = await fetchFromConfigService();

    // For now, use default configuration
    console.log('[InitiativesConfig] Using default configuration');
    return defaultConfig;
  } catch (error) {
    console.error('[InitiativesConfig] Failed to load configuration:', error);
    // Fall back to defaults in development, fail in production
    if (config.NODE_ENV === 'production') {
      throw new Error('Failed to load initiatives configuration');
    }
    return defaultConfig;
  }
}

// Export the loaded configuration
export const initiativesConfig = loadInitiativesConfig();

/**
 * Helper to get D365 GUID for an initiative
 * @param initiativeId - The initiative ID (e.g., 'ec-oregon')
 * @returns The D365 GUID or undefined if not found
 */
export function getD365GuidForInitiative(initiativeId: string): string | undefined {
  const initiative = initiativesConfig.initiatives[initiativeId];
  return initiative?.enabled ? initiative.d365Guid : undefined;
}

/**
 * Build reverse lookup map for efficient GUID to initiative ID conversion
 * This is used when mapping D365 data back to application format
 */
function buildReverseLookupMap(): Map<string, string> {
  const map = new Map<string, string>();
  
  for (const [initiativeId, config] of Object.entries(initiativesConfig.initiatives)) {
    if (config.enabled) {
      // Store GUID in lowercase for case-insensitive lookup
      map.set(config.d365Guid.toLowerCase(), initiativeId);
    }
  }
  
  return map;
}

// Cache the reverse lookup map for performance
const guidToInitiativeMap = buildReverseLookupMap();

/**
 * Get initiative ID from D365 GUID
 * @param d365Guid - The D365 Initiative GUID
 * @returns The application initiative ID (e.g., 'ec-oregon') or undefined
 */
export function getInitiativeIdFromGuid(d365Guid: string): string | undefined {
  // Convert to lowercase for case-insensitive lookup
  return guidToInitiativeMap.get(d365Guid.toLowerCase());
}

/**
 * Validate that all configured initiatives have valid GUIDs
 * This should be called during application startup
 */
export function validateInitiativesConfig(): boolean {
  let isValid = true;
  const placeholderGuidPattern = /^00000000-0000-0000-0000-00000000000[0-9]$/;

  for (const [id, config] of Object.entries(initiativesConfig.initiatives)) {
    // Check for placeholder GUIDs
    if (placeholderGuidPattern.test(config.d365Guid)) {
      console.warn(`[InitiativesConfig] Initiative '${id}' has placeholder GUID: ${config.d365Guid}`);
      if (config.enabled) {
        console.error(`[InitiativesConfig] Enabled initiative '${id}' must have valid D365 GUID`);
        isValid = false;
      }
    }

    // Additional validation could be added here
    // e.g., verify GUID exists in D365
  }

  return isValid;
}
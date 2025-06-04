import { InitiativeConfig } from '../types/initiative';
/**
 * Initiative configurations for each US state expansion
 * These define the theming and branding for each state's partner portal
 */
export declare const INITIATIVE_CONFIG: InitiativeConfig;
export declare function getInitiativeByName(name: string): typeof INITIATIVE_CONFIG[keyof typeof INITIATIVE_CONFIG] | undefined;
export declare function getInitiativeByStateCode(stateCode: string): typeof INITIATIVE_CONFIG[keyof typeof INITIATIVE_CONFIG] | undefined;
//# sourceMappingURL=initiatives.d.ts.map
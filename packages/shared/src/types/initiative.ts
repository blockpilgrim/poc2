/**
 * Initiative represents a US state expansion in the Partner Portal.
 * This is a CRITICAL security boundary - users can only access data
 * tagged with their initiative.
 */
export interface Initiative {
  id: string;
  name: string; // e.g., "EC Arkansas", "EC Kentucky"
  stateCode: string; // e.g., "AR", "KY"
  displayName: string; // e.g., "Arkansas Partner Portal"
  theme: InitiativeTheme;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiativeTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logo: string; // Path to logo file
  favicon: string; // Path to favicon
  customCSS?: string; // Optional custom CSS overrides
}

export interface InitiativeConfig {
  [initiativeId: string]: {
    name: string;
    stateCode: string;
    displayName: string;
    theme: InitiativeTheme;
  };
}
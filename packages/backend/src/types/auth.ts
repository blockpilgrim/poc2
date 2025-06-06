import { JWTPayload as BaseJWTPayload } from '@partner-portal/shared';

/**
 * Extended JWT payload with additional fields for the backend
 * Includes Entra ID groups and roles
 */
export interface ExtendedJWTPayload extends BaseJWTPayload {
  initiativeName?: string; // Display name for the initiative
  initiativeCode?: string; // Internal initiative code
  azureId?: string; // Azure AD Object ID
  iss?: string; // Issuer
  aud?: string; // Audience
}

/**
 * ID Token claims from Azure AD
 */
export interface AzureADIdTokenClaims {
  aud: string;
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
  name?: string;
  nonce?: string;
  oid: string;
  preferred_username?: string;
  rh?: string;
  sub: string;
  tid: string;
  uti?: string;
  ver: string;
  groups?: string[]; // Security group IDs
  roles?: string[]; // App role values
  email?: string;
}

/**
 * Request with authenticated user
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: ExtendedJWTPayload;
}
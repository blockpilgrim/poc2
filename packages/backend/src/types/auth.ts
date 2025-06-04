import { JWTPayload as BaseJWTPayload } from '@partner-portal/shared';

/**
 * Extended JWT payload with additional fields for the backend
 * Note: We override roles to be string[] for simpler token handling
 */
export interface ExtendedJWTPayload extends Omit<BaseJWTPayload, 'roles'> {
  roles: string[]; // Override to string array
  initiativeName?: string;
  initiativeCode?: string;
  azureId?: string;
  iss?: string;
  aud?: string;
}

/**
 * Request with authenticated user
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: ExtendedJWTPayload;
}
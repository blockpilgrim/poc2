import { Configuration, LogLevel } from '@azure/msal-node';
import { config } from './index';

/**
 * MSAL Configuration for Azure AD authentication
 * This configuration sets up the confidential client application
 * that will handle server-side authentication flows
 */

// Validate required Azure AD configuration
const validateAuthConfig = () => {
  const required = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'];
  const missing = required.filter(key => !config[key as keyof typeof config]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Azure AD configuration: ${missing.join(', ')}`);
  }
};

// Log level mapping based on environment
const getMsalLogLevel = (): LogLevel => {
  switch (config.LOG_LEVEL) {
    case 'error':
      return LogLevel.Error;
    case 'warn':
      return LogLevel.Warning;
    case 'info':
      return LogLevel.Info;
    case 'debug':
      return LogLevel.Verbose;
    default:
      return LogLevel.Info;
  }
};

// MSAL configuration object
export const msalConfig: Configuration = {
  auth: {
    clientId: config.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`,
    clientSecret: config.AZURE_CLIENT_SECRET!,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(`[MSAL] ${message}`);
            break;
          case LogLevel.Warning:
            console.warn(`[MSAL] ${message}`);
            break;
          case LogLevel.Info:
            console.info(`[MSAL] ${message}`);
            break;
          case LogLevel.Verbose:
            console.debug(`[MSAL] ${message}`);
            break;
        }
      },
      piiLoggingEnabled: false,
      logLevel: getMsalLogLevel(),
    },
    // Network configuration - MSAL Node requires explicit network client
    networkClient: {
      sendGetRequestAsync: async (url: string, options?: any) => {
        const response = await fetch(url, { method: 'GET', ...options });
        const bodyText = await response.text();
        let parsedBody;
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          parsedBody = bodyText;
        }
        return {
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
          status: response.status
        };
      },
      sendPostRequestAsync: async (url: string, options?: any) => {
        const response = await fetch(url, { method: 'POST', ...options });
        const bodyText = await response.text();
        let parsedBody;
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          parsedBody = bodyText;
        }
        return {
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
          status: response.status
        };
      }
    },
    // Proxy configuration (if needed in production)
    proxyUrl: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined,
  },
};

// Redirect URIs for authentication flows
export const authConfig = {
  redirectUri: config.AZURE_REDIRECT_URI || `http://localhost:${config.PORT}/api/auth/callback`,
  postLogoutRedirectUri: `${config.FRONTEND_URL}/`,
  
  // Scopes for Microsoft Graph API (to fetch user profile)
  graphScopes: ['user.read', 'profile', 'openid', 'email'],
  
  // Scopes for D365 API access
  d365Scopes: config.D365_URL ? [`${config.D365_URL}/.default`] : [],
  
  // Token lifetimes
  accessTokenLifetime: config.JWT_EXPIRES_IN,
  refreshTokenLifetime: config.JWT_REFRESH_EXPIRES_IN,
};

// Initialize auth configuration validation
if (config.NODE_ENV !== 'test') {
  try {
    validateAuthConfig();
    console.log('✅ Azure AD authentication configured successfully');
  } catch (error) {
    console.error('❌ Azure AD authentication configuration error:', error);
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

export default msalConfig;
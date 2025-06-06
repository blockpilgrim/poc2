import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment configuration schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  
  // Azure AD
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_REDIRECT_URI: z.string().optional(),
  
  // D365
  D365_URL: z.string().optional(),
  D365_CLIENT_ID: z.string().optional(),
  D365_CLIENT_SECRET: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32).default('development-secret-change-in-production').refine(
    (val) => process.env.NODE_ENV !== 'production' || val !== 'development-secret-change-in-production',
    'Production requires a secure JWT secret'
  ),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Feature flags
  ENTRA_GROUPS_ENABLED: z.string().default('true').transform((val) => val === 'true'),
  D365_ORG_DATA_ENABLED: z.string().default('true').transform((val) => val === 'true'),
  AZURE_GROUP_CLAIM_TYPE: z.enum(['securityGroup', 'all']).default('securityGroup'),
});

// Parse and validate environment variables
const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Invalid environment variables:', envResult.error.format());
  process.exit(1);
}

export const config = envResult.data;

// Export typed config
export type Config = typeof config;
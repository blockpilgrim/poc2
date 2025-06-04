import { z } from 'zod';

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean(),
    inApp: z.boolean()
  }).optional(),
  tableSettings: z.record(z.string(), z.object({
    pageSize: z.number().min(10).max(100),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })).optional()
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  preferences: userPreferencesSchema.optional()
});
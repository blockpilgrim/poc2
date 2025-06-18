import { z } from 'zod';

/**
 * Lead schemas - Updated to match tc_everychildlead entity
 */

export const leadStatusSchema = z.enum([
  'assigned',
  'in-progress',
  'certified',
  'on-hold',
  'closed',
  'other'
]);

export const leadTypeSchema = z.enum([
  'foster',
  'volunteer',
  'other'
]);

// Note: Priority and address are no longer part of the Lead entity
// export const leadPrioritySchema = z.enum(['low', 'medium', 'high']);
// export const addressSchema = z.object({ ... });

/**
 * Create lead schema - aligned with tc_everychildlead entity
 * Note: Backend create endpoint not yet implemented
 */
export const createLeadSchema = z.object({
  name: z.string().min(1).max(200), // Lead title
  subjectName: z.string().max(200).optional(),
  subjectEmail: z.string().email().optional(),
  leadOwnerName: z.string().max(200).optional(),
  status: leadStatusSchema.default('assigned'),
  type: leadTypeSchema,
  leadScore: z.number().optional(),
  initiativeId: z.string(), // Required
});

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  // Other fields are read-only from D365
});

/**
 * Lead filters schema
 * Note: Currently only search, pagination, and sorting are functional
 * Other filters are preserved for future backend support
 */
export const leadFiltersSchema = z.object({
  search: z.string().optional(), // ✅ Functional
  // Future filters - not yet supported by backend:
  // status: z.union([leadStatusSchema, z.array(leadStatusSchema)]).optional(),
  // type: z.union([leadTypeSchema, z.array(leadTypeSchema)]).optional(),
  // assignedToId: z.string().optional(),
  // assignedOrganizationId: z.string().optional(),
  // dateFrom: z.string().datetime().optional(),
  // dateTo: z.string().datetime().optional(),
  page: z.number().min(1).default(1), // ✅ Functional
  pageSize: z.number().min(10).max(100).default(25), // ✅ Functional
  sortBy: z.string().optional(), // ✅ Functional
  sortOrder: z.enum(['asc', 'desc']).default('desc') // ✅ Functional
});
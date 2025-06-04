import { z } from 'zod';

export const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'in_progress',
  'converted',
  'closed',
  'lost'
]);

export const leadTypeSchema = z.enum([
  'foster',
  'volunteer',
  'donor',
  'partner',
  'other'
]);

export const leadPrioritySchema = z.enum(['low', 'medium', 'high']);

export const addressSchema = z.object({
  street1: z.string().min(1).max(100),
  street2: z.string().max(100).optional(),
  city: z.string().min(1).max(50),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default('USA')
});

export const createLeadSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  alternatePhone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  address: addressSchema.optional(),
  status: leadStatusSchema.default('new'),
  type: leadTypeSchema,
  priority: leadPrioritySchema.optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional()
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.union([leadStatusSchema, z.array(leadStatusSchema)]).optional(),
  type: z.union([leadTypeSchema, z.array(leadTypeSchema)]).optional(),
  assignedToId: z.string().optional(),
  assignedOrganizationId: z.string().optional(),
  priority: leadPrioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(10).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
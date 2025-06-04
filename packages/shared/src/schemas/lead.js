"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadFiltersSchema = exports.updateLeadSchema = exports.createLeadSchema = exports.addressSchema = exports.leadPrioritySchema = exports.leadTypeSchema = exports.leadStatusSchema = void 0;
const zod_1 = require("zod");
exports.leadStatusSchema = zod_1.z.enum([
    'new',
    'contacted',
    'qualified',
    'in_progress',
    'converted',
    'closed',
    'lost'
]);
exports.leadTypeSchema = zod_1.z.enum([
    'foster',
    'volunteer',
    'donor',
    'partner',
    'other'
]);
exports.leadPrioritySchema = zod_1.z.enum(['low', 'medium', 'high']);
exports.addressSchema = zod_1.z.object({
    street1: zod_1.z.string().min(1).max(100),
    street2: zod_1.z.string().max(100).optional(),
    city: zod_1.z.string().min(1).max(50),
    state: zod_1.z.string().length(2),
    zipCode: zod_1.z.string().regex(/^\d{5}(-\d{4})?$/),
    country: zod_1.z.string().default('USA')
});
exports.createLeadSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(50),
    lastName: zod_1.z.string().min(1).max(50),
    email: zod_1.z.string().email().optional(),
    phoneNumber: zod_1.z.string().regex(/^\+?[\d\s-()]+$/).optional(),
    alternatePhone: zod_1.z.string().regex(/^\+?[\d\s-()]+$/).optional(),
    address: exports.addressSchema.optional(),
    status: exports.leadStatusSchema.default('new'),
    type: exports.leadTypeSchema,
    priority: exports.leadPrioritySchema.optional(),
    source: zod_1.z.string().max(100).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
exports.updateLeadSchema = exports.createLeadSchema.partial();
exports.leadFiltersSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.union([exports.leadStatusSchema, zod_1.z.array(exports.leadStatusSchema)]).optional(),
    type: zod_1.z.union([exports.leadTypeSchema, zod_1.z.array(exports.leadTypeSchema)]).optional(),
    assignedToId: zod_1.z.string().optional(),
    assignedOrganizationId: zod_1.z.string().optional(),
    priority: exports.leadPrioritySchema.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
    page: zod_1.z.number().min(1).default(1),
    pageSize: zod_1.z.number().min(10).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc')
});
//# sourceMappingURL=lead.js.map
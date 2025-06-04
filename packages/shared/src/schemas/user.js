"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.userPreferencesSchema = void 0;
const zod_1 = require("zod");
exports.userPreferencesSchema = zod_1.z.object({
    theme: zod_1.z.enum(['light', 'dark', 'system']).optional(),
    notifications: zod_1.z.object({
        email: zod_1.z.boolean(),
        inApp: zod_1.z.boolean()
    }).optional(),
    tableSettings: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        pageSize: zod_1.z.number().min(10).max(100),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
    })).optional()
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(50).optional(),
    lastName: zod_1.z.string().min(1).max(50).optional(),
    phoneNumber: zod_1.z.string().regex(/^\+?[\d\s-()]+$/).optional(),
    preferences: exports.userPreferencesSchema.optional()
});
//# sourceMappingURL=user.js.map
/**
 * Lead Validation Rules
 * Validation constants and rules for lead data
 */

/**
 * Field length constraints
 */
export const LEAD_FIELD_LENGTHS = {
  FIRST_NAME: { min: 1, max: 100 },
  LAST_NAME: { min: 1, max: 100 },
  EMAIL: { max: 255 },
  PHONE: { min: 10, max: 20 },
  NOTES: { max: 2000 },
  TAG: { min: 1, max: 50 },
  MAX_TAGS: 10,
  
  // Address fields
  STREET: { max: 250 },
  CITY: { max: 100 },
  STATE: { min: 2, max: 50 },
  ZIP_CODE: { min: 5, max: 10 },
  COUNTRY: { min: 2, max: 100 },
} as const;

/**
 * Regular expressions for validation
 */
export const LEAD_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\s\-\+\(\)\.]+$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  STATE_CODE: /^[A-Z]{2}$/,
} as const;

/**
 * Validation error messages
 */
export const LEAD_VALIDATION_ERRORS = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PHONE: 'Please provide a valid phone number',
  INVALID_ZIP: 'Please provide a valid ZIP code (12345 or 12345-6789)',
  INVALID_STATE: 'Please provide a valid 2-letter state code',
  FIELD_TOO_SHORT: (field: string, min: number) => 
    `${field} must be at least ${min} characters`,
  FIELD_TOO_LONG: (field: string, max: number) => 
    `${field} must not exceed ${max} characters`,
  TOO_MANY_TAGS: `Cannot have more than ${LEAD_FIELD_LENGTHS.MAX_TAGS} tags`,
  INVALID_STATUS: 'Invalid lead status',
  INVALID_TYPE: 'Invalid lead type',
  INVALID_PRIORITY: 'Invalid priority level',
  INVALID_STATUS_TRANSITION: (from: string, to: string) => 
    `Cannot transition from status '${from}' to '${to}'`,
} as const;

/**
 * Required fields for different operations
 */
export const LEAD_REQUIRED_FIELDS = {
  CREATE: ['firstName', 'lastName', 'email', 'initiativeId'],
  UPDATE: ['id'],
  SEARCH: [],
} as const;

/**
 * Fields that should be sanitized before storage
 */
export const LEAD_SANITIZE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'alternatePhone',
  'notes',
  'tags',
  'address.street1',
  'address.street2',
  'address.city',
  'address.state',
  'address.zipCode',
] as const;
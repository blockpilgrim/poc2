/**
 * Lead Default Values
 * Default values and configurations for lead entities
 */

import type { LeadStatus, LeadType } from '@partner-portal/shared';

/**
 * Default values for new leads
 */
export const LEAD_DEFAULTS = {
  STATUS: 'new' as LeadStatus,
  TYPE: 'other' as LeadType,
  COUNTRY: 'USA',
  PRIORITY: 'medium' as const,
} as const;

/**
 * Lead status progression rules
 * Defines valid status transitions
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  'new': ['contacted', 'qualified', 'disqualified'],
  'contacted': ['qualified', 'nurturing', 'disqualified'],
  'qualified': ['proposal_sent', 'disqualified'],
  'proposal_sent': ['negotiation', 'won', 'lost'],
  'negotiation': ['won', 'lost'],
  'nurturing': ['contacted', 'qualified', 'disqualified'],
  'won': [], // Terminal state
  'lost': [], // Terminal state
  'disqualified': [], // Terminal state
};

/**
 * Lead type categories
 */
export const LEAD_TYPE_CATEGORIES = {
  PERSONAL: ['foster_parent', 'adoptive_parent', 'relative_caregiver'],
  PROFESSIONAL: ['social_worker', 'case_manager', 'therapist'],
  ORGANIZATIONAL: ['agency', 'nonprofit', 'government'],
  OTHER: ['volunteer', 'donor', 'other'],
} as const;

/**
 * Priority levels with display names
 */
export const LEAD_PRIORITIES = {
  low: { value: 'low', label: 'Low', color: '#6B7280' },
  medium: { value: 'medium', label: 'Medium', color: '#F59E0B' },
  high: { value: 'high', label: 'High', color: '#EF4444' },
} as const;

/**
 * Lead source options
 */
export const LEAD_SOURCES = [
  'website',
  'referral',
  'event',
  'social_media',
  'email_campaign',
  'phone',
  'walk_in',
  'partner',
  'other',
] as const;

/**
 * Common lead tags
 */
export const COMMON_LEAD_TAGS = [
  'urgent',
  'vip',
  'follow-up-required',
  'documentation-pending',
  'training-needed',
  'spanish-speaking',
  'first-time',
  'returning',
] as const;
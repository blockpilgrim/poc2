import { FilterParams } from './api';

/**
 * Lead management types
 */
export interface Lead {
  id: string;
  d365Id: string; // D365 Contact ID
  initiativeId: string; // CRITICAL: Initiative this lead belongs to
  
  // Contact Information
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  
  // Address
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Lead Details
  status: LeadStatus;
  source?: string;
  type: LeadType;
  priority?: 'low' | 'medium' | 'high';
  
  // Assignment
  assignedToId?: string;
  assignedToName?: string;
  assignedOrganizationId?: string;
  assignedOrganizationName?: string;
  
  // Metadata
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  assignedAt?: Date;
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiation'
  | 'nurturing'
  | 'won'
  | 'lost'
  | 'disqualified';

export type LeadType = 
  | 'foster_parent'
  | 'adoptive_parent'
  | 'relative_caregiver'
  | 'social_worker'
  | 'case_manager'
  | 'therapist'
  | 'agency'
  | 'nonprofit'
  | 'government'
  | 'volunteer'
  | 'donor'
  | 'other';

export interface LeadFilters extends FilterParams {
  status?: LeadStatus | LeadStatus[];
  type?: LeadType | LeadType[];
  assignedToId?: string;
  assignedOrganizationId?: string;
  priority?: string;
  tags?: string[];
  // Date range filters
  createdAfter?: Date | string;
  createdBefore?: Date | string;
  modifiedAfter?: Date | string;
  modifiedBefore?: Date | string;
}
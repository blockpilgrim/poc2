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
  | 'in_progress'
  | 'converted'
  | 'closed'
  | 'lost';

export type LeadType = 
  | 'foster'
  | 'volunteer'
  | 'donor'
  | 'partner'
  | 'other';

export interface LeadFilters extends FilterParams {
  status?: LeadStatus | LeadStatus[];
  type?: LeadType | LeadType[];
  assignedToId?: string;
  assignedOrganizationId?: string;
  priority?: string;
  tags?: string[];
}
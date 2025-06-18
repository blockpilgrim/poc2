import { FilterParams } from './api';

/**
 * Represents a tc_everychildlead from D365, transformed and enriched for portal use.
 * This is the central "Lead" object for the application.
 */
export interface Lead {
  id: string; // The GUID of the tc_everychildlead record.
  name: string; // The title of the lead from tc_name.

  // Information about the person who is the subject of the lead (from tc_contact lookup).
  subjectName?: string;
  subjectEmail?: string;

  // Internal user who owns the lead within the partner organization (from tc_leadowner lookup).
  leadOwnerName?: string;

  // Organization assignment info (populated from user's JWT organization data)
  assignedOrganizationId?: string;
  assignedOrganizationName?: string;

  // Mapped status and type fields for clear UI display.
  status: LeadStatus;
  type: LeadType; // Single type derived from engagement interest (foster takes priority if both)

  // Raw score for future UI implementation.
  leadScore?: number; // from tc_leadscore2
  
  // Raw engagement interest value from D365 for inclusive filtering
  // This field contains the actual multi-select values from D365 (e.g., "948010000,948010001")
  // Used for inclusive filtering where leads can appear on multiple pages
  // While 'type' provides a single categorization, 'engagementInterest' preserves all values
  engagementInterest?: string; // from tc_engagementinterest (comma-separated values)

  initiativeId: string; // CRITICAL: Initiative this lead belongs to
  createdAt: Date;
  updatedAt: Date;
}

// The defined set of statuses the frontend will work with.
// These map from D365 tc_ecleadlifecyclestatus option set values
export type LeadStatus = 'assigned' | 'in-progress' | 'certified' | 'on-hold' | 'closed' | 'other';

// The defined set of types the frontend will work with.
// These map from D365 tc_engagementinterest option set values
export type LeadType = 'foster' | 'volunteer' | 'other';

/**
 * Lead filter parameters
 * Note: Most filtering is done automatically based on JWT claims (initiative, organization)
 * The backend currently only supports search filtering in addition to automatic filters
 */
export interface LeadFilters extends FilterParams {
  // search is inherited from FilterParams and is the only user-controllable filter currently implemented
  // Future filters can be added here as backend support is implemented:
  // status?: LeadStatus | LeadStatus[];
  // type?: LeadType | LeadType[];
  // leadScore?: number;
}
/**
 * D365 Field Mappings
 * Centralized configuration for mapping D365 fields to application models
 */

import type { Lead, LeadStatus, LeadType } from '@partner-portal/shared';
import type { D365Lead } from '../../types/d365.types';

/**
 * Field mapping configuration type
 */
export interface FieldMapping<TSource = any, TTarget = any> {
  source: keyof TSource;
  target: keyof TTarget;
  transform?: (value: any) => any;
  defaultValue?: any;
  required?: boolean;
}

/**
 * Nested object mapping configuration
 */
export interface NestedMapping<TSource = any, TTarget = any> {
  target: keyof TTarget;
  condition?: (source: TSource) => boolean;
  fields: FieldMapping[];
}

/**
 * D365 Contact Fields for Lead Management
 */
export const D365_LEAD_FIELDS = {
  // Identity
  ID: 'contactid',
  
  // Name fields
  FIRST_NAME: 'firstname',
  LAST_NAME: 'lastname',
  FULL_NAME: 'fullname',
  
  // Contact fields
  EMAIL: 'emailaddress1',
  PHONE: 'telephone1',
  ALTERNATE_PHONE: 'telephone2',
  
  // Address fields
  ADDRESS_LINE1: 'address1_line1',
  ADDRESS_LINE2: 'address1_line2',
  ADDRESS_CITY: 'address1_city',
  ADDRESS_STATE: 'address1_stateorprovince',
  ADDRESS_POSTAL_CODE: 'address1_postalcode',
  ADDRESS_COUNTRY: 'address1_country',
  
  // Custom fields
  INITIATIVE: 'tc_initiative',
  LEAD_STATUS: 'tc_leadstatus',
  LEAD_TYPE: 'tc_leadtype',
  PRIORITY: 'tc_priority',
  SOURCE: 'tc_source',
  NOTES: 'tc_notes',
  TAGS: 'tc_tags',
  
  // Relationships
  OWNER_ID: '_ownerid_value',
  ASSIGNED_ORGANIZATION: '_tc_assignedorganization_value',
  
  // Dates
  CREATED_ON: 'createdon',
  MODIFIED_ON: 'modifiedon',
  LAST_CONTACTED_ON: 'tc_lastcontactedon',
  ASSIGNED_ON: 'tc_assignedon',
} as const;

/**
 * Lead field mappings from D365 to application model
 */
export const LEAD_FIELD_MAPPINGS: FieldMapping<D365Lead, Lead>[] = [
  // Identity mappings
  { source: 'contactid', target: 'id', required: true },
  { source: 'contactid', target: 'd365Id', required: true },
  { source: 'tc_initiative', target: 'initiativeId', required: true },
  
  // Name mappings
  { source: 'firstname', target: 'firstName', defaultValue: '' },
  { source: 'lastname', target: 'lastName', defaultValue: '' },
  {
    source: 'firstname',
    target: 'displayName',
    transform: (value: string, source: D365Lead) => 
      `${source.firstname || ''} ${source.lastname || ''}`.trim()
  },
  
  // Contact mappings
  { source: 'emailaddress1', target: 'email' },
  { source: 'telephone1', target: 'phoneNumber' },
  { source: 'telephone2', target: 'alternatePhone' },
  
  // Lead detail mappings
  {
    source: 'tc_leadstatus',
    target: 'status',
    transform: (value: string) => (value as LeadStatus) || 'new',
    defaultValue: 'new'
  },
  {
    source: 'tc_leadtype',
    target: 'type',
    transform: (value: string) => (value as LeadType) || 'other',
    defaultValue: 'other'
  },
  { source: 'tc_source', target: 'source' },
  {
    source: 'tc_priority',
    target: 'priority',
    transform: (value: string) => value as 'low' | 'medium' | 'high' | undefined
  },
  
  // Assignment mappings
  { source: '_ownerid_value', target: 'assignedToId' },
  { source: '_tc_assignedorganization_value', target: 'assignedOrganizationId' },
  
  // Metadata mappings
  { source: 'tc_notes', target: 'notes' },
  {
    source: 'tc_tags',
    target: 'tags',
    transform: (value: string) => value ? value.split(',').map(t => t.trim()) : undefined
  },
  
  // Date mappings
  {
    source: 'createdon',
    target: 'createdAt',
    transform: (value: string) => new Date(value),
    required: true
  },
  {
    source: 'modifiedon',
    target: 'updatedAt',
    transform: (value: string) => new Date(value),
    required: true
  },
  {
    source: 'tc_lastcontactedon',
    target: 'lastContactedAt',
    transform: (value: string) => value ? new Date(value) : undefined
  },
  {
    source: 'tc_assignedon',
    target: 'assignedAt',
    transform: (value: string) => value ? new Date(value) : undefined
  },
];

/**
 * Address nested mapping configuration
 */
export const LEAD_ADDRESS_MAPPING: NestedMapping<D365Lead, Lead> = {
  target: 'address',
  condition: (source) => !!(source.address1_line1 || source.address1_city),
  fields: [
    { source: 'address1_line1', target: 'street1', defaultValue: '' },
    { source: 'address1_line2', target: 'street2' },
    { source: 'address1_city', target: 'city', defaultValue: '' },
    { source: 'address1_stateorprovince', target: 'state', defaultValue: '' },
    { source: 'address1_postalcode', target: 'zipCode', defaultValue: '' },
    { source: 'address1_country', target: 'country', defaultValue: 'USA' },
  ]
};

/**
 * Reverse mappings for updating D365 from Lead model
 */
export const LEAD_TO_D365_MAPPINGS: FieldMapping<Partial<Lead>, any>[] = [
  { source: 'firstName', target: 'firstname' },
  { source: 'lastName', target: 'lastname' },
  { source: 'email', target: 'emailaddress1' },
  { source: 'phoneNumber', target: 'telephone1' },
  { source: 'alternatePhone', target: 'telephone2' },
  { source: 'status', target: 'tc_leadstatus' },
  { source: 'type', target: 'tc_leadtype' },
  { source: 'priority', target: 'tc_priority' },
  { source: 'source', target: 'tc_source' },
  { source: 'notes', target: 'tc_notes' },
  {
    source: 'tags',
    target: 'tc_tags',
    transform: (value: string[]) => value ? value.join(', ') : undefined
  },
];

/**
 * Address reverse mapping
 */
export const LEAD_ADDRESS_TO_D365_MAPPINGS: FieldMapping[] = [
  { source: 'street1', target: 'address1_line1' },
  { source: 'street2', target: 'address1_line2' },
  { source: 'city', target: 'address1_city' },
  { source: 'state', target: 'address1_stateorprovince' },
  { source: 'zipCode', target: 'address1_postalcode' },
  { source: 'country', target: 'address1_country' },
];

/**
 * Fields to select when querying leads from D365
 */
export const LEAD_SELECT_FIELDS = Object.values(D365_LEAD_FIELDS);

/**
 * Fields that can be updated by users
 */
export const LEAD_UPDATABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'alternatePhone',
  'address',
  'status',
  'type',
  'priority',
  'source',
  'notes',
  'tags',
] as const;
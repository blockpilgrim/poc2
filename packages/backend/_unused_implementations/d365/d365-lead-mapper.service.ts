/**
 * D365 Lead Mapper Service
 * Handles transformation between D365 entities and application models
 */

import type { Lead } from '@partner-portal/shared';
import type { D365Lead } from '../../types/d365.types';
import {
  LEAD_FIELD_MAPPINGS,
  LEAD_ADDRESS_MAPPING,
  LEAD_TO_D365_MAPPINGS,
  LEAD_ADDRESS_TO_D365_MAPPINGS,
  FieldMapping,
  NestedMapping,
} from '../../constants/d365/field-mappings';
import { LEAD_DEFAULTS } from '../../constants/lead/defaults';

/**
 * Mapper configuration options
 */
export interface MapperConfig {
  strictMode?: boolean; // Throw on missing required fields
  includeNulls?: boolean; // Include null values in output
  customTransformers?: Record<string, (value: any, source: any) => any>;
}

/**
 * D365 Lead Mapper
 * Provides bidirectional mapping between D365 and application models
 */
export class D365LeadMapper {
  constructor(private config: MapperConfig = {}) {}

  /**
   * Map D365 contact to application Lead model
   */
  mapToLead(d365Contact: D365Lead): Lead {
    const lead: any = {};
    
    // Apply field mappings
    for (const mapping of LEAD_FIELD_MAPPINGS) {
      const value = this.getFieldValue(d365Contact, mapping);
      
      if (value !== undefined || this.config.includeNulls) {
        this.setFieldValue(lead, mapping.target, value);
      }
    }
    
    // Apply address mapping
    if (this.shouldMapAddress(d365Contact)) {
      lead.address = this.mapAddress(d365Contact);
    }
    
    // Ensure required fields have defaults
    this.applyDefaults(lead);
    
    // Validate if in strict mode
    if (this.config.strictMode) {
      this.validateLead(lead);
    }
    
    return lead as Lead;
  }

  /**
   * Map multiple D365 contacts to Leads
   */
  mapToLeads(d365Contacts: D365Lead[]): Lead[] {
    return d365Contacts.map(contact => this.mapToLead(contact));
  }

  /**
   * Map application Lead to D365 update payload
   */
  mapToD365Update(updates: Partial<Lead>): Record<string, any> {
    const d365Updates: Record<string, any> = {};
    
    // Apply field mappings
    for (const mapping of LEAD_TO_D365_MAPPINGS) {
      if (mapping.source in updates) {
        const value = this.getFieldValue(updates, mapping);
        
        if (value !== undefined) {
          d365Updates[mapping.target as string] = value;
        }
      }
    }
    
    // Handle address separately
    if (updates.address) {
      const addressUpdates = this.mapAddressToD365(updates.address);
      Object.assign(d365Updates, addressUpdates);
    }
    
    return d365Updates;
  }

  /**
   * Get field value with optional transformation
   */
  private getFieldValue(source: any, mapping: FieldMapping): any {
    const sourceValue = source[mapping.source];
    
    // Check for custom transformer
    const customTransform = this.config.customTransformers?.[mapping.target as string];
    if (customTransform) {
      return customTransform(sourceValue, source);
    }
    
    // Apply mapping transformation
    if (mapping.transform) {
      return mapping.transform(sourceValue, source);
    }
    
    // Return value or default
    return sourceValue !== undefined ? sourceValue : mapping.defaultValue;
  }

  /**
   * Set nested field value
   */
  private setFieldValue(target: any, path: string | keyof any, value: any): void {
    if (typeof path === 'string' && path.includes('.')) {
      const parts = path.split('.');
      let current = target;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
    } else {
      target[path] = value;
    }
  }

  /**
   * Check if address should be mapped
   */
  private shouldMapAddress(d365Contact: D365Lead): boolean {
    return LEAD_ADDRESS_MAPPING.condition
      ? LEAD_ADDRESS_MAPPING.condition(d365Contact)
      : true;
  }

  /**
   * Map D365 address fields to address object
   */
  private mapAddress(d365Contact: D365Lead): Lead['address'] {
    const address: any = {};
    
    for (const mapping of LEAD_ADDRESS_MAPPING.fields) {
      const value = this.getFieldValue(d365Contact, mapping);
      if (value !== undefined) {
        address[mapping.target] = value;
      }
    }
    
    return address;
  }

  /**
   * Map address object to D365 fields
   */
  private mapAddressToD365(address: any): Record<string, any> {
    const d365Address: Record<string, any> = {};
    
    for (const mapping of LEAD_ADDRESS_TO_D365_MAPPINGS) {
      if (mapping.source in address) {
        const value = address[mapping.source];
        if (value !== undefined) {
          d365Address[mapping.target as string] = value;
        }
      }
    }
    
    return d365Address;
  }

  /**
   * Apply default values to lead
   */
  private applyDefaults(lead: any): void {
    // Apply status default
    if (!lead.status) {
      lead.status = LEAD_DEFAULTS.STATUS;
    }
    
    // Apply type default
    if (!lead.type) {
      lead.type = LEAD_DEFAULTS.TYPE;
    }
    
    // Apply country default to address
    if (lead.address && !lead.address.country) {
      lead.address.country = LEAD_DEFAULTS.COUNTRY;
    }
  }

  /**
   * Validate lead has required fields
   */
  private validateLead(lead: any): void {
    const requiredFields = LEAD_FIELD_MAPPINGS
      .filter(m => m.required)
      .map(m => m.target);
    
    for (const field of requiredFields) {
      if (!lead[field]) {
        throw new Error(`Required field missing: ${String(field)}`);
      }
    }
  }

  /**
   * Create a partial D365 contact for new lead creation
   */
  mapToD365Create(lead: Partial<Lead>): Record<string, any> {
    const d365Lead = this.mapToD365Update(lead);
    
    // Add any required fields for creation
    if (!d365Lead.tc_initiative && lead.initiativeId) {
      d365Lead.tc_initiative = lead.initiativeId;
    }
    
    return d365Lead;
  }

  /**
   * Extract only the fields that have changed
   */
  extractChangedFields(
    original: Lead,
    updates: Partial<Lead>
  ): Partial<Lead> {
    const changes: Partial<Lead> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (JSON.stringify(original[key as keyof Lead]) !== JSON.stringify(value)) {
        changes[key as keyof Lead] = value as any;
      }
    }
    
    return changes;
  }
}

// Export singleton instance with default configuration
export const d365LeadMapper = new D365LeadMapper();
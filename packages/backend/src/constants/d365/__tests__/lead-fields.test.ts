/**
 * Tests for D365 Lead Fields Constants
 */

import { describe, it, expect } from 'vitest';
import {
  D365_LEAD_FIELDS,
  D365_CONTACT_FIELDS,
  D365_ACCOUNT_FIELDS,
  LEAD_SELECT_FIELDS,
  LEAD_EXPAND_CONFIG,
  LEAD_SORT_FIELD_MAP,
  buildLeadSelectClause,
  buildLeadExpandClause,
  mapLeadSortField
} from '../lead-fields';

describe('D365 Lead Fields', () => {
  describe('Field Constants', () => {
    it('should have all required lead fields', () => {
      expect(D365_LEAD_FIELDS.ID).toBe('tc_everychildleadid');
      expect(D365_LEAD_FIELDS.NAME).toBe('tc_name');
      expect(D365_LEAD_FIELDS.STATUS).toBe('tc_ecleadlifecyclestatus');
      expect(D365_LEAD_FIELDS.ENGAGEMENT_INTEREST).toBe('tc_engagementinterest');
      expect(D365_LEAD_FIELDS.LEAD_SCORE).toBe('tc_leadscore2');
      expect(D365_LEAD_FIELDS.STATE_CODE).toBe('statecode');
      expect(D365_LEAD_FIELDS.CREATED_ON).toBe('createdon');
      expect(D365_LEAD_FIELDS.MODIFIED_ON).toBe('modifiedon');
    });

    it('should have lookup field values with _value suffix', () => {
      expect(D365_LEAD_FIELDS.CONTACT_VALUE).toBe('_tc_contact_value');
      expect(D365_LEAD_FIELDS.LEAD_OWNER_VALUE).toBe('_tc_leadowner_value');
      expect(D365_LEAD_FIELDS.INITIATIVE).toBe('_tc_initiative_value');
      expect(D365_LEAD_FIELDS.FOSTER_ORGANIZATION).toBe('_tc_fosterorganization_value');
    });

    it('should have navigation properties in PascalCase', () => {
      expect(D365_LEAD_FIELDS.CONTACT_NAV).toBe('tc_Contact');
      expect(D365_LEAD_FIELDS.LEAD_OWNER_NAV).toBe('tc_LeadOwner');
    });

    it('should have volunteer organization relationship', () => {
      expect(D365_LEAD_FIELDS.VOLUNTEER_ORG_RELATIONSHIP)
        .toBe('tc_tc_ecleadsvolunteerorg_ECLead_tc_everychi');
    });
  });

  describe('Contact Fields', () => {
    it('should have all contact fields', () => {
      expect(D365_CONTACT_FIELDS.ID).toBe('contactid');
      expect(D365_CONTACT_FIELDS.FULLNAME).toBe('fullname');
      expect(D365_CONTACT_FIELDS.EMAIL).toBe('emailaddress1');
      expect(D365_CONTACT_FIELDS.AZURE_ID).toBe('msevtmgt_aadobjectid');
    });
  });

  describe('Account Fields', () => {
    it('should have all account fields', () => {
      expect(D365_ACCOUNT_FIELDS.ID).toBe('accountid');
      expect(D365_ACCOUNT_FIELDS.NAME).toBe('name');
      expect(D365_ACCOUNT_FIELDS.ORGANIZATION_TYPE).toBe('tc_organizationleadtype');
    });
  });

  describe('Select Fields', () => {
    it('should include all necessary fields for lead queries', () => {
      expect(LEAD_SELECT_FIELDS).toContain('tc_everychildleadid');
      expect(LEAD_SELECT_FIELDS).toContain('tc_name');
      expect(LEAD_SELECT_FIELDS).toContain('tc_ecleadlifecyclestatus');
      expect(LEAD_SELECT_FIELDS).toContain('_tc_contact_value');
      expect(LEAD_SELECT_FIELDS).toContain('_tc_leadowner_value');
      expect(LEAD_SELECT_FIELDS).toHaveLength(11);
    });
  });

  describe('Expand Configuration', () => {
    it('should have contact expand config', () => {
      expect(LEAD_EXPAND_CONFIG.contact.navigationProperty).toBe('tc_Contact');
      expect(LEAD_EXPAND_CONFIG.contact.selectFields).toContain('fullname');
      expect(LEAD_EXPAND_CONFIG.contact.selectFields).toContain('emailaddress1');
    });

    it('should have lead owner expand config', () => {
      expect(LEAD_EXPAND_CONFIG.leadOwner.navigationProperty).toBe('tc_LeadOwner');
      expect(LEAD_EXPAND_CONFIG.leadOwner.selectFields).toContain('fullname');
    });
  });

  describe('buildLeadSelectClause', () => {
    it('should build select clause from fields', () => {
      const selectClause = buildLeadSelectClause();
      
      expect(selectClause).toContain('tc_everychildleadid');
      expect(selectClause).toContain('tc_name');
      expect(selectClause).toContain('_tc_contact_value');
      expect(selectClause.split(',')).toHaveLength(11);
    });
  });

  describe('buildLeadExpandClause', () => {
    it('should build expand clause with field selection', () => {
      const expandClause = buildLeadExpandClause();
      
      expect(expandClause).toContain('tc_Contact($select=fullname,emailaddress1)');
      expect(expandClause).toContain('tc_LeadOwner($select=fullname)');
    });
  });

  describe('Sort Field Mapping', () => {
    it('should map frontend fields to D365 fields', () => {
      expect(LEAD_SORT_FIELD_MAP['id']).toBe('tc_everychildleadid');
      expect(LEAD_SORT_FIELD_MAP['name']).toBe('tc_name');
      expect(LEAD_SORT_FIELD_MAP['status']).toBe('tc_ecleadlifecyclestatus');
      expect(LEAD_SORT_FIELD_MAP['createdAt']).toBe('createdon');
      expect(LEAD_SORT_FIELD_MAP['updatedAt']).toBe('modifiedon');
    });

    it('should include expanded field mappings that cannot be sorted', () => {
      expect(LEAD_SORT_FIELD_MAP['subjectName']).toContain('/');
      expect(LEAD_SORT_FIELD_MAP['subjectEmail']).toContain('/');
      expect(LEAD_SORT_FIELD_MAP['leadOwnerName']).toContain('/');
    });

    it('should support D365 field names directly', () => {
      expect(LEAD_SORT_FIELD_MAP['tc_everychildleadid']).toBe('tc_everychildleadid');
      expect(LEAD_SORT_FIELD_MAP['createdon']).toBe('createdon');
    });
  });

  describe('mapLeadSortField', () => {
    it('should map valid frontend fields', () => {
      expect(mapLeadSortField('id')).toBe('tc_everychildleadid');
      expect(mapLeadSortField('name')).toBe('tc_name');
      expect(mapLeadSortField('createdAt')).toBe('createdon');
    });

    it('should return undefined for expanded fields', () => {
      expect(mapLeadSortField('subjectName')).toBeUndefined();
      expect(mapLeadSortField('subjectEmail')).toBeUndefined();
      expect(mapLeadSortField('leadOwnerName')).toBeUndefined();
    });

    it('should return undefined for unknown fields', () => {
      expect(mapLeadSortField('unknownField')).toBeUndefined();
    });

    it('should handle undefined input', () => {
      expect(mapLeadSortField(undefined)).toBeUndefined();
    });

    it('should pass through valid D365 field names', () => {
      expect(mapLeadSortField('tc_everychildleadid')).toBe('tc_everychildleadid');
      expect(mapLeadSortField('modifiedon')).toBe('modifiedon');
    });
  });
});
import { describe, it, expect } from 'vitest';
import { D365_LEAD_FIELDS } from '../../constants/d365-mappings';

/**
 * Tests for D365 Field Naming Conventions
 * 
 * This test suite verifies that our D365 field constants follow the proper
 * naming conventions required by the D365 Web API:
 * 
 * - $select: lowercase field names (e.g., 'tc_name')
 * - $expand: PascalCase navigation properties (e.g., 'tc_Contact')
 * - Lookup values: fields with _value suffix (e.g., '_tc_contact_value')
 */
describe('D365 Field Naming Conventions', () => {
  describe('Navigation Properties for $expand', () => {
    it('should use PascalCase for navigation properties', () => {
      // Navigation properties must be PascalCase
      expect(D365_LEAD_FIELDS.CONTACT_NAV).toBe('tc_Contact');
      expect(D365_LEAD_FIELDS.LEAD_OWNER_NAV).toBe('tc_LeadOwner');
      
      // Verify PascalCase pattern
      expect(D365_LEAD_FIELDS.CONTACT_NAV).toMatch(/^tc_[A-Z][a-zA-Z]*$/);
      expect(D365_LEAD_FIELDS.LEAD_OWNER_NAV).toMatch(/^tc_[A-Z][a-zA-Z]*$/);
    });
  });

  describe('Field Names for $select', () => {
    it('should use lowercase for base fields', () => {
      expect(D365_LEAD_FIELDS.ID).toBe('tc_everychildleadid');
      expect(D365_LEAD_FIELDS.NAME).toBe('tc_name');
      expect(D365_LEAD_FIELDS.STATUS).toBe('tc_ecleadlifecyclestatus');
      expect(D365_LEAD_FIELDS.CREATED_ON).toBe('createdon');
      
      // All should be lowercase
      expect(D365_LEAD_FIELDS.ID).toBe(D365_LEAD_FIELDS.ID.toLowerCase());
      expect(D365_LEAD_FIELDS.NAME).toBe(D365_LEAD_FIELDS.NAME.toLowerCase());
    });

    it('should use _value suffix for lookup fields', () => {
      expect(D365_LEAD_FIELDS.CONTACT_VALUE).toBe('_tc_contact_value');
      expect(D365_LEAD_FIELDS.LEAD_OWNER_VALUE).toBe('_tc_leadowner_value');
      expect(D365_LEAD_FIELDS.INITIATIVE).toBe('_tc_initiative_value');
      expect(D365_LEAD_FIELDS.FOSTER_ORGANIZATION).toBe('_tc_fosterorganization_value');
      
      // All lookup values should end with _value
      expect(D365_LEAD_FIELDS.CONTACT_VALUE).toMatch(/_value$/);
      expect(D365_LEAD_FIELDS.LEAD_OWNER_VALUE).toMatch(/_value$/);
    });
  });

  describe('Expanded Entity Fields', () => {
    it('should use lowercase for fields within expanded entities', () => {
      expect(D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME).toBe('fullname');
      expect(D365_LEAD_FIELDS.CONTACT_FIELDS.EMAIL).toBe('emailaddress1');
      
      // All should be lowercase
      expect(D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME).toBe(
        D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME.toLowerCase()
      );
    });
  });

  describe('Query Construction Examples', () => {
    it('should construct valid $expand clause', () => {
      // Example of proper expand construction
      const expandClause = `$expand=${D365_LEAD_FIELDS.CONTACT_NAV}($select=${D365_LEAD_FIELDS.CONTACT_FIELDS.FULLNAME},${D365_LEAD_FIELDS.CONTACT_FIELDS.EMAIL})`;
      
      expect(expandClause).toBe('$expand=tc_Contact($select=fullname,emailaddress1)');
    });

    it('should construct valid $select clause', () => {
      // Example of proper select construction
      const selectFields = [
        D365_LEAD_FIELDS.ID,
        D365_LEAD_FIELDS.NAME,
        D365_LEAD_FIELDS.CONTACT_VALUE,
        D365_LEAD_FIELDS.LEAD_OWNER_VALUE
      ];
      
      const selectClause = `$select=${selectFields.join(',')}`;
      
      expect(selectClause).toBe('$select=tc_everychildleadid,tc_name,_tc_contact_value,_tc_leadowner_value');
    });

    it('should construct valid $filter clause', () => {
      // Example of proper filter construction with lookup
      const filterClause = `$filter=${D365_LEAD_FIELDS.INITIATIVE} eq 'some-guid'`;
      
      expect(filterClause).toBe("$filter=_tc_initiative_value eq 'some-guid'");
    });
  });

  describe('Legacy Field Compatibility', () => {
    it('should maintain legacy field names for backward compatibility', () => {
      // Legacy fields should still exist but be deprecated
      expect(D365_LEAD_FIELDS.CONTACT).toBe('tc_contact');
      expect(D365_LEAD_FIELDS.LEAD_OWNER).toBe('tc_leadowner');
    });
  });
});
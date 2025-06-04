/**
 * Lead management types
 */
export interface Lead {
    id: string;
    d365Id: string;
    initiativeId: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email?: string;
    phoneNumber?: string;
    alternatePhone?: string;
    address?: {
        street1: string;
        street2?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    status: LeadStatus;
    source?: string;
    type: LeadType;
    priority?: 'low' | 'medium' | 'high';
    assignedToId?: string;
    assignedToName?: string;
    assignedOrganizationId?: string;
    assignedOrganizationName?: string;
    notes?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    lastContactedAt?: Date;
    assignedAt?: Date;
}
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'in_progress' | 'converted' | 'closed' | 'lost';
export type LeadType = 'foster' | 'volunteer' | 'donor' | 'partner' | 'other';
export interface LeadFilters extends FilterParams {
    status?: LeadStatus | LeadStatus[];
    type?: LeadType | LeadType[];
    assignedToId?: string;
    assignedOrganizationId?: string;
    priority?: string;
    tags?: string[];
}
//# sourceMappingURL=lead.d.ts.map
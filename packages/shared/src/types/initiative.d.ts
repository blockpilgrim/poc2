/**
 * Initiative represents a US state expansion in the Partner Portal.
 * This is a CRITICAL security boundary - users can only access data
 * tagged with their initiative.
 */
export interface Initiative {
    id: string;
    name: string;
    stateCode: string;
    displayName: string;
    theme: InitiativeTheme;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface InitiativeTheme {
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    logo: string;
    favicon: string;
    customCSS?: string;
}
export interface InitiativeConfig {
    [initiativeId: string]: {
        name: string;
        stateCode: string;
        displayName: string;
        theme: InitiativeTheme;
    };
}
//# sourceMappingURL=initiative.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIATIVE_CONFIG = void 0;
exports.getInitiativeByName = getInitiativeByName;
exports.getInitiativeByStateCode = getInitiativeByStateCode;
/**
 * Initiative configurations for each US state expansion
 * These define the theming and branding for each state's partner portal
 */
exports.INITIATIVE_CONFIG = {
    'EC_ARKANSAS': {
        name: 'EC Arkansas',
        stateCode: 'AR',
        displayName: 'Arkansas Partner Portal',
        theme: {
            primaryColor: '#DA291C',
            secondaryColor: '#FFFFFF',
            accentColor: '#F0F0F0',
            logo: '/logos/arkansas.svg',
            favicon: '/favicons/arkansas.ico'
        }
    },
    'EC_KENTUCKY': {
        name: 'EC Kentucky',
        stateCode: 'KY',
        displayName: 'Kentucky Partner Portal',
        theme: {
            primaryColor: '#003F87',
            secondaryColor: '#FFD700',
            accentColor: '#FFFFFF',
            logo: '/logos/kentucky.svg',
            favicon: '/favicons/kentucky.ico'
        }
    },
    'EC_TENNESSEE': {
        name: 'EC Tennessee',
        stateCode: 'TN',
        displayName: 'Tennessee Partner Portal',
        theme: {
            primaryColor: '#FF8200',
            secondaryColor: '#FFFFFF',
            accentColor: '#58595B',
            logo: '/logos/tennessee.svg',
            favicon: '/favicons/tennessee.ico'
        }
    }
    // Additional states will be added as they are onboarded
};
// Helper to get initiative by name (as stored in D365)
function getInitiativeByName(name) {
    return Object.values(exports.INITIATIVE_CONFIG).find(init => init.name === name);
}
// Helper to get initiative by state code
function getInitiativeByStateCode(stateCode) {
    return Object.values(exports.INITIATIVE_CONFIG).find(init => init.stateCode === stateCode);
}
//# sourceMappingURL=initiatives.js.map
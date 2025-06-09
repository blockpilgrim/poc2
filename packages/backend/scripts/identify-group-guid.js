#!/usr/bin/env node
/**
 * Script to identify the correct GUID for "Partner Portal - EC Oregon - Testing"
 * This script uses Microsoft Graph API to fetch actual group names for the 14 GUIDs
 */

const { ConfidentialClientApplication } = require('@azure/msal-node');
const fetch = require('node-fetch');

// Configuration - Replace with your actual values
const config = {
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
};

// The 14 GUIDs we need to check
const guidsToCheck = [
  '94a2bdc0-2fda-461e-b6a1-b8870dc3d09a',
  'e61e451d-8bbc-469c-bb68-5e6bbcb41499',
  '8de42847-85cc-4cce-970f-a2d07aa0d6c8',
  'dd793259-26da-4f98-a5ee-efd5283a3ba3',
  'f61f8f59-660d-451d-8634-d3130ad83c57',
  '51deb97c-11f3-429c-a3ac-10bdbde61971',
  'e6ae3a86-446e-40f0-a2fb-e1b83f11cd3b',
  '82126aa3-ffb3-4372-bb4a-28016c1f2146',
  'e701fbcf-60fc-45b1-b3b5-30f648983f60',
  'fbed8fd9-ed6f-4d02-a07c-a2a64d2e167e',
  '54d4d7ec-5199-4fad-a2f8-27858a3c2320',
  '33702bef-c518-4082-981a-eb6d75b4e6b3',
  'dda668f1-8b71-446f-90ce-d73a49bd8dc6',
  '194a0bf2-77f5-4f87-a637-5cc356eced81'
];

async function getAccessToken() {
  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    }
  };

  const msalClient = new ConfidentialClientApplication(msalConfig);
  
  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default'],
  };

  try {
    const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
  } catch (error) {
    console.error('Error acquiring token:', error);
    throw error;
  }
}

async function getGroupName(groupId, accessToken) {
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { id: groupId, name: 'GROUP_NOT_FOUND', error: 'Group not found' };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const group = await response.json();
    return { 
      id: groupId, 
      name: group.displayName || group.name || 'NO_NAME',
      description: group.description,
      groupType: group.groupTypes,
      securityEnabled: group.securityEnabled
    };
  } catch (error) {
    console.error(`Error fetching group ${groupId}:`, error.message);
    return { 
      id: groupId, 
      name: 'ERROR_FETCHING', 
      error: error.message 
    };
  }
}

async function identifyCorrectGuid() {
  console.log('🔍 Identifying correct GUID for "Partner Portal - EC Oregon - Testing"...\n');
  
  // Validate configuration
  if (!config.tenantId || !config.clientId || !config.clientSecret) {
    console.error('❌ Missing required environment variables:');
    console.error('   - AZURE_TENANT_ID');
    console.error('   - AZURE_CLIENT_ID');
    console.error('   - AZURE_CLIENT_SECRET');
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }

  try {
    // Get access token
    console.log('🔑 Acquiring access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token acquired\n');

    // Fetch group names for all GUIDs
    console.log('📊 Fetching group information for all 14 GUIDs...\n');
    
    const results = [];
    for (const guid of guidsToCheck) {
      const groupInfo = await getGroupName(guid, accessToken);
      results.push(groupInfo);
      
      // Log each result as we go
      if (groupInfo.error) {
        console.log(`❌ ${guid}: ${groupInfo.error}`);
      } else {
        console.log(`✅ ${guid}: "${groupInfo.name}"`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY REPORT');
    console.log('='.repeat(80));

    // Find the correct group
    const targetGroupName = 'Partner Portal - EC Oregon - Testing';
    const correctGroup = results.find(group => 
      group.name === targetGroupName || 
      (group.name && group.name.toLowerCase().includes('oregon') && group.name.toLowerCase().includes('testing'))
    );

    if (correctGroup && correctGroup.name === targetGroupName) {
      console.log(`\n🎯 FOUND EXACT MATCH!`);
      console.log(`   GUID: ${correctGroup.id}`);
      console.log(`   Name: "${correctGroup.name}"`);
      console.log(`   Description: ${correctGroup.description || 'N/A'}`);
    } else {
      // Look for partial matches
      const partialMatches = results.filter(group => 
        group.name && 
        group.name !== 'GROUP_NOT_FOUND' && 
        group.name !== 'ERROR_FETCHING' &&
        (group.name.toLowerCase().includes('oregon') || 
         group.name.toLowerCase().includes('partner') ||
         group.name.toLowerCase().includes('testing'))
      );

      if (partialMatches.length > 0) {
        console.log(`\n🔍 POTENTIAL MATCHES FOUND:`);
        partialMatches.forEach(group => {
          console.log(`   GUID: ${group.id}`);
          console.log(`   Name: "${group.name}"`);
          console.log(`   Description: ${group.description || 'N/A'}`);
          console.log('   ---');
        });
      } else {
        console.log('\n❌ NO MATCHING GROUPS FOUND');
        console.log('   None of the 14 GUIDs correspond to groups containing "Oregon", "Partner", or "Testing"');
      }
    }

    // Show all groups for reference
    console.log('\n📝 ALL GROUPS FOUND:');
    results.forEach(group => {
      if (group.name !== 'GROUP_NOT_FOUND' && group.name !== 'ERROR_FETCHING') {
        console.log(`   ${group.id}: "${group.name}"`);
      }
    });

    // Show errors
    const errors = results.filter(group => group.error);
    if (errors.length > 0) {
      console.log('\n⚠️  GROUPS WITH ERRORS:');
      errors.forEach(group => {
        console.log(`   ${group.id}: ${group.error}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    // Generate code snippet for updating auth.service.ts
    if (correctGroup && correctGroup.name === targetGroupName) {
      console.log('\n💡 TO FIX THE AUTH SERVICE:');
      console.log('Replace the temporary mapping in auth.service.ts with:');
      console.log('');
      console.log(`['${correctGroup.id}', 'Partner Portal - EC Oregon - Testing'],`);
      console.log('');
      console.log('And remove all the other temporary mappings for this group.');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
identifyCorrectGuid().catch(console.error);
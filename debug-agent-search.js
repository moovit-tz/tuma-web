#!/usr/bin/env node

/**
 * Debug script to help find agent 255745763600
 * Run with: node debug-agent-search.js
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'https://parcel.mysafari.co.tz';
const SEARCH_ID = '255745763600';

// Get token from environment or prompt user
const TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

if (TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('❌ Please set your auth token:');
    console.log('   export AUTH_TOKEN="your_actual_token_here"');
    console.log('   node debug-agent-search.js');
    console.log('');
    console.log('You can find your token by:');
    console.log('1. Open your browser dev tools');
    console.log('2. Go to Application/Storage tab');
    console.log('3. Look at Cookies for your domain');
    console.log('4. Copy the "token" cookie value');
    process.exit(1);
}

console.log('🔍 Searching for agent:', SEARCH_ID);
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔐 Token length:', TOKEN.length);
console.log('');

// Helper function to make API requests
function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, error: 'JSON parse error' });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Search endpoints to try
const searchEndpoints = [
    `/api/auth/users?search=${SEARCH_ID}`,
    `/api/auth/users?q=${SEARCH_ID}`,
    `/api/auth/users?query=${SEARCH_ID}`,
    `/api/auth/agents/search?q=${SEARCH_ID}`,
    `/api/auth/agents/search?search=${SEARCH_ID}`,
    `/api/auth/users/search?search=${SEARCH_ID}`,
    `/api/users/search?q=${SEARCH_ID}`,
    `/api/agents/search?search=${SEARCH_ID}`
];

// Get all users endpoints
const getAllEndpoints = [
    '/api/auth/users?all=true&include_inactive=true',
    '/api/auth/users?per_page=10000&include_inactive=true',
    '/api/auth/agents?all=true&include_inactive=true'
];

async function searchWithEndpoints() {
    console.log('🔍 Testing search endpoints...\n');
    
    for (const endpoint of searchEndpoints) {
        console.log(`📡 Trying: ${endpoint}`);
        try {
            const result = await makeRequest(endpoint);
            console.log(`   Status: ${result.status}`);
            
            if (result.status === 200 && result.data) {
                let agents = [];
                if (Array.isArray(result.data)) {
                    agents = result.data;
                } else if (result.data.data && Array.isArray(result.data.data)) {
                    agents = result.data.data;
                } else if (result.data.users && Array.isArray(result.data.users)) {
                    agents = result.data.users;
                }
                
                console.log(`   Found ${agents.length} agents`);
                
                // Check if our target agent is in the results
                const targetAgent = agents.find(agent => 
                    (agent.phoneNumber && agent.phoneNumber.includes(SEARCH_ID)) ||
                    (agent.phone && agent.phone.includes(SEARCH_ID)) ||
                    (agent.id && agent.id.toString() === SEARCH_ID) ||
                    (agent.username && agent.username.includes(SEARCH_ID)) ||
                    (agent.fullName && agent.fullName.includes(SEARCH_ID))
                );
                
                if (targetAgent) {
                    console.log('   ✅ TARGET AGENT FOUND!');
                    console.log('   Agent details:', JSON.stringify(targetAgent, null, 2));
                    return targetAgent;
                } else {
                    console.log('   ❌ Target agent not found in results');
                }
            } else {
                console.log(`   Error: ${result.error || 'No data returned'}`);
            }
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
        console.log('');
    }
    
    return null;
}

async function getAllAgentsAndSearch() {
    console.log('🔍 Fetching all agents and searching client-side...\n');
    
    for (const endpoint of getAllEndpoints) {
        console.log(`📡 Trying: ${endpoint}`);
        try {
            const result = await makeRequest(endpoint);
            console.log(`   Status: ${result.status}`);
            
            if (result.status === 200 && result.data) {
                let agents = [];
                if (Array.isArray(result.data)) {
                    agents = result.data;
                } else if (result.data.data && Array.isArray(result.data.data)) {
                    agents = result.data.data;
                } else if (result.data.users && Array.isArray(result.data.users)) {
                    agents = result.data.users;
                }
                
                console.log(`   Found ${agents.length} total agents`);
                
                // Search through all agents
                const matches = agents.filter(agent => {
                    const searchableFields = [
                        agent.id?.toString(),
                        agent.phoneNumber,
                        agent.phone_number,
                        agent.phone,
                        agent.mobile,
                        agent.fullName,
                        agent.username,
                        agent.email,
                        agent.firstName,
                        agent.lastName
                    ].filter(Boolean);
                    
                    return searchableFields.some(field => 
                        field.toString().toLowerCase().includes(SEARCH_ID.toLowerCase())
                    );
                });
                
                console.log(`   Found ${matches.length} matches for "${SEARCH_ID}"`);
                
                if (matches.length > 0) {
                    console.log('   ✅ MATCHES FOUND!');
                    matches.forEach((match, index) => {
                        console.log(`   Match ${index + 1}:`, {
                            id: match.id,
                            name: match.fullName,
                            username: match.username,
                            phone: match.phoneNumber || match.phone_number || match.phone,
                            email: match.email,
                            isActive: match.isActive
                        });
                    });
                    return matches;
                } else {
                    console.log('   ❌ No matches found');
                    
                    // Show some sample agents for debugging
                    console.log('   📋 Sample agents (first 3):');
                    agents.slice(0, 3).forEach((agent, index) => {
                        console.log(`   Agent ${index + 1}:`, {
                            id: agent.id,
                            name: agent.fullName,
                            phone: agent.phoneNumber || agent.phone_number || agent.phone,
                            isActive: agent.isActive
                        });
                    });
                }
            } else {
                console.log(`   Error: ${result.error || 'No data returned'}`);
            }
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
        console.log('');
    }
    
    return null;
}

async function main() {
    try {
        // First try search endpoints
        console.log('='.repeat(60));
        console.log('PHASE 1: Testing dedicated search endpoints');
        console.log('='.repeat(60));
        
        const searchResult = await searchWithEndpoints();
        
        if (!searchResult) {
            // If search endpoints don't work, try getting all agents
            console.log('='.repeat(60));
            console.log('PHASE 2: Getting all agents and searching client-side');
            console.log('='.repeat(60));
            
            const allAgentsResult = await getAllAgentsAndSearch();
            
            if (!allAgentsResult || allAgentsResult.length === 0) {
                console.log('='.repeat(60));
                console.log('CONCLUSION');
                console.log('='.repeat(60));
                console.log('❌ Agent not found in the system');
                console.log('');
                console.log('Possible reasons:');
                console.log('1. Agent was never added to the system');
                console.log('2. Agent was deleted');
                console.log('3. Phone number format is different (try variations like 0745763600, +255745763600)');
                console.log('4. Agent exists in a different company/branch');
                console.log('5. Agent is in an inactive state');
                console.log('');
                console.log('Recommended actions:');
                console.log('1. Check with the person who reported having this agent');
                console.log('2. Try searching for partial numbers: 745763600, 45763600');
                console.log('3. Check if the agent might be under a different name/username');
                console.log('4. Verify the phone number format in your database');
            }
        }
        
    } catch (error) {
        console.error('❌ Debug script failed:', error);
    }
}

main();
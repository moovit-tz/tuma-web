/**
 * Quick test to verify the search API endpoint is working
 * Instructions: 
 * 1. Open browser console on your agents page
 * 2. Paste this script and run it
 * 3. Check the results
 */

(async function testSearchAPI() {
    const SEARCH_ID = '255745763600';
    
    // Get auth token from cookies
    function getAuthToken() {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
    }
    
    const token = getAuthToken();
    if (!token) {
        console.error('❌ No auth token found');
        return;
    }
    
    console.log('🔍 Testing the correct API endpoint for agent:', SEARCH_ID);
    
    const endpoint = `https://parcel.mysafari.co.tz/api/auth/agents/search?query=${SEARCH_ID}`;
    console.log('🔗 Testing endpoint:', endpoint);
    
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, response.statusText);
            console.error('📄 Error body:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('📊 Raw API response:', data);
        
        // Extract agents from response
        let agents = [];
        if (Array.isArray(data)) {
            agents = data;
        } else if (data.data && Array.isArray(data.data)) {
            agents = data.data;
        } else if (data.agents && Array.isArray(data.agents)) {
            agents = data.agents;
        } else if (data.users && Array.isArray(data.users)) {
            agents = data.users;
        } else if (data.results && Array.isArray(data.results)) {
            agents = data.results;
        }
        
        console.log(`📈 Found ${agents.length} agents`);
        
        if (agents.length > 0) {
            console.log('✅ SUCCESS! Agents found:', agents.map(a => ({
                id: a.id,
                name: a.fullName || a.name,
                phone: a.phoneNumber || a.phone_number || a.phone,
                email: a.email
            })));
            
            // Check if our specific agent is in the results
            const targetAgent = agents.find(agent => {
                const phone = agent.phoneNumber || agent.phone_number || agent.phone || '';
                return phone.includes(SEARCH_ID) || 
                       (agent.fullName && agent.fullName.includes(SEARCH_ID)) ||
                       (agent.id && agent.id.toString() === SEARCH_ID);
            });
            
            if (targetAgent) {
                console.log('🎉 TARGET AGENT FOUND!', targetAgent);
            } else {
                console.log('❌ Target agent not in results, but search is working');
            }
        } else {
            console.log('⚠️ API working but no results found for this search term');
            console.log('💡 Try testing with a different search term that you know exists');
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error);
        console.log('💡 Possible causes:');
        console.log('   - Network connectivity issues');
        console.log('   - CORS configuration');
        console.log('   - API endpoint might be different');
        console.log('   - Authentication token expired');
    }
})();
# Dashboard Endpoint Testing Guide

## New Unified Endpoints

The dashboard now uses unified endpoints that automatically route based on user role:

### Primary Endpoints:
- `GET /api/dashboard/` - Unified endpoint (fallback)
- `GET /api/dashboard/ops` - OPS-specific stats  
- `GET /api/dashboard/biz` - BIZ/OWNER-specific stats

### Expected Response Formats:

#### OPS Dashboard (ADMIN, OPS, OPERATIONS roles):
```json
{
  "success": true,
  "role": "OPS",
  "stats": {
    "totalParcels": 1496,
    "totalAgents": 77,
    "totalCompanies": 32,
    "totalVehicles": 155,
    "totalOffices": 83,
    "deliveredParcels": 15,
    "lostParcels": 22,
    "complaints": 0
  },
  "timestamp": "2025-09-12T09:44:03.598Z"
}
```

#### BIZ Dashboard (OWNER, BUSINESS, BIZ, COMPANY_OWNER roles):
```json
{
  "success": true,
  "role": "BIZ",
  "stats": {
    "totalParcelsPrice": 1994641,
    "totalAgents": 38,
    "totalVehicles": 2,
    "receivedParcels": 138,
    "deliveredParcels": 12,
    "companyName": "JT Enterprises Ltd (TEST)"
  },
  "timestamp": "2025-09-12T13:45:00.000Z"
}
```

## Role-Based Routing Logic

The `dashboard-unified.ts` service automatically determines which endpoint to use:

```typescript
function getDashboardEndpoint(): string {
    const user = getCurrentUser()
    const userRole = user?.role?.toUpperCase()
    
    switch (userRole) {
        case "ADMIN":
        case "OPS":
        case "OPERATIONS":
            return "/api/dashboard/ops"
        case "OWNER":
        case "BUSINESS":
        case "BIZ":
        case "COMPANY_OWNER":
            return "/api/dashboard/biz"
        default:
            return "/api/dashboard"
    }
}
```

## UI Components

### Enhanced Dashboard Stats Component
- Automatically renders different stats based on user role
- Shows OPS metrics for operations users
- Shows BIZ metrics (including revenue) for business users
- Handles loading states and error fallbacks

## Backend Integration
- Falls back to unified endpoint if role-specific endpoint fails
- Handles multiple response formats and naming conventions
- Includes proper error handling and caching

### Data Processing
The service now properly handles the actual API response format:

```typescript
// Primary parsing: Handle { success, role, stats, timestamp } format
if (result.data.success && result.data.stats) {
    const stats = result.data.stats
    const role = result.data.role
    
    dashboardData = {
        totalParcels: stats.totalParcels || 0,
        totalAgents: stats.totalAgents || 0,
        // ... extract from stats object
        role: role,
        userType: role
    }
}

// Fallback parsing: Handle legacy formats
else {
    // Handle direct data responses or nested data.data
}
```

## Testing Instructions

1. **OPS User Testing:**
   - Login as OPS/ADMIN user
   - Navigate to `/ops/dashboard`
   - Should show: Total Parcels, Agents, Companies, Vehicles, Offices, Delivered Parcels
   - Should fetch from `/api/dashboard/ops`

2. **BIZ User Testing:**
   - Login as OWNER/BUSINESS user  
   - Navigate to `/biz/dashboard`
   - Should show: Total Parcels Price, Agents, Vehicles, Received Parcels, Delivered Parcels
   - Should fetch from `/api/dashboard/biz`

3. **Fallback Testing:**
   - Test with invalid/missing role
   - Should fallback to `/api/dashboard`
   - Should still render appropriate fallback data

## Backward Compatibility

The old `getDashboardData()` function still exists for backward compatibility but now internally uses the new unified approach with a deprecation warning.

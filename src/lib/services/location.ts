import { apiRequest } from "@/lib/constants"
import { mapWithConcurrency } from "@/lib/concurrency"
import { getAllRestCountries } from "./rest-countries"

export interface Country {
    id: number
    name: string
    code?: string
    flagUrl?: string
    population?: number
    regionName?: string
    created_at: string
    updated_at: string
    regions?: Region[]
}

export interface Region {
    id: number
    name: string
    code?: string
    country_id?: number
    country?: Country
    created_at: string
    updated_at: string
}

export interface District {
    id: number
    name: string
    code?: string
    region_id?: number
    region?: Region
    created_at: string
    updated_at: string
}

export interface BookingOffice {
    id: number
    name: string
    code?: string
    address?: string
    phone?: string
    district_id?: number
    district?: District
    created_at: string
    updated_at: string
}

export interface LocationParams {
    page?: number
    limit?: number
    search?: string
    name?: string
    code?: string
    country_id?: number
    region_id?: number
    district_id?: number
    paginate?: boolean
    include?: string
    [key: string]: any
}

/**
 * Exact country name mappings for this platform's database
 * Maps local DB names (uppercase, possibly custom) to RestCountries common names
 */
const COUNTRY_NAME_MAP: Record<string, string> = {
    'burundi': 'burundi',
    'congo': 'democratic republic of the congo',
    'dr congo': 'democratic republic of the congo',
    'drc': 'democratic republic of the congo',
    'kenya': 'kenya',
    'malawi': 'malawi',
    'rwanda': 'rwanda',
    'south africa': 'south africa',
    'tanzania': 'tanzania',
    'uganda': 'uganda',
    'zambia': 'zambia',
    'zanzibar': 'tanzania', // Zanzibar is part of Tanzania in RestCountries
}

export const mapTerritoryToRestInfo = (territoryName: string | undefined, isoCode: string | undefined, restCountries: any[]) => {
    if (!territoryName) return null
    const name = territoryName.toLowerCase().trim()

    // Check exact or aliased name map first
    const mappedName = COUNTRY_NAME_MAP[name]
    
    // Pass 1: Prioritize explicit name matching
    let match = restCountries.find(rc => {
        if (!rc.name || !rc.name.common) return false
        const common = rc.name.common.toLowerCase()
        const official = (rc.name.official || '').toLowerCase()

        // 1. Use our explicit mapping table
        if (mappedName && (common === mappedName || official === mappedName)) return true

        // 2. Direct common name match
        if (common === name || official === name) return true

        return false
    })

    // Pass 2: Fallback to ISO code ONLY if no name match was found
    if (!match && isoCode && isoCode.length === 2) {
        match = restCountries.find(rc => rc.cca2 === isoCode.toUpperCase())
    }

    return match || null
}

/**
 * Get all countries with optional filters
 */
export async function getCountries(params: LocationParams = {}): Promise<Country[]> {
    console.log("[Location] Fetching countries with params:", params)

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/location/countries${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const responseData = await apiRequest(endpoint)
        let countriesData = []

        if (responseData.data && Array.isArray(responseData.data)) {
            countriesData = responseData.data
        } else if (Array.isArray(responseData)) {
            countriesData = responseData
        } else if (responseData.countries && Array.isArray(responseData.countries)) {
            countriesData = responseData.countries
        } else if (responseData.success && responseData.data) {
            countriesData = Array.isArray(responseData.data) ? responseData.data : []
        } else {
            // Last resort: find any array in the response
            for (const value of Object.values(responseData)) {
                if (Array.isArray(value)) {
                    countriesData = value
                    break
                }
            }
        }
        
        // Enrich with flags from RestCountries
        try {
            const restCountries = await getAllRestCountries()
            return countriesData.map((c: any) => {
                if (!c || !c.name) return c
                const restInfo = mapTerritoryToRestInfo(c.name, c.code, restCountries)
                return {
                    ...c,
                    flagUrl: restInfo?.flags?.svg || restInfo?.flags?.png,
                    population: restInfo?.population,
                    regionName: restInfo?.region,
                    capital: restInfo?.capital?.[0]
                }
            })
        } catch (e) {
            console.warn("[Location] RestCountries enrichment failed:", e)
            return countriesData
        }
    } catch (error) {
        console.error("❌ [Location] Error fetching countries:", error)
        throw error
    }
}

/**
 * Get all regions with optional filters
 */
export async function getRegions(params: LocationParams = {}): Promise<Region[]> {
    console.log("[Location] Fetching regions with params:", params)

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/location/regions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const responseData = await apiRequest(endpoint, { silent: true })
        let regions = []

        if (responseData.data && Array.isArray(responseData.data)) {
            regions = responseData.data
        } else if (Array.isArray(responseData)) {
            regions = responseData
        } else if (responseData.regions && Array.isArray(responseData.regions)) {
            regions = responseData.regions
        } else if (responseData.success && responseData.data) {
            regions = Array.isArray(responseData.data) ? responseData.data : []
        } else {
            for (const value of Object.values(responseData)) {
                if (Array.isArray(value)) {
                    regions = value
                    break
                }
            }
        }
        
        // Enrich parent country with flags if present
        try {
            const restCountries = await getAllRestCountries()
            return regions.map((r: any) => {
                if (!r.country) return r
                const restInfo = mapTerritoryToRestInfo(r.country.name, r.country.code, restCountries)
                return {
                    ...r,
                    country: {
                        ...r.country,
                        flagUrl: restInfo?.flags?.svg || restInfo?.flags?.png
                    }
                }
            })
        } catch (e) {
            console.warn("[Location] Region parent enrichment failed:", e)
            return regions
        }
    } catch (error) {
        console.warn("⚠️ [Location] Non-critical failure fetching regions:", error)
        return []
    }
}

export async function getDistricts(params: LocationParams = {}): Promise<District[]> {
    console.log("[Location] Fetching districts with params:", params)

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/location/districts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const responseData = await apiRequest(endpoint, { silent: true })
        let data = []

        if (responseData.data && Array.isArray(responseData.data)) {
            data = responseData.data
        } else if (Array.isArray(responseData)) {
            data = responseData
        } else if (responseData.districts && Array.isArray(responseData.districts)) {
            data = responseData.districts
        } else if (responseData.success && responseData.data) {
            data = Array.isArray(responseData.data) ? responseData.data : []
        } else {
            for (const value of Object.values(responseData)) {
                if (Array.isArray(value)) {
                    data = value
                    break
                }
            }
        }
        return data
    } catch (error) {
        console.warn("⚠️ [Location] Non-critical failure fetching districts:", error)
        return []
    }
}

/**
 * Get all booking offices with optional filters
 */
function extractOfficesList(responseData: any): BookingOffice[] {
    if (responseData?.data && Array.isArray(responseData.data)) return responseData.data
    if (Array.isArray(responseData)) return responseData
    if (Array.isArray(responseData?.bookingOffices)) return responseData.bookingOffices
    if (Array.isArray(responseData?.booking_offices)) return responseData.booking_offices
    if (responseData?.success && Array.isArray(responseData?.data)) return responseData.data
    for (const value of Object.values(responseData || {})) {
        if (Array.isArray(value)) return value as BookingOffice[]
    }
    return []
}

/**
 * Get booking offices for a single region (GET /location/booking-offices/:regionId).
 */
async function getBookingOfficesForRegion(regionId: number): Promise<BookingOffice[]> {
    try {
        const responseData = await apiRequest(`/api/location/booking-offices/${regionId}`, { silent: true })
        return extractOfficesList(responseData)
    } catch (error) {
        console.warn(`⚠️ [Location] No booking offices for region ${regionId}:`, error)
        return []
    }
}

export async function getBookingOffices(params: LocationParams = {}): Promise<BookingOffice[]> {
    console.log("[Location] Fetching booking offices with params:", params)

    const regionId = params.region_id
    if (regionId) {
        return getBookingOfficesForRegion(regionId)
    }

    // No region specified — every office. GET /location/booking-offices
    // returns them all (with region and district) in one request; only if
    // that fails fall back to one request per region. Concurrent callers
    // share the lookup in flight.
    allBookingOfficesInFlight ??= (async () => {
        try {
            const all = extractOfficesList(await apiRequest("/api/location/booking-offices", { silent: true }))
            if (all.length) return all
        } catch {
            // fall through to the per-region lookup
        }
        try {
            const regions = await getRegions({ paginate: false })
            const results = await mapWithConcurrency(regions, REGION_FETCH_CONCURRENCY, (r) => getBookingOfficesForRegion(r.id))
            return results.flat()
        } catch (error) {
            console.warn("⚠️ [Location] Non-critical failure fetching all booking offices:", error)
            return []
        } finally {
            allBookingOfficesInFlight = null
        }
    })()
    return allBookingOfficesInFlight
}

const REGION_FETCH_CONCURRENCY = 4
let allBookingOfficesInFlight: Promise<BookingOffice[]> | null = null

/**
 * Get a single country by ID
 */
export async function getCountry(id: number): Promise<Country> {
    console.log("[Location] Fetching country:", id)

    try {
        const result = await apiRequest(`/api/location/countries/${id}`)
        console.log("✅ Country fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching country ${id}:`, error)
        throw error
    }
}

/**
 * Get a single region by ID
 */
export async function getRegion(id: number): Promise<Region> {
    console.log("[Location] Fetching region:", id)

    try {
        const result = await apiRequest(`/api/location/regions/${id}`)
        console.log("✅ Region fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching region ${id}:`, error)
        throw error
    }
}

/**
 * Get a single district by ID
 */
export async function getDistrict(id: number): Promise<District> {
    console.log("[Location] Fetching district:", id)

    try {
        const result = await apiRequest(`/api/location/districts/${id}`)
        console.log("✅ District fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching district ${id}:`, error)
        throw error
    }
}

/**
 * Get a single booking office by ID
 */
export async function getBookingOffice(id: number): Promise<BookingOffice> {
    console.log("[Location] Fetching booking office:", id)

    try {
        const result = await apiRequest(`/api/location/booking-offices/${id}`)
        console.log("✅ Booking office fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching booking office ${id}:`, error)
        throw error
    }
}
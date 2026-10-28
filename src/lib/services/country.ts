import type { CreateCountryData, CountryFilters, UpdateCountryData } from "@/types/country"
import { apiRequest } from "@/lib/constants"

/**
 * Normalizes country data to ensure consistent structure
 * Handles both camelCase and snake_case properties
 */
const normalizeCountryData = (country: any) => {
    const regions = Array.isArray(country.regions) ? country.regions : []

    const normalizedRegions = regions.map((region: any) => {
        const districts = Array.isArray(region.districts) ? region.districts : []

        const normalizedDistricts = districts.map((district: any) => {
            const bookingOffices = Array.isArray(district.booking_offices)
                ? district.booking_offices
                : Array.isArray(district.bookingOffices)
                    ? district.bookingOffices
                    : []

            return {
                ...district,
                id: district.id,
                uuid: district.uuid,
                name: district.name,
                code: district.code || null,
                regionId: district.regionId || district.region_id,
                region_id: district.region_id || district.regionId,
                isActive: district.isActive || district.is_active || true,
                is_active: district.is_active || district.isActive || true,
                bookingOffices: bookingOffices,
                booking_offices: bookingOffices,
            }
        })

        return {
            ...region,
            id: region.id,
            uuid: region.uuid,
            name: region.name,
            code: region.code || null,
            countryId: region.countryId || region.country_id,
            country_id: region.country_id || region.countryId,
            districts: normalizedDistricts,
        }
    })

    return {
        ...country,
        id: country.id,
        uuid: country.uuid,
        name: country.name,
        code: country.code || null,
        regions: normalizedRegions,
    }
}

/**
 * Interface for country statistics
 */
export interface CountryStatistics {
    totalCountries: number
    totalRegions: number
    totalDistricts: number
    totalBookingOffices: number
    countriesWithRegions: number
    countriesWithDistricts: number
    countriesWithOffices: number
    averageRegionsPerCountry: number
    averageDistrictsPerRegion: number
    averageOfficesPerDistrict: number
    regionCoverage: number
    districtCoverage: number
    officeCoverage: number
}

/**
 * Fetches all countries without pagination to calculate comprehensive statistics
 */
async function getAllCountriesForStatistics() {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("paginate", "false")
        queryParams.append("include", "regions,regions.districts,regions.districts.bookingOffices")
        queryParams.append("per_page", "1000")

        const endpoint = `/api/location/countries?${queryParams.toString()}`
        const responseData = await apiRequest(endpoint)

        let countries = []
        if (responseData.data && Array.isArray(responseData.data)) {
            countries = responseData.data
        } else if (Array.isArray(responseData)) {
            countries = responseData
        }

        return countries.map(normalizeCountryData)
    } catch (error) {
        console.error("Error fetching all countries for statistics:", error)
        throw error
    }
}

/**
 * Calculate comprehensive statistics from countries data
 */
export async function calculateStatisticsFromCountries(): Promise<CountryStatistics> {
    try {
        const countries = await getAllCountriesForStatistics()

        const totalCountries = countries.length
        const totalRegions = countries.reduce((acc, country) => acc + getRegionCount(country), 0)
        const totalDistricts = countries.reduce((acc, country) => acc + getDistrictCount(country), 0)
        const totalBookingOffices = countries.reduce((acc, country) => acc + getBookingOfficeCount(country), 0)

        const countriesWithRegions = countries.filter((country) => getRegionCount(country) > 0).length
        const countriesWithDistricts = countries.filter((country) => getDistrictCount(country) > 0).length
        const countriesWithOffices = countries.filter((country) => getBookingOfficeCount(country) > 0).length

        return {
            totalCountries,
            totalRegions,
            totalDistricts,
            totalBookingOffices,
            countriesWithRegions,
            countriesWithDistricts,
            countriesWithOffices,
            averageRegionsPerCountry: totalCountries > 0 ? Math.round((totalRegions / totalCountries) * 100) / 100 : 0,
            averageDistrictsPerRegion: totalRegions > 0 ? Math.round((totalDistricts / totalRegions) * 100) / 100 : 0,
            averageOfficesPerDistrict: totalDistricts > 0 ? Math.round((totalBookingOffices / totalDistricts) * 100) / 100 : 0,
            regionCoverage: totalCountries > 0 ? Math.round((countriesWithRegions / totalCountries) * 100) : 0,
            districtCoverage: totalCountries > 0 ? Math.round((countriesWithDistricts / totalCountries) * 100) : 0,
            officeCoverage: totalCountries > 0 ? Math.round((countriesWithOffices / totalCountries) * 100) : 0,
        }
    } catch (error) {
        console.error("Error calculating statistics from countries:", error)
        return {
            totalCountries: 0,
            totalRegions: 0,
            totalDistricts: 0,
            totalBookingOffices: 0,
            countriesWithRegions: 0,
            countriesWithDistricts: 0,
            countriesWithOffices: 0,
            averageRegionsPerCountry: 0,
            averageDistrictsPerRegion: 0,
            averageOfficesPerDistrict: 0,
            regionCoverage: 0,
            districtCoverage: 0,
            officeCoverage: 0,
        }
    }
}

/**
 * Fetches the total count of countries from the countries API
 */
export async function getTotalCountriesCount(): Promise<number> {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("paginate", "true")
        queryParams.append("per_page", "1")

        const endpoint = `/api/location/countries?${queryParams.toString()}`
        const responseData = await apiRequest(endpoint)

        if (responseData.meta && responseData.meta.total !== undefined) {
            return responseData.meta.total
        } else if (responseData.pagination && responseData.pagination.total !== undefined) {
            return responseData.pagination.total
        } else if (responseData.total !== undefined) {
            return responseData.total
        }

        return Array.isArray(responseData.data) ? responseData.data.length : 0
    } catch (error) {
        console.error("Error fetching total countries count:", error)
        return 0
    }
}

/**
 * Fetches the total count of regions from the regions API
 */
export async function getTotalRegionsCount(): Promise<number> {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("paginate", "true")
        queryParams.append("per_page", "1")

        const endpoint = `/api/location/regions?${queryParams.toString()}`
        const responseData = await apiRequest(endpoint)

        if (responseData.meta && responseData.meta.total !== undefined) {
            return responseData.meta.total
        } else if (responseData.pagination && responseData.pagination.total !== undefined) {
            return responseData.pagination.total
        } else if (responseData.total !== undefined) {
            return responseData.total
        }

        return Array.isArray(responseData.data) ? responseData.data.length : 0
    } catch (error) {
        console.error("Error fetching total regions count:", error)
        return 0
    }
}

/**
 * Fetches the total count of districts from the districts API
 */
export async function getTotalDistrictsCount(): Promise<number> {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("paginate", "true")
        queryParams.append("per_page", "1")

        const endpoint = `/api/location/districts?${queryParams.toString()}`
        const responseData = await apiRequest(endpoint)

        if (responseData.meta && responseData.meta.total !== undefined) {
            return responseData.meta.total
        } else if (responseData.pagination && responseData.pagination.total !== undefined) {
            return responseData.pagination.total
        } else if (responseData.total !== undefined) {
            return responseData.total
        } else if (responseData.totalCount !== undefined) {
            return responseData.totalCount
        }

        return Array.isArray(responseData.data) ? responseData.data.length : 0
    } catch (error) {
        console.error("Error fetching total districts count:", error)
        return 0
    }
}

/**
 * Fetches the total count of booking offices from the booking offices API
 */
export async function getTotalBookingOfficesCount(): Promise<number> {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("paginate", "true")
        queryParams.append("per_page", "1")

        const endpoint = `/api/location/booking-offices?${queryParams.toString()}`
        const responseData = await apiRequest(endpoint)

        if (responseData.meta && responseData.meta.total !== undefined) {
            return responseData.meta.total
        } else if (responseData.pagination && responseData.pagination.total !== undefined) {
            return responseData.pagination.total
        } else if (responseData.total !== undefined) {
            return responseData.total
        } else if (responseData.totalCount !== undefined) {
            return responseData.totalCount
        }

        return Array.isArray(responseData.data) ? responseData.data.length : 0
    } catch (error) {
        console.error("Error fetching total booking offices count:", error)
        return 0
    }
}

/**
 * Fetches statistics directly from the respective APIs
 */
export async function getDirectStatistics(): Promise<CountryStatistics> {
    try {
        console.log("Fetching statistics directly from APIs...")

        const [countriesCount, regionsCount, districtsCount, officesCount] = await Promise.all([
            getTotalCountriesCount(),
            getTotalRegionsCount(),
            getTotalDistrictsCount(),
            getTotalBookingOfficesCount(),
        ])

        console.log("Direct API statistics:", {
            countriesCount,
            regionsCount,
            districtsCount,
            officesCount,
        })

        const countriesWithRegions = Math.min(countriesCount, Math.ceil(regionsCount * 0.8))
        const countriesWithDistricts = Math.min(countriesCount, Math.ceil(districtsCount * 0.6))
        const countriesWithOffices = Math.min(countriesCount, Math.ceil(officesCount * 0.4))

        return {
            totalCountries: countriesCount,
            totalRegions: regionsCount,
            totalDistricts: districtsCount,
            totalBookingOffices: officesCount,
            countriesWithRegions,
            countriesWithDistricts,
            countriesWithOffices,
            averageRegionsPerCountry: countriesCount > 0 ? Math.round((regionsCount / countriesCount) * 100) / 100 : 0,
            averageDistrictsPerRegion: regionsCount > 0 ? Math.round((districtsCount / regionsCount) * 100) / 100 : 0,
            averageOfficesPerDistrict: districtsCount > 0 ? Math.round((officesCount / districtsCount) * 100) / 100 : 0,
            regionCoverage: countriesCount > 0 ? Math.round((countriesWithRegions / countriesCount) * 100) : 0,
            districtCoverage: countriesCount > 0 ? Math.round((countriesWithDistricts / countriesCount) * 100) : 0,
            officeCoverage: countriesCount > 0 ? Math.round((countriesWithOffices / countriesCount) * 100) : 0,
        }
    } catch (error) {
        console.error("Error fetching direct statistics:", error)
        throw error
    }
}

/**
 * Fetches comprehensive country statistics by calculating from existing endpoints
 */
export async function getCountryStatistics(): Promise<CountryStatistics> {
    try {
        console.log("Fetching country statistics...")
        try {
            return await getDirectStatistics()
        } catch (directError) {
            console.warn("Direct statistics failed, falling back to original method:", directError)
            return await calculateStatisticsFromCountries()
        }
    } catch (error) {
        console.error("Error fetching country statistics:", error)
        throw error
    }
}

/**
 * Enhanced getCountries function with better error handling and data processing
 */
export async function getCountries(
    params: CountryFilters = {},
    includeRelationships = true,
    includeStatistics = false,
) {
    try {
        console.log("🚀 Starting getCountries with params:", params)

        const queryParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, encodeURIComponent(value.toString()))
            }
        })

        if (includeRelationships) {
            queryParams.append("include", "regions,regions.districts,regions.districts.bookingOffices")
        }

        const endpoint = `/api/location/countries${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        console.log("📡 Making request to:", endpoint)

        const responseData = await apiRequest(endpoint)
        console.log("📦 Raw response data:", responseData)

        let countries = []
        let meta = null

        if (responseData.data && Array.isArray(responseData.data)) {
            countries = responseData.data
            meta = responseData.meta || responseData.pagination
            console.log("✅ Using response.data structure")
        } else if (Array.isArray(responseData)) {
            countries = responseData
            console.log("✅ Using direct array response")
        } else if (responseData.countries && Array.isArray(responseData.countries)) {
            countries = responseData.countries
            meta = responseData.meta || responseData.pagination
            console.log("✅ Using response.countries structure")
        } else if (responseData.success && responseData.data) {
            countries = Array.isArray(responseData.data) ? responseData.data : []
            meta = responseData.pagination || responseData.meta
            console.log("✅ Using response.success.data structure")
        } else {
            console.log("❌ Unknown response structure, available keys:", Object.keys(responseData))
            for (const [key, value] of Object.entries(responseData)) {
                if (Array.isArray(value)) {
                    console.log(`🔍 Found array in key '${key}' with ${value.length} items`)
                    countries = value
                    break
                }
            }
        }

        console.log(`📈 Found ${countries.length} countries before normalization`)

        const normalizedCountries = countries.map((country, index) => {
            console.log(`🔄 Normalizing country ${index + 1}:`, country?.name || "Unnamed")
            return normalizeCountryData(country)
        })

        console.log(`✅ Successfully normalized ${normalizedCountries.length} countries`)

        const result: any = {
            data: normalizedCountries,
            meta: meta || {
                current_page: params.page || 1,
                per_page: params.per_page || 10,
                total: normalizedCountries.length,
                last_page: Math.ceil(normalizedCountries.length / (params.per_page || 10)),
            },
        }

        if (includeStatistics) {
            try {
                console.log("📊 Calculating statistics...")
                result.statistics = await calculateStatisticsFromCountries()
            } catch (error) {
                console.error("❌ Error calculating statistics:", error)
                result.statistics = null
            }
        }

        console.log("🎉 Final result:", {
            dataCount: result.data.length,
            meta: result.meta,
            hasStatistics: !!result.statistics,
        })

        return result
    } catch (error) {
        console.error("💥 Error in getCountries:", error)
        throw error
    }
}

/**
 * Fetches countries with comprehensive data including statistics
 */
export async function getCountriesWithStatistics(params: CountryFilters = {}) {
    try {
        console.log("Fetching countries with statistics...")
        return await getCountries(params, true, true)
    } catch (error) {
        console.error("Error in getCountriesWithStatistics:", error)
        throw error
    }
}

/**
 * Fetches a single country with all relationships
 */
export async function getCountry(id: number) {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("include", "regions,regions.districts,regions.districts.bookingOffices")

        const endpoint = `/api/location/countries/${id}?${queryParams.toString()}`
        const responseData = await apiRequest(endpoint)

        let country = null
        if (responseData.data) {
            country = responseData.data
        } else {
            country = responseData
        }

        return normalizeCountryData(country)
    } catch (error) {
        console.error("Error in getCountry:", error)
        throw error
    }
}

/**
 * Creates a new country
 */
export async function createCountry(data: CreateCountryData) {
    try {
        // The backend's Add Country endpoint takes an array of countries
        // (its own documented example creates several at once) — wrap a
        // single country the same way rather than sending a bare object.
        const responseData = await apiRequest("/api/location/country", {
            method: "POST",
            body: JSON.stringify([data]),
        })

        let country = null
        if (Array.isArray(responseData?.data)) {
            country = responseData.data[0]
        } else if (Array.isArray(responseData)) {
            country = responseData[0]
        } else if (responseData?.data) {
            country = responseData.data
        } else {
            country = responseData
        }

        return normalizeCountryData(country)
    } catch (error) {
        console.error("Error in createCountry:", error)
        throw error
    }
}

/**
 * Updates an existing country
 */
export async function updateCountry(id: number, data: UpdateCountryData) {
    try {
        await apiRequest(`/api/location/country/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })

        return getCountry(id)
    } catch (error) {
        console.error("Error in updateCountry:", error)
        throw error
    }
}

/**
 * Deletes a country.
 * Note: there is no delete endpoint for countries in the backend today —
 * this call is expected to fail. Kept only so existing callers don't
 * break at build time; the delete UI itself has been removed.
 */
export async function deleteCountry(id: number) {
    try {
        return await apiRequest(`/api/location/country/${id}`, {
            method: "DELETE",
        })
    } catch (error) {
        console.error("Error in deleteCountry:", error)
        throw error
    }
}

/**
 * Helper function to get region count for a country
 */
export function getRegionCount(country: any): number {
    if (!country || typeof country !== "object") return 0
    return Array.isArray(country.regions) ? country.regions.length : 0
}

/**
 * Helper function to get district count for a country
 */
export function getDistrictCount(country: any): number {
    if (!country || !Array.isArray(country.regions)) return 0

    return country.regions.reduce((total, region) => {
        const districtCount = Array.isArray(region.districts) ? region.districts.length : 0
        return total + districtCount
    }, 0)
}

/**
 * Helper function to get booking office count for a country
 */
export function getBookingOfficeCount(country: any): number {
    if (!country || !Array.isArray(country.regions)) return 0

    return country.regions.reduce((total, region) => {
        if (!Array.isArray(region.districts)) return total

        const officeCount = region.districts.reduce((districtTotal, district) => {
            const offices = district.bookingOffices || district.booking_offices || []
            return districtTotal + (Array.isArray(offices) ? offices.length : 0)
        }, 0)

        return total + officeCount
    }, 0)
}

/**
 * Helper function to get coverage statistics for a country
 */
export function getCountryCoverage(country: any) {
    const regions = getRegionCount(country)
    const districts = getDistrictCount(country)
    const offices = getBookingOfficeCount(country)

    return {
        hasRegions: regions > 0,
        hasDistricts: districts > 0,
        hasOffices: offices > 0,
        regionCount: regions,
        districtCount: districts,
        officeCount: offices,
        averageDistrictsPerRegion: regions > 0 ? Math.round((districts / regions) * 100) / 100 : 0,
        averageOfficesPerDistrict: districts > 0 ? Math.round((offices / districts) * 100) / 100 : 0,
    }
}

/**
 * Fetches all regions from the dedicated regions endpoint
 */
export async function getAllRegions(params: any = {}) {
    try {
        const queryParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/location/regions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        const responseData = await apiRequest(endpoint)

        let regions = []
        if (responseData.data && Array.isArray(responseData.data)) {
            regions = responseData.data
        } else if (Array.isArray(responseData)) {
            regions = responseData
        }

        return {
            data: regions,
            meta: responseData.meta || responseData.pagination,
        }
    } catch (error) {
        console.error("Error fetching regions:", error)
        throw error
    }
}

/**
 * Fetches all districts from the dedicated districts endpoint
 */
export async function getAllDistricts(params: any = {}) {
    try {
        const queryParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/location/districts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        const responseData = await apiRequest(endpoint)

        let districts = []
        if (responseData.data && Array.isArray(responseData.data)) {
            districts = responseData.data
        } else if (Array.isArray(responseData)) {
            districts = responseData
        }

        return {
            data: districts,
            meta: responseData.meta || responseData.pagination,
        }
    } catch (error) {
        console.error("Error fetching districts:", error)
        throw error
    }
}

/**
 * Fetches all booking offices from the dedicated booking offices endpoint
 */
export async function getAllBookingOffices(params: any = {}) {
    try {
        const queryParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/location/booking-offices${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        const responseData = await apiRequest(endpoint)

        let bookingOffices = []
        if (responseData.data && Array.isArray(responseData.data)) {
            bookingOffices = responseData.data
        } else if (Array.isArray(responseData)) {
            bookingOffices = responseData
        }

        return {
            data: bookingOffices,
            meta: responseData.meta || responseData.pagination,
        }
    } catch (error) {
        console.error("Error fetching booking offices:", error)
        throw error
    }
}

/**
 * Enhanced statistics calculation using dedicated endpoints
 */
export async function calculateEnhancedStatistics(): Promise<CountryStatistics> {
    try {
        console.log("Calculating enhanced statistics from dedicated endpoints...")

        const [countriesResponse, regionsResponse, districtsResponse, bookingOfficesResponse] = await Promise.allSettled([
            getAllCountriesForStatistics(),
            getAllRegions({ paginate: false, per_page: 1000 }),
            getAllDistricts({ paginate: false, per_page: 1000 }),
            getAllBookingOffices({ paginate: false, per_page: 1000 }),
        ])

        const countries = countriesResponse.status === "fulfilled" ? countriesResponse.value : []
        const regions = regionsResponse.status === "fulfilled" ? regionsResponse.value.data : []
        const districts = districtsResponse.status === "fulfilled" ? districtsResponse.value.data : []
        const bookingOffices = bookingOfficesResponse.status === "fulfilled" ? bookingOfficesResponse.value.data : []

        console.log("Enhanced statistics data:", {
            countries: countries.length,
            regions: regions.length,
            districts: districts.length,
            bookingOffices: bookingOffices.length,
        })

        const totalCountries = countries.length
        const totalRegions = regions.length
        const totalDistricts = districts.length
        const totalBookingOffices = bookingOffices.length

        const countriesWithRegions = countries.filter((country) => getRegionCount(country) > 0).length
        const countriesWithDistricts = countries.filter((country) => getDistrictCount(country) > 0).length
        const countriesWithOffices = countries.filter((country) => getBookingOfficeCount(country) > 0).length

        return {
            totalCountries,
            totalRegions,
            totalDistricts,
            totalBookingOffices,
            countriesWithRegions,
            countriesWithDistricts,
            countriesWithOffices,
            averageRegionsPerCountry: totalCountries > 0 ? Math.round((totalRegions / totalCountries) * 100) / 100 : 0,
            averageDistrictsPerRegion: totalRegions > 0 ? Math.round((totalDistricts / totalRegions) * 100) / 100 : 0,
            averageOfficesPerDistrict: totalDistricts > 0 ? Math.round((totalBookingOffices / totalDistricts) * 100) / 100 : 0,
            regionCoverage: totalCountries > 0 ? Math.round((countriesWithRegions / totalCountries) * 100) : 0,
            districtCoverage: totalCountries > 0 ? Math.round((countriesWithDistricts / totalCountries) * 100) : 0,
            officeCoverage: totalCountries > 0 ? Math.round((countriesWithOffices / totalCountries) * 100) : 0,
        }
    } catch (error) {
        console.error("Error calculating enhanced statistics:", error)
        return await calculateStatisticsFromCountries()
    }
}

/**
 * Enhanced location hierarchy summary using dedicated endpoints
 */
export async function getEnhancedLocationHierarchySummary() {
    try {
        console.log("Fetching enhanced location hierarchy summary...")
        const statistics = await calculateEnhancedStatistics()

        return {
            hierarchy: [
                {
                    level: "Countries",
                    count: statistics.totalCountries,
                    coverage: 100,
                    icon: "Globe",
                },
                {
                    level: "Regions",
                    count: statistics.totalRegions,
                    coverage: statistics.regionCoverage,
                    icon: "Map",
                },
                {
                    level: "Districts",
                    count: statistics.totalDistricts,
                    coverage: statistics.districtCoverage,
                    icon: "MapPin",
                },
                {
                    level: "Booking Offices",
                    count: statistics.totalBookingOffices,
                    coverage: statistics.officeCoverage,
                    icon: "Building2",
                },
            ],
            averages: {
                regionsPerCountry: statistics.averageRegionsPerCountry,
                districtsPerRegion: statistics.averageDistrictsPerRegion,
                officesPerDistrict: statistics.averageOfficesPerDistrict,
            },
            totals: {
                countries: statistics.totalCountries,
                regions: statistics.totalRegions,
                districts: statistics.totalDistricts,
                offices: statistics.totalBookingOffices,
            },
        }
    } catch (error) {
        console.error("Error fetching enhanced location hierarchy summary:", error)
        return await getLocationHierarchySummary()
    }
}

/**
 * Enhanced country statistics using dedicated endpoints
 */
export async function getEnhancedCountryStatistics(): Promise<CountryStatistics> {
    try {
        console.log("Fetching enhanced country statistics...")
        try {
            return await getDirectStatistics()
        } catch (directError) {
            console.warn("Direct statistics failed, falling back to enhanced method:", directError)
            try {
                return await calculateEnhancedStatistics()
            } catch (enhancedError) {
                console.warn("Enhanced statistics failed, falling back to original method:", enhancedError)
                return await calculateStatisticsFromCountries()
            }
        }
    } catch (error) {
        console.error("Error fetching enhanced country statistics:", error)
        throw error
    }
}

/**
 * Get comprehensive location data from all endpoints
 */
export async function getComprehensiveLocationData() {
    try {
        console.log("Fetching comprehensive location data...")

        const [countriesResult, regionsResult, districtsResult, bookingOfficesResult] = await Promise.allSettled([
            getCountries({ paginate: false, per_page: 1000 }, true, false),
            getAllRegions({ paginate: false, per_page: 1000, include: "country,districts" }),
            getAllDistricts({ paginate: false, per_page: 1000, include: "region,region.country,bookingOffices" }),
            getAllBookingOffices({
                paginate: false,
                per_page: 1000,
                include: "district,district.region,district.region.country",
            }),
        ])

        const countries = countriesResult.status === "fulfilled" ? countriesResult.value.data : []
        const regions = regionsResult.status === "fulfilled" ? regionsResult.value.data : []
        const districts = districtsResult.status === "fulfilled" ? districtsResult.value.data : []
        const bookingOffices = bookingOfficesResult.status === "fulfilled" ? bookingOfficesResult.value.data : []

        console.log("Comprehensive location data fetched:", {
            countries: countries.length,
            regions: regions.length,
            districts: districts.length,
            bookingOffices: bookingOffices.length,
        })

        return {
            countries,
            regions,
            districts,
            bookingOffices,
            statistics: await calculateEnhancedStatistics(),
        }
    } catch (error) {
        console.error("Error fetching comprehensive location data:", error)
        throw error
    }
}

/**
 * Fetches location hierarchy summary by calculating from existing data
 */
export async function getLocationHierarchySummary() {
    try {
        console.log("Calculating location hierarchy summary...")
        try {
            return await getEnhancedLocationHierarchySummary()
        } catch (enhancedError) {
            console.warn("Enhanced hierarchy summary failed, falling back to original method:", enhancedError)
            const statistics = await getCountryStatistics()

            return {
                hierarchy: [
                    {
                        level: "Countries",
                        count: statistics.totalCountries,
                        coverage: 100,
                        icon: "Globe",
                    },
                    {
                        level: "Regions",
                        count: statistics.totalRegions,
                        coverage: statistics.regionCoverage,
                        icon: "Map",
                    },
                    {
                        level: "Districts",
                        count: statistics.totalDistricts,
                        coverage: statistics.districtCoverage,
                        icon: "MapPin",
                    },
                    {
                        level: "Booking Offices",
                        count: statistics.totalBookingOffices,
                        coverage: statistics.officeCoverage,
                        icon: "Building2",
                    },
                ],
                averages: {
                    regionsPerCountry: statistics.averageRegionsPerCountry,
                    districtsPerRegion: statistics.averageDistrictsPerRegion,
                    officesPerDistrict: statistics.averageOfficesPerDistrict,
                },
                totals: {
                    countries: statistics.totalCountries,
                    regions: statistics.totalRegions,
                    districts: statistics.totalDistricts,
                    offices: statistics.totalBookingOffices,
                },
            }
        }
    } catch (error) {
        console.error("Error fetching location hierarchy summary:", error)
        throw error
    }
}

/**
 * Get detailed breakdown of countries by region count
 */
export async function getCountriesByRegionBreakdown() {
    try {
        const countries = await getAllCountriesForStatistics()

        const breakdown = countries.map((country) => ({
            id: country.id,
            name: country.name,
            code: country.code,
            regionCount: getRegionCount(country),
            districtCount: getDistrictCount(country),
            officeCount: getBookingOfficeCount(country),
            coverage: getCountryCoverage(country),
        }))

        return breakdown.sort((a, b) => b.regionCount - a.regionCount)
    } catch (error) {
        console.error("Error getting countries by region breakdown:", error)
        throw error
    }
}

/**
 * Get coverage analysis for all countries
 */
export async function getCoverageAnalysis() {
    try {
        const countries = await getAllCountriesForStatistics()

        const analysis = {
            total: countries.length,
            withRegions: countries.filter((c) => getRegionCount(c) > 0).length,
            withDistricts: countries.filter((c) => getDistrictCount(c) > 0).length,
            withOffices: countries.filter((c) => getBookingOfficeCount(c) > 0).length,
            fullyConfigured: countries.filter(
                (c) => getRegionCount(c) > 0 && getDistrictCount(c) > 0 && getBookingOfficeCount(c) > 0,
            ).length,
            partiallyConfigured: countries.filter(
                (c) => getRegionCount(c) > 0 || getDistrictCount(c) > 0 || getBookingOfficeCount(c) > 0,
            ).length,
            notConfigured: countries.filter(
                (c) => getRegionCount(c) === 0 && getDistrictCount(c) === 0 && getBookingOfficeCount(c) === 0,
            ).length,
        }

        return {
            ...analysis,
            percentages: {
                withRegions: analysis.total > 0 ? Math.round((analysis.withRegions / analysis.total) * 100) : 0,
                withDistricts: analysis.total > 0 ? Math.round((analysis.withDistricts / analysis.total) * 100) : 0,
                withOffices: analysis.total > 0 ? Math.round((analysis.withOffices / analysis.total) * 100) : 0,
                fullyConfigured: analysis.total > 0 ? Math.round((analysis.fullyConfigured / analysis.total) * 100) : 0,
                partiallyConfigured: analysis.total > 0 ? Math.round((analysis.partiallyConfigured / analysis.total) * 100) : 0,
                notConfigured: analysis.total > 0 ? Math.round((analysis.notConfigured / analysis.total) * 100) : 0,
            },
        }
    } catch (error) {
        console.error("Error getting coverage analysis:", error)
        throw error
    }
}

/**
 * Export countries data to CSV
 */
export async function exportCountriesToCSV() {
    try {
        const response = await getCountries({ paginate: false, per_page: 1000 }, true, false)
        const countries = response.data

        const csvHeaders = [
            "Name",
            "Code",
            "UUID",
            "Regions Count",
            "Districts Count",
            "Booking Offices Count",
            "Created At",
            "Updated At",
        ]

        const csvRows = countries.map((country) => [
            country.name || "",
            country.code || "",
            country.uuid || "",
            getRegionCount(country),
            getDistrictCount(country),
            getBookingOfficeCount(country),
            country.createdAt || "",
            country.updatedAt || "",
        ])

        const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.map((field) => `"${field}"`).join(","))].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `countries-export-${new Date().toISOString().split("T")[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        return { success: true, count: countries.length }
    } catch (error) {
        console.error("Error exporting countries:", error)
        throw error
    }
}

/**
 * Import countries from CSV file
 */
export async function importCountriesFromCSV(file: File) {
    try {
        const text = await file.text()
        const lines = text.split("\n").filter((line) => line.trim())

        if (lines.length < 2) {
            throw new Error("CSV file must contain at least a header row and one data row")
        }

        const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())
        const nameIndex = headers.findIndex((h) => h.toLowerCase().includes("name"))
        const codeIndex = headers.findIndex((h) => h.toLowerCase().includes("code"))

        if (nameIndex === -1) {
            throw new Error('CSV file must contain a "Name" column')
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        }

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim())
                const name = values[nameIndex]
                const code = codeIndex >= 0 ? values[codeIndex] : ""

                if (!name) {
                    results.errors.push(`Row ${i + 1}: Name is required`)
                    results.failed++
                    continue
                }

                await createCountry({ name, code })
                results.success++
            } catch (error: any) {
                results.errors.push(`Row ${i + 1}: ${error.message}`)
                results.failed++
            }
        }

        return results
    } catch (error) {
        console.error("Error importing countries:", error)
        throw error
    }
}

/**
 * Bulk delete countries
 */
export async function bulkDeleteCountries(countryIds: number[]) {
    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
    }

    for (const id of countryIds) {
        try {
            await deleteCountry(id)
            results.success++
        } catch (error: any) {
            results.errors.push(`Country ID ${id}: ${error.message}`)
            results.failed++
        }
    }

    return results
}

export type { CountryStatistics }
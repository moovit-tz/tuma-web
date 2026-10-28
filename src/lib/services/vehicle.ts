import { apiRequest } from "@/lib/constants"
import type { Company } from "@/types/company"
import type { Vehicle, UpdateVehicleData, CreateVehicleData } from "@/types/vehicle"

export interface GetVehiclesParams {
    company_id?: number
    brand_id?: number
    model_id?: number
    fleet_type_id?: number
    status?: number
    name?: string
    registration_number?: string
    is_active?: boolean
    page?: number
    limit?: number
    search?: string
    all?: number
    paginate?: number | boolean
    no_pagination?: number | boolean
}

/**
 * Get all vehicles with optional filters
 */
export async function getVehicles(params: GetVehiclesParams = {}) {
    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/vehicle/vehicles${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    console.log("[Vehicle] Fetching vehicles with params:", params)

    try {
        const response = await apiRequest(endpoint)
        console.log("[Vehicle] Vehicles API response structure:", {
            hasVehicles: !!response.vehicles,
            hasData: !!response.data,
            hasPagination: !!response.pagination,
            hasDataPagination: !!response.data?.pagination,
            isArray: Array.isArray(response),
            isDataArray: Array.isArray(response.data),
            responseKeys: Object.keys(response),
        })

        // Handle Laravel-style pagination at root level
        if (response.data && Array.isArray(response.data) && response.current_page) {
            return {
                data: response.data,
                vehicles: response.data,
                pagination: {
                    current_page: response.current_page,
                    last_page: response.last_page,
                    total: response.total,
                    per_page: response.per_page,
                    from: response.from,
                    to: response.to,
                    totalPages: response.last_page,
                    totalItems: response.total,
                    currentPage: response.current_page,
                    limit: response.per_page,
                },
            }
        }

        // Handle nested data structure with pagination
        if (response.data && response.data.vehicles && response.data.pagination) {
            return {
                data: response.data.vehicles,
                vehicles: response.data.vehicles,
                pagination: {
                    ...response.data.pagination,
                    currentPage: response.data.pagination.currentPage || response.data.pagination.current_page,
                    totalPages: response.data.pagination.totalPages || response.data.pagination.last_page,
                    totalItems: response.data.pagination.totalItems || response.data.pagination.total,
                    limit: response.data.pagination.limit || response.data.pagination.per_page,
                },
            }
        }

        // Handle direct vehicles and pagination at root
        if (response.vehicles && response.pagination) {
            return {
                data: response.vehicles,
                vehicles: response.vehicles,
                pagination: {
                    ...response.pagination,
                    currentPage: response.pagination.currentPage || response.pagination.current_page,
                    totalPages: response.pagination.totalPages || response.pagination.last_page,
                    totalItems: response.pagination.totalItems || response.pagination.total,
                    limit: response.pagination.limit || response.pagination.per_page,
                },
            }
        }

        // Handle simple array response (when paginate=false or no pagination)
        if (Array.isArray(response.data)) {
            return {
                data: response.data,
                vehicles: response.data,
                pagination: null,
            }
        }

        if (Array.isArray(response)) {
            return {
                data: response,
                vehicles: response,
                pagination: null,
            }
        }

        // Fallback - return the response as is with normalized structure
        console.warn("[Vehicle] Unexpected response structure:", response)
        return {
            data: response.data || response,
            vehicles: response.data || response,
            pagination: response.pagination || null,
        }
    } catch (error) {
        console.error("❌ Error fetching vehicles:", error)
        throw error
    }
}

/**
 * Get a single vehicle by ID
 */
export async function getVehicle(id: number) {
    console.log(`[Vehicle] Fetching vehicle ${id}`)
    try {
        const result = await apiRequest(`/api/vehicle/${id}`)
        return result
    } catch (error) {
        console.error(`❌ Error fetching vehicle ${id}:`, error)
        throw error
    }
}

/**
 * Create a new vehicle
 */
export async function createVehicle(vehicleData: any): Promise<Vehicle | null> {
    console.log("[Vehicle] Creating vehicle with data:", vehicleData)

    // Convert camelCase keys to snake_case for Laravel backend
    const snakeCaseData: Record<string, any> = {}
    if (vehicleData.brandId !== undefined) snakeCaseData.brand_id = vehicleData.brandId
    if (vehicleData.modelId !== undefined) snakeCaseData.model_id = vehicleData.modelId
    if (vehicleData.companyId !== undefined) snakeCaseData.company_id = vehicleData.companyId
    if (vehicleData.fleetTypeId !== undefined) snakeCaseData.fleet_type_id = vehicleData.fleetTypeId
    if (vehicleData.seatLayoutId !== undefined) snakeCaseData.seat_layout_id = vehicleData.seatLayoutId
    if (vehicleData.name !== undefined) snakeCaseData.name = vehicleData.name
    if (vehicleData.capacity !== undefined) snakeCaseData.capacity = vehicleData.capacity
    if (vehicleData.registrationNumber !== undefined) snakeCaseData.registration_number = vehicleData.registrationNumber
    if (vehicleData.engineNumber !== undefined) snakeCaseData.engine_number = vehicleData.engineNumber
    if (vehicleData.chassisNumber !== undefined) snakeCaseData.chassis_number = vehicleData.chassisNumber
    if (vehicleData.plateNumber !== undefined) snakeCaseData.plate_number = vehicleData.plateNumber
    if (vehicleData.location !== undefined) snakeCaseData.location = vehicleData.location
    if (vehicleData.isActive !== undefined) snakeCaseData.is_active = vehicleData.isActive
    if (vehicleData.frontSeatAvailable !== undefined) snakeCaseData.front_seat_available = vehicleData.frontSeatAvailable
    if (vehicleData.isLastFullSeat !== undefined) snakeCaseData.is_last_full_seat = vehicleData.isLastFullSeat
    if (vehicleData.isNew !== undefined) snakeCaseData.is_new = vehicleData.isNew
    if (vehicleData.isSpecialHire !== undefined) snakeCaseData.is_special_hire = vehicleData.isSpecialHire
    if (vehicleData.status !== undefined) snakeCaseData.status = vehicleData.status

    console.log("[Vehicle] Sending snake_case payload:", snakeCaseData)

    try {
        const result = await apiRequest("/api/vehicle/vehicle", {
            method: "POST",
            body: JSON.stringify(snakeCaseData),
        })

        console.log("✅ Vehicle created successfully:", result)

        // Handle different response structures
        if (result.vehicle) {
            return normalizeVehicleData(result.vehicle)
        } else if (result.data?.vehicle) {
            return normalizeVehicleData(result.data.vehicle)
        } else if (result.data) {
            return normalizeVehicleData(result.data)
        } else {
            return normalizeVehicleData(result)
        }
    } catch (error) {
        console.error("❌ Error creating vehicle:", error)
        throw error
    }
}

/**
 * Update a vehicle
 */
export async function updateVehicle(id: number, data: UpdateVehicleData) {
    console.log("[Vehicle] Updating vehicle:", id, "with data:", data)

    // Convert camelCase keys to snake_case for Laravel backend
    const snakeCaseData: Record<string, any> = {}
    if (data.brandId !== undefined) snakeCaseData.brand_id = data.brandId
    if (data.modelId !== undefined) snakeCaseData.model_id = data.modelId
    if (data.companyId !== undefined) snakeCaseData.company_id = data.companyId
    if (data.fleetTypeId !== undefined) snakeCaseData.fleet_type_id = data.fleetTypeId
    if (data.seatLayoutId !== undefined) snakeCaseData.seat_layout_id = data.seatLayoutId
    if (data.name !== undefined) snakeCaseData.name = data.name
    if (data.capacity !== undefined) snakeCaseData.capacity = data.capacity
    if (data.registrationNumber !== undefined) snakeCaseData.registration_number = data.registrationNumber
    if (data.engineNumber !== undefined) snakeCaseData.engine_number = data.engineNumber
    if (data.chassisNumber !== undefined) snakeCaseData.chassis_number = data.chassisNumber
    if (data.plateNumber !== undefined) snakeCaseData.plate_number = data.plateNumber
    if (data.location !== undefined) snakeCaseData.location = data.location
    if (data.isActive !== undefined) snakeCaseData.is_active = data.isActive
    if (data.frontSeatAvailable !== undefined) snakeCaseData.front_seat_available = data.frontSeatAvailable
    if (data.isLastFullSeat !== undefined) snakeCaseData.is_last_full_seat = data.isLastFullSeat
    if (data.isNew !== undefined) snakeCaseData.is_new = data.isNew
    if ((data as any).isSpecialHire !== undefined) snakeCaseData.is_special_hire = (data as any).isSpecialHire

    console.log("[Vehicle] Sending snake_case payload:", snakeCaseData)

    // Try PATCH first (Laravel resource route), then PUT as fallback
    const endpoints = [
        { url: `/api/vehicle/vehicle/${id}`, method: "PATCH" },
        { url: `/api/vehicle/vehicle/${id}`, method: "PUT" },
    ]

    for (const { url, method } of endpoints) {
        try {
            const result = await apiRequest(url, {
                method,
                body: JSON.stringify(snakeCaseData),
            })
            console.log(`✅ Vehicle updated successfully via ${method}:`, result)
            return result
        } catch (error: any) {
            console.warn(`[Vehicle] ${method} to ${url} failed:`, error.message)
            // Only continue to fallback if it wasn't a validation error (4xx)
            if (error.message?.includes("422") || error.message?.includes("400")) {
                console.error("❌ Validation error updating vehicle:", error)
                throw error
            }
        }
    }

    throw new Error("Error updating vehicle: all endpoints failed")
}

/**
 * Delete a vehicle
 */
export async function deleteVehicle(id: number): Promise<any> {
    console.log(`[Vehicle] Deleting vehicle ${id}`)

    try {
        const result = await apiRequest(`/api/vehicle/vehicle/${id}`, {
            method: "DELETE",
        })

        console.log("✅ Vehicle deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting vehicle ${id}:`, error)
        throw error
    }
}

/**
 * Get all brands
 */
export async function getBrands() {
    console.log("[Vehicle] Fetching brands...")

    // Try multiple endpoints with pagination disabled
    const endpoints = [
        "/api/vehicle/brands?all=true",
        "/api/vehicle/brands?paginate=false",
        "/api/vehicle/brands?per_page=10000",
        "/api/vehicle/brands",
    ]

    for (const endpoint of endpoints) {
        try {
            console.log(`[Vehicle] Trying endpoint: ${endpoint}`)
            const response = await apiRequest(endpoint)

            let brands: any[] = []
            if (Array.isArray(response)) {
                brands = response
            } else if (response.data && Array.isArray(response.data)) {
                brands = response.data
            } else if (response.brands && Array.isArray(response.brands)) {
                brands = response.brands
            }

            // Handle pagination if present
            if ((response.pagination || response.meta || response.current_page) && brands.length > 0) {
                console.log("[Vehicle] Detected paginated response")
                const allBrands = [...brands]

                const totalPages =
                    response.pagination?.totalPages ||
                    response.pagination?.last_page ||
                    response.meta?.last_page ||
                    response.last_page ||
                    1

                const currentPage =
                    response.pagination?.currentPage ||
                    response.pagination?.current_page ||
                    response.meta?.current_page ||
                    response.current_page ||
                    1

                if (totalPages > currentPage) {
                    for (let page = currentPage + 1; page <= totalPages; page++) {
                        try {
                            const pageEndpoint = endpoint.includes("?") ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`
                            const pageResponse = await apiRequest(pageEndpoint)
                            const pageBrands = pageResponse.data || pageResponse.brands || pageResponse

                            if (Array.isArray(pageBrands)) {
                                allBrands.push(...pageBrands)
                            }
                        } catch (pageError) {
                            console.warn(`[Vehicle] Error fetching page ${page}:`, pageError)
                        }
                    }
                }

                brands = allBrands
            }

            const normalizedBrands = brands
                .filter((brand: any) => brand && (brand.id || brand._id) && brand.name)
                .map((brand: any) => ({
                    id: brand.id || brand._id,
                    name: brand.name || brand.brandName || brand.title,
                    ...(brand.description && { description: brand.description }),
                    ...(brand.logo && { logo: brand.logo }),
                }))

            const uniqueBrands = normalizedBrands.filter(
                (brand, index, self) => index === self.findIndex((b) => b.id === brand.id)
            )

            if (uniqueBrands.length > 0) {
                console.log(`✅ Fetched ${uniqueBrands.length} brands`)
                return uniqueBrands
            }
        } catch (error) {
            console.log(`[Vehicle] Endpoint ${endpoint} failed:`, error)
            continue
        }
    }

    console.warn("⚠️ All brand endpoints failed, returning empty array")
    return []
}

/**
 * Get all models
 */
export async function getModels() {
    console.log("[Vehicle] Fetching models...")

    const endpoints = [
        "/api/vehicle/models?all=true",
        "/api/vehicle/models?paginate=false",
        "/api/vehicle/models?per_page=10000",
        "/api/vehicle/models",
    ]

    for (const endpoint of endpoints) {
        try {
            console.log(`[Vehicle] Trying endpoint: ${endpoint}`)
            const response = await apiRequest(endpoint)

            let models: any[] = []
            if (Array.isArray(response)) {
                models = response
            } else if (response.data && Array.isArray(response.data)) {
                models = response.data
            } else if (response.models && Array.isArray(response.models)) {
                models = response.models
            }

            // Handle pagination if present
            if ((response.pagination || response.meta || response.current_page) && models.length > 0) {
                console.log("[Vehicle] Detected paginated response")
                const allModels = [...models]

                const totalPages =
                    response.pagination?.totalPages ||
                    response.pagination?.last_page ||
                    response.meta?.last_page ||
                    response.last_page ||
                    1

                const currentPage =
                    response.pagination?.currentPage ||
                    response.pagination?.current_page ||
                    response.meta?.current_page ||
                    response.current_page ||
                    1

                if (totalPages > currentPage) {
                    for (let page = currentPage + 1; page <= totalPages; page++) {
                        try {
                            const pageEndpoint = endpoint.includes("?") ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`
                            const pageResponse = await apiRequest(pageEndpoint)
                            const pageModels = pageResponse.data || pageResponse.models || pageResponse

                            if (Array.isArray(pageModels)) {
                                allModels.push(...pageModels)
                            }
                        } catch (pageError) {
                            console.warn(`[Vehicle] Error fetching page ${page}:`, pageError)
                        }
                    }
                }

                models = allModels
            }

            const normalizedModels = models
                .filter((model: any) => model && (model.id || model._id) && model.name)
                .map((model: any) => ({
                    id: model.id || model._id,
                    name: model.name || model.modelName || model.title,
                    brandId: model.brandId || model.brand_id,
                    ...(model.description && { description: model.description }),
                    ...(model.year && { year: model.year }),
                }))

            const uniqueModels = normalizedModels.filter(
                (model, index, self) => index === self.findIndex((m) => m.id === model.id)
            )

            if (uniqueModels.length > 0) {
                console.log(`✅ Fetched ${uniqueModels.length} models`)
                return uniqueModels
            }
        } catch (error) {
            console.log(`[Vehicle] Endpoint ${endpoint} failed:`, error)
            continue
        }
    }

    console.warn("⚠️ All model endpoints failed, returning empty array")
    return []
}

/**
 * Get all fleet types
 */
export async function getFleetTypes() {
    console.log("[Vehicle] Fetching fleet types...")

    const endpoints = [
        "/api/vehicle/fleet-types?all=true",
        "/api/vehicle/fleet-types?paginate=false",
        "/api/vehicle/fleet-types?per_page=10000",
        "/api/vehicle/fleet-types",
    ]

    for (const endpoint of endpoints) {
        try {
            console.log(`[Vehicle] Trying endpoint: ${endpoint}`)
            const response = await apiRequest(endpoint)

            let fleetTypes: any[] = []
            if (Array.isArray(response)) {
                fleetTypes = response
            } else if (response.data && Array.isArray(response.data)) {
                fleetTypes = response.data
            } else if (response.fleetTypes && Array.isArray(response.fleetTypes)) {
                fleetTypes = response.fleetTypes
            } else if (response.fleet_types && Array.isArray(response.fleet_types)) {
                fleetTypes = response.fleet_types
            }

            // Handle pagination if present
            if ((response.pagination || response.meta || response.current_page) && fleetTypes.length > 0) {
                console.log("[Vehicle] Detected paginated response")
                const allFleetTypes = [...fleetTypes]

                const totalPages =
                    response.pagination?.totalPages ||
                    response.pagination?.last_page ||
                    response.meta?.last_page ||
                    response.last_page ||
                    1

                const currentPage =
                    response.pagination?.currentPage ||
                    response.pagination?.current_page ||
                    response.meta?.current_page ||
                    response.current_page ||
                    1

                if (totalPages > currentPage) {
                    for (let page = currentPage + 1; page <= totalPages; page++) {
                        try {
                            const pageEndpoint = endpoint.includes("?") ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`
                            const pageResponse = await apiRequest(pageEndpoint)
                            const pageFleetTypes =
                                pageResponse.data || pageResponse.fleetTypes || pageResponse.fleet_types || pageResponse

                            if (Array.isArray(pageFleetTypes)) {
                                allFleetTypes.push(...pageFleetTypes)
                            }
                        } catch (pageError) {
                            console.warn(`[Vehicle] Error fetching page ${page}:`, pageError)
                        }
                    }
                }

                fleetTypes = allFleetTypes
            }

            const normalizedFleetTypes = fleetTypes
                .filter((fleetType: any) => fleetType && (fleetType.id || fleetType._id) && fleetType.name)
                .map((fleetType: any) => ({
                    id: fleetType.id || fleetType._id,
                    name: fleetType.name || fleetType.typeName || fleetType.title,
                    ...(fleetType.description && { description: fleetType.description }),
                    ...(fleetType.capacity && { capacity: fleetType.capacity }),
                }))

            const uniqueFleetTypes = normalizedFleetTypes.filter(
                (fleetType, index, self) => index === self.findIndex((f) => f.id === fleetType.id)
            )

            if (uniqueFleetTypes.length > 0) {
                console.log(`✅ Fetched ${uniqueFleetTypes.length} fleet types`)
                return uniqueFleetTypes
            }
        } catch (error) {
            console.log(`[Vehicle] Endpoint ${endpoint} failed:`, error)
            continue
        }
    }

    console.warn("⚠️ All fleet type endpoints failed, returning empty array")
    return []
}

/**
 * Get all seat layouts
 */
export async function getSeatLayouts() {
    console.log("[Vehicle] Fetching seat layouts...")

    const endpoints = [
        "/api/vehicle/seat-layouts?all=true",
        "/api/vehicle/seat-layouts?paginate=false",
        "/api/vehicle/seat-layouts?per_page=10000",
        "/api/vehicle/seat-layouts",
    ]

    for (const endpoint of endpoints) {
        try {
            console.log(`[Vehicle] Trying endpoint: ${endpoint}`)
            const response = await apiRequest(endpoint)

            let seatLayouts: any[] = []
            if (Array.isArray(response)) {
                seatLayouts = response
            } else if (response.data && Array.isArray(response.data)) {
                seatLayouts = response.data
            } else if (response.seatLayouts && Array.isArray(response.seatLayouts)) {
                seatLayouts = response.seatLayouts
            } else if (response.seat_layouts && Array.isArray(response.seat_layouts)) {
                seatLayouts = response.seat_layouts
            }

            // Handle pagination if present
            if ((response.pagination || response.meta || response.current_page) && seatLayouts.length > 0) {
                console.log("[Vehicle] Detected paginated response")
                const allSeatLayouts = [...seatLayouts]

                const totalPages =
                    response.pagination?.totalPages ||
                    response.pagination?.last_page ||
                    response.meta?.last_page ||
                    response.last_page ||
                    1

                const currentPage =
                    response.pagination?.currentPage ||
                    response.pagination?.current_page ||
                    response.meta?.current_page ||
                    response.current_page ||
                    1

                if (totalPages > currentPage) {
                    for (let page = currentPage + 1; page <= totalPages; page++) {
                        try {
                            const pageEndpoint = endpoint.includes("?") ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`
                            const pageResponse = await apiRequest(pageEndpoint)
                            const pageSeatLayouts =
                                pageResponse.data || pageResponse.seatLayouts || pageResponse.seat_layouts || pageResponse

                            if (Array.isArray(pageSeatLayouts)) {
                                allSeatLayouts.push(...pageSeatLayouts)
                            }
                        } catch (pageError) {
                            console.warn(`[Vehicle] Error fetching page ${page}:`, pageError)
                        }
                    }
                }

                seatLayouts = allSeatLayouts
            }

            const normalizedSeatLayouts = seatLayouts
                .filter((seatLayout: any) => seatLayout && (seatLayout.id || seatLayout._id) && seatLayout.name)
                .map((seatLayout: any) => ({
                    id: seatLayout.id || seatLayout._id,
                    name: seatLayout.name || seatLayout.layoutName || seatLayout.title,
                    ...(seatLayout.description && { description: seatLayout.description }),
                    ...(seatLayout.totalSeats && { totalSeats: seatLayout.totalSeats }),
                }))

            const uniqueSeatLayouts = normalizedSeatLayouts.filter(
                (seatLayout, index, self) => index === self.findIndex((s) => s.id === seatLayout.id)
            )

            if (uniqueSeatLayouts.length > 0) {
                console.log(`✅ Fetched ${uniqueSeatLayouts.length} seat layouts`)
                return uniqueSeatLayouts
            }
        } catch (error) {
            console.log(`[Vehicle] Endpoint ${endpoint} failed:`, error)
            continue
        }
    }

    console.warn("⚠️ All seat layout endpoints failed, returning empty array")
    return []
}

/**
 * Get all companies
 */
export async function getCompanies(): Promise<Company[]> {
    console.log("[Vehicle] Fetching companies...")

    const endpoints = [
        "/api/companies?all=true",
        "/api/companies?paginate=false",
        "/api/companies?per_page=10000",
        "/api/companies",
        "/api/auth/companies?all=true",
        "/api/auth/companies?paginate=false",
        "/api/auth/companies",
    ]

    for (const endpoint of endpoints) {
        try {
            console.log(`[Vehicle] Trying endpoint: ${endpoint}`)
            const response = await apiRequest(endpoint)

            let companies: any[] = []
            if (Array.isArray(response)) {
                companies = response
            } else if (response.data && Array.isArray(response.data)) {
                companies = response.data
            } else if (response.companies && Array.isArray(response.companies)) {
                companies = response.companies
            }

            // Handle pagination if present
            if ((response.pagination || response.meta || response.current_page) && companies.length > 0) {
                console.log("[Vehicle] Detected paginated response")
                const allCompanies = [...companies]

                const totalPages =
                    response.pagination?.totalPages ||
                    response.pagination?.last_page ||
                    response.meta?.last_page ||
                    response.last_page ||
                    1

                const currentPage =
                    response.pagination?.currentPage ||
                    response.pagination?.current_page ||
                    response.meta?.current_page ||
                    response.current_page ||
                    1

                if (totalPages > currentPage) {
                    for (let page = currentPage + 1; page <= totalPages; page++) {
                        try {
                            const pageEndpoint = endpoint.includes("?") ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`
                            const pageResponse = await apiRequest(pageEndpoint)
                            const pageCompanies = pageResponse.data || pageResponse.companies || pageResponse

                            if (Array.isArray(pageCompanies)) {
                                allCompanies.push(...pageCompanies)
                            }
                        } catch (pageError) {
                            console.warn(`[Vehicle] Error fetching page ${page}:`, pageError)
                        }
                    }
                }

                companies = allCompanies
            }

            const normalizedCompanies = companies
                .filter((company: any) => company && (company.id || company._id) && company.name)
                .map((company: any) => ({
                    id: company.id || company._id,
                    name: company.name || company.companyName || company.title,
                    ...(company.description && { description: company.description }),
                    ...(company.email && { email: company.email }),
                    ...(company.phone && { phone: company.phone }),
                }))

            const uniqueCompanies = normalizedCompanies.filter(
                (company, index, self) => index === self.findIndex((c) => c.id === company.id)
            )

            if (uniqueCompanies.length > 0) {
                console.log(`✅ Fetched ${uniqueCompanies.length} companies`)
                return uniqueCompanies
            }
        } catch (error) {
            console.log(`[Vehicle] Endpoint ${endpoint} failed:`, error)
            continue
        }
    }

    console.warn("⚠️ All company endpoints failed, returning empty array")
    return []
}

/**
 * Normalize vehicle data between camelCase and snake_case
 */
export function normalizeVehicleData(vehicle: any): Vehicle | null {
    if (!vehicle) return null

    return {
        id: vehicle.id,
        uuid: vehicle.uuid,
        name: vehicle.name,
        brandId: vehicle.brandId || vehicle.brand_id,
        modelId: vehicle.modelId || vehicle.model_id,
        companyId: vehicle.companyId || vehicle.company_id,
        fleetTypeId: vehicle.fleetTypeId || vehicle.fleet_type_id,
        seatLayoutId: vehicle.seatLayoutId || vehicle.seat_layout_id,
        capacity: vehicle.capacity,
        registrationNumber: vehicle.registrationNumber || vehicle.registration_number,
        engineNumber: vehicle.engineNumber || vehicle.engine_number,
        chassisNumber: vehicle.chassisNumber || vehicle.chassis_number,
        plateNumber: vehicle.plateNumber || vehicle.plate_number,
        location: vehicle.location,
        isActive: vehicle.isActive ?? vehicle.is_active ?? true,
        status: vehicle.status || 0,
        frontSeatAvailable: vehicle.frontSeatAvailable || vehicle.front_seat_available || false,
        isLastFullSeat: vehicle.isLastFullSeat || vehicle.is_last_full_seat || false,
        isNew: vehicle.isNew || vehicle.is_new || false,
        color: vehicle.color,
        latraSync: vehicle.latraSync || vehicle.latra_sync || 0,
        latraPayload: vehicle.latraPayload || vehicle.latra_payload,
        latraResponse: vehicle.latraResponse || vehicle.latra_response,
        yearOfManufacture: vehicle.yearOfManufacture || vehicle.year_of_manufacture,
        insuranceProvider: vehicle.insuranceProvider || vehicle.insurance_provider,
        insurancePolicyNumber: vehicle.insurancePolicyNumber || vehicle.insurance_policy_number,
        insuranceExpiryDate: vehicle.insuranceExpiryDate || vehicle.insurance_expiry_date,
        inspectionCertificateNumber: vehicle.inspectionCertificateNumber || vehicle.inspection_certificate_number,
        inspectionExpiryDate: vehicle.inspectionExpiryDate || vehicle.inspection_expiry_date,
        additionalNotes: vehicle.additionalNotes || vehicle.additional_notes,
        brand: vehicle.brand,
        model: vehicle.model,
        company: vehicle.company,
        fleetType: vehicle.fleetType || vehicle.fleet_type,
        seatLayout: vehicle.seatLayout || vehicle.seat_layout,
        createdAt: vehicle.createdAt || vehicle.created_at,
        updatedAt: vehicle.updatedAt || vehicle.updated_at,
    }
}

/**
 * Calculate vehicle statistics
 */
export function calculateVehicleStats(vehicles: any[]) {
    return {
        total: vehicles.length,
        active: vehicles.filter((v) => v.isActive || v.is_active).length,
        inactive: vehicles.filter((v) => !(v.isActive || v.is_active)).length,
    }
}
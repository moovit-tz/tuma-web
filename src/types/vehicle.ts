export interface Vehicle {
    id: number
    uuid: string
    brandId: number
    modelId: number
    companyId: number
    fleetTypeId: number
    seatLayoutId: number
    name: string
    capacity?: number
    registrationNumber: string
    engineNumber: string
    chassisNumber: string
    isActive: boolean
    status: number
    createdAt: string
    updatedAt: string
    frontSeatAvailable: boolean
    isLastFullSeat: boolean
    isNew: boolean
    isSpecialHire?: boolean
    location?: string
    latraSync: number
    latraPayload?: any
    latraResponse?: any
    plateNumber?: string
    color?: string
    yearOfManufacture?: number
    insuranceProvider?: string
    insurancePolicyNumber?: string
    insuranceExpiryDate?: string
    inspectionCertificateNumber?: string
    inspectionExpiryDate?: string
    additionalNotes?: string
    brand?: {
        id: number
        name: string
        uuid: string
    }
    company?: {
        id: number
        name: string
        phoneNumber?: string
        email?: string
    }
    fleetType?: {
        id: number
        name: string
    }
    model?: {
        id: number
        name: string
        uuid: string
    }
    seatLayout?: {
        id: number
        name: string
    }
    parcels?: any[]
}

export interface VehicleFilters {
    company_id?: number
    brand_id?: number
    model_id?: number
    fleet_type_id?: number
    status?: number
    name?: string
    registration_number?: string
    is_active?: boolean
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateVehicleData {
    brandId: number
    modelId: number
    companyId: number
    fleetTypeId: number
    seatLayoutId: number
    name: string
    capacity?: number
    registrationNumber: string
    engineNumber: string
    chassisNumber: string
    isActive: boolean
    status: number
    frontSeatAvailable: boolean
    isLastFullSeat: boolean
    isNew: boolean
    isSpecialHire?: boolean
    location?: string
    plateNumber?: string
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

export interface VehicleResponse {
    data: Vehicle[]
    meta?: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
}

// Additional interfaces for related entities
export interface Brand {
    id: number
    uuid: string
    name: string
    createdAt: string
    updatedAt: string
}

export interface Model {
    id: number
    uuid: string
    name: string
    createdAt: string
    updatedAt: string
}

export interface FleetType {
    id: number
    name: string
}

export interface SeatLayout {
    id: number
    name: string
}

export interface BookingOffice {
    id: number
    uuid: string
    name: string
    code?: string
    address?: string
    phoneNumber?: string
    email?: string
    districtId: number
    isActive: boolean
    createdAt: string
    updatedAt: string
    district?: {
        id: number
        name: string
        code?: string
        region?: {
            id: number
            name: string
            country?: {
                id: number
                name: string
                code: string
            }
        }
    }
    agents?: any[]
    parcels?: any[]
}

export interface BookingOfficeFilters {
    name?: string
    code?: string
    district_id?: number
    region_id?: number
    country_id?: number
    is_active?: boolean
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateBookingOfficeData {
    name: string
    code?: string
    address?: string
    phoneNumber?: string
    email?: string
    districtId: number
    isActive: boolean
}

export interface UpdateBookingOfficeData extends Partial<CreateBookingOfficeData> {}

export interface BookingOfficeResponse {
    data: BookingOffice[]
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

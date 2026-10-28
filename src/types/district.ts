export interface District {
    id: number
    uuid: string
    name: string
    code?: string
    regionId: number
    region_id?: number // Alternative field name
    latitude?: number
    longitude?: number
    isActive: boolean
    is_active?: boolean // Alternative field name
    createdAt: string
    created_at?: string // Alternative field name
    updatedAt: string
    updated_at?: string // Alternative field name
    region?: {
        id: number
        name: string
        code?: string
        country?: {
            id: number
            name: string
            code: string
        }
    }
    bookingOffices?: any[]
    booking_offices?: any[] // Alternative field name
}

export interface DistrictFilters {
    name?: string
    code?: string
    region_id?: number
    country_id?: number
    is_active?: boolean
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateDistrictData {
    name: string
    code?: string
    regionId: number
    latitude?: number
    longitude?: number
    isActive?: boolean
}

export interface UpdateDistrictData extends Partial<CreateDistrictData> {}

export interface DistrictResponse {
    data: District[]
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

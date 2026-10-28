export interface Region {
    id: number
    uuid: string
    name: string
    code?: string
    countryId: number
    createdAt: string
    updatedAt: string
    country?: {
        id: number
        name: string
        code: string
    }
    districts?: any[]
}

export interface RegionFilters {
    name?: string
    code?: string
    country_id?: number
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateRegionData {
    name: string
    code?: string
    countryId: number
}

export interface UpdateRegionData extends Partial<CreateRegionData> {}

export interface RegionResponse {
    data: Region[]
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

export interface Country {
    id: number
    uuid: string
    name: string
    code: string
    createdAt: string
    updatedAt: string
    regions?: {
        id: number
        name: string
        code?: string
    }[]
}

export interface CountryFilters {
    name?: string
    code?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateCountryData {
    name: string
    code: string
}

export interface UpdateCountryData extends Partial<CreateCountryData> {}

export interface CountryResponse {
    data: Country[]
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

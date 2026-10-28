export interface Brand {
    id: number
    uuid: string
    name: string
    createdAt: string
    updatedAt: string
    vehicles?: any[]
}

export interface BrandFilters {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateBrandData {
    name: string
}

export interface UpdateBrandData extends Partial<CreateBrandData> {}

export interface BrandResponse {
    data: Brand[]
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

export interface FleetType {
    id: number
    name: string
    description?: string
    createdAt: string
    updatedAt: string
    vehicles?: any[]
}

export interface FleetTypeFilters {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateFleetTypeData {
    name: string
    description?: string
}

export interface UpdateFleetTypeData extends Partial<CreateFleetTypeData> {}

export interface FleetTypeResponse {
    data: FleetType[]
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

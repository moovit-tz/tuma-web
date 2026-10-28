export interface Model {
    id: number
    uuid: string
    name: string
    createdAt: string
    updatedAt: string
    vehicles?: any[]
}

export interface ModelFilters {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateModelData {
    name: string
}

export interface UpdateModelData extends Partial<CreateModelData> {}

export interface ModelResponse {
    data: Model[]
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

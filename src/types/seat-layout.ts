export interface SeatLayout {
    id: number
    name: string
    description?: string
    totalSeats?: number
    configuration?: string
    createdAt: string
    updatedAt: string
    vehicles?: any[]
}

export interface SeatLayoutFilters {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateSeatLayoutData {
    name: string
    description?: string
    totalSeats?: number
    configuration?: string
}

export interface UpdateSeatLayoutData extends Partial<CreateSeatLayoutData> {}

export interface SeatLayoutResponse {
    data: SeatLayout[]
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

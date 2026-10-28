export interface Route {
    id: number
    name: string
    start_point_id: number
    end_point_id: number
    distance: number
    estimated_journey_hours: number
    fare: number
    is_active: boolean
    status?: string
    created_at?: string
    updated_at?: string
}

export interface RouteFilters {
    name?: string
    is_active?: boolean
    paginate?: boolean
    page?: number
}

export interface CreateRouteData {
    name: string
    start_point_id: number
    end_point_id: number
    distance: number
    estimated_journey_hours: number
    fare: number
    is_active: boolean
}

export interface UpdateRouteData extends Partial<CreateRouteData> {}

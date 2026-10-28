export type DeviceStatus = "active" | "inactive" | "maintenance" | "offline"
export type DeviceType = "mounted" | "handheld" | "fixed" | "mobile"

export interface Device {
    id: number
    name: string
    serial_number: string
    type: DeviceType
    status: DeviceStatus
    vehicle_id?: number | null
    fcm_token?: string | null
    created_at: string
    updated_at: string
}

export interface DeviceFilters {
    name?: string
    status?: boolean
    paginate?: boolean
    page?: number
}

export interface CreateDeviceData {
    name: string
    serial_number: string
    type: DeviceType
    status: DeviceStatus
    vehicle_id?: number | null
    fcm_token?: string | null
}

export interface UpdateDeviceData {
    name?: string
    serial_number?: string
    type?: DeviceType
    status?: DeviceStatus
    vehicle_id?: number | null
    fcm_token?: string | null
}

export interface DeviceResponse {
    data: Device[]
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

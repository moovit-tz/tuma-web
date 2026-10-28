import type { DateRange } from "react-day-picker"

export type TimeFrame = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

export type ExportFormat = "csv" | "excel" | "pdf"

export interface ChartData {
    name: string
    value: number
}

export interface RevenueChartData {
    name: string
    revenue: number
    bookings?: number
}

export interface BookingDistribution {
    label: string
    count: number
}

export interface DashboardStats {
    period: {
        start_date: string
        end_date: string
    }
    metrics: {
        total_revenue: string
        total_bookings: number
        total_active_vehicles: number
        average_fare: string
        revenue_per_vehicle: string
        bookings_per_day: string
    }
}

export interface Company {
    id: number
    name: string
    // Add any other company properties needed
}

export interface DashboardResponse {
    success: boolean
    data: DashboardStats
    message?: string
}

export interface PaginationParams {
    page: number
    limit: number
}

export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
    success: boolean
    message?: string
}

export interface DashboardDateRange extends DateRange {
    // Add any custom properties to extend DateRange
    name?: string // For named presets
}

export interface FilterOption {
    id: string
    label: string
    type: "text" | "select" | "date" | "number" | "boolean"
    options?: { value: string; label: string }[]
}

export interface ChartOptions {
    timeFrame: TimeFrame
    showLabels?: boolean
    colors?: string[]
    stack?: boolean
    animated?: boolean
}

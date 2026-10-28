export interface Report {
    id: number
    name: string
    type: ReportType
    status: ReportStatus
    format: ReportFormat
    createdAt: string
    completedAt?: string
    fileSize?: string
    downloadUrl?: string
    companyId?: number
    companyName?: string
    agentId?: string
    vehicleId?: number
    locationId?: number
    locationName?: string
    locationType?: LocationType
    dateRange?: {
        startDate: string
        endDate: string
    }
    userId: number
    userName?: string
    description?: string
    errorMessage?: string
    downloadCount: number
}

export type ReportType =
    | "COMPANY_SUMMARY"
    | "COMPANY_AGENTS"
    | "COMPANY_VEHICLES"
    | "COMPANY_PARCELS"
    | "ALL_AGENTS"
    | "SPECIFIC_AGENT"
    | "LOGGED_AGENT"
    | "FLOAT_REPORTS"
    | "REVENUE_OVER_TIME"
    | "COUNTRY_REPORT"
    | "REGION_REPORT"
    | "DISTRICT_REPORT"
    | "BOOKING_OFFICE_REPORT"
    | "VEHICLES_BY_DATE"
    | "PARCELS_BY_VEHICLE"
    | "PARCEL_REPORTS"
    | "AUTOMATED_REPORTS"
    | "CANCELLATION_REPORTS"

export type ReportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export type ReportFormat = "PDF" | "EXCEL" | "CSV"

export type LocationType = "country" | "region" | "district" | "booking_office"

export interface ReportAnalytics {
    totalReports: number
    completedReports: number
    processingReports: number
    failedReports: number
    totalDownloads: number
    avgProcessingTime: string
    popularFormat: string
    mostRequestedType: string
    reportsByCategory: Record<string, number>
    recentActivity: {
        date: string
        count: number
    }[]
}

export interface GenerateReportParams {
    type: string
    startDate: string
    endDate: string
    format: ReportFormat
    description?: string
    companyId?: number
    agentId?: string
    vehicleId?: number
    locationId?: number
    locationType?: string
    interval?: string
}

export interface ReportsResponse {
    data: Report[]
    meta: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface GetReportsParams {
    page?: number
    limit?: number
    type?: ReportType | "ALL"
    status?: ReportStatus | "ALL"
    search?: string
    companyId?: number
    userId?: number
}

export interface ReportTypeDefinition {
    id: string
    name: string
    description: string
    category: string
    requiresCompany?: boolean
    requiresAgent?: boolean
    requiresVehicle?: boolean
    requiresLocation?: boolean
    requiresDateRange?: boolean
    supportedFormats: ReportFormat[]
    estimatedTime: string
}

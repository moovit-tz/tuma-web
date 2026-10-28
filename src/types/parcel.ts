export interface Parcel {
    id: number
    uuid: string
    name: string
    parcelNumber: string
    parcelTypeId?: number
    weight?: number
    value?: number
    price?: number
    units?: number
    originId: number
    destinationId: number
    originOfficeId?: number
    destinationOfficeId?: number
    senderName: string
    senderPhoneNumber: string
    recipientName: string
    recipientPhoneNumber: string
    description?: string
    secretKey?: string
    status: ParcelStatus
    vehicleId?: number
    travelDate?: string
    deliveredDate?: string
    createdAt: string
    updatedAt: string
    senderId: number
    receiverId: number
    dispatcherId?: number
    offloaderId?: number
    delivererId?: number
    cancelerId?: number
    cancellationReason?: string
    isCanceled: boolean
    pickedUpDate?: string
    pickupPersonName?: string
    pickupPersonPhone?: string

    // Calculated fields for LOST status logic
    daysSinceReceived?: number
    daysSinceDispatched?: number
    daysSinceOffloaded?: number
    isOverdue?: boolean

    // Relations
    parcelType?: {
        id: number
        name: string
        description?: string
    }
    origin?: {
        id: number
        name: string
        code?: string
    }
    destination?: {
        id: number
        name: string
        code?: string
    }
    originOffice?: {
        id: number
        name: string
    }
    destinationOffice?: {
        id: number
        name: string
    }
    sender?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    receiver?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    dispatcher?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    offloader?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    deliverer?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    canceler?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    vehicle?: {
        id: number
        name: string
        registrationNumber: string
    }
    tracking?: ParcelTracking[]
    otps?: OTP[]
}

export interface ParcelTracking {
    id: number
    uuid: string
    parcelId: number
    status: ParcelStatus
    location?: string
    description?: string
    timestamp: string
    createdAt: string
    updatedAt: string
}

export interface OTP {
    id: number
    parcelId: number
    code: string
    createdAt: string
    used: boolean
}

export interface ParcelType {
    id: number
    name: string
    description?: string
    createdAt: string
    updatedAt: string
}

export enum ParcelStatus {
    RECEIVED = "RECEIVED",
    DISPATCHED = "DISPATCHED",
    OFFLOADED = "OFFLOADED",
    LOST = "LOST",
    DELIVERED = "DELIVERED",
    CANCELED = "CANCELED",
    PICKED_UP = "PICKED_UP",
}

export interface ParcelFilters {
    parcelNumber?: string
    senderName?: string
    recipientName?: string
    originId?: number
    destinationId?: number
    originOfficeId?: number
    destinationOfficeId?: number
    vehicleId?: number
    status?: ParcelStatus
    dateFrom?: string
    dateTo?: string
    paginate?: boolean
    page?: number
    perPage?: number
    includeOverdue?: boolean
}

export interface ParcelStats {
    total: number
    received: number
    dispatched: number
    offloaded: number
    lost: number
    delivered: number
    canceled: number
    pickedUp: number
    totalValue: number // Declared goods value, in TZS
    totalPrice?: number // Shipping revenue (sum of parcel price), in TZS
    totalWeight: number
    pendingDeliveries: number
    overdueCount?: number
    lostPercentage?: number
    averageValue?: number // Average value per parcel in TZS
    averageWeight?: number // Average weight per parcel
    /** Whether the value/price/weight sums cover every parcel in the range */
    totalsComplete?: boolean
    /** Parcels the sums and averages were computed from */
    totalsSampleSize?: number
}

export interface ParcelResponse {
    data: Parcel[]
    meta: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
    stats?: ParcelStats
}

export interface TrackingResult {
    parcel: Parcel
    currentStatus: ParcelStatus
    currentLocation?: string
    estimatedDelivery?: string
    trackingHistory: ParcelTracking[]
    isOverdue: boolean
    daysSinceLastUpdate: number
}

export interface ParcelPriceData {
    totalPrice: number
    totalParcels: number
    averagePrice: number
    statusBreakdown: {
        [key in ParcelStatus]?: {
            totalPrice: number
            count: number
        }
    }
    filters: {
        role: string
        companyId: number
        dateRange: string | null
    }
}

export interface ParcelPriceResponse {
    success: boolean
    data: ParcelPriceData
    message: string
}

export interface RegionPriceData {
    regionId: number
    regionName: string
    regionCode: string
    totalAmount: number
    parcelCount: number
    averagePrice: number
}

export interface ParcelPriceByRegionResponse {
    success: boolean
    data: {
        groupBy: string
        regions: Array<{
            groupType: string
            data: RegionPriceData[]
        }>
        filters: {
            role: string
            companyId: number
            dateRange: string | null
        }
    }
    message: string
}

export interface OfficePriceData {
    officeId: number
    officeName: string
    regionName: string
    regionCode: string
    districtName: string
    totalAmount: number
    parcelCount: number
    averagePrice: number
}

export interface ParcelPriceByOfficeResponse {
    success: boolean
    data: {
        groupBy: string
        offices: Array<{
            groupType: string
            data: OfficePriceData[]
        }>
        filters: {
            role: string
            companyId: number
            dateRange: string | null
        }
    }
    message: string
}

export interface ParcelTransaction {
    id: number
    parcelNumber: string
    price: number
    status: string
    createdAt: string
    senderName: string
    recipientName: string
    sender: {
        id: number
        username: string
        fullName: string
        company: {
            id: number
            name: string
        }
    }
    receiver: {
        id: number
        username: string
        fullName: string
    }
    origin: {
        id: number
        name: string
        code: string
    }
    destination: {
        id: number
        name: string
        code: string
    }
    originOffice: {
        id: number
        name: string
    } | null
    destinationOffice: {
        id: number
        name: string
    }
    parcelType: {
        id: number
        name: string
    }
}

export interface ParcelPriceListResponse {
    success: boolean
    data: {
        transactions: ParcelTransaction[]
        pagination: {
            currentPage: number
            totalPages: number
            totalItems: number
            itemsPerPage: number
            hasNextPage: boolean
            hasPreviousPage: boolean
        }
        summary: {
            totalTransactions: number
            totalAmount: number
            averagePrice: number
            minPrice: number
            maxPrice: number
        }
    }
    message: string
}

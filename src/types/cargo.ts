export interface Cargo {
    id: number
    title: string
    description: string
    pickupLocation: string
    deliveryLocation: string
    pickupDate: string
    deliveryDate: string
    weight: number
    dimensions: {
        length: number
        width: number
        height: number
    }
    cargoType: CargoType
    value: number
    currency: string
    specialRequirements?: string[]
    images?: string[]
    status: CargoStatus
    postedBy: {
        id: number
        name: string
        email: string
        phone: string
        rating: number
        totalCargos: number
    }
    bids: Bid[]
    selectedBid?: number
    createdAt: string
    updatedAt: string
}

export interface Bid {
    id: number
    cargoId: number
    companyId: number
    company: {
        id: number
        name: string
        logoUrl?: string
        rating: number
        totalDeliveries: number
        verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED"
    }
    amount: number
    currency: string
    estimatedDeliveryTime: number // in hours
    message?: string
    status: BidStatus
    createdAt: string
    updatedAt: string
}

export type CargoType =
    | "GENERAL"
    | "FRAGILE"
    | "PERISHABLE"
    | "HAZARDOUS"
    | "ELECTRONICS"
    | "DOCUMENTS"
    | "FURNITURE"
    | "AUTOMOTIVE"
    | "TEXTILES"
    | "FOOD"
    | "MEDICAL"
    | "OTHER"

export type CargoStatus = "POSTED" | "BIDDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"

export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"

export interface CargoFilter {
    location?: string
    cargoType?: CargoType
    weightRange?: {
        min: number
        max: number
    }
    valueRange?: {
        min: number
        max: number
    }
    dateRange?: {
        from: string
        to: string
    }
    status?: CargoStatus
    sortBy?: "date" | "weight" | "value" | "bids"
    sortOrder?: "asc" | "desc"
}

export interface CreateCargoRequest {
    title: string
    description: string
    pickupLocation: string
    deliveryLocation: string
    pickupDate: string
    deliveryDate: string
    weight: number
    dimensions: {
        length: number
        width: number
        height: number
    }
    cargoType: CargoType
    value: number
    currency: string
    specialRequirements?: string[]
    images?: File[]
}

export interface CreateBidRequest {
    cargoId: number
    amount: number
    currency: string
    estimatedDeliveryTime: number
    message?: string
}

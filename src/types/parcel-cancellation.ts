export interface ParcelCancellation {
    id: number
    parcelId: number
    userId: number
    reason: string
    status: "PENDING" | "APPROVED" | "REJECTED"
    createdAt: string
    updatedAt: string
    user?: {
        id: number
        fullName: string
        username: string
        role: string
    }
    parcel?: {
        id: number
        trackingNumber: string
        senderName: string
        receiverName: string
        status: string
    }
}

export interface CancellationRequest {
    parcelId: number
    reason: string
}

export interface CancellationResponse {
    success: boolean
    message: string
    data?: ParcelCancellation
}

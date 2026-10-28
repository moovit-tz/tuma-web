import { apiRequest } from "@/lib/constants"
import type { CancellationRequest, CancellationResponse, ParcelCancellation } from "@/types/parcel-cancellation"

/**
 * Request parcel cancellation
 */
export async function requestParcelCancellation(data: CancellationRequest): Promise<CancellationResponse> {
    console.log("[Cancellation] Requesting parcel cancellation:", data)

    try {
        const result = await apiRequest("/api/parcels/cancel", {
            method: "POST",
            body: JSON.stringify(data),
        })

        console.log("✅ Parcel cancellation requested successfully")
        return result
    } catch (error) {
        console.error("❌ Error requesting parcel cancellation:", error)
        throw error
    }
}

/**
 * Reverse parcel cancellation
 */
export async function reverseParcelCancellation(parcelId: number): Promise<CancellationResponse> {
    console.log("[Cancellation] Reversing parcel cancellation for parcel:", parcelId)

    try {
        const result = await apiRequest(`/api/parcels/${parcelId}/reverse-cancellation`, {
            method: "POST",
        })

        console.log("✅ Parcel cancellation reversed successfully")
        return result
    } catch (error) {
        console.error(`❌ Error reversing parcel cancellation for parcel ${parcelId}:`, error)
        throw error
    }
}

/**
 * Get pending cancellations with pagination
 */
export async function getPendingCancellations(
    page = 1,
    perPage = 10
): Promise<{
    data: ParcelCancellation[]
    meta: {
        current_page: number
        last_page: number
        total: number
        per_page: number
    }
}> {
    console.log("[Cancellation] Fetching pending cancellations, page:", page, "perPage:", perPage)

    const queryParams = new URLSearchParams()
    queryParams.append("page", page.toString())
    queryParams.append("per_page", perPage.toString())

    const endpoint = `/api/parcels/cancellations/pending?${queryParams.toString()}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Pending cancellations fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching pending cancellations:", error)
        throw error
    }
}

/**
 * Approve a cancellation request
 */
export async function approveCancellation(cancellationId: number): Promise<CancellationResponse> {
    console.log("[Cancellation] Approving cancellation:", cancellationId)

    try {
        const result = await apiRequest(`/api/parcels/cancellations/${cancellationId}/approve`, {
            method: "POST",
        })

        console.log("✅ Cancellation approved successfully")
        return result
    } catch (error) {
        console.error(`❌ Error approving cancellation ${cancellationId}:`, error)
        throw error
    }
}

/**
 * Reject a cancellation request
 */
export async function rejectCancellation(cancellationId: number, reason?: string): Promise<CancellationResponse> {
    console.log("[Cancellation] Rejecting cancellation:", cancellationId, "Reason:", reason)

    try {
        const result = await apiRequest(`/api/parcels/cancellations/${cancellationId}/reject`, {
            method: "POST",
            body: JSON.stringify({ reason }),
        })

        console.log("✅ Cancellation rejected successfully")
        return result
    } catch (error) {
        console.error(`❌ Error rejecting cancellation ${cancellationId}:`, error)
        throw error
    }
}
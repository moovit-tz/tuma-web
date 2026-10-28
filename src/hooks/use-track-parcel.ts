"use client"

import { useState } from "react"
import { trackParcel as trackParcelService, cancelParcel as cancelParcelService, type TrackingResult } from "@/lib/services/parcel"

interface TimelineEvent {
  status: string
  location: string
  timestamp: string
  notes?: string
}

interface ParcelData {
  id: string
  parcelNumber: string
  status: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  origin?: string
  destination?: string
  weight?: number
  value?: number
  createdAt: string
  updatedAt: string
  timeline?: TimelineEvent[]
  fullTimeline?: TimelineEvent[]
}

export function useTrackParcel() {
  const [parcelData, setParcelData] = useState<TrackingResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trackParcel = async (trackingNumber: string) => {
    setIsLoading(true)
    setError(null)
    setParcelData(null)

    try {
      const result = await trackParcelService(trackingNumber)
      setParcelData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to track parcel"
      setError(errorMessage)
      console.error("Tracking error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelParcel = async (parcelId: number, reason: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await cancelParcelService(parcelId, reason)
      // Refresh data after cancellation if needed
      if (parcelData?.parcel.parcelNumber) {
        await trackParcel(parcelData.parcel.parcelNumber)
      }
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel parcel"
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const resetTracking = () => {
    setParcelData(null)
    setError(null)
    setIsLoading(false)
  }

  return {
    trackParcel,
    parcelData,
    isLoading,
    error,
    resetTracking,
    cancelParcel,
  }
}

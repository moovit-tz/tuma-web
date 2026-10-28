"use client"

import { useEffect, useRef, useCallback } from "react"
import { safeStorage } from "@/lib/safe-storage"
import { useToast } from "@/components/ui/use-toast"

interface UseFormAutosaveOptions<T> {
    data: T
    onSave?: (data: T) => Promise<void>
    delay?: number
    enabled?: boolean
    key: string
    showToast?: boolean
}

export function useFormAutosave<T extends Record<string, any>>({
                                                                   data,
                                                                   onSave,
                                                                   delay = 3000,
                                                                   enabled = true,
                                                                   key,
                                                                   showToast = false,
                                                               }: UseFormAutosaveOptions<T>) {
    const { toast } = useToast()
    const timeoutRef = useRef<NodeJS.Timeout>()
    const lastSavedRef = useRef<string>("")
    const isInitialLoad = useRef(true)

    // Save to localStorage
    const saveToLocalStorage = useCallback(
        (formData: T) => {
            try {
                safeStorage.setItem(
                    `autosave_${key}`,
                    JSON.stringify({
                        data: formData,
                        timestamp: Date.now(),
                    }),
                )
            } catch (error) {
                console.error("Failed to save to localStorage:", error)
            }
        },
        [key],
    )

    // Load from localStorage
    const loadFromLocalStorage = useCallback((): T | null => {
        try {
            const saved = safeStorage.getItem(`autosave_${key}`)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Check if data is less than 24 hours old
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    return parsed.data
                }
            }
        } catch (error) {
            console.error("Failed to load from localStorage:", error)
        }
        return null
    }, [key])

    // Clear autosave data
    const clearAutosave = useCallback(() => {
        try {
            safeStorage.removeItem(`autosave_${key}`)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        } catch (error) {
            console.error("Failed to clear autosave:", error)
        }
    }, [key])

    // Check if there's saved data
    const hasSavedData = useCallback(() => {
        return loadFromLocalStorage() !== null
    }, [loadFromLocalStorage])

    // Auto-save effect
    useEffect(() => {
        if (!enabled || isInitialLoad.current) {
            isInitialLoad.current = false
            return
        }

        const currentDataString = JSON.stringify(data)

        // Only save if data has actually changed
        if (currentDataString === lastSavedRef.current) {
            return
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Set new timeout
        timeoutRef.current = setTimeout(async () => {
            try {
                // Save to localStorage
                saveToLocalStorage(data)
                lastSavedRef.current = currentDataString

                // Optionally save to backend
                if (onSave) {
                    await onSave(data)
                }

                if (showToast) {
                    toast({
                        title: "Draft saved",
                        description: "Your changes have been automatically saved.",
                        duration: 2000,
                    })
                }
            } catch (error) {
                console.error("Autosave failed:", error)
                if (showToast) {
                    toast({
                        variant: "destructive",
                        title: "Autosave failed",
                        description: "Failed to save your changes automatically.",
                        duration: 3000,
                    })
                }
            }
        }, delay)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [data, delay, enabled, onSave, saveToLocalStorage, showToast, toast])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    return {
        loadFromLocalStorage,
        clearAutosave,
        hasSavedData,
        saveToLocalStorage,
    }
}

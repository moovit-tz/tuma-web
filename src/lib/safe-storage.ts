/**
 * Safe Storage Utility
 * 
 * Provides robust access to localStorage with protection against SSR environments
 * and broken polyfills (where localStorage exists but methods are missing).
 */

export const isStorageAvailable = (): boolean => {
    try {
        return (
            typeof window !== "undefined" &&
            typeof window.document !== "undefined" &&
            typeof localStorage !== "undefined" &&
            typeof localStorage.getItem === "function" &&
            typeof localStorage.setItem === "function" &&
            typeof localStorage.removeItem === "function"
        )
    } catch (e) {
        return false
    }
}

export const safeStorage = {
    getItem: (key: string): string | null => {
        if (isStorageAvailable()) {
            try {
                return localStorage.getItem(key)
            } catch (e) {
                console.error(`Error reading from localStorage: ${key}`, e)
                return null
            }
        }
        return null
    },

    setItem: (key: string, value: string): void => {
        if (isStorageAvailable()) {
            try {
                localStorage.setItem(key, value)
            } catch (e) {
                console.error(`Error writing to localStorage: ${key}`, e)
            }
        }
    },

    removeItem: (key: string): void => {
        if (isStorageAvailable()) {
            try {
                localStorage.removeItem(key)
            } catch (e) {
                console.error(`Error removing from localStorage: ${key}`, e)
            }
        }
    },

    clear: (): void => {
        if (isStorageAvailable() && typeof localStorage.clear === "function") {
            try {
                localStorage.clear()
            } catch (e) {
                console.error("Error clearing localStorage", e)
            }
        }
    }
}

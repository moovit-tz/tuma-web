/*
 * Parcel tracking numbers are 3 letters followed by 3 digits, e.g. ABC123
 * (the backend issues them in sequence: AAA000, AAA001, …).
 */

export const TRACKING_EXAMPLE = "ABC123"
export const TRACKING_PATTERN = /^[A-Z]{3}\d{3}$/
export const TRACKING_HINT = `3 letters then 3 numbers, like ${TRACKING_EXAMPLE}`

// What people type → what we search: capitals, no spaces/dashes, at most 6
export const normaliseTrackingNumber = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)

export const isTrackingNumber = (value: string) => TRACKING_PATTERN.test(normaliseTrackingNumber(value))

// Why a (normalised) value isn't a tracking number yet, or null if it is
export function trackingNumberProblem(value: string): string | null {
    const v = normaliseTrackingNumber(value)
    if (!v) return "Enter your tracking number."
    if (TRACKING_PATTERN.test(v)) return null
    if (!/^[A-Z]{0,3}/.test(v) || /\d/.test(v.slice(0, 3))) return `It starts with 3 letters: ${TRACKING_HINT}.`
    if (v.length < 6) return `That's too short: ${TRACKING_HINT}.`
    return `Check the number: ${TRACKING_HINT}.`
}

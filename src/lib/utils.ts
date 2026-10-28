import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names and merges Tailwind CSS classes efficiently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a price value to a localized string with the specified currency
 */
export function formatPrice(
    price: number,
    currency: "TZS" | "USD" = "TZS",
    notation: "compact" | "standard" = "standard",
) {
  // For TZS, use a more appropriate locale and formatting
  if (currency === "TZS") {
    return new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: "TZS",
      notation,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation,
  }).format(price)
}

/**
 * Format TZS currency specifically
 */
export function formatTZS(amount: number, compact = false): string {
  return formatPrice(amount, "TZS", compact ? "compact" : "standard")
}

/**
 * Format a date to a localized string with validation
 */
export function formatDate(date: string | Date | undefined, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return "No date available"

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date"
    }

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...options,
    }).format(dateObj)
  } catch (error) {
    console.error("Date formatting error:", error)
    return "Invalid date"
  }
}

/**
 * Masks a phone number to show only the last 3 digits
 */
export function maskPhoneNumber(phoneNumber: string | undefined): string {
  if (!phoneNumber) return "N/A"
  return `xxxx-xxx-${phoneNumber.slice(-3)}`
}

export function maskAmount(amount: number | string | undefined, currency = "TZS"): string {
  if (amount === undefined || amount === null || amount === "") return "N/A"
  const digits = String(Math.round(Number(amount) || 0))
  const tail = digits.slice(-2)
  return `${currency} xxx,x${tail}`
}

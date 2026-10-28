"use client"

import { useState, useCallback } from "react"

interface ValidationRule {
    required?: boolean
    minLength?: number
    maxLength?: number
    type?: "email" | "phone" | "number"
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => string | null
}

interface ValidationSchema {
    [key: string]: ValidationRule
}

interface ValidationError {
    field: string
    message: string
}

export function useFormValidation(schema: ValidationSchema) {
    const [errors, setErrors] = useState<ValidationError[]>([])
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

    const validateField = useCallback(
        (field: string, value: any): string | null => {
            const rule = schema[field]
            if (!rule) return null

            // Required validation
            if (rule.required && (!value || (typeof value === "string" && !value.trim()))) {
                return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required`
            }

            // Skip other validations if field is empty and not required
            if (!value || (typeof value === "string" && !value.trim())) {
                return null
            }

            // String validations
            if (typeof value === "string") {
                if (rule.minLength && value.length < rule.minLength) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} must be at least ${rule.minLength} characters`
                }

                if (rule.maxLength && value.length > rule.maxLength) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} must be no more than ${rule.maxLength} characters`
                }

                // Email validation
                if (rule.type === "email") {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(value)) {
                        return "Please enter a valid email address"
                    }
                }

                // Phone validation
                if (rule.type === "phone") {
                    const phoneRegex = /^[0-9+\-\s()]+$/
                    if (!phoneRegex.test(value)) {
                        return "Please enter a valid phone number"
                    }
                }

                // Pattern validation
                if (rule.pattern && !rule.pattern.test(value)) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} format is invalid`
                }
            }

            // Number validations
            if (rule.type === "number" || typeof value === "number") {
                const numValue = typeof value === "string" ? Number.parseFloat(value) : value

                if (isNaN(numValue)) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} must be a valid number`
                }

                if (rule.min !== undefined && numValue < rule.min) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} must be at least ${rule.min}`
                }

                if (rule.max !== undefined && numValue > rule.max) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} must be no more than ${rule.max}`
                }
            }

            // Array validation (for roles, etc.)
            if (Array.isArray(value)) {
                if (rule.required && value.length === 0) {
                    return `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required`
                }
            }

            // Custom validation
            if (rule.custom) {
                return rule.custom(value)
            }

            return null
        },
        [schema],
    )

    const validateSingleField = useCallback(
        (field: string, value: any) => {
            const error = validateField(field, value)

            setErrors((prev) => {
                const filtered = prev.filter((e) => e.field !== field)
                if (error) {
                    return [...filtered, { field, message: error }]
                }
                return filtered
            })

            return error
        },
        [validateField],
    )

    const validateForm = useCallback(
        (data: Record<string, any>): ValidationError[] => {
            const newErrors: ValidationError[] = []

            Object.keys(schema).forEach((field) => {
                const error = validateField(field, data[field])
                if (error) {
                    newErrors.push({ field, message: error })
                }
            })

            setErrors(newErrors)
            return newErrors
        },
        [schema, validateField],
    )

    const markFieldTouched = useCallback((field: string) => {
        setTouchedFields((prev) => new Set([...prev, field]))
    }, [])

    const clearErrors = useCallback(() => {
        setErrors([])
        setTouchedFields(new Set())
    }, [])

    const getFieldError = useCallback(
        (field: string): string | null => {
            const error = errors.find((e) => e.field === field)
            return error ? error.message : null
        },
        [errors],
    )

    const isFieldTouched = useCallback(
        (field: string): boolean => {
            return touchedFields.has(field)
        },
        [touchedFields],
    )

    const isValid = errors.length === 0

    return {
        errors,
        isValid,
        validateForm,
        validateSingleField,
        markFieldTouched,
        clearErrors,
        getFieldError,
        isFieldTouched,
    }
}

"use client"

import React, { forwardRef } from "react"

type IconElement = [string, Record<string, any>]
type IconData = IconElement[]

interface IconProps extends React.SVGProps<SVGSVGElement> {
    icon: IconData
    size?: number | string
    color?: string
    strokeWidth?: number
}

/**
 * Lightweight icon renderer for @hugeicons/core-free-icons icon data.
 * Drop-in replacement for HugeiconsIcon that avoids the bundler CJS/ESM mismatch.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ icon, size = 24, color = "currentColor", strokeWidth, className = "", ...rest }, ref) => {
        if (!icon || !Array.isArray(icon)) return null

        const strokeProps = strokeWidth !== undefined ? { strokeWidth } : {}

        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                color={color}
                className={className}
                {...strokeProps}
                {...rest}
            >
                {icon.map(([tag, attrs], i) =>
                    React.createElement(tag, { ...attrs, key: attrs.key ?? i })
                )}
            </svg>
        )
    }
)

Icon.displayName = "Icon"

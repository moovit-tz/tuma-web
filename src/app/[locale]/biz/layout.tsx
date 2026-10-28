"use client"

import type React from "react"
import { BizSidebar } from "@/components/biz/BizSidebar"
import { DashboardShell } from "@/components/shell/dashboard-shell"

export default function BizLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardShell
            portal="biz"
            renderSidebar={({ expanded, onExpandedChange, isMobile, onClose }) =>
                isMobile ? (
                    <BizSidebar onClose={onClose} isMobile />
                ) : (
                    <BizSidebar expanded={expanded} onExpandedChange={onExpandedChange} />
                )
            }
        >
            {children}
        </DashboardShell>
    )
}

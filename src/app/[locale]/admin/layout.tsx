"use client"

import type React from "react"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { DashboardShell } from "@/components/shell/dashboard-shell"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardShell
            portal="admin"
            renderSidebar={({ expanded, onExpandedChange, isMobile, onClose }) =>
                isMobile ? (
                    <AdminSidebar onClose={onClose} isMobile />
                ) : (
                    <AdminSidebar expanded={expanded} onExpandedChange={onExpandedChange} />
                )
            }
        >
            {children}
        </DashboardShell>
    )
}

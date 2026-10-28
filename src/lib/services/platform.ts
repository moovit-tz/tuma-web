import { apiRequest } from "@/lib/constants"

/* Platform monitoring and controls (Admin → Settings) */

export type HealthStatus = "operational" | "degraded" | "down"

export interface Probe {
    reachable: boolean
    httpStatus?: number
    latencyMs: number
    error?: string
}

export type IntegrationsPeriod = "1h" | "24h" | "7d" | "30d"

export interface IntegrationsHealth {
    checkedAt: string
    period: IntegrationsPeriod
    payment: {
        name: string
        endpoint: string
        probe: Probe
        status: HealthStatus
        window: { paid: number; pending: number; failed: number; total: number; paidAmount: number; successRate: number | null }
        previousSuccessRate: number | null
        stuckPending: number
        lastPaidAt: string | null
        providers: { total: number; active: number; list: { id: number; name: string; code: string; isActive: boolean }[] }
    }
    sms: {
        name: string
        endpoint: string
        probe: Probe
        configured: boolean
        senderId: string
        status: HealthStatus
        window: { sent: number; failed: number; total: number; successRate: number | null }
        previousSuccessRate: number | null
        lastSentAt: string | null
        recentFailures: { id: number; phone: string | null; error: string | null; at: string }[]
    }
    apps: { appType: string; appVersion: string; appVersionCode: number; mustUpdate: boolean; createdAt: string }[]
}

export interface LogEntry {
    id: number
    time: string | null
    level: string
    message: string
    service?: string
    requestId?: string
    userId?: string
    username?: string
    meta: Record<string, unknown> | null
    raw: string
}

export interface ActivityEntry {
    id: string
    kind: "staff" | "agent"
    who: string
    whoId: number
    role: string | null
    activity: string
    details: string | null
    at: string
    ip: string | null
    userAgent: string | null
}

export type MaintenanceType = "APP_UPDATE" | "SERVER_UPDATE" | "DATABASE" | "OTHER"

export interface MaintenanceWindow {
    id: string
    title: string
    type: MaintenanceType
    startsAt: string
    endsAt: string
    message: string | null
    announce: boolean
    createdAt: string
    cancelledAt: string | null
    state?: "upcoming" | "active" | "done" | "cancelled"
}

export interface Maintenance {
    /** On right now, by hand or because a scheduled window is running */
    enabled: boolean
    manualEnabled: boolean
    source: "manual" | "schedule" | null
    message: string | null
    until: string | null
    updatedAt: string | null
    updatedById: number | null
    activeWindow: MaintenanceWindow | null
    nextWindow: MaintenanceWindow | null
}

export async function getIntegrationsHealth(period: IntegrationsPeriod = "24h"): Promise<IntegrationsHealth> {
    return (await apiRequest(`/api/platform/integrations?period=${period}`))?.data
}

export async function getPlatformLogs(params: { file?: string; level?: string; q?: string; limit?: number }): Promise<{ file: string; files: string[]; entries: LogEntry[] }> {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)))
    return (await apiRequest(`/api/platform/logs?${q}`))?.data
}

export async function getPlatformActivity(limit = 100): Promise<ActivityEntry[]> {
    return (await apiRequest(`/api/platform/activity?limit=${limit}`))?.data ?? []
}

export async function getMaintenance(): Promise<Maintenance> {
    return (await apiRequest("/api/platform/maintenance"))?.data
}

export async function setMaintenance(body: { enabled: boolean; message?: string | null; until?: string | null }): Promise<Maintenance> {
    return (await apiRequest("/api/platform/maintenance", { method: "PUT", body: JSON.stringify(body) }))?.data
}

export async function getMaintenanceSchedule(): Promise<MaintenanceWindow[]> {
    return (await apiRequest("/api/platform/maintenance/schedule"))?.data ?? []
}

export async function scheduleMaintenance(body: { title: string; type: MaintenanceType; startsAt: string; endsAt: string; message?: string | null; announce: boolean }): Promise<MaintenanceWindow> {
    return (await apiRequest("/api/platform/maintenance/schedule", { method: "POST", body: JSON.stringify(body) }))?.data
}

export async function cancelMaintenanceWindow(id: string) {
    return apiRequest(`/api/platform/maintenance/schedule/${id}/cancel`, { method: "POST" })
}

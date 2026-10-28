import { apiRequest } from "@/lib/constants"

/*
 * Monthly platform invoices: parcels that earned no commission, billed at a
 * flat rate per parcel. PROFORMA until the payment is recorded, then PAID.
 */

export interface InvoiceCompany {
    id: number
    name: string
    code?: string
    tin?: string
    address?: string
    phoneNumber?: string
    email?: string | null
}

export interface Invoice {
    id: number
    number: string
    companyId: number
    company: InvoiceCompany
    periodStart: string
    periodEnd: string
    parcelCount: number
    ratePerParcel: number
    amount: number
    status: "PROFORMA" | "PAID"
    paidAt: string | null
    paymentReference: string | null
    createdAt: string
    updatedAt: string
}

export interface InvoiceSummary {
    count: number
    total: number
    paid: number
    outstanding: number
    proformaCount: number
    ratePerParcel: number
}

export interface InvoicePreviewRow {
    companyId: number
    companyName: string
    parcels: number
    amount: number
    existingStatus: "PROFORMA" | "PAID" | null
    /** First uncovered parcel (all-time previews) */
    since?: string | null
}

/** "2026-01..2026-03" → ["2026-01", "2026-03"] */
export const monthRange = (period: string): [string, string] | null => {
    const m = /^(\d{4}-\d{2})\.\.(\d{4}-\d{2})$/.exec(period)
    return m ? [m[1], m[2]] : null
}

export async function getInvoices(params: { month?: string; status?: string } = {}): Promise<{ data: Invoice[]; summary: InvoiceSummary }> {
    const q = new URLSearchParams()
    if (params.month) q.set("month", params.month)
    if (params.status) q.set("status", params.status)
    const res = await apiRequest(`/api/invoices${q.toString() ? `?${q}` : ""}`)
    return { data: res?.data ?? [], summary: res?.summary }
}

export async function previewInvoices(month: string): Promise<{ data: InvoicePreviewRow[]; ratePerParcel: number }> {
    const res = await apiRequest(`/api/invoices/preview?month=${month}`)
    return { data: res?.data ?? [], ratePerParcel: res?.ratePerParcel ?? 150 }
}

// First month with parcels (null before the API has this endpoint)
export async function getInvoiceRange(): Promise<{ firstMonth: string | null }> {
    const res = await apiRequest("/api/invoices/range", { silent: true })
    return { firstMonth: res?.data?.firstMonth ?? null }
}

/*
 * All-time preview worked out month by month, so it can report progress.
 * Matches the single all-time query: a month's parcels already on that month's
 * own invoice are covered, and everything else uncovered is billed. Rows build
 * up as months finish; onProgress gets each month as it completes.
 */
export async function previewAllTimeByMonth(
    firstMonth: string,
    onProgress: (p: { months: string[]; done: string[]; month: string | null; rows: InvoicePreviewRow[]; ratePerParcel: number }) => void,
    signal?: { cancelled: boolean },
    // Last month to check (a month range); up to now when left out
    lastMonth?: string,
): Promise<{ data: InvoicePreviewRow[]; ratePerParcel: number }> {
    const months: string[] = []
    const now = new Date()
    const stop = lastMonth ? new Date(`${lastMonth}-01T00:00:00Z`) : now
    for (let d = new Date(`${firstMonth}-01T00:00:00Z`); d <= stop && d <= now; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
        months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
    }
    const byCompany = new Map<number, InvoicePreviewRow>()
    let rate = 150
    const done: string[] = []
    const snapshot = () => [...byCompany.values()].sort((a, b) => b.amount - a.amount)
    // Newest months first; a few at a time to stay gentle on the server
    const queue = [...months].reverse()
    const worker = async () => {
        while (queue.length && !signal?.cancelled) {
            const month = queue.shift()!
            const res = await previewInvoices(month)
            rate = res.ratePerParcel
            for (const r of res.data) {
                if (r.existingStatus) continue // on its own monthly invoice already
                const prev = byCompany.get(r.companyId)
                const since = (r.since && (!prev?.since || r.since < prev.since)) ? r.since : prev?.since ?? r.since ?? null
                byCompany.set(r.companyId, {
                    companyId: r.companyId,
                    companyName: r.companyName,
                    parcels: (prev?.parcels ?? 0) + r.parcels,
                    amount: ((prev?.parcels ?? 0) + r.parcels) * rate,
                    existingStatus: null,
                    since,
                })
            }
            done.push(month)
            if (!signal?.cancelled) onProgress({ months, done: [...done], month, rows: snapshot(), ratePerParcel: rate })
        }
    }
    onProgress({ months, done: [], month: null, rows: [], ratePerParcel: rate })
    await Promise.all(Array.from({ length: Math.min(3, months.length) }, worker))
    return { data: snapshot(), ratePerParcel: rate }
}

export interface CompanyInvoicePreview {
    month: string
    grouping?: "day" | "month"
    since?: string | null
    company: InvoiceCompany & { isActive: boolean; owner: { fullName: string; phoneNumber: string; email: string } | null }
    billable: boolean
    reason: "commission" | "no-parcels" | null
    parcels: number
    ratePerParcel: number
    amount: number
    agentCount: number
    agents: { id: number; fullName: string; phoneNumber: string; parcels: number; first: string; last: string }[]
    cancelled: number
    byStatus: { status: string; parcels: number }[]
    byDay: { date: string; parcels: number }[]
    existing: Invoice | null
}

export async function previewCompanyInvoice(month: string, companyId: number): Promise<CompanyInvoicePreview> {
    const res = await apiRequest(`/api/invoices/preview/${companyId}?month=${month}`)
    return res?.data
}

// companyIds: only these companies (omit for all)
export async function generateInvoices(month: string, companyIds?: number[]): Promise<{ created: number; updated: number; skippedPaid: number }> {
    const res = await apiRequest("/api/invoices/generate", { method: "POST", body: JSON.stringify({ month, companyIds }) })
    return res?.data
}

export async function markInvoicePaid(id: number, body: { reference?: string; paidAt?: string }): Promise<Invoice> {
    const res = await apiRequest(`/api/invoices/${id}/paid`, { method: "POST", body: JSON.stringify(body) })
    return res?.data
}

export async function markInvoiceUnpaid(id: number): Promise<Invoice> {
    const res = await apiRequest(`/api/invoices/${id}/unpaid`, { method: "POST" })
    return res?.data
}

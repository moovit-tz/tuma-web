import { apiRequest } from "@/lib/constants"

/* Portal-wide smart search (GET /api/search?q=) */

export type SearchType = "parcels" | "agents" | "companies" | "vehicles" | "offices" | "staff" | "regions"

export interface SearchUnderstood {
    trackingNumber: string | null
    phone: string | null
    status: string | null
    period: { from: string; to: string; label: string } | null
    origin: string | null
    destination: string | null
    place: string | null
    types: SearchType[]
    text: string
}

export interface SearchItem {
    id: number
    title: string
    subtitle?: string
    status?: string
    at?: string
    score: number
    /** A close match rather than an exact one ("did you mean") */
    fuzzy: boolean
}

export interface SearchGroup {
    type: SearchType
    label: string
    total: number
    items: SearchItem[]
}

export async function smartSearch(q: string, signal?: AbortSignal): Promise<{ understood: SearchUnderstood; groups: SearchGroup[] }> {
    const res = await apiRequest(`/api/search?q=${encodeURIComponent(q)}`, { signal, silent: true })
    return res?.data ?? { understood: null, groups: [] }
}

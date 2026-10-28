import { type NextRequest, NextResponse } from "next/server"
import { BackendError, getPeriodMetrics, tokenFrom } from "@/lib/server/portal-insights"

export const dynamic = "force-dynamic"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/portal-insights/agent-period?from=yyyy-MM-dd&to=yyyy-MM-dd
// Same cached parcel read as company-period, grouped by booking agent.
export async function GET(request: NextRequest) {
    const token = tokenFrom(request)
    if (!token) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

    const from = request.nextUrl.searchParams.get("from") ?? ""
    const to = request.nextUrl.searchParams.get("to") ?? ""
    if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
        return NextResponse.json({ message: "from and to must be yyyy-MM-dd with from <= to" }, { status: 400 })
    }

    try {
        const { companies: _companies, ...result } = await getPeriodMetrics(token, from, to)
        return NextResponse.json(result)
    } catch (error) {
        const status = error instanceof BackendError ? error.status : 500
        return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status })
    }
}

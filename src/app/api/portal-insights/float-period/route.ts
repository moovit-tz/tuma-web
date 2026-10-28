import { type NextRequest, NextResponse } from "next/server"
import { BackendError, getFloatPeriod, tokenFrom } from "@/lib/server/portal-insights"

export const dynamic = "force-dynamic"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/portal-insights/float-period?from=yyyy-MM-dd&to=yyyy-MM-dd  (omit both for all time)
export async function GET(request: NextRequest) {
    const token = tokenFrom(request)
    if (!token) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

    const from = request.nextUrl.searchParams.get("from") ?? undefined
    const to = request.nextUrl.searchParams.get("to") ?? undefined
    if ((from || to) && (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to)) {
        return NextResponse.json({ message: "from and to must both be yyyy-MM-dd with from <= to" }, { status: 400 })
    }

    try {
        return NextResponse.json(await getFloatPeriod(token, from, to))
    } catch (error) {
        const status = error instanceof BackendError ? error.status : 500
        return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status })
    }
}

import { type NextRequest, NextResponse } from "next/server"
import { BackendError, getCompaniesActivity, tokenFrom } from "@/lib/server/portal-insights"

export const dynamic = "force-dynamic"

const MAX_IDS = 1000

// GET /api/portal-insights/company-activity?ids=1,2,3
export async function GET(request: NextRequest) {
    const token = tokenFrom(request)
    if (!token) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

    const ids = (request.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n > 0)
    if (ids.length === 0 || ids.length > MAX_IDS) {
        return NextResponse.json({ message: `ids must list 1-${MAX_IDS} company ids` }, { status: 400 })
    }

    try {
        return NextResponse.json(await getCompaniesActivity(token, ids))
    } catch (error) {
        const status = error instanceof BackendError ? error.status : 500
        return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status })
    }
}

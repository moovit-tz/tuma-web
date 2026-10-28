import createMiddleware from "next-intl/middleware"
import type { NextRequest } from "next/server"

const intlMiddleware = createMiddleware({
    locales: ["en", "sw"],
    defaultLocale: "en",
})

export default function middleware(request: NextRequest) {
    // Skip middleware for API routes, static files, and Next.js internals
    if (
        request.nextUrl.pathname.startsWith("/api/") ||
        request.nextUrl.pathname.startsWith("/_next/") ||
        request.nextUrl.pathname.startsWith("/favicon.ico") ||
        request.nextUrl.pathname.includes(".")
    ) {
        return
    }

    return intlMiddleware(request)
}

export const config = {
    // Match only internationalized pathnames
    matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}

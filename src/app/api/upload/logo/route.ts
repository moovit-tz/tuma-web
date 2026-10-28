import { type NextRequest, NextResponse } from "next/server"

const MAX_FILE_SIZE = 1024 * 1024 // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]

export async function POST(request: NextRequest) {
    try {
        // Get auth token from headers
        const authHeader = request.headers.get("authorization")
        const token = authHeader?.replace("Bearer ", "")

        if (!token) {
            return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get("logo") as File
        const type = formData.get("type") as string

        if (!file) {
            return NextResponse.json({ error: { message: "No file provided" } }, { status: 400 })
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: { message: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}` } },
                { status: 400 },
            )
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: { message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` } },
                { status: 400 },
            )
        }

        // Create new FormData for backend
        const backendFormData = new FormData()
        backendFormData.append("logo", file)
        if (type) backendFormData.append("type", type)

        // Forward to your backend
        const response = await fetch(`${process.env.BACKEND_URL || "https://parcel.mysafari.co.tz"}/api/upload/logo`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: backendFormData,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: { message: errorData.message || "Upload failed" } },
                { status: response.status },
            )
        }

        const result = await response.json()
        return NextResponse.json(result)
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 })
    }
}

// Configure the route to handle larger payloads
export const runtime = "nodejs"
export const maxDuration = 30

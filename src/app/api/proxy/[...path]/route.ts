import { type NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/constants"

async function constructUrl(path: string, searchParams?: URLSearchParams): Promise<string> {
  console.log("Constructing URL for path:", path, "with params:", searchParams?.toString())
  console.log("API_BASE_URL:", API_BASE_URL)

  // Special handling for login endpoint
  if (path === "login") {
    return `${API_BASE_URL}/api/login`
  }

  // Handle parcel endpoints
  if (path === "parcel" || path.startsWith("parcel/")) {
    let url = `${API_BASE_URL}/api/${path}`

    // Add search params if present
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`
    }

    console.log("Final parcel URL:", url)
    return url
  }

  // Handle float admin endpoints
  if (path.startsWith("float/admin/")) {
    let url = `${API_BASE_URL}/${path}`

    // Add search params if present
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`
    }

    console.log("Final float admin URL:", url)
    return url
  }

  // Construct base URL for other endpoints
  let url = `${API_BASE_URL}/api/${path}`

  // Add search params if present
  if (searchParams?.toString()) {
    url += `?${searchParams.toString()}`
  }

  console.log("Final URL:", url)
  return url
}

async function forwardRequest(request: NextRequest, params: { path: string[] }) {
  try {
    console.log("=== PROXY REQUEST START ===")
    console.log("Method:", request.method)
    console.log("Path params:", params.path)
    console.log("API_BASE_URL:", API_BASE_URL)

    const headers = new Headers()
    headers.set("Content-Type", "application/json")
    headers.set("Accept", "application/json")

    // Always get token from cookie for authenticated endpoints
    const token = request.cookies.get("token")?.value
    if (token) {
      headers.set("authorization", `Bearer ${token}`)
      console.log("Added auth token")
    } else {
      console.log("No auth token found")
    }

    // Get path and search params
    const pathString = params.path.join("/")
    const searchParams = request.nextUrl.searchParams
    const url = await constructUrl(pathString, searchParams)

    console.log(`Forwarding ${request.method} request to: ${url}`)

    const options: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    }

    // Handle request body for non-GET requests
    if (!["GET", "HEAD"].includes(request.method)) {
      try {
        const body = await request.json()
        options.body = JSON.stringify(body)
        console.log("Request body:", body)
      } catch (error) {
        console.error("Error parsing request body:", error)
      }
    }

    console.log("Making fetch request to:", url)
    const response = await fetch(url, options)
    console.log("Response status:", response.status, response.statusText)

    // Create response headers
    const responseHeaders = new Headers()
    responseHeaders.set("Content-Type", "application/json")

    // Skip JSON parsing for HEAD requests
    if (request.method === "HEAD") {
      return NextResponse.json(
          { success: response.ok },
          {
            status: response.status,
            headers: responseHeaders,
          },
      )
    }

    // Handle 401 authentication failures
    if (response.status === 401) {
      const errorData = { message: "Unauthenticated.", status: 401 }
      console.log("Authentication failed:", errorData)

      responseHeaders.set("X-Auth-Failed", "true")

      return NextResponse.json(errorData, {
        status: 401,
        headers: responseHeaders,
      })
    }

    // Handle 404 specifically for debugging
    if (response.status === 404) {
      console.error("404 Not Found for URL:", url)
      const errorText = await response.text()
      console.error("404 Response body:", errorText)

      return NextResponse.json(
          {
            error: "Endpoint not found",
            url: url,
            message: "The requested API endpoint was not found on the server",
            details: errorText,
          },
          { status: 404 },
      )
    }

    // Try to parse JSON response
    let data
    try {
      const clonedResponse = response.clone()
      data = await clonedResponse.json()
      console.log("Parsed JSON response:", data)
    } catch (error) {
      console.warn("Non-JSON response from server:", error)
      const textResponse = await response.text()
      console.log("Text response:", textResponse)

      data = {
        success: response.ok,
        status: response.status,
        message: response.ok ? "Request successful" : "Request failed",
        rawResponse: textResponse,
      }
    }

    if (!response.ok) {
      console.error("Proxy error response:", {
        status: response.status,
        url,
        data,
        method: request.method,
      })
    }

    console.log("=== PROXY REQUEST END ===")

    return NextResponse.json(data, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, context: { params: any }) {
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function POST(request: NextRequest, context: { params: any }) {
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function PUT(request: NextRequest, context: { params: any }) {
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function DELETE(request: NextRequest, context: { params: any }) {
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

export async function HEAD(request: NextRequest, context: { params: any }) {
  const params = await Promise.resolve(context.params)
  return forwardRequest(request, params)
}

import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, params, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, params, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, params, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, params, "DELETE");
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) {
  try {
    const accessToken = await auth0.getAccessToken();

    if (!accessToken) {
      // Get the current URL to redirect back after login
      const currentUrl = request.nextUrl.pathname + request.nextUrl.search;
      const loginUrl = `/auth/login?returnTo=${encodeURIComponent(currentUrl)}`;

      return NextResponse.redirect(new URL(loginUrl, request.url));
    }

    // Build the target URL
    const { path } = await params;
    const targetPath = path.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${API_BASE_URL}/${targetPath}${
      searchParams ? `?${searchParams}` : ""
    }`;

    // Forward the request to the backend API
    const response = await fetch(targetUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type":
          request.headers.get("content-type") || "application/json",
      },
      body: ["POST", "PUT", "PATCH"].includes(method)
        ? await request.text()
        : undefined,
    });

    // Return the response as-is (true transparent proxy)
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("BFF Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

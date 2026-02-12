import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

type HandlerContext = {
  request: NextRequest;
  params: Promise<{ path: string[] }>;
  method: string;
  targetUrl?: string;
  body?: BodyInit;
  headers: Headers;
};

type MiddlewareResult = HandlerContext | NextResponse;
type HandlerMiddleware = (context: HandlerContext) => Promise<MiddlewareResult>;

const getReturnToPath = (request: NextRequest) => {
  const referer = request.headers.get("referer");

  if (!referer) {
    return "/dashboard";
  }

  try {
    const refererUrl = new URL(referer);
    const currentOrigin = request.nextUrl.origin;

    if (refererUrl.origin !== currentOrigin) {
      return "/dashboard";
    }

    return `${refererUrl.pathname}${refererUrl.search}`;
  } catch {
    return "/dashboard";
  }
};

const createUnauthorizedResponse = (request: NextRequest, message: string) => {
  const returnTo = getReturnToPath(request);
  const loginUrl = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  return NextResponse.json(
    {
      error: "Unauthorized",
      message,
      loginUrl,
    },
    { status: 401 },
  );
};

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

const withTargetUrl: HandlerMiddleware = async (context) => {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const searchParams = context.request.nextUrl.searchParams.toString();

  return {
    ...context,
    targetUrl: `${API_BASE_URL}/${targetPath}${searchParams ? `?${searchParams}` : ""}`,
  };
};

const withAuthorizationHeader: HandlerMiddleware = async (context) => {
  try {
    const accessToken = await auth0.getAccessToken();

    if (!accessToken?.token) {
      return createUnauthorizedResponse(
        context.request,
        "Authentication required.",
      );
    }

    const headers = new Headers(context.headers);
    headers.set("authorization", `Bearer ${accessToken.token}`);

    return {
      ...context,
      headers,
    };
  } catch (error) {
    return createUnauthorizedResponse(
      context.request,
      error instanceof Error ? error.message : "Authentication required.",
    );
  }
};

const withForwardedHeaders: HandlerMiddleware = async (context) => {
  const headers = new Headers(context.headers);
  const contentType = context.request.headers.get("content-type");
  const accept = context.request.headers.get("accept");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  return {
    ...context,
    headers,
  };
};

const withRequestBody: HandlerMiddleware = async (context) => {
  if (!BODY_METHODS.has(context.method)) {
    return context;
  }

  if (!context.request.body) {
    return context;
  }

  return {
    ...context,
    body: await context.request.arrayBuffer(),
  };
};

const middlewares: HandlerMiddleware[] = [
  withTargetUrl,
  withAuthorizationHeader,
  withForwardedHeaders,
  withRequestBody,
];

async function runMiddlewares(initialContext: HandlerContext) {
  let context = initialContext;

  for (const middleware of middlewares) {
    const result = await middleware(context);

    if (result instanceof NextResponse) {
      return result;
    }

    context = result;
  }

  return context;
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) {
  try {
    const result = await runMiddlewares({
      request,
      params,
      method,
      headers: new Headers(),
    });

    if (result instanceof NextResponse) {
      return result;
    }

    if (!result.targetUrl) {
      throw new Error("Target URL is missing");
    }

    const response = await fetch(result.targetUrl, {
      method,
      headers: result.headers,
      body: result.body,
    });

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

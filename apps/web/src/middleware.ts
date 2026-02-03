import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = await auth0.middleware(request);

  // Add the current pathname to headers so we can access it in layouts
  const newResponse = response || NextResponse.next();
  newResponse.headers.set("x-pathname", pathname);

  return newResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

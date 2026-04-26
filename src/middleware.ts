import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-in-production"
);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = [
    "/login", 
    "/register", 
    "/api/login",
    "/api/debug-login", 
    "/api/auth/register",
    "/api/auth", // NextAuth endpoints
    "/api/auth/status", // Auth status check
    "/api/auth/forgot-password",
    "/api/auth/verify-otp",
    "/api/auth/reset-password",
    "/api/public-settings"
  ];
  
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static images and common files to bypass middleware
  const staticFileExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"];
  if (staticFileExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // Check for session token in cookies
  const token = request.cookies.get("session-token")?.value;

  if (!token) {
    // No token, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  const user = await verifyToken(token);
  
  if (!user) {
    // Invalid token, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token is valid, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

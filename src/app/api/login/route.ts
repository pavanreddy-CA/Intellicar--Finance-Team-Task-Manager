import { NextRequest, NextResponse } from "next/server";
import { authenticate, createToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    console.log("[Login API] Attempting login for:", email);
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Authenticate user
    const result = await authenticate(email, password);
    
    if (!result.success || !result.user) {
      console.log("[Login API] Auth failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Authentication failed" },
        { status: 401 }
      );
    }
    
    console.log("[Login API] Auth success for:", result.user.email);
    
    // Create JWT token
    const token = await createToken(result.user);
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      }
    });
    
    // Set session cookie
    response.cookies.set("session-token", token, {
      httpOnly: true,
      secure: false, // Allow in development and preview environments
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    
    console.log("[Login API] Session cookie set with token length:", token.length);
    
    return response;
  } catch (error: any) {
    console.error("[Login API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

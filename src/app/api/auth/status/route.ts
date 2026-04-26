import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    console.log("[v0] Auth Status - Checking session...");
    
    // Check all cookies
    const allCookies = req.cookies.getAll();
    console.log("[v0] Auth Status - All cookies:", allCookies.map(c => c.name));
    
    // Check for session-token
    const sessionToken = req.cookies.get("session-token");
    console.log("[v0] Auth Status - Session token exists:", !!sessionToken);
    
    const session = await getSession();
    console.log("[v0] Auth Status - Session user:", session?.user?.email);
    
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user || null,
      cookies: allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + "..." }))
    });
  } catch (error: any) {
    console.error("[Auth Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to check auth status" },
      { status: 500 }
    );
  }
}

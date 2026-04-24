import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcrypt";
import { encode } from "next-auth/jwt";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    console.log("[v0] Test login - Direct auth check for:", email);
    
    // 1. Find user
    const users = await sql`
      SELECT * FROM "User" WHERE email = ${email} LIMIT 1
    `;
    const user = users[0];
    
    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    
    // 2. Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    
    console.log("[v0] User authenticated successfully");
    
    // 3. Create JWT token manually
    const token = await encode({
      token: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    
    console.log("[v0] JWT token created");
    
    // 4. Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
    
    // Set the session cookie
    response.cookies.set("next-auth.session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    
    console.log("[v0] Cookie set on response");
    
    return response;
  } catch (error: any) {
    console.log("[v0] Test login error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

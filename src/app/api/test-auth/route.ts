import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("[v0] test-auth API called");
  
  try {
    const { email, password } = await request.json();
    console.log("[v0] Testing login for:", email);
    
    // Test database connection
    console.log("[v0] Querying database...");
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    console.log("[v0] User found:", !!user);
    
    if (!user) {
      return NextResponse.json({ error: "User not found", step: "user_lookup" }, { status: 401 });
    }
    
    if (!user.password) {
      return NextResponse.json({ error: "No password set", step: "password_check" }, { status: 401 });
    }
    
    console.log("[v0] Checking password...");
    const isValid = await bcrypt.compare(password, user.password);
    console.log("[v0] Password valid:", isValid);
    
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password", step: "password_verify" }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.log("[v0] Error in test-auth:", error);
    return NextResponse.json({ 
      error: "Server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

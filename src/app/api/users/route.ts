import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";


// GET all users
export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // --- Self-healing Migration ---
    // Add isSuspended column if it doesn't exist
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT FALSE`;
    } catch (e) {
      // Ignore errors if column already exists (though IF NOT EXISTS handles it)
      console.log("Migration check done or skipped");
    }

    const users = await sql`
      SELECT id, name, email, role, department, "isApproved", "isAllocator", "isSuspended", "createdAt"
      FROM "User"
      ORDER BY "createdAt" DESC
    `;

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch users", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT (update user role)
export async function PUT(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role, department, isAllocator, isApproved } = body;

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];
    
    if (role !== undefined) {
      updates.push(`role = $${values.length + 1}`);
      values.push(role);
    }
    if (department !== undefined) {
      updates.push(`department = $${values.length + 1}`);
      values.push(department);
    }
    if (isAllocator !== undefined) {
      updates.push(`"isAllocator" = $${values.length + 1}`);
      values.push(isAllocator);
    }
    if (isApproved !== undefined) {
      updates.push(`"isApproved" = $${values.length + 1}`);
      values.push(isApproved);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    values.push(userId);
    
    const user = await sql`
      UPDATE "User"
      SET ${sql.unsafe(updates.join(', '))}
      WHERE id = ${userId}
      RETURNING *
    `;

    return NextResponse.json({ message: "User role updated successfully", user: user[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update user role", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PATCH (update specific user fields like isAllocator)
export async function PATCH(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, isAllocator } = body;

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    const user = await sql`
      UPDATE "User"
      SET "isAllocator" = ${isAllocator}
      WHERE id = ${userId}
      RETURNING *
    `;

    return NextResponse.json({ message: "User updated successfully", user: user[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update user", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
// POST (Create User directly by Admin)
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, email, department, role } = await req.json();

    if (!name || !email || !department || !role) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existingUsers = await sql`
      SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash("Intellicar@123", 10);
    const userId = crypto.randomUUID();

    const users = await sql`
      INSERT INTO "User" (id, name, email, password, department, "isApproved", role, "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, ${department}, true, ${role}, NOW(), NOW())
      RETURNING id, name, email
    `;

    return NextResponse.json({ message: "User created successfully", user: users[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create user", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

// GET all users
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    // Allow if ADMIN or if email matches superadmin
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const users = await sql`
      SELECT id, name, email, role, department, "isApproved", "isAllocator", "createdAt"
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
export async function PUT(req: Request) {
  try {
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
export async function PATCH(req: Request) {
  try {
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

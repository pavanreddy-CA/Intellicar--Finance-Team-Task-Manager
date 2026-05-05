import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function PUT(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    // Only Admin can bulk update users
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ message: "Invalid updates format" }, { status: 400 });
    }

    // Execute updates sequentially (Neon serverless over HTTP does not support transactions via .begin)
    for (const update of updates) {
      const { userId, role, department, employeeId, isSuspended } = update;
      
      if (role !== undefined) {
        await sql`UPDATE "User" SET "role" = ${role} WHERE "id" = ${userId}`;
      }
      if (department !== undefined) {
        await sql`UPDATE "User" SET "department" = ${department} WHERE "id" = ${userId}`;
      }
      if (employeeId !== undefined) {
        await sql`UPDATE "User" SET "employeeId" = ${employeeId} WHERE "id" = ${userId}`;
      }
      if (isSuspended !== undefined) {
        await sql`UPDATE "User" SET "isSuspended" = ${isSuspended} WHERE "id" = ${userId}`;
      }
    }

    return NextResponse.json({ message: "Users updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Bulk update users error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

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
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeId" TEXT`;
    } catch (e) {
      console.log("Migration check done or skipped");
    }

    const users = await sql`
      SELECT id, name, email, role, department, "employeeId", "isApproved", "isAllocator", "isSuspended", "createdAt"
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
    const { userId, role, department, isAllocator, isApproved, employeeId, isSuspended } = body;

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
    if (employeeId !== undefined) {
      updates.push(`"employeeId" = $${values.length + 1}`);
      values.push(employeeId);
    }
    if (isSuspended !== undefined) {
      updates.push(`"isSuspended" = $${values.length + 1}`);
      values.push(isSuspended);
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

    const { name, email, department, role, employeeId } = await req.json();

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
      INSERT INTO "User" (id, name, email, password, department, "employeeId", "isApproved", role, "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, ${department}, ${employeeId || null}, true, ${role}, NOW(), NOW())
      RETURNING id, name, email
    `;
    const user = users[0];

    // Notify new employee
    try {
      const { sendEmail } = require("@/lib/email");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://v0-finpulse.vercel.app';
      await sendEmail({
        to: user.email,
        subject: "Welcome to Finance Hub!",
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #2563eb; padding: 24px; color: white; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">Welcome to Finance Hub!</h2>
            </div>
            <div style="padding: 32px; text-align: center;">
              <p style="font-size: 18px;">Hello <strong>${user.name}</strong>,</p>
              <p>Your account has been created by the Administrator.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <p style="margin: 0 0 10px 0;"><strong>Employee ID:</strong> ${user.employeeId}</p>
                <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> ${user.email}</p>
                <p style="margin: 0;"><strong>Default Password:</strong> Intellicar@123</p>
              </div>
              <p>You can now log in to manage your tasks and collaborate with the team.</p>
              <a href="${appUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; font-size: 16px;">Log In Now</a>
              <p style="margin-top: 20px; font-size: 13px; color: #64748b;">(Please change your password after logging in for the first time.)</p>
            </div>
            <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
              © 2026 Intellicar Telematics. All rights reserved.
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error("FAILED TO NOTIFY NEW EMPLOYEE:", emailError);
    }

    return NextResponse.json({ message: "User created successfully", user: user }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create user", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

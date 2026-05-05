import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;
    
    // Only Admin can sync schema
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Perform migrations
    console.log("Starting manual schema sync...");
    
    // User Table enhancements
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeId" TEXT`;
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAllocator" BOOLEAN DEFAULT FALSE`;
    
    // Task Table enhancements
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "entityName" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "frequency" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "editApproved" BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "createdByEmail" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "displayId" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedSubmissionAt" TIMESTAMP(3)`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "reviewedSubmissionAt" TIMESTAMP(3)`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedSubmissionAt" TIMESTAMP(3)`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedBy" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT`;
    await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "processedBy" TEXT`;

    // Ensure TaskSequence table exists
    await sql`CREATE TABLE IF NOT EXISTS "TaskSequence" ("monthYear" TEXT PRIMARY KEY, "nextVal" INTEGER DEFAULT 1)`;

    console.log("Schema sync completed successfully.");

    return NextResponse.json({ 
      message: "Database schema synced successfully! All newly added fields are now available." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Schema sync error:", error);
    return NextResponse.json({ 
      message: "Sync failed. " + (error.message || "Please check the server logs."),
      error: error.message 
    }, { status: 500 });
  }
}

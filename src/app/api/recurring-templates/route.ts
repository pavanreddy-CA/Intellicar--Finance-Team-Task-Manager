import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/recurring-templates
export async function GET() {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Self-Healing Migration: Add new columns if they don't exist ---
    await (sql as any).query(`
      ALTER TABLE "RecurringTemplate" 
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT,
      ADD COLUMN IF NOT EXISTS "startDate" DATE,
      ADD COLUMN IF NOT EXISTS "endDate" DATE,
      ADD COLUMN IF NOT EXISTS "stopDate" DATE,
      ADD COLUMN IF NOT EXISTS "isStopped" BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE "Task"
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT;
    `).catch((err: any) => console.error("Migration check error:", err));
    // ------------------------------------------------------------------

    const templates = await sql`
      SELECT * FROM "RecurringTemplate"
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("Fetch recurring templates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/recurring-templates
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check - only Admin or those allowed in matrix
    // For now, allow all logged in, we will refine in UI
    const data = await req.json();
    const {
      taskNamePattern,
      entityName,
      taskType,
      departmentName,
      financeFunction,
      frequency,
      dayOffset,
      monthOffset,
      defaultOwner,
      defaultReviewer,
      startDate,
      endDate
    } = data;

    if (!taskNamePattern || !entityName || !taskType || !frequency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO "RecurringTemplate" (
        "taskNamePattern", "entityName", "taskType", "departmentName", "financeFunction",
        "frequency", "dayOffset", "monthOffset", "defaultOwner", "defaultReviewer",
        "startDate", "endDate",
        "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${taskNamePattern}, ${entityName}, ${taskType}, ${departmentName || "Finance"}, ${financeFunction || null},
        ${frequency}, ${Number(dayOffset) || 0}, ${Number(monthOffset) || 0},
        ${defaultOwner || null}, ${defaultReviewer || null},
        ${startDate ? new Date(startDate) : null}, ${endDate ? new Date(endDate) : null},
        TRUE, NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("Create recurring template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

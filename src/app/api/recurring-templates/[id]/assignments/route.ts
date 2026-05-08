import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/recurring-templates/[id]/assignments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await sql`
      SELECT * FROM "AssignmentHistory"
      WHERE "templateId" = ${parseInt(id)}
      ORDER BY "createdAt" DESC
    `;

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Fetch assignment history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/recurring-templates/[id]/assignments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ownerName, reviewerName, effectiveFrom } = await req.json();

    if (!ownerName || !reviewerName || !effectiveFrom) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const templateId = parseInt(id);
    const effectiveDate = new Date(effectiveFrom);

    // --- Pre-check: If no history exists, capture the CURRENT values as the initial baseline ---
    const existingHistory = await sql`SELECT id FROM "AssignmentHistory" WHERE "templateId" = ${templateId} LIMIT 1`;
    
    if (existingHistory.length === 0) {
      const template = await sql`SELECT "defaultOwner", "defaultReviewer", "startDate" FROM "RecurringTemplate" WHERE id = ${templateId}`;
      if (template.length > 0) {
        const t = template[0];
        // Create an initial record starting from template start date
        await sql`
          INSERT INTO "AssignmentHistory" ("templateId", "ownerName", "reviewerName", "effectiveFrom", "createdAt")
          VALUES (${templateId}, ${t.defaultOwner}, ${t.defaultReviewer}, ${t.startDate || new Date('2024-01-01')}, NOW())
        `;
      }
    }

    // 1. Record the NEW assignment in AssignmentHistory
    await sql`
      INSERT INTO "AssignmentHistory" ("templateId", "ownerName", "reviewerName", "effectiveFrom", "createdAt")
      VALUES (${templateId}, ${ownerName}, ${reviewerName}, ${effectiveDate}, NOW())
    `;

    // 2. Update RecurringTemplate defaults
    await sql`
      UPDATE "RecurringTemplate"
      SET "defaultOwner" = ${ownerName}, "defaultReviewer" = ${reviewerName}, "updatedAt" = NOW()
      WHERE id = ${templateId}
    `;

    // 3. Update existing live tasks in Task table
    await sql`
      UPDATE "Task"
      SET "ownerName" = ${ownerName}, "reviewerName" = ${reviewerName}, "updatedAt" = NOW()
      WHERE "templateId" = ${templateId}
      AND "dueDate" >= ${effectiveDate}
      AND "taskStatus" NOT IN ('Completed', 'Processed', 'Review Completed')
    `;

    return NextResponse.json({ message: "Assignment updated and posted successfully" });
  } catch (error: any) {
    console.error("Post assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// PATCH /api/recurring-templates/[id]
export async function PATCH(
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

    const data = await req.json();
    const allowedFields = [
      "taskNamePattern", "entityName", "taskType", "departmentName", "financeFunction",
      "frequency", "dayOffset", "monthOffset", "defaultOwner", "defaultReviewer", 
      "isActive", "startDate", "endDate", "stopDate", "isStopped"
    ];

    const updates: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Dynamic update building
    const result = await sql`
      UPDATE "RecurringTemplate"
      SET 
        "taskNamePattern" = ${updates.taskNamePattern !== undefined ? updates.taskNamePattern : sql`"taskNamePattern"`},
        "entityName" = ${updates.entityName !== undefined ? updates.entityName : sql`"entityName"`},
        "taskType" = ${updates.taskType !== undefined ? updates.taskType : sql`"taskType"`},
        "departmentName" = ${updates.departmentName !== undefined ? updates.departmentName : sql`"departmentName"`},
        "financeFunction" = ${updates.financeFunction !== undefined ? updates.financeFunction : sql`"financeFunction"`},
        "frequency" = ${updates.frequency !== undefined ? updates.frequency : sql`"frequency"`},
        "dayOffset" = ${updates.dayOffset !== undefined ? Number(updates.dayOffset) : sql`"dayOffset"`},
        "monthOffset" = ${updates.monthOffset !== undefined ? Number(updates.monthOffset) : sql`"monthOffset"`},
        "defaultOwner" = ${updates.defaultOwner !== undefined ? updates.defaultOwner : sql`"defaultOwner"`},
        "defaultReviewer" = ${updates.defaultReviewer !== undefined ? updates.defaultReviewer : sql`"defaultReviewer"`},
        "isActive" = ${updates.isActive !== undefined ? updates.isActive : sql`"isActive"`},
        "startDate" = ${updates.startDate !== undefined ? (updates.startDate ? new Date(updates.startDate) : null) : sql`"startDate"`},
        "endDate" = ${updates.endDate !== undefined ? (updates.endDate ? new Date(updates.endDate) : null) : sql`"endDate"`},
        "stopDate" = ${updates.stopDate !== undefined ? (updates.stopDate ? new Date(updates.stopDate) : null) : sql`"stopDate"`},
        "isStopped" = ${updates.isStopped !== undefined ? updates.isStopped : sql`"isStopped"`},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Update recurring template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Support PUT as an alias for PATCH for compatibility
export const PUT = PATCH;

// DELETE /api/recurring-templates/[id]
export async function DELETE(
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

    await sql`DELETE FROM "RecurringTemplate" WHERE id = ${id}`;
    return NextResponse.json({ message: "Template deleted" });
  } catch (error: any) {
    console.error("Delete recurring template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// DELETE /api/payments/analytics/manual/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await sql`
      DELETE FROM payments_analytics_manual
      WHERE id = ${id}
    `;

    return NextResponse.json({ message: "Entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete manual analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

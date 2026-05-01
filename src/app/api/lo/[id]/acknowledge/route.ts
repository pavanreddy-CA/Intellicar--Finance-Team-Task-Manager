import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const sql = getDb();
    const { learnerComments } = await req.json();

    const updated = await sql`
      UPDATE "LearningOpportunity"
      SET 
        "isAcknowledged" = true,
        "acknowledgedAt" = NOW(),
        "learnerComments" = ${learnerComments},
        "updatedAt" = NOW()
      WHERE "id" = ${parseInt(id)}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ message: "LO not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error("Acknowledgment error:", error);
    return NextResponse.json({ message: "Failed to acknowledge LO", error: error.message }, { status: 500 });
  }
}

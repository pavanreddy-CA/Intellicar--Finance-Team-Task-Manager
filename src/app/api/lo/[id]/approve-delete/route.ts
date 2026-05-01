import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession();
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const sql = getDb();
    const { action } = await req.json();
    const loId = parseInt(id);

    if (action === "APPROVE") {
      await sql`
        DELETE FROM "LearningOpportunity"
        WHERE id = ${loId}
      `;
      return NextResponse.json({ message: `LO deleted successfully` });
    } else {
      await sql`
        UPDATE "LearningOpportunity"
        SET "deleteRequested" = false, "deleteRequestReason" = null
        WHERE id = ${loId}
      `;
      return NextResponse.json({ message: `Deletion request rejected` });
    }
  } catch (error) {
    console.error("Failed to process delete request:", error);
    return NextResponse.json({ message: "Failed to process delete request" }, { status: 500 });
  }
}

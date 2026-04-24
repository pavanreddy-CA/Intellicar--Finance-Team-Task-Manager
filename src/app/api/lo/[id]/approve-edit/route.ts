import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession();
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { action } = await req.json();
    const loId = parseInt(id);

    if (action === "APPROVE") {
      await sql`
        UPDATE "LearningOpportunity"
        SET "editRequested" = false, "editApproved" = true, "editRequestReason" = null
        WHERE id = ${loId}
      `;
    } else {
      await sql`
        UPDATE "LearningOpportunity"
        SET "editRequested" = false, "editRequestReason" = null
        WHERE id = ${loId}
      `;
    }

    return NextResponse.json({ message: `Edit request ${action.toLowerCase()}d` });
  } catch (error) {
    return NextResponse.json({ message: "Failed to process edit request" }, { status: 500 });
  }
}

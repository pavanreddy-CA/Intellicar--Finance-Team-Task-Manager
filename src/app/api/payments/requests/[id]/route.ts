import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
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
    const request = await sql`
      SELECT * FROM "PaymentRequest" WHERE id = ${id}
    `;

    if (request.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check permissions (optional but recommended)
    // requester, dept head, or finance
    const userEmail = (session.user as any)?.email;
    const userDept = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === "ADMIN";

    const r = request[0];
    const isOwner = r.requesterEmail === userEmail;
    const isFinance = userDept === "Finance" || isAdmin;
    
    // Dept head check
    const settings = await sql`SELECT "departmentHeadMatrix" FROM "SystemSettings" LIMIT 1`;
    const matrix = JSON.parse(settings[0]?.departmentHeadMatrix || "{}");
    const heads = matrix[r.department] || [];
    const isDeptHead = heads.includes(userEmail);

    if (!isOwner && !isFinance && !isDeptHead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(r);
  } catch (error: any) {
    console.error("Fetch request details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

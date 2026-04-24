import { NextResponse, NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getServerSession } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await sql`DELETE FROM "User" WHERE id = ${id}`;

    return NextResponse.json({ message: "Request rejected and user removed" });
  } catch (error: any) {
    console.error("REJECT ERROR:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

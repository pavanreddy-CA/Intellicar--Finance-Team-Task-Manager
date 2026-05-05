import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    if (!session || session.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Task'
    `;

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    return NextResponse.json({ columns, tables }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Debug failed", error: error.message }, { status: 500 });
  }
}

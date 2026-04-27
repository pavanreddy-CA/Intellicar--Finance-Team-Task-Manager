import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getDb();
    const users = await sql`SELECT * FROM "User"`;

    return NextResponse.json({ 
      message: "Listing all users in database",
      users: users,
      count: users.length
    });
  } catch (error: any) {
    console.error("Fetch error:", error);
    return NextResponse.json({ message: "Failed to fetch users", error: error.message }, { status: 500 });
  }
}

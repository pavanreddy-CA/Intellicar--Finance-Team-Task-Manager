import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const EMAILS_TO_DELETE = [
    "saikatdas@intellicar.in",
    "sami@intellicar.in",
    "hanusha@intellicar.in",
    "sreenivasulu.t@intellicar.in",
    "sharath.shetty@intellicar.in",
    "chandanak@intellicar.in",
    "nikhat@intellicar.in",
    "venkata.g@intellicar.in",
    "saneja@intellicar.in"
  ];

  try {
    const sql = getDb();
    let deletedCount = 0;

    for (const email of EMAILS_TO_DELETE) {
      const result = await sql`DELETE FROM "User" WHERE email = ${email}`;
      deletedCount++;
    }

    return NextResponse.json({ 
      message: `Database cleanup complete. Deleted ${deletedCount} hardcoded users.`,
      status: "success"
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ message: "Failed to cleanup users", error: error.message }, { status: 500 });
  }
}

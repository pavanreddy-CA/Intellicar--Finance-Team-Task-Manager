import { NextResponse, NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    // This will update all users who don't have isApproved set
    const result = await sql`
      UPDATE "User"
      SET "isApproved" = true
      WHERE "isApproved" IS NULL OR "isApproved" != false
    `;

    return NextResponse.json({ 
      message: "Database cleanup successful"
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Cleanup failed", error: error.message }, { status: 500 });
  }
}

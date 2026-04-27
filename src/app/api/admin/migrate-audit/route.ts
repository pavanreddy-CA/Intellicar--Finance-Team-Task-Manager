import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "transferredBy" TEXT`;
    return NextResponse.json({ message: "Migration successful" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
    try {
        const sql = getDb();
        await sql`
            CREATE TABLE IF NOT EXISTS "ImportHistory" (
                "id" SERIAL PRIMARY KEY,
                "type" TEXT NOT NULL,
                "fileName" TEXT,
                "successCount" INTEGER NOT NULL,
                "errorCount" INTEGER NOT NULL,
                "errors" JSONB,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "createdBy" TEXT
            )
        `;
        return NextResponse.json({ message: "Table created" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

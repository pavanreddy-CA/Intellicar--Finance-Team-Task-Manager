import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL missing");

    const sql = neon(url);
    console.log("Creating ImportHistory table...");
    
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
    console.log("Table created successfully.");
}

run().catch(console.error);

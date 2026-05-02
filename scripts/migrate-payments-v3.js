import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser
const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});

const sql = neon(env.DATABASE_URL);

async function migrate() {
  console.log("Running migration V3 for Payment Advice & UTR improvements...");

  try {
    // Add columns to PaymentOccurrence for Payment Advice tracking
    await sql`
      ALTER TABLE "PaymentOccurrence" 
      ADD COLUMN IF NOT EXISTS "utrNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "adviceShared" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "adviceRecipient" TEXT,
      ADD COLUMN IF NOT EXISTS "adviceCC" TEXT,
      ADD COLUMN IF NOT EXISTS "adviceAttachment" TEXT;
    `;
    console.log("Successfully added advice and UTR columns to PaymentOccurrence.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();

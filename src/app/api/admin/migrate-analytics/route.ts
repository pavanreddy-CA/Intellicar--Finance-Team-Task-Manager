import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    
    console.log("Running migration for Payments Analytics...");
    
    // Create payments_analytics_manual table
    await sql`
      CREATE TABLE IF NOT EXISTS payments_analytics_manual (
        id SERIAL PRIMARY KEY,
        entity_name TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        frequency TEXT,
        amount DECIMAL(15, 2) NOT NULL,
        status TEXT NOT NULL,
        transaction_count INTEGER NOT NULL DEFAULT 1,
        payment_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return NextResponse.json({ message: "Payments Analytics migration completed successfully!" });
  } catch (error: any) {
    console.error("Analytics Migration failed:", error);
    return NextResponse.json({ message: "Migration failed", error: error.message }, { status: 500 });
  }
}

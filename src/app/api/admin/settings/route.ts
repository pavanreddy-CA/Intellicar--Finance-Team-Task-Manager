import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function GET() {
  try {
    const sql = getDb();
    const settings = await sql`SELECT * FROM "SystemSettings" LIMIT 1`;
    return NextResponse.json(settings[0] || null);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sql = getDb();
    const body = await request.json();
    const existingSettings = await sql`SELECT * FROM "SystemSettings" LIMIT 1`;

    if (!existingSettings || existingSettings.length === 0) {
      // Create new settings
      const columns = Object.keys(body);
      const values = Object.values(body);
      
      // Build dynamic insert
      const newSettings = await sql`
        INSERT INTO "SystemSettings" (
          "masterDepartments", "masterEntities", "masterTaskTypes", 
          "masterCommunicationModes", "masterRequestTypes",
          "moduleAccessMatrix", "allocationMatrix"
        ) VALUES (
          ${body.masterDepartments || ''},
          ${body.masterEntities || ''},
          ${body.masterTaskTypes || ''},
          ${body.masterCommunicationModes || ''},
          ${body.masterRequestTypes || ''},
          ${body.moduleAccessMatrix || '{}'},
          ${body.allocationMatrix || '{}'}
        )
        RETURNING *
      `;
      return NextResponse.json(newSettings[0]);
    }

    const settingsId = existingSettings[0].id;
    
    // Update existing settings
    const updatedSettings = await sql`
      UPDATE "SystemSettings"
      SET 
        "masterDepartments" = COALESCE(${body.masterDepartments}, "masterDepartments"),
        "masterEntities" = COALESCE(${body.masterEntities}, "masterEntities"),
        "masterTaskTypes" = COALESCE(${body.masterTaskTypes}, "masterTaskTypes"),
        "masterCommunicationModes" = COALESCE(${body.masterCommunicationModes}, "masterCommunicationModes"),
        "masterRequestTypes" = COALESCE(${body.masterRequestTypes}, "masterRequestTypes"),
        "moduleAccessMatrix" = COALESCE(${body.moduleAccessMatrix}, "moduleAccessMatrix"),
        "allocationMatrix" = COALESCE(${body.allocationMatrix}, "allocationMatrix"),
        "updatedAt" = NOW()
      WHERE id = ${settingsId}
      RETURNING *
    `;

    return NextResponse.json(updatedSettings[0]);
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

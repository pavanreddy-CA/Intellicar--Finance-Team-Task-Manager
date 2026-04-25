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
          "id", "masterDepartments", "masterEntities", "masterTaskTypes", 
          "masterCommunicationModes", "masterRequestTypes",
          "moduleAccessMatrix", "allocationMatrix", "createdAt", "updatedAt"
        ) VALUES (
          'singleton',
          ${body.masterDepartments || ''},
          ${body.masterEntities || ''},
          ${body.masterTaskTypes || ''},
          ${body.masterCommunicationModes || ''},
          ${body.masterRequestTypes || ''},
          ${body.moduleAccessMatrix || '{}'},
          ${body.allocationMatrix || '{}'},
          NOW(), NOW()
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
        "masterDepartments" = ${body.masterDepartments ?? existingSettings[0].masterDepartments},
        "masterEntities" = ${body.masterEntities ?? existingSettings[0].masterEntities},
        "masterTaskTypes" = ${body.masterTaskTypes ?? existingSettings[0].masterTaskTypes},
        "masterCommunicationModes" = ${body.masterCommunicationModes ?? existingSettings[0].masterCommunicationModes},
        "masterRequestTypes" = ${body.masterRequestTypes ?? existingSettings[0].masterRequestTypes},
        "moduleAccessMatrix" = ${body.moduleAccessMatrix ?? existingSettings[0].moduleAccessMatrix},
        "allocationMatrix" = ${body.allocationMatrix ?? existingSettings[0].allocationMatrix},
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

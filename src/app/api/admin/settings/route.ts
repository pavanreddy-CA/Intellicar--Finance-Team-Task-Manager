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
    console.log('PATCH /api/admin/settings - Body:', JSON.stringify(body));

    const existingSettings = await sql`SELECT * FROM "SystemSettings" LIMIT 1`;
    console.log('PATCH /api/admin/settings - Existing settings found:', existingSettings.length);

    if (!existingSettings || existingSettings.length === 0) {
      console.log('PATCH /api/admin/settings - No existing settings, creating new row');
      const newSettings = await sql`
        INSERT INTO "SystemSettings" (
          "id", 
          "masterDepartments", 
          "masterEntities", 
          "masterTaskTypes", 
          "masterCommunicationModes", 
          "masterRequestTypes",
          "moduleAccessMatrix", 
          "allocationMatrix",
          "entityMatrix",
          "recurringMatrix",
          "homeContent",
          "reminderFrequency",
          "reminderTimes",
          "managerReportFrequency",
          "managerReportTimes",
          "loReportFrequency",
          "loReportTimes",
          "managerEmail",
          "loReportEmail"
        ) VALUES (
          'singleton',
          ${body.masterDepartments || ''},
          ${body.masterEntities || ''},
          ${body.masterTaskTypes || ''},
          ${body.masterCommunicationModes || ''},
          ${body.masterRequestTypes || ''},
          ${body.moduleAccessMatrix || '{}'},
          ${body.allocationMatrix || '{}'},
          ${body.entityMatrix || '{}'},
          ${body.recurringMatrix || '{}'},
          ${body.homeContent || '{}'},
          ${body.reminderFrequency || 'DAILY'},
          ${body.reminderTimes || '09:00,18:00'},
          ${body.managerReportFrequency || 'DAILY'},
          ${body.managerReportTimes || '10:00'},
          ${body.loReportFrequency || 'WEEKLY'},
          ${body.loReportTimes || '10:00'},
          ${body.managerEmail || ''},
          ${body.loReportEmail || ''}
        )
        RETURNING *
      `;
      return NextResponse.json(newSettings[0]);
    }

    const settingsId = existingSettings[0].id;
    console.log('PATCH /api/admin/settings - Updating settings with ID:', settingsId);
    
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
        "entityMatrix" = ${body.entityMatrix ?? existingSettings[0].entityMatrix},
        "recurringMatrix" = ${body.recurringMatrix ?? existingSettings[0].recurringMatrix},
        "homeContent" = ${body.homeContent ?? existingSettings[0].homeContent},
        "reminderFrequency" = ${body.reminderFrequency ?? existingSettings[0].reminderFrequency},
        "reminderTimes" = ${body.reminderTimes ?? existingSettings[0].reminderTimes},
        "managerReportFrequency" = ${body.managerReportFrequency ?? existingSettings[0].managerReportFrequency},
        "managerReportTimes" = ${body.managerReportTimes ?? existingSettings[0].managerReportTimes},
        "loReportFrequency" = ${body.loReportFrequency ?? existingSettings[0].loReportFrequency},
        "loReportTimes" = ${body.loReportTimes ?? existingSettings[0].loReportTimes},
        "managerEmail" = ${body.managerEmail ?? existingSettings[0].managerEmail},
        "loReportEmail" = ${body.loReportEmail ?? existingSettings[0].loReportEmail}
      WHERE id = ${settingsId}
      RETURNING *
    `;

    console.log('PATCH /api/admin/settings - Successfully updated');
    return NextResponse.json(updatedSettings[0]);
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error', 
      details: error.message
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function GET() {
  try {
    const sql = getDb();
    
    // Self-healing migration for masterResourceCategories
    try {
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "masterResourceCategories" TEXT DEFAULT 'Goods & Service Tax,Income Tax,Audit,ROC,IND AS,Miscellaneous'`;
    } catch (e) {
      console.log("Settings migration failed/skipped", e);
    }

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
    const { getServerSession } = await import("@/lib/session");
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && session.user?.email !== "pavanreddy@intellicar.in")) {
      return NextResponse.json({ message: "Forbidden: Only Admins can modify settings" }, { status: 403 });
    }

    const body = await request.json();
    console.log('PATCH /api/admin/settings - Body:', JSON.stringify(body));

    const existingSettings = await sql`SELECT * FROM "SystemSettings" LIMIT 1`;
    console.log('PATCH /api/admin/settings - Existing settings found:', existingSettings.length);

    // Self-healing migration for new fields
    try {
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "masterFrequencies" TEXT DEFAULT 'Ad,M,Y,2Y,H,Q,W,BW,D'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "masterPaymentTypes" TEXT DEFAULT 'AMC,Rent,Electricity,Subscriptions,Salaries,Vendor Payment'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "userModuleExceptions" TEXT DEFAULT '{}'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "dailyTaskGenerationTime" TEXT DEFAULT '06:00'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "holidayList" TEXT DEFAULT '[]'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "lastDailyGenerationAt" TIMESTAMP`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "masterResourceCategories" TEXT DEFAULT 'Goods & Service Tax,Income Tax,Audit,ROC,IND AS,Miscellaneous'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "bulkImportMatrix" TEXT DEFAULT '{}'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "masterBankAccounts" TEXT DEFAULT 'HDFC,ICICI,SBI'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportFrequency" TEXT DEFAULT 'OFF'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportTimes" TEXT DEFAULT '10:00'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportEmail" TEXT DEFAULT ''`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportDay" TEXT DEFAULT 'Monday'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportDate" INTEGER DEFAULT 1`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "departmentHeadMatrix" TEXT DEFAULT '{}'`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "masterLOClassifications" TEXT DEFAULT 'Process Error,Calculation Error,Communication Gap,Documentation Miss,System Issue,Miscellaneous'`;
    } catch (e) {
      console.log("Migration for settings fields failed/skipped");
    }

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
          "bulkImportMatrix",
          "homeContent",
          "reminderFrequency",
          "reminderTimes",
          "managerReportFrequency",
          "managerReportTimes",
          "loReportFrequency",
          "loReportTimes",
          "paymentReportFrequency",
          "paymentReportTimes",
          "paymentReportEmail",
          "paymentReportDay",
          "paymentReportDate",
          "managerEmail",
          "loReportEmail",
          "masterFrequencies",
          "masterPaymentTypes",
          "userModuleExceptions",
          "dailyTaskGenerationTime",
          "holidayList",
          "masterResourceCategories",
          "departmentHeadMatrix",
          "masterLOClassifications"
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
          ${body.bulkImportMatrix || '{}'},
          ${body.homeContent || '{}'},
          ${body.reminderFrequency || 'D'},
          ${body.reminderTimes || '09:00,18:00'},
          ${body.managerReportFrequency || 'D'},
          ${body.managerReportTimes || '10:00'},
          ${body.loReportFrequency || 'W'},
          ${body.loReportTimes || '10:00'},
          ${body.paymentReportFrequency || 'OFF'},
          ${body.paymentReportTimes || '10:00'},
          ${body.paymentReportEmail || ''},
          ${body.paymentReportDay || 'Monday'},
          ${body.paymentReportDate || 1},
          ${body.managerEmail || ''},
          ${body.loReportEmail || ''},
          ${body.masterFrequencies || 'Ad,M,Y,2Y,H,Q,W,BW,D'},
          ${body.masterPaymentTypes || 'AMC,Rent,Electricity,Subscriptions,Salaries,Vendor Payment'},
          ${body.masterBankAccounts || 'HDFC,ICICI,SBI'},
          ${body.userModuleExceptions || '{}'},
          ${body.dailyTaskGenerationTime || '06:00'},
          ${body.holidayList || '[]'},
          ${body.masterResourceCategories || 'Goods & Service Tax,Income Tax,Audit,ROC,IND AS,Miscellaneous'},
          ${body.departmentHeadMatrix || '{}'},
          ${body.masterLOClassifications || 'Process Error,Calculation Error,Communication Gap,Documentation Miss,System Issue,Miscellaneous'}
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
        "bulkImportMatrix" = ${body.bulkImportMatrix ?? existingSettings[0].bulkImportMatrix},
        "homeContent" = ${body.homeContent ?? existingSettings[0].homeContent},
        "reminderFrequency" = ${body.reminderFrequency ?? existingSettings[0].reminderFrequency},
        "reminderTimes" = ${body.reminderTimes ?? existingSettings[0].reminderTimes},
        "managerReportFrequency" = ${body.managerReportFrequency ?? existingSettings[0].managerReportFrequency},
        "managerReportTimes" = ${body.managerReportTimes ?? existingSettings[0].managerReportTimes},
        "loReportFrequency" = ${body.loReportFrequency ?? existingSettings[0].loReportFrequency},
        "loReportTimes" = ${body.loReportTimes ?? existingSettings[0].loReportTimes},
        "paymentReportFrequency" = ${body.paymentReportFrequency ?? existingSettings[0].paymentReportFrequency},
        "paymentReportTimes" = ${body.paymentReportTimes ?? existingSettings[0].paymentReportTimes},
        "paymentReportEmail" = ${body.paymentReportEmail ?? existingSettings[0].paymentReportEmail},
        "paymentReportDay" = ${body.paymentReportDay ?? existingSettings[0].paymentReportDay},
        "paymentReportDate" = ${body.paymentReportDate ?? existingSettings[0].paymentReportDate},
        "managerEmail" = ${body.managerEmail ?? existingSettings[0].managerEmail},
        "loReportEmail" = ${body.loReportEmail ?? existingSettings[0].loReportEmail},
        "masterFrequencies" = ${body.masterFrequencies ?? existingSettings[0].masterFrequencies},
        "masterPaymentTypes" = ${body.masterPaymentTypes ?? existingSettings[0].masterPaymentTypes},
        "masterBankAccounts" = ${body.masterBankAccounts ?? existingSettings[0].masterBankAccounts},
        "userModuleExceptions" = ${body.userModuleExceptions ?? existingSettings[0].userModuleExceptions},
        "dailyTaskGenerationTime" = ${body.dailyTaskGenerationTime ?? existingSettings[0].dailyTaskGenerationTime},
        "holidayList" = ${body.holidayList ?? existingSettings[0].holidayList},
        "masterResourceCategories" = ${body.masterResourceCategories ?? existingSettings[0].masterResourceCategories},
        "departmentHeadMatrix" = ${body.departmentHeadMatrix ?? existingSettings[0].departmentHeadMatrix},
        "masterLOClassifications" = ${body.masterLOClassifications ?? existingSettings[0].masterLOClassifications}
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

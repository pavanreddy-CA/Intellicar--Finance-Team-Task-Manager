import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEmail, getEmailFromName } from "@/lib/email";
import { getServerSession } from "@/lib/session";
import * as ExcelJS from "exceljs";

export const dynamic = 'force-dynamic';


// Helper to check if a task is overdue
function isOverdue(dueDate: Date | null, referenceDate: Date) {
  if (!dueDate) return false;
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  return target < ref;
}

function isScheduleDue(
  frequency: string,
  timesStr: string,
  lastSentAt: Date | string | null,
  istDate: Date,
  dayOfWeek: number,
  currentDate: number,
  targetDayName?: string | null,
  targetDate?: number | null
): boolean {
  if (!frequency || frequency.includes('OFF') || !timesStr) return false;

  const currentHHmm = `${String(istDate.getUTCHours()).padStart(2, '0')}:${String(istDate.getUTCMinutes()).padStart(2, '0')}`;
  
  const freqs = frequency.split(',').map(f => f.trim().toUpperCase());
  let frequencyIsActive = false;
  
  if (freqs.includes('D') || freqs.includes('DAILY')) {
    frequencyIsActive = true;
  }
  if (!frequencyIsActive && (freqs.includes('W') || freqs.includes('WEEKLY'))) {
    const dayMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[targetDayName || 'Monday'];
    if (dayOfWeek === targetDay) frequencyIsActive = true;
  }
  if (!frequencyIsActive && (freqs.includes('M') || freqs.includes('MONTHLY'))) {
    if (currentDate === (targetDate || 1)) frequencyIsActive = true;
  }

  if (!frequencyIsActive) return false;
  
  const times = timesStr.split(',').map(t => t.trim()).sort();
  const dueTimes = times.filter(t => t <= currentHHmm);
  
  if (dueTimes.length === 0) return false;

  const latestDueTime = dueTimes[dueTimes.length - 1];
  const [dueHour, dueMin] = latestDueTime.split(':').map(Number);
  const latestDueTimestamp = new Date(istDate.getTime());
  latestDueTimestamp.setUTCHours(dueHour, dueMin, 0, 0);

  if (!lastSentAt) return true;
  
  const lastSentDate = new Date(lastSentAt);
  const lastSentIST = new Date(lastSentDate.getTime() + (5.5 * 60 * 60 * 1000));

  return lastSentIST < latestDueTimestamp;
}


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Format date as DD-MMM-YYYY
function formatDate(date: Date | string | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format date and time as DD-MMM-YYYY HH:mm
function formatDateTime(date: Date | string | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

// LO Stats Helper
function getLOStats(los: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    weekly: los.filter(l => new Date(l.createdAt) >= weekAgo).length,
    mtd: los.filter(l => new Date(l.createdAt) >= startOfMonth).length,
    allTime: los.length,
    mtdItems: los.filter(l => new Date(l.createdAt) >= startOfMonth),
    startOfMonth
  };
}

// Excel Generator Helper with perfected styling
async function generateLOExcelBuffer(los: any[], subtitle: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Learning Opportunities");

  worksheet.columns = [
    { width: 8 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 45 },
    { width: 20 }, { width: 20 }, { width: 45 }, { width: 20 }, { width: 30 }, { width: 40 }
  ];

  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ITPL - Finance Learning Opportunity Report';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:K2');
  const subCell = worksheet.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const headerRow = worksheet.getRow(3);
  const headers = ['SI No', 'Timestamp', 'Entity', 'Date of Identification', 'Learning Opportunity', 
    'Identified by', 'Commited By', 'Resolution Provided', 'Mode Of Communication', 'Email Sub', 'Comments'];
  
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  los.forEach((lo, index) => {
    const row = worksheet.addRow([
      index + 1, formatDateTime(lo.createdAt), lo.entity || "", formatDate(lo.dateOfIdentification),
      lo.learningOpportunity || "", lo.identifiedBy || "", lo.committedBy || "", lo.resolutionProvided || "",
      lo.modeOfCommunication || "", lo.emailSub || "Not Applicable", lo.comments || "NA"
    ]);
    row.alignment = { vertical: 'middle', wrapText: true };
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Task Excel Generator
async function generateTaskExcelBuffer(tasks: any[], subtitle: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Tasks");

  worksheet.columns = [
    { width: 8 }, { width: 20 }, { width: 45 }, { width: 25 }, { width: 20 }, { width: 20 },
    { width: 20 }, { width: 25 }, { width: 20 }, { width: 20 }, { width: 18 }, { width: 15 }, { width: 25 },
    { width: 25 }, { width: 20 }, { width: 40 }, { width: 40 }, { width: 30 }
  ];

  worksheet.mergeCells('A1:R1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ITPL - Finance Task Management Report';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:R2');
  const subCell = worksheet.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const headerRow = worksheet.getRow(3);
  const headers = ['SI No', 'Timestamp', 'Task Name', 'Entity', 'Type', 'Frequency', 'Department', 'Requested By',
    'Owner', 'Due Date', 'Completion Date', 'Status', 'Reviewer', 'Review Status', 'Review Date',
    'Owner Comments', 'Reviewer Comments', 'Mail Link'];
  
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  tasks.forEach((t, index) => {
    const row = worksheet.addRow([
      index + 1, formatDateTime(t.createdAt), t.taskName || "", t.entityName || "", t.taskType || "", t.frequency || "",
      t.departmentName || "", t.requestFrom || "", formatDate(t.dueDate),
      formatDate(t.completionDate), t.taskStatus || "", t.reviewerName || "Not Applicable",
      t.reviewStatus || "", formatDate(t.reviewCompletionDate), t.ownerComments || "",
      t.reviewerComments || "", t.mailLink || ""
    ]);
    row.alignment = { vertical: 'middle', wrapText: true };
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Payment Excel Generator
async function generatePaymentExcelBuffer(payments: any[], subtitle: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Payments");

  worksheet.columns = [
    { width: 8 }, { width: 20 }, { width: 25 }, { width: 35 }, { width: 20 }, { width: 15 }, 
    { width: 18 }, { width: 18 }, { width: 20 }, { width: 20 }
  ];

  worksheet.mergeCells('A1:J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ITPL - Finance Payments Report';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:J2');
  const subCell = worksheet.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const headerRow = worksheet.getRow(3);
  const headers = ['SI No', 'Entity', 'Vendor', 'Description', 'Type', 'Freq', 'Due Date', 'Actual Date', 'Amount', 'Status'];
  
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  payments.forEach((p, index) => {
    const status = p.isPaid ? (new Date(p.actualDate) > new Date(p.dueDate) ? "PAID (DELAYED)" : "PAID (ON TIME)") : (new Date() > new Date(p.dueDate) ? "OVERDUE" : "NOT YET DUE");
    const row = worksheet.addRow([
      index + 1, p.entityName || "", p.vendorName || "", p.paymentDescription || "", p.paymentType || "", p.frequency || "",
      formatDate(p.dueDate), formatDate(p.actualDate), p.amountPaid || "", status
    ]);
    row.alignment = { vertical: 'middle', wrapText: true };
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Reusable HTML Table Generator
function generateGridHtml(tasks: any[], title: string, referenceDate: Date) {
  let html = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; overflow-x: auto; margin-bottom: 40px;">`;
  html += `<h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; font-weight: 600;">${title}</h2>`;
  html += `<table cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px; text-align: left; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <tr style="background-color: #2563eb; color: #ffffff; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
      <th>S.No</th><th>Time Stamp</th><th>Owner Name</th><th>Reviewer Name</th><th>Task Name</th><th>Entity Name</th><th>Task Type</th><th>Freq</th><th>Department Name</th><th>Request From</th><th>Owner Mail ID</th><th>Due Date</th><th>Completion Date</th><th>Task Status</th><th>Reviewer Email</th><th>Review Completion Date</th><th>Review Status</th><th>Mail Link</th><th>Owner Comments</th><th>Reviewer Comments</th>
    </tr>`;

  if (tasks.length === 0) {
    html += `<tr><td colspan="20" style="padding: 20px;">No pending tasks found.</td></tr>`;
  } else {
    tasks.forEach((t, index) => {
      const overdue = isOverdue(t.dueDate, referenceDate) && t.taskStatus !== "Completed";
      const rowStyle = overdue ? 'background-color: #fef2f2; border-bottom: 1px solid #fee2e2;' : 'background-color: #ffffff; border-bottom: 1px solid #e2e8f0;';
      html += `<tr style="${rowStyle}">
        <td>${index + 1}</td><td>${formatDateTime(t.createdAt)}</td><td>${t.ownerName}</td>
        <td>${t.reviewerName === "Not Applicable" ? "NA" : t.reviewerName || ""}</td>
        <td style="min-width: 400px;">${t.taskName}</td><td>${t.entityName}</td><td>${t.taskType}</td><td>${t.frequency || ""}</td>
        <td>${t.departmentName}</td><td>${t.requestFrom}</td>
        <td><a href="mailto:${getEmailFromName(t.ownerName)}">${getEmailFromName(t.ownerName)}</a></td>
        <td style="${overdue ? 'color: red; font-weight: bold;' : ''}">${formatDate(t.dueDate)}</td>
        <td>${formatDate(t.completionDate)}</td><td>${t.taskStatus}</td>
        <td><a href="mailto:${getEmailFromName(t.reviewerName)}">${getEmailFromName(t.reviewerName)}</a></td>
        <td>${t.reviewerName === "Not Applicable" ? "NA" : formatDate(t.reviewCompletionDate)}</td>
        <td>${t.reviewerName === "Not Applicable" ? "Review Not Required" : t.reviewStatus}</td>
        <td>${t.mailLink ? `<a href="${t.mailLink}">Link</a>` : ""}</td>
        <td>${t.ownerComments || ""}</td><td>${t.reviewerComments || ""}</td>
      </tr>`;
    });
  }
  html += `</table></div>`;
  return html;
}

export async function GET(req: NextRequest) {
  const sql = getDb();
  const url = new URL(req.url);
  const requestedType = url.searchParams.get("type") || "all";
  let typesToProcess: string[] = [requestedType];
  const clientDateStr = url.searchParams.get("clientDate");
  const referenceDate = clientDateStr ? new Date(clientDateStr) : new Date();

  const authHeader = req.headers.get("authorization");
  const session = await getServerSession();
  
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualToken = authHeader === "Bearer intellicar-cron-123";
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";
  
  if (process.env.NODE_ENV === "production" && !isVercelCron && !isManualToken && !isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const settingsRows = await sql`SELECT * FROM "SystemSettings" WHERE id = 'singleton'`;
  const settings = settingsRows[0];

  if (isVercelCron) {
    try {
      if (settings) {
        const now = new Date();
        // Add 1-minute jitter buffer so if Vercel fires at 02:29:58, it is treated as 02:30
        const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) + (1 * 60 * 1000));
        const currentHHmm = `${String(istDate.getUTCHours()).padStart(2, '0')}:${String(istDate.getUTCMinutes()).padStart(2, '0')}`;
        const currentDay = istDate.getUTCDay();
        const currentDate = istDate.getUTCDate();

        let shouldRemind = false, shouldReport = false, shouldLOReport = false, shouldPaymentReport = false;

        shouldRemind = isScheduleDue(
          settings.reminderFrequency,
          settings.reminderTimes,
          settings.lastReminderSentAt,
          istDate,
          currentDay,
          currentDate,
          settings.reminderDay,
          settings.reminderDate
        );

        shouldReport = isScheduleDue(
          settings.managerReportFrequency,
          settings.managerReportTimes,
          settings.lastManagerReportSentAt,
          istDate,
          currentDay,
          currentDate,
          settings.managerReportDay,
          settings.managerReportDate
        );

        shouldLOReport = isScheduleDue(
          settings.loReportFrequency,
          settings.loReportTimes,
          settings.lastLoReportSentAt,
          istDate,
          currentDay,
          currentDate,
          settings.loReportDay,
          settings.loReportDate
        );

        shouldPaymentReport = isScheduleDue(
          settings.paymentReportFrequency || 'OFF',
          settings.paymentReportTimes || '10:00',
          settings.lastPaymentReportSentAt,
          istDate,
          currentDay,
          currentDate,
          settings.paymentReportDay,
          settings.paymentReportDate
        );

        if (!shouldRemind && !shouldReport && !shouldLOReport && !shouldPaymentReport) {
          return NextResponse.json({ message: `Skipping.` });
        }

        typesToProcess = [];
        if (shouldPaymentReport) typesToProcess.push("payments");
        if (shouldLOReport) typesToProcess.push("lo");
        if (shouldRemind && shouldReport) typesToProcess.push("all");
        else {
          if (shouldRemind) typesToProcess.push("users");
          if (shouldReport) typesToProcess.push("manager");
        }
      }
    } catch (e) {
      console.error("Settings check failed", e);
    }
  }

  try {
    const sql = getDb();
    if (typesToProcess.includes("lo")) {
      const allLOs = await sql`SELECT * FROM "LearningOpportunity" ORDER BY "createdAt" DESC`;
      const stats = getLOStats(allLOs);
      const managerEmail = settings?.loReportEmail || "pavanreddy@intellicar.in";
      
      const currentMonthName = `${FULL_MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
      const currentMonthSubtitle = `Current Month Report - ${currentMonthName}`;
      const consolidatedSubtitle = `Consolidated Report (All Entries)`;
      
      const currentMonthBuffer = await generateLOExcelBuffer(stats.mtdItems, currentMonthSubtitle);
      const consolidatedBuffer = await generateLOExcelBuffer(allLOs, consolidatedSubtitle);

      const entityCounts: Record<string, number> = {};
      stats.mtdItems.forEach(lo => {
        if (lo.entity) entityCounts[lo.entity] = (entityCounts[lo.entity] || 0) + 1;
      });

      let loHtml = `
        <div style="background-color: #f4f7f9; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155;">
          <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #3b5998; padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Weekly Finance LO Report</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Report Period: ${formatDate(stats.startOfMonth)} to ${formatDate(referenceDate)}</p>
            </div>
            <div style="padding: 40px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi Team,</p>
              <p style="font-size: 14px; line-height: 1.6; margin-bottom: 30px;">Please find below the Learning Opportunity summary.</p>
              <div style="display: table; width: 100%; border-spacing: 15px 0; margin-bottom: 40px;">
                <div style="display: table-cell; background-color: #eff6ff; padding: 20px; text-align: center; border-radius: 8px;">
                  <div style="font-size: 12px; color: #2563eb; font-weight: bold;">This Week</div>
                  <div style="font-size: 36px; font-weight: 700;">${stats.weekly}</div>
                </div>
                <div style="display: table-cell; background-color: #ecfdf5; padding: 20px; text-align: center; border-radius: 8px;">
                  <div style="font-size: 12px; color: #059669; font-weight: bold;">MTD</div>
                  <div style="font-size: 36px; font-weight: 700;">${stats.mtd}</div>
                </div>
                <div style="display: table-cell; background-color: #f5f3ff; padding: 20px; text-align: center; border-radius: 8px;">
                  <div style="font-size: 12px; color: #7c3aed; font-weight: bold;">All Time</div>
                  <div style="font-size: 36px; font-weight: 700;">${stats.allTime}</div>
                </div>
              </div>
              <h3 style="font-size: 14px; color: #2563eb;">Entity-wise Breakdown (MTD)</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr style="background-color: #3b5998; color: #ffffff;"><th style="padding: 10px;">Entity</th><th style="padding: 10px; text-align: right;">Count</th></tr>
                ${Object.entries(entityCounts).map(([entity, count]) => `
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px;">${entity}</td><td style="padding: 10px; text-align: right;">${count}</td></tr>
                `).join('')}
              </table>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: managerEmail,
        subject: `Weekly Finance LO Report - ${formatDate(referenceDate)}`,
        html: loHtml,
        attachments: [
          { filename: `Current_Month_LO_Report_${formatDate(referenceDate)}.xlsx`, content: currentMonthBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          { filename: `Consolidated_LO_Report_${formatDate(referenceDate)}.xlsx`, content: consolidatedBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        ]
      });

      await sql`UPDATE "SystemSettings" SET "lastLoReportSentAt" = NOW() WHERE id = 'singleton'`;
    }

    if (typesToProcess.includes("payments")) {
      const allOccurrences = await sql`
        SELECT o.*, t."entityName", t."vendorName", t."paymentDescription", t."paymentType", t."departmentName", t."financeFunction", t.frequency
        FROM "PaymentOccurrence" o
        JOIN "PaymentTemplate" t ON o."templateId" = t.id
        ORDER BY o."dueDate" DESC
      `;
      
      const managerEmail = settings?.paymentReportEmail || "pavanreddy@intellicar.in";
      const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const mtdOccurrences = allOccurrences.filter(o => new Date(o.dueDate) >= startOfMonth);
      
      const currentMonthName = `${FULL_MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
      const currentMonthSubtitle = `Current Month Payments - ${currentMonthName}`;
      const consolidatedSubtitle = `Consolidated Payment Report (All Entries)`;
      
      const currentMonthBuffer = await generatePaymentExcelBuffer(mtdOccurrences, currentMonthSubtitle);
      const consolidatedBuffer = await generatePaymentExcelBuffer(allOccurrences, consolidatedSubtitle);

      const statsHtml = `
        <div style="font-family: sans-serif; color: #334155;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Payments Summary Report</h2>
          <div style="display: flex; gap: 20px; margin: 24px 0;">
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="color: #2563eb; font-size: 12px; font-weight: bold;">MTD Payments</div>
              <div style="font-size: 24px; font-weight: bold;">${mtdOccurrences.length}</div>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="color: #ef4444; font-size: 12px; font-weight: bold;">Unpaid (MTD)</div>
              <div style="font-size: 24px; font-weight: bold;">${mtdOccurrences.filter(o => !o.isPaid).length}</div>
            </div>
          </div>
          <p>Full reports are attached as Excel files.</p>
        </div>
      `;

      await sendEmail({
        to: managerEmail,
        subject: `Finance Payments Report - ${formatDate(referenceDate)}`,
        html: statsHtml,
        attachments: [
          { filename: `Current_Month_Payments_${formatDate(referenceDate)}.xlsx`, content: currentMonthBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          { filename: `Consolidated_Payments_Report_${formatDate(referenceDate)}.xlsx`, content: consolidatedBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        ]
      });

      await sql`UPDATE "SystemSettings" SET "lastPaymentReportSentAt" = NOW() WHERE id = 'singleton'`;
    }

    const allTasks = await sql`SELECT * FROM "Task" ORDER BY "createdAt" DESC`;
    const pendingOwnerTasks = allTasks.filter(t => t.taskStatus !== "Completed");
    const pendingReviewTasks = allTasks.filter(t => t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner");

    if (typesToProcess.includes("all") || typesToProcess.includes("users")) {
      const owners = Array.from(new Set(pendingOwnerTasks.map(t => t.ownerName)));
      const emailPromises = owners.map(async (owner) => {
        const ownerEmail = getEmailFromName(owner as string);
        if (!ownerEmail) return;

        const ownerTasks = pendingOwnerTasks.filter(t => t.ownerName === owner);
        const taskListHtml = generateGridHtml(ownerTasks, `Pending Tasks for ${owner}`, referenceDate);
        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-finpulse.vercel.app/";

        try {
          await sendEmail({
            to: ownerEmail,
            subject: `Reminder: You have ${ownerTasks.length} pending tasks - ${formatDate(referenceDate)}`,
            html: `
              <div style="font-family: sans-serif; color: #334155; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #2563eb; margin-top: 0;">Pending Task Reminder</h2>
                <p>Hi <strong>${owner}</strong>,</p>
                <p>This is a reminder that you have <strong>${ownerTasks.length}</strong> tasks pending your action as of ${formatDate(referenceDate)}.</p>
                <div style="margin: 20px 0;">${taskListHtml}</div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Login to Dashboard</a>
                </div>
                <p style="font-size: 14px; color: #64748b;">Please update the status on the dashboard once completed.</p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                  This is an automated reminder from Intellicar Finance Task Manager.
                </p>
              </div>
            `
          });
        } catch (mailErr) {
          console.error(`Failed to send reminder email to ${owner} (${ownerEmail}):`, mailErr);
        }
      });

      await Promise.allSettled(emailPromises);
      
      await sql`UPDATE "SystemSettings" SET "lastReminderSentAt" = NOW() WHERE id = 'singleton'`;
    }

    if (typesToProcess.includes("all") || typesToProcess.includes("manager")) {
      const managerEmail = settings?.managerEmail || "pavanreddy@intellicar.in";
      const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const mtdTasks = allTasks.filter(t => new Date(t.createdAt) >= startOfMonth);
      
      const currentMonthName = `${FULL_MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
      const currentMonthSubtitle = `Current Month Tasks - ${currentMonthName}`;
      const consolidatedSubtitle = `Consolidated Task Report (All Entries)`;
      
      const currentMonthBuffer = await generateTaskExcelBuffer(mtdTasks, currentMonthSubtitle);
      const consolidatedBuffer = await generateTaskExcelBuffer(allTasks, consolidatedSubtitle);

      const statsHtml = `
        <div style="font-family: sans-serif; color: #334155;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Daily Task Summary Report</h2>
          <div style="display: flex; gap: 20px; margin: 24px 0;">
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="color: #2563eb; font-size: 12px; font-weight: bold;">Total Pending</div>
              <div style="font-size: 24px; font-weight: bold;">${pendingOwnerTasks.length}</div>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="color: #ef4444; font-size: 12px; font-weight: bold;">Pending Review</div>
              <div style="font-size: 24px; font-weight: bold;">${pendingReviewTasks.length}</div>
            </div>
          </div>
          ${generateGridHtml(pendingOwnerTasks.slice(0, 10), "Top Pending Tasks (Preview)", referenceDate)}
          <p>Full reports are attached as Excel files.</p>
        </div>
      `;

      await sendEmail({
        to: managerEmail,
        subject: `Daily Finance Task Report - ${formatDate(referenceDate)}`,
        html: statsHtml,
        attachments: [
          { filename: `Current_Month_Tasks_${formatDate(referenceDate)}.xlsx`, content: currentMonthBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          { filename: `Consolidated_Tasks_Report_${formatDate(referenceDate)}.xlsx`, content: consolidatedBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        ]
      });

      await sql`UPDATE "SystemSettings" SET "lastManagerReportSentAt" = NOW() WHERE id = 'singleton'`;
    }

    return NextResponse.json({ message: `Emails sent.` });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ message: "Error", error: error.message }, { status: 500 });
  }
}

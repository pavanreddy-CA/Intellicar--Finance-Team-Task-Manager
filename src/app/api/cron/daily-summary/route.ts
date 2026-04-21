import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, getEmailFromName } from "@/lib/email";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ExcelJS from "exceljs";

// Helper to check if a task is overdue
function isOverdue(dueDate: Date | null, referenceDate: Date) {
  if (!dueDate) return false;
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  return target < ref;
}

// Format date as DD-MMM-YYYY
function formatDate(dateStr: Date | string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format date and time as DD-MMM-YYYY HH:mm
function formatDateTime(dateStr: Date | string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
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

// Excel Generator Helper
async function generateLOExcelBuffer(los: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Learning Opportunities");

  worksheet.mergeCells('A1:J2');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ITPL - FINANCE LEARNING OPPORTUNITY REPORT';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.columns = [
    { header: 'SI No', key: 'id', width: 8 },
    { header: 'Timestamp', key: 'createdAt', width: 20 },
    { header: 'Entity', key: 'entity', width: 20 },
    { header: 'Date of Identification', key: 'dateOfIdentification', width: 20 },
    { header: 'Learning Opportunity', key: 'learningOpportunity', width: 45 },
    { header: 'Identified By', key: 'identifiedBy', width: 20 },
    { header: 'Committed By', key: 'committedBy', width: 20 },
    { header: 'Resolution Provided', key: 'resolutionProvided', width: 45 },
    { header: 'Mode Of Communication', key: 'modeOfCommunication', width: 20 },
    { header: 'Email Sub', key: 'emailSub', width: 30 },
    { header: 'Comments', key: 'comments', width: 40 }
  ];

  const headerRow = worksheet.getRow(3);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  los.forEach((lo, index) => {
    const row = worksheet.addRow({
      id: index + 1,
      createdAt: formatDateTime(lo.createdAt),
      entity: lo.entity,
      dateOfIdentification: formatDate(lo.dateOfIdentification),
      learningOpportunity: lo.learningOpportunity,
      identifiedBy: lo.identifiedBy,
      committedBy: lo.committedBy,
      resolutionProvided: lo.resolutionProvided,
      modeOfCommunication: lo.modeOfCommunication,
      emailSub: lo.emailSub || "N/A",
      comments: lo.comments || "N/A"
    });
    row.alignment = { vertical: 'middle', wrapText: true };
  });

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
}

// Reusable HTML Table Generator mirroring the Google Sheet layout
function generateGridHtml(tasks: any[], title: string, referenceDate: Date) {
  let html = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; overflow-x: auto; margin-bottom: 40px;">`;
  html += `<h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; font-weight: 600;">${title}</h2>`;
  html += `
    <table cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px; text-align: left; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
      <tr style="background-color: #2563eb; color: #ffffff; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
        <th>S.No</th>
        <th>Time Stamp</th>
        <th>Owner Name</th>
        <th>Reviewer Name</th>
        <th>Task Name</th>
        <th>Entity Name</th>
        <th>Task Type</th>
        <th>Department Name</th>
        <th>Request From</th>
        <th>Owner Mail ID</th>
        <th>Due Date</th>
        <th>Completion Date</th>
        <th>Task Status</th>
        <th>Reviewer Email</th>
        <th>Review Completion Date</th>
        <th>Review Status</th>
        <th>Mail Link</th>
        <th>Owner Comments</th>
        <th>Reviewer Comments</th>
      </tr>
  `;

  if (tasks.length === 0) {
    html += `<tr><td colspan="19" style="padding: 20px;">No pending tasks found.</td></tr>`;
  } else {
    tasks.forEach((t, index) => {
      const overdue = isOverdue(t.dueDate, referenceDate) && t.taskStatus !== "Completed";
      const rowStyle = overdue ? 'background-color: #fef2f2; border-bottom: 1px solid #fee2e2;' : 'background-color: #ffffff; border-bottom: 1px solid #e2e8f0;';

      html += `<tr style="${rowStyle}">
        <td style="white-space: nowrap;">${index + 1}</td>
        <td style="white-space: nowrap;">${formatDateTime(t.createdAt)}</td>
        <td style="white-space: nowrap;">${t.ownerName}</td>
        <td style="white-space: nowrap;">${t.reviewerName === "Not Applicable" ? "NA" : t.reviewerName || ""}</td>
        <td style="min-width: 400px; max-width: 750px; white-space: normal; word-wrap: break-word;">${t.taskName}</td>
        <td style="white-space: nowrap;">${t.entityName}</td>
        <td style="white-space: nowrap;">${t.taskType}</td>
        <td style="white-space: nowrap;">${t.departmentName}</td>
        <td style="white-space: nowrap;">${t.requestFrom}</td>
        <td style="white-space: nowrap;"><a href="mailto:${getEmailFromName(t.ownerName)}">${getEmailFromName(t.ownerName)}</a></td>
        <td style="${overdue ? 'color: red; font-weight: bold;' : ''} white-space: nowrap;">${formatDate(t.dueDate)}</td>
        <td style="white-space: nowrap;">${formatDate(t.completionDate)}</td>
        <td style="white-space: nowrap;">${t.taskStatus}</td>
        <td style="white-space: nowrap;"><a href="mailto:${getEmailFromName(t.reviewerName)}">${getEmailFromName(t.reviewerName)}</a></td>
        <td style="white-space: nowrap;">${t.reviewerName === "Not Applicable" ? "NA" : formatDate(t.reviewCompletionDate)}</td>
        <td style="white-space: nowrap;">${t.reviewerName === "Not Applicable" ? "Review Not Required" : t.reviewStatus}</td>
        <td style="white-space: nowrap;">${t.mailLink ? `<a href="${t.mailLink}">Link</a>` : ""}</td>
        <td style="max-width: 380px; white-space: normal; word-wrap: break-word;">${t.ownerComments || ""}</td>
        <td style="max-width: 380px; white-space: normal; word-wrap: break-word;">${t.reviewerComments || ""}</td>
      </tr>`;
    });
  }

  html += `</table></div>`;
  return html;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  let type = url.searchParams.get("type") || "all"; 
  const clientDateStr = url.searchParams.get("clientDate");
  const referenceDate = clientDateStr ? new Date(clientDateStr) : new Date();

  const authHeader = req.headers.get("authorization");
  const session = await getServerSession(authOptions);
  
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualToken = authHeader === "Bearer intellicar-cron-123";
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";
  
  if (process.env.NODE_ENV === "production" && !isVercelCron && !isManualToken && !isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Automation Logic
  if (isVercelCron) {
    try {
      const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
      if (settings) {
        const now = new Date();
        const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const currentHHmm = `${String(istDate.getUTCHours()).padStart(2, '0')}:${String(istDate.getUTCMinutes()).padStart(2, '0')}`;
        const currentDay = istDate.getUTCDay();
        const currentDate = istDate.getUTCDate();

        let shouldRemind = false;
        let shouldReport = false;
        let shouldLOReport = false;

        if (settings.reminderFrequency !== 'OFF') {
          const rTimes = settings.reminderTimes.split(',').map(t => t.trim());
          if (rTimes.includes(currentHHmm)) {
            if (settings.reminderFrequency === 'DAILY') shouldRemind = true;
            else if (settings.reminderFrequency === 'WEEKLY' && currentDay === 1) shouldRemind = true;
            else if (settings.reminderFrequency === 'MONTHLY' && currentDate === 1) shouldRemind = true;
          }
        }

        if (settings.managerReportFrequency !== 'OFF') {
          const mTimes = settings.managerReportTimes.split(',').map(t => t.trim());
          if (mTimes.includes(currentHHmm)) {
            if (settings.managerReportFrequency === 'DAILY') shouldReport = true;
            else if (settings.managerReportFrequency === 'WEEKLY' && currentDay === 1) shouldReport = true;
            else if (settings.managerReportFrequency === 'MONTHLY' && currentDate === 1) shouldReport = true;
          }
        }

        if ((settings as any).loReportFrequency !== 'OFF') {
          const loTimes = (settings as any).loReportTimes.split(',').map((t: string) => t.trim());
          if (loTimes.includes(currentHHmm)) {
             if ((settings as any).loReportFrequency === 'DAILY') shouldLOReport = true;
             else if ((settings as any).loReportFrequency === 'WEEKLY' && currentDay === 1) shouldLOReport = true;
             else if ((settings as any).loReportFrequency === 'MONTHLY' && currentDate === 1) shouldLOReport = true;
          }
        }

        if (!shouldRemind && !shouldReport && !shouldLOReport) {
          return NextResponse.json({ message: `Skipping. Current IST ${currentHHmm} does not match schedule.` });
        }

        if (shouldLOReport) type = "lo";
        else if (shouldRemind && shouldReport) type = "all";
        else if (shouldRemind) type = "users";
        else if (shouldReport) type = "manager";
      }
    } catch (e) {
      console.error("Settings check failed", e);
    }
  }

  try {
    if (type === "lo") {
      const allLOs = await prisma.learningOpportunity.findMany({
        orderBy: { createdAt: "desc" }
      });
      const stats = getLOStats(allLOs);
      
      // Calculate Entity-wise Breakdown for MTD
      const entityCounts: Record<string, number> = {};
      stats.mtdItems.forEach(lo => {
        entityCounts[lo.entity] = (entityCounts[lo.entity] || 0) + 1;
      });

      const managerEmail = "pavanreddy@intellicar.in";
      const excelBuffer = await generateLOExcelBuffer(allLOs);

      let loHtml = `
        <div style="background-color: #f4f7f9; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155;">
          <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background-color: #3b5998; padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Weekly Finance LO Report</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">
                Report Period: ${formatDate(stats.startOfMonth)} to ${formatDate(referenceDate)}
              </p>
            </div>

            <!-- Body -->
            <div style="padding: 40px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi Team,</p>
              <p style="font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
                Please find below the Learning Opportunity summary for the period <b>${formatDate(stats.startOfMonth)} to ${formatDate(referenceDate)}</b>. Detailed reports are attached.
              </p>

              <!-- Stats Boxes -->
              <div style="display: table; width: 100%; border-spacing: 15px 0; margin-left: -15px; margin-right: -15px; margin-bottom: 40px;">
                <div style="display: table-cell; width: 33.33%; background-color: #eff6ff; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #dbeafe;">
                  <div style="font-size: 12px; color: #2563eb; text-transform: uppercase; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">This Week</div>
                  <div style="font-size: 36px; font-weight: 700; color: #1e3a8a;">${stats.weekly}</div>
                </div>
                <div style="display: table-cell; width: 33.33%; background-color: #ecfdf5; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #d1fae5;">
                  <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">Month To Date</div>
                  <div style="font-size: 36px; font-weight: 700; color: #064e3b;">${stats.mtd}</div>
                </div>
                <div style="display: table-cell; width: 33.33%; background-color: #f5f3ff; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #ede9fe;">
                  <div style="font-size: 12px; color: #7c3aed; text-transform: uppercase; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">All Time</div>
                  <div style="font-size: 36px; font-weight: 700; color: #4c1d95;">${stats.allTime}</div>
                </div>
              </div>

              <!-- Entity Table -->
              <h3 style="font-size: 14px; color: #2563eb; margin-bottom: 15px;">Entity-wise Breakdown (MTD)</h3>
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #3b5998; color: #ffffff;">
                    <th style="padding: 12px 15px; text-align: left; font-size: 13px;">Entity</th>
                    <th style="padding: 12px 15px; text-align: right; font-size: 13px;">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(entityCounts).length > 0 ? Object.entries(entityCounts).map(([entity, count]) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 12px 15px; font-size: 13px;">${entity}</td>
                      <td style="padding: 12px 15px; text-align: right; font-size: 13px; font-weight: 600;">${count}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="2" style="padding: 20px; text-align: center; color: #64748b;">No data available for this period.</td>
                    </tr>
                  `}
                </tbody>
              </table>

              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                <p>Detailed reports attached. Current_Month_LO_Report.xlsx & Consolidated_LO_Report.xlsx</p>
                <p style="margin-top: 5px;">This is an automated weekly report. Regards, Finance Team.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: managerEmail,
        subject: `Weekly Finance LO Report - ${formatDate(referenceDate)}`,
        html: loHtml,
        attachments: [
          {
            filename: `Current_Month_LO_Report_${formatDate(referenceDate)}.xlsx`,
            content: excelBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ]
      });

      return NextResponse.json({ message: "LO Report sent successfully." });
    }

    const allTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" }
    });

    const pendingOwnerTasks = allTasks.filter(t => t.taskStatus !== "Completed");
    const ownerMap: Record<string, { email: string, tasks: typeof allTasks }> = {};

    pendingOwnerTasks.forEach(task => {
      const ownerName = task.ownerName;
      if (!ownerName) return;
      const email = getEmailFromName(ownerName);
      if (!email) return;
      if (!ownerMap[ownerName]) ownerMap[ownerName] = { email, tasks: [] };
      ownerMap[ownerName].tasks.push(task);
    });

    const pendingReviewTasks = allTasks.filter(t => t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner");
    const reviewerMap: Record<string, { email: string, tasks: typeof allTasks }> = {};

    pendingReviewTasks.forEach(task => {
      const reviewerName = task.reviewerName;
      if (reviewerName && reviewerName !== "Not Applicable") {
        const email = getEmailFromName(reviewerName);
        if (!email) return;
        if (!reviewerMap[reviewerName]) reviewerMap[reviewerName] = { email, tasks: [] };
        reviewerMap[reviewerName].tasks.push(task);
      }
    });

    if (type === "all" || type === "users") {
      for (const [ownerName, data] of Object.entries(ownerMap)) {
        if (data.tasks.length === 0) continue;
        const title = `${ownerName} - Pending Tasks`;
        const html = generateGridHtml(data.tasks, title, referenceDate);
        await sendEmail({ 
          to: data.email, 
          subject: `Pending Tasks Reminder - ${formatDate(referenceDate)} (${data.tasks.length} Pending)`, 
          html 
        });
      }

      for (const [reviewerName, data] of Object.entries(reviewerMap)) {
        if (data.tasks.length === 0) continue;
        const title = `${reviewerName} - Pending Reviews`;
        const html = generateGridHtml(data.tasks, title, referenceDate);
        await sendEmail({ 
          to: data.email, 
          subject: `Pending Reviews Reminder - ${formatDate(referenceDate)} (${data.tasks.length} Pending)`, 
          html 
        });
      }
    }

    if (type === "all" || type === "manager") {
      const employees = [
        "Pavan", "Saikath", "Sami", "Hanusha", "Sreenivas", 
        "Sharath", "Chandana", "Nikhat", "Venkat", "Sidharth Saneja"
      ];

      let summaryHtml = `<div style="font-family: 'Segoe UI', Arial, sans-serif; margin-bottom: 40px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">`;
      summaryHtml += `<h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-weight: 600; text-align: center;">Summary of Pending Tasks</h2>`;
      summaryHtml += `
        <table cellpadding="12" cellspacing="0" style="border-collapse: collapse; width: 80%; margin: 0 auto; background-color: #ffffff; font-size: 13px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tr style="background-color: #1e293b; color: #ffffff; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">
            <th>Name</th>
            <th>Pending Owner</th>
            <th>Overdue Owner</th>
            <th>Pending Reviewer</th>
          </tr>
      `;

      let hasAnyPending = false;
      employees.forEach(emp => {
        const empPendingOwner = pendingOwnerTasks.filter(t => t.ownerName === emp);
        const overdueCount = empPendingOwner.filter(t => isOverdue(t.dueDate, referenceDate)).length;
        const empPendingReview = pendingReviewTasks.filter(t => t.reviewerName === emp).length;

        if (empPendingOwner.length > 0 || empPendingReview > 0) {
          hasAnyPending = true;
          summaryHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0; color: #334155;">
              <td style="font-weight: 500;">${emp}</td>
              <td>${empPendingOwner.length}</td>
              <td style="${overdueCount > 0 ? 'background-color: #fef2f2; color: #ef4444; font-weight: bold;' : ''}">${overdueCount}</td>
              <td>${empPendingReview}</td>
            </tr>
          `;
        }
      });

      if (!hasAnyPending) {
        summaryHtml += `<tr><td colspan="4" style="padding: 16px;">No pending tasks for any candidate.</td></tr>`;
      }
      summaryHtml += `</table></div>`;

      const managerEmail = "pavanreddy@intellicar.in";
      const allConsolidatedTasks = allTasks.filter(t => t.taskStatus !== "Completed" || (t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner"));
      
      let consolidatedHtml = `
        <div style="background-color: #f1f5f9; padding: 30px 15px;">
          <div style="max-width: 1400px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://intellicar-finance-team-task-manager.vercel.app/logo.png" alt="Intellicar Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
              <h1 style="color: #2563eb; font-family: 'Segoe UI', Arial, sans-serif; margin: 0;">Intellicar Telematics</h1>
              <p style="color: #64748b; font-family: 'Segoe UI', Arial, sans-serif; margin-top: 5px;">Finance Task Management Report - ${formatDate(referenceDate)}</p>
            </div>
            ${summaryHtml}
            ${generateGridHtml(allConsolidatedTasks, "Consolidated Pending Tasks", referenceDate)}
          </div>
        </div>
      `;

      await sendEmail({ 
        to: managerEmail, 
        subject: `Daily Pending Tasks Report - ${formatDate(referenceDate)}`, 
        html: consolidatedHtml 
      });
    }

    return NextResponse.json({ message: `Emails sent successfully (type: ${type}).` }, { status: 200 });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ message: "Failed to send summaries", error: error.message }, { status: 500 });
  }
}

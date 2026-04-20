import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, getEmailFromName } from "@/lib/email";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

// Reusable HTML Table Generator mirroring the Google Sheet layout
function generateGridHtml(tasks: any[], title: string, referenceDate: Date) {
  let html = `<h2 align="center" style="font-family: sans-serif; color: #333;">${title}</h2>`;
  html += `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; text-align: center;">
      <tr style="background-color: #f4f4f4; font-weight: bold; color: #333;">
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
      const rowStyle = overdue ? 'background-color: #ffe6e6;' : ''; // Light red background for overdue

      html += `<tr style="${rowStyle}">
        <td style="white-space: nowrap;">${index + 1}</td>
        <td style="white-space: nowrap;">${formatDate(t.createdAt)}</td>
        <td style="white-space: nowrap;">${t.ownerName}</td>
        <td style="white-space: nowrap;">${t.reviewerName === "Not Applicable" ? "NA" : t.reviewerName || ""}</td>
        <td style="min-width: 150px;">${t.taskName}</td>
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

  html += `</table><br/><br/>`;
  return html;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "all"; // 'all', 'users', or 'manager'
  const clientDateStr = url.searchParams.get("clientDate");
  const referenceDate = clientDateStr ? new Date(clientDateStr) : new Date();

  const authHeader = req.headers.get("authorization");
  const session = await getServerSession(authOptions);
  
  // Allow if called by Vercel Cron (CRON_SECRET), frontend hardcoded token, or Admin session
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}` || authHeader === "Bearer intellicar-cron-123";
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";
  
  if (process.env.NODE_ENV === "production" && !isCron && !isAdmin) {
    return NextResponse.json({ message: "Unauthorized (Session: " + (session ? "Found" : "None") + ")" }, { status: 401 });
  }

  try {
    const allTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" }
    });

    // 1. Group tasks pending OWNER action
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

    // 2. Group tasks pending REVIEWER action
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
      // 3. Send emails to Owners
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

      // 4. Send emails to Reviewers
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
      // 5. Generate Manager Summary Matrix
      const employees = [
        "Pavan", "Saikath", "Sami", "Hanusha", "Sreenivas", 
        "Sharath", "Chandana", "Nikhat", "Venkat", "Sidharth Saneja"
      ];

      let summaryHtml = `<h2 align="center" style="font-family: sans-serif; color: #333;">Summary of Pending Tasks</h2>`;
      summaryHtml += `
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 60%; margin: 0 auto; font-family: Arial, sans-serif; font-size: 12px; text-align: center;">
          <tr style="background-color: #f4f4f4; font-weight: bold; color: #333;">
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
            <tr>
              <td>${emp}</td>
              <td>${empPendingOwner.length}</td>
              <td style="${overdueCount > 0 ? 'color: red; font-weight: bold;' : ''}">${overdueCount}</td>
              <td>${empPendingReview}</td>
            </tr>
          `;
        }
      });

      if (!hasAnyPending) {
        summaryHtml += `<tr><td colspan="4" style="padding: 16px;">No pending tasks for any candidate.</td></tr>`;
      }

      summaryHtml += `</table><br/><br/>`;

      // 6. Send Consolidated Email to Manager
      const managerEmail = "pavanreddy@intellicar.in";
      const allConsolidatedTasks = allTasks.filter(t => t.taskStatus !== "Completed" || (t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner"));
      
      let consolidatedHtml = summaryHtml;
      consolidatedHtml += generateGridHtml(allConsolidatedTasks, "Consolidated Pending Tasks", referenceDate);

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

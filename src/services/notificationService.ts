import { sendEmail, getEmailFromName } from '@/lib/email';
import { getBaseTemplate } from './emailTemplates';
import { getDb } from '@/lib/db';

// Types for different notification payloads
export type NotificationType = 
  | 'TASK_ASSIGNED' 
  | 'TASK_COMPLETED' 
  | 'TASK_PROCESSED'
  | 'TASK_REJECTED'
  | 'REQUEST_SUBMITTED'
  | 'REQUEST_REJECTED'
  | 'LO_CREATED'
  | 'LO_ACKNOWLEDGED';

/**
 * Resolves an email address from a name by checking the database first,
 * then falling back to the legacy hardcoded map.
 */
async function resolveEmail(name: string | null, providedEmail?: string | null): Promise<string | null> {
  if (providedEmail && providedEmail.includes('@')) return providedEmail;
  if (!name || name === "Not Applicable" || name === "Choose") return null;

  try {
    const sql = getDb();
    const users = await sql`SELECT email FROM "User" WHERE name = ${name} LIMIT 1`;
    if (users.length > 0) return users[0].email;
  } catch (error) {
    console.error(`[NotificationEngine] Database lookup failed for ${name}:`, error);
  }

  // Fallback to hardcoded map in taskUtils
  return getEmailFromName(name);
}

/**
 * The core Notification Service.
 * This is designed to be called asynchronously and silently.
 */
export async function triggerNotification(type: NotificationType, payload: any) {
  try {
    const emailData = await buildEmailData(type, payload);
    if (!emailData || !emailData.to) return;

    const html = getBaseTemplate({
      title: emailData.title,
      badgeText: emailData.badgeText,
      badgeType: emailData.badgeType as any,
      rows: emailData.rows,
      ctaLink: emailData.ctaLink,
      ctaText: 'View in Dashboard'
    });

    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: html,
    });

    console.log(`[NotificationEngine] Email sent: ${type} to ${emailData.to}`);
  } catch (error) {
    // Silent failure as per core constraints
    console.error(`[NotificationEngine] Failed to send ${type}:`, error);
  }
}

function formatDate(date: any) {
  if (!date) return 'No deadline';
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

async function buildEmailData(type: NotificationType, payload: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://v0-finpulse.vercel.app';

  switch (type) {
    case 'TASK_ASSIGNED':
      return {
        to: await resolveEmail(payload.ownerName, payload.ownerMailId),
        subject: `New Task Assigned: ${payload.taskName}`,
        title: 'A new task has been assigned to you',
        badgeText: 'New Assignment',
        badgeType: 'blue',
        rows: [
          { label: 'Task Name', value: payload.taskName },
          { label: 'Entity', value: payload.entityName },
          { label: 'Requested By', value: payload.reviewerName || payload.requestFrom },
          { label: 'Due Date', value: formatDate(payload.dueDate) }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'TASK_COMPLETED':
      return {
        to: await resolveEmail(payload.reviewerName, payload.reviewerEmail),
        subject: `Task Ready for Review: ${payload.taskName}`,
        title: 'A task has been completed and is ready for review',
        badgeText: 'Review Required',
        badgeType: 'blue',
        rows: [
          { label: 'Task Name', value: payload.taskName },
          { label: 'Completed By', value: payload.ownerName },
          { label: 'Owner Comments', value: payload.ownerComments }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'TASK_PROCESSED':
      return {
        to: payload.requesterEmail,
        subject: `Your Request has been Processed: ${payload.taskName}`,
        title: 'Your inter-departmental request has been fully processed',
        badgeText: 'Request Completed',
        badgeType: 'green',
        rows: [
          { label: 'Task Name', value: payload.taskName },
          { label: 'Resolution', value: payload.reviewerComments || 'Request completed successfully' },
          { label: 'Status', value: 'PROCESSED' }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'TASK_REJECTED':
      return {
        to: await resolveEmail(payload.ownerName, payload.ownerMailId),
        subject: `Task Returned: ${payload.taskName}`,
        title: 'A task has been returned for further action',
        badgeText: 'Action Required',
        badgeType: 'red',
        rows: [
          { label: 'Task Name', value: payload.taskName },
          { label: 'Reviewer', value: payload.reviewerName },
          { label: 'Review Remarks', value: payload.reviewerComments }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'REQUEST_SUBMITTED':
      return {
        to: payload.to || "pavanreddy@intellicar.in", 
        subject: `New Inter-Dept Request: ${payload.natureOfRequest}`,
        title: 'A new inter-departmental request has been submitted',
        badgeText: 'New Request',
        badgeType: 'blue',
        rows: [
          { label: 'What is Needed', value: payload.natureOfRequest },
          { label: 'Reason for Request', value: payload.reasonForRequest || "N/A" },
          { label: 'Request From', value: payload.requestFrom },
          { label: 'Requester Email', value: payload.requesterEmail },
          { label: 'Finance Function', value: payload.requestType }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'REQUEST_REJECTED':
      return {
        to: payload.requesterEmail,
        subject: `Request Update: ${payload.natureOfRequest}`,
        title: 'Your inter-departmental request could not be processed',
        badgeText: 'Action Required',
        badgeType: 'red',
        rows: [
          { label: 'What is Needed', value: payload.natureOfRequest },
          { label: 'Status', value: 'REJECTED' },
          { label: 'Remarks/Reason', value: payload.rejectReason || 'No reason provided' }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'LO_CREATED':
      return {
        to: await resolveEmail(payload.committedBy),
        subject: `New Learning Opportunity: ${payload.entity}`,
        title: 'A new learning finding has been recorded for you',
        badgeText: 'New Finding',
        badgeType: 'blue',
        rows: [
          { label: 'Entity', value: payload.entity },
          { label: 'Opportunity', value: payload.learningOpportunity },
          { label: 'Identified By', value: payload.identifiedBy },
          { label: 'Resolution Plan', value: payload.resolutionProvided }
        ],
        ctaLink: `${baseUrl}`
      };

    case 'LO_ACKNOWLEDGED':
      return {
        to: payload.createdByEmail || await resolveEmail(payload.identifiedBy),
        subject: `Learning Acknowledged: ${payload.entity}`,
        title: 'A learning finding has been acknowledged by the user',
        badgeText: 'Acknowledged',
        badgeType: 'green',
        rows: [
          { label: 'Opportunity', value: payload.learningOpportunity },
          { label: 'Acknowledged By', value: payload.committedBy },
          { label: 'Learner Remarks', value: payload.learnerComments }
        ],
        ctaLink: `${baseUrl}`
      };

    default:
      return null;
  }
}

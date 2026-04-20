import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, getEmailFromName } from "@/lib/email";

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;
    
    // Master Admin can see everything
    if (userEmail === "pavanreddy@intellicar.in" || userRole === "ADMIN") {
      const tasks = await prisma.task.findMany({
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(tasks, { status: 200 });
    }

    // Regular users only see tasks assigned to them or created by them
    // Fetch all and filter in memory since we use a custom email mapping
    const allTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" }
    });

    const filteredTasks = allTasks.filter(task => {
      const ownerEmail = getEmailFromName(task.ownerName);
      const reviewerEmail = getEmailFromName(task.reviewerName);
      // We can also check requestFrom if it is an email or maps to an email, but let's stick to owner/reviewer for now
      return ownerEmail === userEmail || reviewerEmail === userEmail;
    });

    return NextResponse.json(filteredTasks, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch tasks", error: error.message }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const {
      taskName,
      entityName,
      taskType,
      departmentName,
      requestFrom,
      ownerName,
      reviewerName,
      dueDate,
      mailLink,
    } = data;

    if (!taskName || !entityName || !taskType || !departmentName || !requestFrom || !ownerName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Default business logic
    const resolvedReviewer = reviewerName || "Not Applicable";
    const reviewStatus = resolvedReviewer === "Not Applicable" ? "Review Not Required" : "Task Pending From Owner";

    const newTask = await prisma.task.create({
      data: {
        taskName,
        entityName,
        taskType,
        departmentName,
        requestFrom,
        ownerName,
        reviewerName: resolvedReviewer,
        dueDate: dueDate ? new Date(dueDate) : null,
        mailLink: mailLink || null,
        taskStatus: "Pending",
        reviewStatus,
      }
    });

    const ownerEmail = getEmailFromName(ownerName);
    if (ownerEmail) {
      const emailHtml = `
        <h2>New Task Assigned: ${taskName}</h2>
        <p><strong>Entity:</strong> ${entityName}</p>
        <p><strong>Type:</strong> ${taskType}</p>
        <p><strong>Requester:</strong> ${requestFrom}</p>
        <p><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toDateString() : "No deadline"}</p>
        <p>Please log in to the Task Manager Dashboard to view or update the task.</p>
        ${mailLink ? `<p><a href="${mailLink}">View Linked Email</a></p>` : ""}
      `;
      // Don't wait for the email to send before returning the response
      sendEmail({ to: ownerEmail, subject: `New Task Assigned: ${taskName}`, html: emailHtml });
    }

    return NextResponse.json({ message: "Task created", task: newTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to create task", error: error.message }, { status: 500 });
  }
}

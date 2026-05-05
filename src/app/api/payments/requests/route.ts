import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail, getEmailFromName } from "@/lib/email";

// GET /api/payments/requests
export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "MY", "TEAM", "INTER"
    const userEmail = (session.user as any)?.email;
    const userDept = (session.user as any)?.department;
    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === "ADMIN";

    // --- Self-Healing Migration ---
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "PaymentRequest" (
          id SERIAL PRIMARY KEY,
          "requesterId" TEXT NOT NULL,
          "requesterName" TEXT NOT NULL,
          "requesterEmail" TEXT NOT NULL,
          department TEXT NOT NULL,
          "entityName" TEXT NOT NULL,
          "vendorName" TEXT NOT NULL,
          description TEXT NOT NULL,
          "paymentType" TEXT NOT NULL,
          frequency TEXT NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          "dueDate" DATE NOT NULL,
          "isNewVendor" BOOLEAN DEFAULT FALSE,
          "kycDocuments" JSONB,
          status TEXT DEFAULT 'PENDING_DEPT',
          "approvedBy" TEXT,
          "approvedByEmail" TEXT,
          "processedBy" TEXT,
          "processedByEmail" TEXT,
          "deptHeadComments" TEXT,
          "financeComments" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      await sql`ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "supportings" JSONB`;
      await sql`ALTER TABLE "PaymentOccurrence" ADD COLUMN IF NOT EXISTS "requestId" INTEGER`;
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "departmentHeadMatrix" TEXT DEFAULT '{}'`;
    } catch (err) {
      console.error("PaymentRequest migration error:", err);
    }

    const search = searchParams.get("search");
    const department = searchParams.get("department"); // Comma-separated
    const status = searchParams.get("status"); // Comma-separated
    const entity = searchParams.get("entity"); // Comma-separated
    const vendor = searchParams.get("vendor"); // Comma-separated
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let requests;
    let baseQuery = sql`
      SELECT 
        id, "requesterId", "requesterName", "requesterEmail", department, 
        "entityName", "vendorName", description, "paymentType", frequency, 
        amount, "dueDate", "isNewVendor", status, "approvedBy", "approvedByEmail", 
        "processedBy", "processedByEmail", "deptHeadComments", "financeComments", 
        "createdAt", "updatedAt"
      FROM "PaymentRequest"
    `;
    let conditions = [];

    // Base Type filtering
    if (type === "MY") {
      conditions.push(sql`"requesterEmail" = ${userEmail}`);
    } else if (type === "TEAM") {
      const settings = await sql`SELECT "departmentHeadMatrix" FROM "SystemSettings" LIMIT 1`;
      const matrix = JSON.parse(settings[0]?.departmentHeadMatrix || "{}");
      const deptsAsHead = Object.keys(matrix).filter(dept => 
        matrix[dept] && matrix[dept].includes(userEmail)
      );

      if (deptsAsHead.length === 0 && !isAdmin) {
        return NextResponse.json([]);
      }
      if (!isAdmin) {
        conditions.push(sql`department = ANY(${deptsAsHead})`);
      }
    } else if (type === "INTER") {
      if (userDept !== "Finance" && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      conditions.push(sql`status IN ('PENDING_FINANCE', 'APPROVED', 'REJECTED')`);
    }

    // Additional Filters
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(sql`("vendorName" ILIKE ${searchPattern} OR "entityName" ILIKE ${searchPattern} OR description ILIKE ${searchPattern})`);
    }
    
    if (department) {
      const depts = department.split(',').map(d => d.trim());
      conditions.push(sql`department = ANY(${depts})`);
    }
    
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      conditions.push(sql`status = ANY(${statuses})`);
    }

    if (entity) {
      const entities = entity.split(',').map(e => e.trim());
      conditions.push(sql`"entityName" = ANY(${entities})`);
    }

    if (vendor) {
      const vendors = vendor.split(',').map(v => v.trim());
      conditions.push(sql`"vendorName" = ANY(${vendors})`);
    }

    if (startDate) {
      conditions.push(sql`"dueDate" >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`"dueDate" <= ${endDate}`);
    }

    if (conditions.length > 0) {
      const whereClause = conditions.reduce((acc, curr, idx) => 
        idx === 0 ? sql`WHERE ${curr}` : sql`${acc} AND ${curr}`
      );
      requests = await sql`${baseQuery} ${whereClause} ORDER BY "createdAt" DESC`;
    } else {
      requests = await sql`${baseQuery} ORDER BY "createdAt" DESC`;
    }

    // Add Due Date Status calculations
    const now = new Date();
    now.setHours(0,0,0,0);
    const enrichedRequests = requests.map((r: any) => {
      const dueDate = new Date(r.dueDate);
      dueDate.setHours(0,0,0,0);
      let dateStatus = "UPCOMING";
      if (dueDate.getTime() === now.getTime()) dateStatus = "DUE TODAY";
      else if (dueDate.getTime() < now.getTime()) dateStatus = "OVERDUE";
      return { ...r, dateStatus };
    });

    return NextResponse.json(enrichedRequests);
  } catch (error: any) {
    console.error("Fetch payment requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payments/requests
export async function POST(req: NextRequest) {
  const sql = getDb();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { 
      id, action, // "SUBMIT", "APPROVE", "REJECT", "PROCESS"
      entityName, vendorName, description, paymentType, frequency, amount, dueDate, isNewVendor, kycDocuments,
      supportings, comments
    } = data;

    const userEmail = (session.user as any)?.email;
    const userName = (session.user as any)?.name;
    const userDept = (session.user as any)?.department;

    if (id && action) {
      const current = await sql`SELECT * FROM "PaymentRequest" WHERE id = ${id}`;
      if (current.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

      if (action === "APPROVE" || (action === "REJECT" && userDept !== "Finance")) {
        const settings = await sql`SELECT "departmentHeadMatrix" FROM "SystemSettings" LIMIT 1`;
        const matrix = JSON.parse(settings[0]?.departmentHeadMatrix || "{}");
        const heads = matrix[current[0].department] || [];
        if (!heads.includes(userEmail) && (session.user as any)?.role !== "ADMIN") {
          return NextResponse.json({ error: "Forbidden: Not a Department Head" }, { status: 403 });
        }
      }

      if (action === "APPROVE") {
        await sql`
          UPDATE "PaymentRequest"
          SET status = 'PENDING_FINANCE', "approvedBy" = ${userName}, "approvedByEmail" = ${userEmail}, "deptHeadComments" = ${comments}, "updatedAt" = NOW()
          WHERE id = ${id}
        `;
        
        // Email: Notify User that Dept Head approved
        await sendEmail({
          to: current[0].requesterEmail,
          subject: `Payment Request Approved by ${userName} - ${current[0].vendorName}`,
          html: `<p>Your payment request for <strong>${current[0].vendorName}</strong> has been approved by <strong>${userName}</strong> and is now with Finance for final review.</p>`
        });

      } else if (action === "REJECT") {
        const isFinance = userDept === "Finance";
        await sql`
          UPDATE "PaymentRequest"
          SET status = 'REJECTED', 
              ${isFinance ? sql`"financeComments"` : sql`"deptHeadComments"`} = ${comments},
              "updatedAt" = NOW()
          WHERE id = ${id}
        `;
        
        // Email: Notify User of rejection
        await sendEmail({
          to: current[0].requesterEmail,
          subject: `Payment Request Rejected - ${current[0].vendorName}`,
          html: `<p>Your payment request for <strong>${current[0].vendorName}</strong> has been rejected by <strong>${userName}</strong>.</p><p>Comments: ${comments || 'None'}</p>`
        });

      } else if (action === "PROCESS") {
        if (userDept !== "Finance" && (session.user as any)?.role !== "ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await sql`
          UPDATE "PaymentRequest"
          SET status = 'APPROVED', "processedBy" = ${userName}, "processedByEmail" = ${userEmail}, "financeComments" = ${comments}, "updatedAt" = NOW()
          WHERE id = ${id}
        `;

        // Create Payment Occurrence (Ad-hoc)
        let adHocTemplate = await sql`SELECT id FROM "PaymentTemplate" WHERE "paymentDescription" = 'AD-HOC REQUESTS' LIMIT 1`;
        if (adHocTemplate.length === 0) {
          adHocTemplate = await sql`
            INSERT INTO "PaymentTemplate" ("entityName", "paymentDescription", "vendorName", "frequency", "isStopped", "isActive")
            VALUES ('SYSTEM', 'AD-HOC REQUESTS', 'VARIOUS', 'Ad-hoc', TRUE, TRUE)
            RETURNING id
          `;
        }

        await sql`
          INSERT INTO "PaymentOccurrence" (
            "templateId", "dueDate", "amountToRelease", "isPaid", "isListed", "paidFromAccount", "requestId"
          )
          VALUES (
            ${adHocTemplate[0].id}, ${new Date(current[0].dueDate)}, ${current[0].amount}, FALSE, TRUE, 'PENDING-FINANCE', ${id}
          )
        `;

        // Email: Notify User that Finance approved (Processing)
        await sendEmail({
          to: current[0].requesterEmail,
          subject: `Payment Request Processed by Finance - ${current[0].vendorName}`,
          html: `<p>Your payment request for <strong>${current[0].vendorName}</strong> has been approved by Finance and added to the payment list.</p>`
        });
      }
      return NextResponse.json({ success: true });
    } else {
      // Create New Request
      const result = await sql`
        INSERT INTO "PaymentRequest" (
          "requesterId", "requesterName", "requesterEmail", department, "entityName", "vendorName",
          description, "paymentType", frequency, amount, "dueDate", "isNewVendor", "kycDocuments", "supportings", status
        )
        VALUES (
          ${(session.user as any)?.id || 'unknown'}, ${userName}, ${userEmail}, ${userDept}, ${entityName}, ${vendorName},
          ${description}, ${paymentType}, ${frequency}, ${amount}, ${new Date(dueDate)}, ${isNewVendor}, 
          ${JSON.stringify(kycDocuments)}, ${JSON.stringify(supportings)}, 'PENDING_DEPT'
        )
        RETURNING *
      `;
      const newReq = result[0];

      // Email: Notify User & Dept Head
      const settings = await sql`SELECT "departmentHeadMatrix" FROM "SystemSettings" LIMIT 1`;
      const matrix = JSON.parse(settings[0]?.departmentHeadMatrix || "{}");
      const deptHeads = matrix[userDept] || [];

      // To Requester
      await sendEmail({
        to: userEmail,
        subject: `Payment Request Submitted - ${vendorName}`,
        html: `<p>Hi ${userName},</p><p>Your payment request for <strong>${vendorName}</strong> has been submitted and is pending Department Head approval.</p>`
      });

      // To Dept Heads
      for (const headEmail of deptHeads) {
        await sendEmail({
          to: headEmail,
          subject: `New Payment Request for Approval - ${userName} (${vendorName})`,
          html: `<p>A new payment request has been submitted by <strong>${userName}</strong> from your department for <strong>${vendorName}</strong>.</p><p>Amount: ₹${Number(amount).toLocaleString()}</p><p>Please review it in the Finance Dashboard.</p>`
        });
      }

      return NextResponse.json(newReq, { status: 201 });
    }
  } catch (error: any) {
    console.error("Save payment request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

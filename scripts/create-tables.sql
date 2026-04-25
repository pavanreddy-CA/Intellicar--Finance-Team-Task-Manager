-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "department" TEXT DEFAULT 'Finance',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isAllocator" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Task
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "taskName" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "requestFrom" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "reviewerName" TEXT DEFAULT 'Not Applicable',
    "dueDate" TIMESTAMP(3),
    "mailLink" TEXT,
    "ownerMailId" TEXT,
    "reviewerEmail" TEXT,
    "taskStatus" TEXT NOT NULL DEFAULT 'Pending',
    "reviewStatus" TEXT NOT NULL DEFAULT 'Task Pending From Owner',
    "completionDate" TIMESTAMP(3),
    "reviewCompletionDate" TIMESTAMP(3),
    "ownerComments" TEXT,
    "reviewerComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editRequested" BOOLEAN NOT NULL DEFAULT false,
    "editRequestBy" TEXT,
    "editRequestReason" TEXT,
    "deleteRequested" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequestReason" TEXT,
    "linkedRequestId" INTEGER,
    "requestStatus" TEXT DEFAULT 'Pending',

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable LearningOpportunity
CREATE TABLE "LearningOpportunity" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "dateOfIdentification" TIMESTAMP(3) NOT NULL,
    "learningOpportunity" TEXT NOT NULL,
    "identifiedBy" TEXT NOT NULL,
    "committedBy" TEXT NOT NULL,
    "resolutionProvided" TEXT NOT NULL,
    "modeOfCommunication" TEXT NOT NULL,
    "emailSub" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editRequested" BOOLEAN NOT NULL DEFAULT false,
    "editApproved" BOOLEAN NOT NULL DEFAULT false,
    "editRequestReason" TEXT,
    "deleteRequested" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequestReason" TEXT,
    "createdByEmail" TEXT,

    CONSTRAINT "LearningOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExternalRequest
CREATE TABLE "ExternalRequest" (
    "id" SERIAL NOT NULL,
    "requestFrom" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "natureOfRequest" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "originalRequestType" TEXT,
    "transferStatus" TEXT DEFAULT 'O',
    "status" TEXT NOT NULL DEFAULT 'Under Process',
    "assignedAllocatorEmail" TEXT,
    "convertedTaskId" INTEGER,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable SystemSettings
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "reminderFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "reminderTimes" TEXT NOT NULL DEFAULT '09:00,18:00',
    "managerReportFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "managerReportTimes" TEXT NOT NULL DEFAULT '10:00',
    "loReportFrequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "loReportTimes" TEXT NOT NULL DEFAULT '10:00',
    "lastReminderSentAt" TIMESTAMP(3),
    "lastManagerReportSentAt" TIMESTAMP(3),
    "lastLoReportSentAt" TIMESTAMP(3),
    "managerEmail" TEXT NOT NULL DEFAULT 'pavanreddy@intellicar.in',
    "loReportEmail" TEXT NOT NULL DEFAULT 'pavanreddy@intellicar.in',
    "masterDepartments" TEXT NOT NULL DEFAULT 'Finance,HR,IT,Operations,Sales,Marketing,Admin',
    "masterEntities" TEXT NOT NULL DEFAULT 'Intellicar-BLR,Intellicar-DEL,Intellicar-MUM,ITPL-Bangalore',
    "masterTaskTypes" TEXT NOT NULL DEFAULT 'Daily,Weekly,Monthly,Quarterly,Yearly,Statutory,Internal',
    "masterCommunicationModes" TEXT NOT NULL DEFAULT 'Email,Verbal Discussion,Hangouts,Whatsapp-IC Group',
    "masterRequestTypes" TEXT NOT NULL DEFAULT 'Accounts Receivable,Accounts Payable,General & Administration,Payroll',
    "masterRequestStatuses" TEXT NOT NULL DEFAULT 'Under Process,Pending for Review,Processed',
    "moduleAccessMatrix" TEXT NOT NULL DEFAULT '{}',
    "allocationMatrix" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Insert default SystemSettings
INSERT INTO "SystemSettings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;

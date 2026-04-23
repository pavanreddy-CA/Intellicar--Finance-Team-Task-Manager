const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const taskTypes = [
    "Accounts Payable", "MIS", "Inventory", "Banking & Treasury", 
    "Customer Reconciliations", "Vendor Reconciliation", "Reporting", 
    "Financial Audit", "Tax Audit", "Other Audits", "Assesments & Notices", 
    "Month Closure", "Corporate Taxation", "GST", "Employee Laws", 
    "Due Diligence", "Presentations & Trainings", "Other Reconciallitions", 
    "MCA Filings", "Miscellaneous Activities", "Month End Billing", 
    "Credit Cards & Debt", "Customizations / Automations"
  ].join(',');

  const departments = [
    "SW - Engineering", "Manufacturing and Supply Chain", 
    "Field Operations Technicians", "HW - Engineering", "Operations", 
    "CSM & Sales", "Finance", "HR and Admin", "External People"
  ].join(',');

  const communicationModes = [
    "Email", "Verbal Discussion", "Hangouts", "Whatsapp-IC Group"
  ].join(',');

  const settings = await prisma.systemSettings.findFirst();

  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        masterTaskTypes: taskTypes,
        masterDepartments: departments,
        masterCommunicationModes: communicationModes
      }
    });
    console.log("Master data updated successfully in database.");
  } else {
    await prisma.systemSettings.create({
      data: {
        reminderFrequency: 'DAILY',
        reminderTimes: '09:00,18:00',
        managerReportFrequency: 'DAILY',
        managerReportTimes: '10:00',
        loReportFrequency: 'WEEKLY',
        loReportTimes: '10:00',
        masterTaskTypes: taskTypes,
        masterDepartments: departments,
        masterCommunicationModes: communicationModes,
        masterEntities: 'Intellicar-BLR,Intellicar-MUM,Intellicar-DEL'
      }
    });
    console.log("System settings created with new master data.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

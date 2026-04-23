-- Migration: Add master data fields to SystemSettings table
-- This allows admin to manage dropdown options from the UI

ALTER TABLE "SystemSettings" 
ADD COLUMN IF NOT EXISTS "masterEntities" TEXT DEFAULT 'Intellicar-BLR,Intellicar-Delhi,Fabric IoT-BLR,Ratch-AI,Consolidation';

ALTER TABLE "SystemSettings" 
ADD COLUMN IF NOT EXISTS "masterTaskTypes" TEXT DEFAULT 'Accounts Receivable,Accounts Payable,MIS,Inventory,Banking & Treasury,Customer Reconciliations,Vendor Reconciliation,Reporting,Financial Audit,Tax Audit,Other Audits,Assements & Notices,Month Closure,Corporate Taxation,GST,Employee Laws,Due Diligence,Presentations & Trainings,Other Reconcillitions,MCA Filings,Miscellaneous Activities';

ALTER TABLE "SystemSettings" 
ADD COLUMN IF NOT EXISTS "masterDepartments" TEXT DEFAULT 'SW - Engineering,Manufacturing and Supply Chain,Field Operations Technicians,HW - Engineering,Operations,CSM & Sales,Finance,HR and Admin,External People';

ALTER TABLE "SystemSettings" 
ADD COLUMN IF NOT EXISTS "masterTeamMembers" TEXT DEFAULT 'Venkat,Saikath,Nikhat,Sami,Pavan,Sharath,Sreenivas,Hanusha,Chandana,Sidharth Saneja';

ALTER TABLE "SystemSettings" 
ADD COLUMN IF NOT EXISTS "masterCommunicationModes" TEXT DEFAULT 'Email,Verbal Discussion,Hangouts,Whatsapp IC Group';

-- Update existing singleton record with default values if columns are null
UPDATE "SystemSettings" 
SET 
  "masterEntities" = COALESCE("masterEntities", 'Intellicar-BLR,Intellicar-Delhi,Fabric IoT-BLR,Ratch-AI,Consolidation'),
  "masterTaskTypes" = COALESCE("masterTaskTypes", 'Accounts Receivable,Accounts Payable,MIS,Inventory,Banking & Treasury,Customer Reconciliations,Vendor Reconciliation,Reporting,Financial Audit,Tax Audit,Other Audits,Assements & Notices,Month Closure,Corporate Taxation,GST,Employee Laws,Due Diligence,Presentations & Trainings,Other Reconcillitions,MCA Filings,Miscellaneous Activities'),
  "masterDepartments" = COALESCE("masterDepartments", 'SW - Engineering,Manufacturing and Supply Chain,Field Operations Technicians,HW - Engineering,Operations,CSM & Sales,Finance,HR and Admin,External People'),
  "masterTeamMembers" = COALESCE("masterTeamMembers", 'Venkat,Saikath,Nikhat,Sami,Pavan,Sharath,Sreenivas,Hanusha,Chandana,Sidharth Saneja'),
  "masterCommunicationModes" = COALESCE("masterCommunicationModes", 'Email,Verbal Discussion,Hangouts,Whatsapp IC Group')
WHERE id = 'singleton';

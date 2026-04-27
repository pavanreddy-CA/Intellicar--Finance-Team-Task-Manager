  const downloadBulkTemplate = async (type: 'tasks' | 'lo' | 'recurring' | 'payments') => {
    const workbook = new ExcelJS.Workbook();
    const sheetName = type === 'tasks' ? 'Tasks' : type === 'lo' ? 'LOs' : type === 'recurring' ? 'RecurringTemplates' : 'PaymentsMaster';
    const worksheet = workbook.addWorksheet(sheetName);
    
    if (type === 'tasks') {
      worksheet.columns = [
        { header: 'Task Name', key: 'taskName', width: 25 },
        { header: 'Entity', key: 'entityName', width: 20 },
        { header: 'Type', key: 'taskType', width: 15 },
        { header: 'Dept', key: 'departmentName', width: 15 },
        { header: 'Requester', key: 'requestFrom', width: 20 },
        { header: 'Owner', key: 'ownerName', width: 20 },
        { header: 'Reviewer', key: 'reviewerName', width: 20 },
        { header: 'Due Date (YYYY-MM-DD)', key: 'dueDate', width: 25 },
      ];
      worksheet.addRow(['Sample Task', 'Sample Entity', 'Daily', 'Finance', 'Manager', 'Owner Name', 'Reviewer Name', '2026-12-31']);
    } else if (type === 'lo') {
      worksheet.columns = [
        { header: 'Entity', key: 'entity', width: 20 },
        { header: 'Date (YYYY-MM-DD)', key: 'dateOfIdentification', width: 25 },
        { header: 'LO Description', key: 'learningOpportunity', width: 40 },
        { header: 'Identified By', key: 'identifiedBy', width: 20 },
        { header: 'Committed By', key: 'committedBy', width: 20 },
        { header: 'Resolution', key: 'resolutionProvided', width: 40 },
      ];
      worksheet.addRow(['Sample Entity', '2026-04-21', 'Sample LO description...', 'Name A', 'Name B', 'Done']);
    } else if (type === 'recurring') {
      worksheet.columns = [
        { header: 'Task Name Pattern', key: 'taskNamePattern', width: 30 },
        { header: 'Entity Name', key: 'entityName', width: 20 },
        { header: 'Task Type', key: 'taskType', width: 15 },
        { header: 'Department', key: 'departmentName', width: 15 },
        { header: 'Finance Function', key: 'financeFunction', width: 20 },
        { header: 'Frequency (M/Q/Y/W/D/BW/H/2Y/Ad)', key: 'frequency', width: 30 },
        { header: 'Day Offset (Date/DayIdx)', key: 'dayOffset', width: 25 },
        { header: 'Month Offset', key: 'monthOffset', width: 15 },
        { header: 'Default Owner', key: 'defaultOwner', width: 20 },
        { header: 'Default Reviewer', key: 'defaultReviewer', width: 20 },
        { header: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 25 },
        { header: 'End Date (YYYY-MM-DD)', key: 'endDate', width: 25 },
        { header: 'Is Active (TRUE/FALSE)', key: 'isActive', width: 20 },
        { header: 'Freq Label', key: 'freqLabel', width: 20 },
      ];
      worksheet.addRow([
        'Sample Recurring Task - [Month] [Year]', 
        'Entity Name', 
        'External', 
        'Finance', 
        'Direct Tax', 
        'M', 
        '10', 
        '0', 
        'Owner Email/Name', 
        'Reviewer Email/Name', 
        '2026-04-01', 
        '', 
        'TRUE', 
        'Monthly'
      ]);
    } else if (type === 'payments') {
      worksheet.columns = [
        { header: 'Entity Name', key: 'entityName', width: 25 },
        { header: 'Description', key: 'paymentDescription', width: 30 },
        { header: 'Vendor Name', key: 'vendorName', width: 25 },
        { header: 'Payment Type', key: 'paymentType', width: 20 },
        { header: 'Department', key: 'departmentName', width: 20 },
        { header: 'Finance Function', key: 'financeFunction', width: 20 },
        { header: 'Frequency (M/Q/Y/W/BW/H/D)', key: 'frequency', width: 25 },
        { header: 'Due Day (1-31)', key: 'dueDay', width: 15 },
        { header: 'Weekly Day (Monday...)', key: 'weeklyDay', width: 20 },
        { header: 'Vendor Email', key: 'vendorEmail', width: 25 },
        { header: 'Prod Email', key: 'prodEmail', width: 25 },
        { header: 'Owner', key: 'defaultOwner', width: 20 },
        { header: 'Reviewer', key: 'defaultReviewer', width: 20 },
        { header: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 25 },
        { header: 'End Date (YYYY-MM-DD)', key: 'endDate', width: 25 },
        { header: 'Gen Window (Days)', key: 'leadTime', width: 20 },
      ];
      worksheet.addRow([
        'Intellicar-BLR', 'Office Rent', 'Landlord Name', 'Rent', 'Finance', 'Payroll', 'M', '5', '', 'vendor@example.com', 'production@intellicar.in', 'Pavan Reddy', '', '2026-04-01', '', '7'
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${type}_import_template.xlsx`);
  };

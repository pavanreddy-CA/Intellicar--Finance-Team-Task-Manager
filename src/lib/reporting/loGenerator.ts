import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { BRAND_COLORS, BRAND_TEXT } from './reportAssets';

/**
 * Professional LO Excel Generator
 */
export async function generateProfessionalLOExcel(data: {
  los: any[];
  stats: any;
  userSummary: any[];
  entitySummary: any[];
  filters: any;
  generatedBy: string;
}, mode: 'download' | 'buffer' = 'download') {
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('LO Summary');
  
  summarySheet.addRow([BRAND_TEXT.PRODUCT_NAME.toUpperCase() + ' - LO ANALYTICS']);
  summarySheet.addRow([BRAND_TEXT.CORPORATE_NAME]);
  summarySheet.addRow([]);
  
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.addRow(['Total Findings', data.stats.total]);
  summarySheet.addRow(['Acknowledged', data.stats.ack]);
  summarySheet.addRow(['Pending Review', data.stats.pending]);
  
  const logSheet = workbook.addWorksheet('Detailed Findings');
  logSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Entity', key: 'entity', width: 20 },
    { header: 'Finding', key: 'finding', width: 50 },
    { header: 'Identified By', key: 'by', width: 20 },
    { header: 'Status', key: 'status', width: 15 }
  ];
  data.los.forEach(lo => logSheet.addRow({
    date: new Date(lo.dateOfIdentification).toLocaleDateString(),
    entity: lo.entity,
    finding: lo.learningOpportunity,
    by: lo.identifiedBy,
    status: lo.isAcknowledged ? 'Acknowledged' : 'Pending'
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  if (mode === 'download') {
    saveAs(new Blob([buffer]), `LO_Analytics_Report_${new Date().getTime()}.xlsx`);
  }
  return buffer;
}

/**
 * Professional LO PDF Generator
 */
export async function generateProfessionalLOPDF(data: {
  stats: any;
  userSummary: any[];
  entitySummary: any[];
  filters: any;
  generatedBy: string;
}, mode: 'download' | 'buffer' = 'download') {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(BRAND_COLORS.INTELLICAR_BLUE);
  doc.text('Learning Opportunity Analytics', 14, 20);
  
  autoTable(doc, {
    startY: 30,
    head: [['Metric', 'Count']],
    body: [['Total Findings', data.stats.total], ['Acknowledged', data.stats.ack], ['Pending Review', data.stats.pending]],
    headStyles: { fillColor: BRAND_COLORS.INTELLICAR_BLUE }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['User', 'Found', 'Resolved']],
    body: data.userSummary.map(u => [u.name, u.reported, u.resolved]),
    headStyles: { fillColor: BRAND_COLORS.SUCCESS }
  });

  if (mode === 'download') {
    doc.save(`LO_Analytics_Report_${new Date().getTime()}.pdf`);
  }
  return doc.output('arraybuffer');
}

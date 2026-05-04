"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Calendar, Filter, PieChart as PieIcon, 
  BarChart3, TrendingUp, Info, Table as TableIcon, 
  ArrowUpRight, ArrowDownRight, Wallet, Activity,
  ChevronDown, X, Trash2, CheckCircle2, AlertCircle,
  Zap, ArrowRight, Download, FileSpreadsheet, FileText, Mail, Share2,
  Building2, Layers, ArrowUp, ArrowDown
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import MultiSelectFilter from "./MultiSelectFilter";

interface ManualEntry {
  id: number;
  entity_name: string;
  department_name?: string;
  payment_type: string;
  frequency?: string;
  amount: number;
  status: string;
  transaction_count: number;
  payment_date: string;
}

interface AnalyticsProps {
  user: any;
  theme: string;
  t: any;
  settings: any;
  trackerOccurrences: any[];
  showNotification: (msg: string) => void;
  showConfirm: (msg: string, onConfirm: () => void) => void;
}

export default function PaymentsAnalytics({ 
  user, theme, t, settings, trackerOccurrences, showNotification, showConfirm 
}: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'TABLE' | 'CHARTS'>('TABLE');
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Export/Share UI State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Tag-style Email Inputs
  const [recipientTags, setRecipientTags] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [ccTags, setCcTags] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  
  const [shareConfig, setShareConfig] = useState({
    format: 'BOTH' as 'PDF' | 'EXCEL' | 'BOTH',
    subject: "" // Will be set dynamically
  });
  const [isSharing, setIsSharing] = useState(false);

  // Helper for DD-MM-YYYY display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  };

  useEffect(() => {
    if (settings?.paymentReportEmail) {
      setRecipientTags(settings.paymentReportEmail.split(',').map((e: string) => e.trim()).filter(Boolean));
    }
  }, [settings]);

  // Default Dates
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getInitialDates();

  const [tableFilters, setTableFilters] = useState({
    fromDate: firstDay, 
    toDate: lastDay, 
    entity: [] as string[], 
    department: [] as string[], 
    type: [] as string[], 
    status: [] as string[], 
    search: '', 
    bank: [] as string[]
  });

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'payment_date', direction: 'desc' });

  const [chartFilters, setChartFilters] = useState({
    fromDate: firstDay, 
    toDate: lastDay, 
    entity: [] as string[], 
    department: [] as string[], 
    type: [] as string[], 
    status: [] as string[], 
    bank: [] as string[]
  });

  const [newEntry, setNewEntry] = useState({
    entity_name: "", department_name: "", payment_type: "", frequency: "M", amount: "", status: "Paid on due date", transaction_count: "1", payment_date: new Date().toISOString().split('T')[0]
  });

  const [forecastFilters, setForecastFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0).toISOString().split('T')[0],
    department: [] as string[],
    type: [] as string[]
  });

  useEffect(() => { fetchManualEntries(); }, []);

  const fetchManualEntries = async () => {
    try {
      const res = await fetch('/api/payments/analytics/manual');
      if (res.ok) { setManualEntries(await res.json()); }
    } catch (error) { console.error("Fetch error:", error); } finally { setLoading(false); }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/analytics/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ...newEntry, 
            amount: parseFloat(newEntry.amount), 
            transactionCount: parseInt(newEntry.transaction_count),
            department_name: newEntry.department_name || 'N/A'
        })
      });
      if (res.ok) {
        showNotification("Entry added!");
        setShowAddEntry(false);
        fetchManualEntries();
        setNewEntry({ ...newEntry, amount: "", transaction_count: "1", entity_name: "", payment_type: "", department_name: "" });
      }
    } catch (error) { showNotification("Failed to add entry."); } finally { setIsSubmitting(false); }
  };

  const handleDeleteEntry = (id: number) => {
    showConfirm("Are you sure you want to delete this entry?", async () => {
      try {
        const res = await fetch(`/api/payments/analytics/manual/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showNotification("Entry deleted.");
          fetchManualEntries();
        }
      } catch (error) {
        showNotification("Delete failed.");
      }
    });
  };

  const combinedData = useMemo(() => {
    const trackerData = trackerOccurrences
      .filter(o => o.isPaid)
      .map(o => {
        let status = "";
        const due = new Date(o.dueDate); 
        const actual = new Date(o.actualDate);
        due.setHours(0,0,0,0); 
        actual.setHours(0,0,0,0);
        
        if (actual.getTime() < due.getTime()) status = "Paid Before due date";
        else if (actual.getTime() === due.getTime()) status = "Paid on due date";
        else status = "Paid After due date";

      return {
        id: `tracker-${o.id}`, 
        entity_name: o.entityName, 
        department_name: o.departmentName || 'N/A',
        payment_type: o.paymentType, 
        frequency: o.frequency, 
        amount: Number(o.amountPaid),
        status,
        transaction_count: 1, 
        payment_date: o.actualDate ? new Date(o.actualDate).toISOString().split('T')[0] : new Date(o.dueDate).toISOString().split('T')[0], 
        isTracker: true,
        isPaid: true,
        paidFromAccount: o.paidFromAccount || 'Not Specified'
      };
    })
    .filter(d => ["Paid Before due date", "Paid on due date", "Paid After due date"].includes(d.status));

    const manual = manualEntries.map(e => ({ ...e, id: `manual-${e.id}`, amount: Number(e.amount), isTracker: false, isPaid: true }));
    return [...trackerData, ...manual];
  }, [trackerOccurrences, manualEntries]);

  const filteredTableData = useMemo(() => {
    const filtered = combinedData.filter(d => {
      const dateInRange = d.payment_date >= tableFilters.fromDate && d.payment_date <= tableFilters.toDate;
      const entityMatch = tableFilters.entity.length === 0 || tableFilters.entity.includes(d.entity_name);
      const deptMatch = tableFilters.department.length === 0 || tableFilters.department.includes(d.department_name || 'N/A');
      const typeMatch = tableFilters.type.length === 0 || tableFilters.type.includes(d.payment_type);
      const statusMatch = tableFilters.status.length === 0 || tableFilters.status.includes(d.status);
      const bankMatch = tableFilters.bank.length === 0 || (d as any).paidFromAccount && tableFilters.bank.includes((d as any).paidFromAccount);
      const searchMatch = !tableFilters.search || d.entity_name.toLowerCase().includes(tableFilters.search.toLowerCase());
      return dateInRange && entityMatch && deptMatch && typeMatch && statusMatch && bankMatch && searchMatch;
    });

    return filtered.sort((a: any, b: any) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'payment_date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [combinedData, tableFilters, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig.key !== colKey) return <ChevronDown size={14} style={{ opacity: 0.3, marginLeft: '4px' }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} style={{ marginLeft: '4px' }} /> : <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };


  const filteredChartData = useMemo(() => {
    return combinedData.filter(d => {
      const dateInRange = d.payment_date >= chartFilters.fromDate && d.payment_date <= chartFilters.toDate;
      const entityMatch = chartFilters.entity.length === 0 || chartFilters.entity.includes(d.entity_name);
      const deptMatch = chartFilters.department.length === 0 || chartFilters.department.includes(d.department_name || 'N/A');
      const typeMatch = chartFilters.type.length === 0 || chartFilters.type.includes(d.payment_type);
      const statusMatch = chartFilters.status.length === 0 || chartFilters.status.includes(d.status);
      const bankMatch = chartFilters.bank.length === 0 || (d as any).paidFromAccount && chartFilters.bank.includes((d as any).paidFromAccount);
      return dateInRange && entityMatch && deptMatch && typeMatch && statusMatch && bankMatch;
    });
  }, [combinedData, chartFilters]);

  const stats = useMemo(() => {
    // Only consider PAID records for these specific charts
    const paidRecords = filteredChartData.filter(d => d.isPaid);
    
    const totalAmount = paidRecords.reduce((sum, d) => sum + Number(d.amount), 0);
    const totalCount = paidRecords.reduce((sum, d) => sum + d.transaction_count, 0);
    
    // Health Index: (Paid On Time Volume / Total Paid Volume)
    const onTimeAmount = paidRecords.filter(d => d.status === "Paid On Time" || d.status === "Paid Before due date" || d.status === "Paid on due date").reduce((sum, d) => sum + Number(d.amount), 0);
    const healthScore = totalAmount > 0 ? Math.round((onTimeAmount / totalAmount) * 100) : 0;
    
    // Pie Data based on AMOUNT for financial accuracy
    const statusMap: Record<string, number> = {};
    paidRecords.forEach(d => { statusMap[d.status] = (statusMap[d.status] || 0) + Number(d.amount); });
    const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const typeMap: Record<string, number> = {};
    paidRecords.forEach(d => { typeMap[d.payment_type] = (typeMap[d.payment_type] || 0) + Number(d.amount); });
    const typePieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    const deptMap: Record<string, number> = {};
    paidRecords.forEach(d => { deptMap[d.department_name || 'N/A'] = (deptMap[d.department_name || 'N/A'] || 0) + Number(d.amount); });
    const deptPieData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    const entityMap: Record<string, number> = {};
    paidRecords.forEach(d => { entityMap[d.entity_name] = (entityMap[d.entity_name] || 0) + Number(d.amount); });
    const barData = Object.entries(entityMap).map(([name, amount]) => ({ name, amount })).sort((a,b) => b.amount - a.amount).slice(0, 8);

    const trendMap: Record<string, number> = {};
    paidRecords.forEach(d => { const key = d.payment_date.substring(0, 7); trendMap[key] = (trendMap[key] || 0) + Number(d.amount); });
    const trendData = Object.entries(trendMap).map(([date, amount]) => ({ 
      date: new Date(date + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), amount 
    })).sort((a,b) => a.date.localeCompare(b.date));
    
    // Bank wise Outflow
    const bankMap: Record<string, number> = {};
    paidRecords.forEach(d => {
      if ((d as any).paidFromAccount) {
        bankMap[(d as any).paidFromAccount] = (bankMap[(d as any).paidFromAccount] || 0) + Number(d.amount);
      } else {
        bankMap['Not Specified'] = (bankMap['Not Specified'] || 0) + Number(d.amount);
      }
    });
    const bankData = Object.entries(bankMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return { totalAmount, totalCount, healthScore, pieData, typePieData, deptPieData, barData, trendData, bankData };
  }, [filteredChartData]);

  const budgetVsActualData = useMemo(() => {
    // Group by month
    const months: Record<string, { month: string; budget: number; actual: number }> = {};
    
    // Only include records that match filters
    filteredChartData.forEach(d => {
      const monthKey = d.payment_date.substring(0, 7);
      if (!months[monthKey]) {
        months[monthKey] = { 
          month: new Date(monthKey + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), 
          budget: 0, 
          actual: 0 
        };
      }
      
      // If it's a tracker item, we might have amountToRelease
      if (d.isTracker) {
        const original = trackerOccurrences.find(o => `tracker-${o.id}` === d.id);
        if (original) {
          months[monthKey].budget += Number(original.amountToRelease);
        }
      } else {
        // Manual entries: consider budget = actual for now if no separate budget field
        months[monthKey].budget += Number(d.amount);
      }
      months[monthKey].actual += Number(d.amount);
    });

    return Object.values(months).sort((a, b) => {
      const dateA = new Date(a.month + '-01');
      const dateB = new Date(b.month + '-01');
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredChartData, trackerOccurrences]);

  const forecastData = useMemo(() => {
    const futureOccs = trackerOccurrences.filter(o => !o.isPaid);
    
    const filtered = futureOccs.filter(o => {
      const occDate = o.dueDate.split('T')[0];
      const dateInRange = occDate >= forecastFilters.fromDate && occDate <= forecastFilters.toDate;
      const deptMatch = forecastFilters.department.length === 0 || forecastFilters.department.includes(o.departmentName || 'N/A');
      const typeMatch = forecastFilters.type.length === 0 || forecastFilters.type.includes(o.paymentType);
      return dateInRange && deptMatch && typeMatch;
    });

    const totalAmount = filtered.reduce((sum, o) => sum + Number(o.amountToRelease), 0);
    const totalCount = filtered.length;

    const deptMap: Record<string, number> = {};
    filtered.forEach(o => { 
      const d = o.departmentName || 'N/A';
      deptMap[d] = (deptMap[d] || 0) + Number(o.amountToRelease); 
    });
    const deptCharts = Object.entries(deptMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    const typeMap: Record<string, number> = {};
    filtered.forEach(o => { 
      const t = o.paymentType || 'Other';
      typeMap[t] = (typeMap[t] || 0) + Number(o.amountToRelease); 
    });
    const typeCharts = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return { totalAmount, totalCount, deptCharts, typeCharts };
  }, [trackerOccurrences, forecastFilters]);

  const insights = useMemo(() => {
    if (filteredChartData.length === 0) return "Select a wider date range to see intelligence insights.";
    return `In this period, ₹${stats.totalAmount.toLocaleString('en-IN')} was processed across ${stats.totalCount} transactions. ${stats.barData[0]?.name || "N/A"} represents your highest financial volume. ${stats.healthScore >= 80 ? "Strong on-time performance." : "Delays detected in payments."}`;
  }, [stats, filteredChartData]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#0ea5e9"];

  // TAG MANAGEMENT
  const handleRecipientKeyDown = (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ',') && recipientInput.trim()) { e.preventDefault(); const val = recipientInput.trim().replace(',', ''); if (val.includes('@') && !recipientTags.includes(val)) { setRecipientTags([...recipientTags, val]); setRecipientInput(""); } } };
  const handleCcKeyDown = (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ',') && ccInput.trim()) { e.preventDefault(); const val = ccInput.trim().replace(',', ''); if (val.includes('@') && !ccTags.includes(val)) { setCcTags([...ccTags, val]); setCcInput(""); } } };

  // REPORT ENGINE
  const captureCharts = async () => {
    const ids = ['trend-chart', 'pie-chart', 'type-pie-chart', 'dept-pie-chart'];
    const images: Record<string, string> = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) images[id] = (await html2canvas(el)).toDataURL('image/png');
    }
    return images;
  };

  const generateExcel = async (isForEmail = false) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payment Analytics');
    sheet.columns = [
      { header: 'Entity', key: 'entity', width: 25 }, 
      { header: 'Department', key: 'dept', width: 20 },
      { header: 'Payment Type', key: 'type', width: 20 },
      { header: 'Amount (INR)', key: 'amount', width: 15 }, 
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Txn Count', key: 'count', width: 10 }, 
      { header: 'Date', key: 'date', width: 15 }
    ];
    filteredTableData.forEach(d => { 
        sheet.addRow({ 
            entity: d.entity_name, 
            dept: d.department_name || 'N/A',
            type: d.payment_type, 
            amount: d.amount, 
            status: d.status, 
            count: d.transaction_count, 
            date: formatDateDisplay(d.payment_date) 
        }); 
    });
    const buffer = await workbook.xlsx.writeBuffer();
    if (isForEmail) return buffer;
    saveAs(new Blob([buffer]), `Payments_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generatePDF = async (isForEmail = false) => {
    const periodStr = `${formatDateDisplay(chartFilters.fromDate)} to ${formatDateDisplay(chartFilters.toDate)}`;
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(30, 41, 59);
    doc.text(`Payments Analytical report for the period`, 14, 25);
    doc.setFontSize(18); doc.setTextColor(59, 130, 246);
    doc.text(periodStr, 14, 35);
    
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 45);
    
    doc.setDrawColor(226, 232, 240); doc.line(14, 50, 196, 50);

    doc.setFontSize(14); doc.setTextColor(30, 41, 59);
    doc.text("Executive Summary", 14, 60);
    doc.setFontSize(10);
    doc.text(`Total Amount: INR ${stats.totalAmount.toLocaleString('en-IN')}`, 14, 68);
    doc.text(`Total Transactions: ${stats.totalCount}`, 14, 74);
    doc.text(`Health Index: ${stats.healthScore}%`, 14, 80);

    // Add Charts to PDF
    const chartImages = await captureCharts();
    if (chartImages['trend-chart']) {
      doc.text("Spending Velocity Trend", 14, 95);
      doc.addImage(chartImages['trend-chart'], 'PNG', 14, 100, 180, 60);
    }
    
    if (chartImages['pie-chart']) {
      doc.text("Payment Health", 14, 175);
      doc.addImage(chartImages['pie-chart'], 'PNG', 14, 180, 55, 45);
    }
    if (chartImages['type-pie-chart']) {
      doc.text("By Payment Type", 75, 175);
      doc.addImage(chartImages['type-pie-chart'], 'PNG', 75, 180, 55, 45);
    }
    if (chartImages['dept-pie-chart']) {
      doc.text("By Department", 140, 175);
      doc.addImage(chartImages['dept-pie-chart'], 'PNG', 140, 180, 55, 45);
    }

    doc.addPage();
    doc.setFontSize(14); doc.text("Detailed Transaction Records", 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Entity', 'Department', 'Type', 'Amount', 'Status', 'Date']],
      body: filteredTableData.map(d => [d.entity_name, d.department_name || 'N/A', d.payment_type, d.amount.toLocaleString('en-IN'), d.status, formatDateDisplay(d.payment_date)]),
      theme: 'grid', headStyles: { fillColor: [59, 130, 246] }
    });

    if (isForEmail) return doc.output('arraybuffer');
    doc.save(`Payments_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleShareEmail = async () => {
    if (recipientTags.length === 0) return showNotification("Add at least one recipient email tag.");
    setIsSharing(true);
    try {
      const periodStr = `${formatDateDisplay(chartFilters.fromDate)} to ${formatDateDisplay(chartFilters.toDate)}`;
      const subjectLine = `Payments Analytical report for the period ${periodStr}`;
      
      const attachments = [];
      const chartImages = await captureCharts();
      
      if (shareConfig.format === 'PDF' || shareConfig.format === 'BOTH') {
        const pdfBuffer = await generatePDF(true) as ArrayBuffer;
        attachments.push({ filename: `Analytics_Report_${periodStr.replace(/\s+/g, '_')}.pdf`, content: Buffer.from(pdfBuffer).toString('base64'), contentType: 'application/pdf' });
      }
      if (shareConfig.format === 'EXCEL' || shareConfig.format === 'BOTH') {
        const excelBuffer = await generateExcel(true) as ArrayBuffer;
        attachments.push({ filename: `Analytics_Data_${periodStr.replace(/\s+/g, '_')}.xlsx`, content: Buffer.from(excelBuffer).toString('base64'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }

      // 1000% Better Email Body (Glassmorphism Dashboard Style)
      const emailBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 40px 20px;">
          <div style="max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Finance Hub • Intelligence Report</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 16px;">Analytical summary for ${periodStr}</p>
            </div>
            
            <div style="padding: 40px;">
              <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <div style="flex: 1; background: #eff6ff; padding: 25px; border-radius: 20px; border: 1px solid #dbeafe;">
                  <p style="margin: 0; color: #3b82f6; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Total Volume Paid</p>
                  <h2 style="margin: 5px 0; color: #1e3a8a; font-size: 32px;">₹${stats.totalAmount.toLocaleString('en-IN')}</h2>
                  <p style="margin: 0; color: #60a5fa; font-size: 14px;">Across ${stats.totalCount} Transactions</p>
                </div>
                <div style="flex: 1; background: #ecfdf5; padding: 25px; border-radius: 20px; border: 1px solid #d1fae5;">
                  <p style="margin: 0; color: #10b981; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Treasury Health</p>
                  <h2 style="margin: 5px 0; color: #064e3b; font-size: 32px;">${stats.healthScore}%</h2>
                  <p style="margin: 0; color: #34d399; font-size: 14px;">Operational Efficiency</p>
                </div>
              </div>

              <div style="margin-bottom: 40px;">
                <h3 style="color: #1e293b; border-left: 4px solid #3b82f6; padding-left: 15px; margin-bottom: 20px;">Spending Trends</h3>
                ${chartImages['trend-chart'] ? `<img src="${chartImages['trend-chart']}" style="width: 100%; border-radius: 16px; border: 1px solid #e2e8f0;" />` : ''}
              </div>

              <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px;">
                  <h3 style="color: #1e293b; border-left: 4px solid #10b981; padding-left: 15px; margin-bottom: 20px;">By Type</h3>
                  ${chartImages['type-pie-chart'] ? `<img src="${chartImages['type-pie-chart']}" style="width: 100%; border-radius: 16px;" />` : ''}
                </div>
                <div style="flex: 1; min-width: 250px;">
                  <h3 style="color: #1e293b; border-left: 4px solid #f59e0b; padding-left: 15px; margin-bottom: 20px;">By Department</h3>
                  ${chartImages['dept-pie-chart'] ? `<img src="${chartImages['dept-pie-chart']}" style="width: 100%; border-radius: 16px;" />` : ''}
                </div>
              </div>

              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 14px;">
                <p>Detailed PDF and Excel files are attached for deep-dive analysis.</p>
                <p>© 2026 Intellicar Finance Hub • Automated Intelligence Engine</p>
              </div>
            </div>
          </div>
        </div>
      `;

      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: recipientTags.join(','), ccEmail: ccTags.join(','), subject: subjectLine, body: emailBody, attachments })
      });
      if (res.ok) { showNotification("Premium intelligence report shared!"); setShowShareModal(false); }
    } catch (error) { console.error("Share error:", error); showNotification("Error sharing report."); } finally { setIsSharing(false); }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{label}</p>
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#3b82f6" }}>₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fade-in 0.5s ease-out" }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } select option { background: white !important; color: #1e293b !important; } .sort-th:hover { background: #f1f5f9 !important; }` }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", padding: "20px 24px", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", padding: "12px", borderRadius: "14px" }}><Activity size={24} /></div>
          <div><h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Finance Analytics Hub</h2></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} style={{ background: "#dcfce7", color: "#16a34a", border: "none", padding: "10px", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><Download size={20} /> <ChevronDown size={14} /></button>
            {showDownloadMenu && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "white", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", zIndex: 100, minWidth: "200px", overflow: "hidden" }}>
                <button onClick={() => { generateExcel(); setShowDownloadMenu(false); }} style={menuItemStyle}><FileSpreadsheet size={16} color="#16a34a" /> Download Excel</button>
                <button onClick={() => { generatePDF(); setShowDownloadMenu(false); }} style={menuItemStyle}><FileText size={16} color="#ef4444" /> Download PDF</button>
                <button onClick={() => { setShowShareModal(true); setShowDownloadMenu(false); }} style={{ ...menuItemStyle, borderTop: "1px solid #f1f5f9" }}><Mail size={16} color="#3b82f6" /> Share via Email</button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", background: theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "4px", borderRadius: "14px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}` }}>
            <button onClick={() => setActiveTab('TABLE')} style={tabStyle(activeTab === 'TABLE')}><TableIcon size={18} /> Detailed Records</button>
            <button onClick={() => setActiveTab('CHARTS')} style={tabStyle(activeTab === 'CHARTS')}><PieIcon size={18} /> Visual Dashboard</button>
          </div>
        </div>
      </div>

      {activeTab === 'TABLE' ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Filters */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", background: theme === 'DARK' ? "rgba(30, 41, 59, 0.4)" : "#f8fafc", padding: "24px", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#e2e8f0"}` }}>
            <div><label style={filterLabelStyle}>From Date</label><input type="date" value={tableFilters.fromDate} onChange={e => setTableFilters({...tableFilters, fromDate: e.target.value})} style={filterInputStyle(theme)} /></div>
            <div><label style={filterLabelStyle}>To Date</label><input type="date" value={tableFilters.toDate} onChange={e => setTableFilters({...tableFilters, toDate: e.target.value})} style={filterInputStyle(theme)} /></div>
            <div>
              <label style={filterLabelStyle}>By Entity</label>
              <MultiSelectFilter
                options={settings.masterEntities.split(',').map((e: string) => e.trim()).filter(Boolean)}
                selected={tableFilters.entity}
                onChange={(val) => setTableFilters({...tableFilters, entity: val})}
                placeholder="All Entities"
                theme={theme}
                t={t}
              />
            </div>
            <div>
              <label style={filterLabelStyle}>By Department</label>
              <MultiSelectFilter
                options={settings.masterDepartments?.split(',').map((d: string) => d.trim()).filter(Boolean) || []}
                selected={tableFilters.department}
                onChange={(val) => setTableFilters({...tableFilters, department: val})}
                placeholder="All Departments"
                theme={theme}
                t={t}
              />
            </div>
            <div>
              <label style={filterLabelStyle}>By Type</label>
              <MultiSelectFilter
                options={settings.masterPaymentTypes.split(',').map((t: string) => t.trim()).filter(Boolean)}
                selected={tableFilters.type}
                onChange={(val) => setTableFilters({...tableFilters, type: val})}
                placeholder="All Types"
                theme={theme}
                t={t}
              />
            </div>
            <div>
              <label style={filterLabelStyle}>By Status</label>
              <MultiSelectFilter
                options={["Paid on due date", "Paid Before due date", "Paid After due date", "CANCELLED"]}
                selected={tableFilters.status}
                onChange={(val) => setTableFilters({...tableFilters, status: val})}
                placeholder="All Status"
                theme={theme}
                t={t}
              />
            </div>
            <div>
              <label style={filterLabelStyle}>By Bank</label>
              <MultiSelectFilter
                options={Array.from(new Set(combinedData.map(d => (d as any).paidFromAccount).filter(Boolean))).sort() as string[]}
                selected={tableFilters.bank}
                onChange={(val) => setTableFilters({...tableFilters, bank: val})}
                placeholder="All Banks"
                theme={theme}
                t={t}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}><button onClick={() => setShowAddEntry(true)} style={addBtnStyle}><Plus size={18} /> Add Entry</button></div>
          </div>
          <div style={{ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th onClick={() => handleSort('entity_name')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Entity <SortIcon colKey="entity_name" /></th>
                  <th onClick={() => handleSort('department_name')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Department <SortIcon colKey="department_name" /></th>
                  <th onClick={() => handleSort('payment_type')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Type <SortIcon colKey="payment_type" /></th>
                  <th onClick={() => handleSort('amount')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Amount <SortIcon colKey="amount" /></th>
                  <th onClick={() => handleSort('status')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Status <SortIcon colKey="status" /></th>
                  <th onClick={() => handleSort('payment_date')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Date <SortIcon colKey="payment_date" /></th>
                  <th onClick={() => handleSort('paidFromAccount')} className="sort-th" style={{ ...thStyle, cursor: "pointer", transition: "background 0.2s" }}>Bank <SortIcon colKey="paidFromAccount" /></th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTableData.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{d.entity_name}</td>
                    <td style={tdStyle}><span style={{ ...badgeStyle, background: "#fef3c7", color: "#d97706" }}>{d.department_name || 'N/A'}</span></td>
                    <td style={tdStyle}><span style={badgeStyle}>{d.payment_type}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>₹{d.amount.toLocaleString('en-IN')}</td>
                    <td style={tdStyle}><span style={statusBadgeStyle(d.status)}>{d.status}</span></td>
                    <td style={tdStyle}>{formatDateDisplay(d.payment_date)}</td>
                    <td style={tdStyle}><div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{(d as any).paidFromAccount || '--'}</div></td>
                    <td style={tdStyle}>{!d.isTracker && <button onClick={() => handleDeleteEntry(parseInt(d.id.split('-')[1]))} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={16} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Graphical Filters */}
          <div style={chartFilterBarStyle}>
            <div><label style={labelLight}>Analysis From</label><input type="date" value={chartFilters.fromDate} onChange={e => setChartFilters({...chartFilters, fromDate: e.target.value})} style={chartInputStyle} /></div>
            <div><label style={labelLight}>Analysis To</label><input type="date" value={chartFilters.toDate} onChange={e => setChartFilters({...chartFilters, toDate: e.target.value})} style={chartInputStyle} /></div>
            <div>
              <label style={labelLight}>Entity focus</label>
              <MultiSelectFilter
                options={settings.masterEntities.split(',').map((e: string) => e.trim()).filter(Boolean)}
                selected={chartFilters.entity}
                onChange={(val) => setChartFilters({...chartFilters, entity: val})}
                placeholder="All Entities"
                theme={theme}
                t={t}
                customStyle={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label style={labelLight}>Department focus</label>
              <MultiSelectFilter
                options={settings.masterDepartments?.split(',').map((d: string) => d.trim()).filter(Boolean) || []}
                selected={chartFilters.department}
                onChange={(val) => setChartFilters({...chartFilters, department: val})}
                placeholder="All Departments"
                theme={theme}
                t={t}
                customStyle={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label style={labelLight}>Type Focus</label>
              <MultiSelectFilter
                options={settings.masterPaymentTypes.split(',').map((t: string) => t.trim()).filter(Boolean)}
                selected={chartFilters.type}
                onChange={(val) => setChartFilters({...chartFilters, type: val})}
                placeholder="All Types"
                theme={theme}
                t={t}
                customStyle={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div style={statCardStyle(theme)}><div style={cardHead}><span>Health Index</span><div style={iconBox("#10b981")}><CheckCircle2 size={22} /></div></div><div style={cardVal}>{stats.healthScore}% <ArrowUpRight size={24} color="#10b981" /></div><p style={cardSub}>Payment Efficiency</p></div>
            <div style={statCardStyle(theme)}><div style={cardHead}><span>Total Amount Paid</span><div style={iconBox("#3b82f6")}><Wallet size={22} /></div></div><div style={cardVal}>₹{stats.totalAmount.toLocaleString('en-IN')}</div><p style={cardSub}>Aggregate Volume</p></div>
            <div style={statCardStyle(theme)}><div style={cardHead}><span>Txn Count</span><div style={iconBox("#f59e0b")}><Activity size={22} /></div></div><div style={cardVal}>{stats.totalCount} <span style={{ fontSize: "1rem" }}>txns</span></div><p style={cardSub}>Processed Transactions</p></div>
          </div>

          <div style={{ ...statCardStyle(theme), background: "#1e293b", color: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}><Zap size={20} color="#f59e0b" fill="#f59e0b" /><span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase" }}>Strategic Intelligence</span></div>
            <p style={{ margin: 0, fontSize: "1rem", lineHeight: "1.7", fontWeight: 500, color: "#e2e8f0" }}>{insights}</p>
          </div>

          <div id="trend-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Spending Velocity (Growth Trend)</h4>
              <div style={{ height: "350px" }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.trendData}><defs><linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tick={{dy: 10}} /><YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fill="url(#colorAmt)" animationDuration={1000} /></AreaChart></ResponsiveContainer></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
            <div id="pie-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Health Breakdown</h4>
              <div style={{ height: "300px" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.pieData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>{stats.pieData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div>
            </div>
            <div id="type-pie-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>By Payment Type</h4>
              <div style={{ height: "300px" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.typePieData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>{stats.typePieData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div>
            </div>
            <div id="dept-pie-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>By Department</h4>
              <div style={{ height: "300px" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.deptPieData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>{stats.deptPieData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div>
            </div>
            <div id="bank-pie-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Bank-wise Outflow</h4>
              <div style={{ height: "300px" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.bankData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>{stats.bankData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div>
            </div>

            {/* BUDGET VS ACTUAL */}
            <div style={{ ...chartContainerStyle(theme), gridColumn: "span 2" }}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Budget vs Actual Outflow</h4>
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsActualData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9"} vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} />
                    <Bar dataKey="budget" name="Budgeted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={modalOverlay}><div style={modalBox(theme)}><div style={modalHeader}><h3 style={{ margin: 0 }}>Share Intelligence Report</h3><button onClick={() => setShowShareModal(false)} style={closeBtn}><X size={20} /></button></div><div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div><label style={filterLabelStyle}>Recipient Emails (Hit Enter/Comma)</label><div style={tagInputBoxStyle}>{recipientTags.map(tag => (<span key={tag} style={tagStyle}>{tag} <X size={12} style={{ cursor: "pointer" }} onClick={() => setRecipientTags(recipientTags.filter(t => t !== tag))} /></span>))}<input type="text" value={recipientInput} onChange={e => setRecipientInput(e.target.value)} onKeyDown={handleRecipientKeyDown} placeholder="Type email..." style={tagGhostInputStyle} /></div></div>
              <div><label style={filterLabelStyle}>CC Emails (Hit Enter/Comma)</label><div style={tagInputBoxStyle}>{ccTags.map(tag => (<span key={tag} style={tagStyle}>{tag} <X size={12} style={{ cursor: "pointer" }} onClick={() => setCcTags(ccTags.filter(t => t !== tag))} /></span>))}<input type="text" value={ccInput} onChange={e => setCcInput(e.target.value)} onKeyDown={handleCcKeyDown} placeholder="Type email..." style={tagGhostInputStyle} /></div></div>
              <div><label style={filterLabelStyle}>Subject (Auto-generates Period)</label><input type="text" placeholder="Leave blank for auto-subject" value={shareConfig.subject} onChange={e => setShareConfig({...shareConfig, subject: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Format</label><div style={{ display: "flex", gap: "10px" }}>{['PDF', 'EXCEL', 'BOTH'].map(f => (<button key={f} onClick={() => setShareConfig({...shareConfig, format: f as any})} style={formatBtnStyle(shareConfig.format === f)}>{f}</button>))}</div></div>
              <button onClick={handleShareEmail} disabled={isSharing} style={primaryBtnStyle}>{isSharing ? "Synthesizing Dashboard & Sharing..." : "Generate Premium Report"}</button>
        </div></div></div>
      )}

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div style={modalOverlay}><div style={modalBox(theme)}><div style={modalHeader}><h3>Add Bulk Entry</h3><button onClick={() => setShowAddEntry(false)} style={closeBtn}><X size={20} /></button></div><form onSubmit={handleAddEntry} style={{ padding: "28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ gridColumn: "span 2" }}><label style={filterLabelStyle}>Entity</label><select required value={newEntry.entity_name} onChange={e => setNewEntry({...newEntry, entity_name: e.target.value})} style={filterInputStyle(theme)}><option value="">Select Entity</option>{settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}</select></div>
              <div style={{ gridColumn: "span 2" }}><label style={filterLabelStyle}>Department</label><select required value={newEntry.department_name} onChange={e => setNewEntry({...newEntry, department_name: e.target.value})} style={filterInputStyle(theme)}><option value="">Select Department</option>{settings.masterDepartments?.split(',').map((d: string) => <option key={d} value={d.trim()}>{d.trim()}</option>)}</select></div>
              <div style={{ gridColumn: "span 2" }}><label style={filterLabelStyle}>Type</label><select required value={newEntry.payment_type} onChange={e => setNewEntry({...newEntry, payment_type: e.target.value})} style={filterInputStyle(theme)}><option value="">Select Type</option>{settings.masterPaymentTypes.split(',').map((t: string) => <option key={t} value={t.trim()}>{t.trim()}</option>)}</select></div>
              <div><label style={filterLabelStyle}>Amount</label><input required type="number" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Txn Count</label><input required type="number" value={newEntry.transaction_count} onChange={e => setNewEntry({...newEntry, transaction_count: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Date</label><input required type="date" value={newEntry.payment_date} onChange={e => setNewEntry({...newEntry, payment_date: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Status</label><select value={newEntry.status} onChange={e => setNewEntry({...newEntry, status: e.target.value})} style={filterInputStyle(theme)}><option value="Paid on due date">Paid on due date</option><option value="Paid Before due date">Paid Before due date</option><option value="Paid After due date">Paid After due date</option></select></div>
              <button type="submit" style={{ gridColumn: "span 2", padding: "14px", borderRadius: "14px", border: "none", background: "#3b82f6", color: "white", fontWeight: 700 }}>Save Analytics Entry</button>
        </form></div></div>
      )}

      {/* STRATEGIC PREDICTIVE FORECAST */}
      <div style={{ marginTop: "40px", padding: "40px", background: theme === 'DARK' ? "rgba(30, 41, 59, 0.4)" : "#f8fafc", borderRadius: "32px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#e2e8f0"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#8b5cf6" }}></div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, color: theme === 'DARK' ? "white" : "#1e293b" }}>Strategic Forecast</h2>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>Predictive expected cash flows based on scheduled payment occurrences.</p>
          </div>
          
          <div style={{ display: "flex", gap: "16px", background: theme === 'DARK' ? "#1e293b" : "white", padding: "16px", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}` }}>
            <div>
              <label style={filterLabelStyle}>Forecast From</label>
              <input type="date" value={forecastFilters.fromDate} onChange={e => setForecastFilters({...forecastFilters, fromDate: e.target.value})} style={{ ...filterInputStyle(theme), padding: "8px 12px" }} />
            </div>
            <div>
              <label style={filterLabelStyle}>Forecast To</label>
              <input type="date" value={forecastFilters.toDate} onChange={e => setForecastFilters({...forecastFilters, toDate: e.target.value})} style={{ ...filterInputStyle(theme), padding: "8px 12px" }} />
            </div>
            <div>
              <label style={filterLabelStyle}>By Dept</label>
              <MultiSelectFilter
                options={settings.masterDepartments?.split(',').map((d: string) => d.trim()).filter(Boolean) || []}
                selected={forecastFilters.department}
                onChange={(val) => setForecastFilters({...forecastFilters, department: val})}
                placeholder="All Depts"
                theme={theme}
                t={t}
              />
            </div>
            <div>
              <label style={filterLabelStyle}>By Type</label>
              <MultiSelectFilter
                options={settings.masterPaymentTypes.split(',').map((t: string) => t.trim()).filter(Boolean)}
                selected={forecastFilters.type}
                onChange={(val) => setForecastFilters({...forecastFilters, type: val})}
                placeholder="All Types"
                theme={theme}
                t={t}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "24px" }}>
          <div style={{ ...statCardStyle(theme), background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", color: "white" }}>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "12px" }}>Forecasted Liability</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>₹{forecastData.totalAmount.toLocaleString('en-IN')}</div>
            <div style={{ marginTop: "8px", fontSize: "0.875rem", opacity: 0.9 }}>Across {forecastData.totalCount} upcoming transactions</div>
          </div>

          <div style={statCardStyle(theme)}>
            <div style={cardHead}>By Department <Activity size={18} /></div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={forecastData.deptCharts} margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={statCardStyle(theme)}>
            <div style={cardHead}>By Payment Type <PieIcon size={18} /></div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData.typeCharts}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// STYLES (Existing styles + some additions)
const filterLabelStyle = { display: "block", marginBottom: "8px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#94a3b8" };
const filterInputStyle = (theme: string) => ({ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: "white", color: "#1e293b", fontSize: "0.875rem", outline: "none" });
const tabStyle = (active: boolean) => ({ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "10px", border: "none", background: active ? "#3b82f6" : "transparent", color: active ? "white" : "#64748b", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", transition: "all 0.3s" });
const thStyle = { 
  background: "#1e293b",
  padding: "14px 24px", 
  textAlign: "left" as const, 
  fontSize: "0.7rem", 
  fontWeight: 700, 
  color: "#ffffff", 
  textTransform: "uppercase" as const, 
  letterSpacing: "0.1em",
  borderBottom: "2px solid #3b82f6"
};
const tdStyle = { padding: "18px 24px", fontSize: "0.875rem" };
const badgeStyle = { fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "#eff6ff", color: "#3b82f6" };
const statusBadgeStyle = (status: string) => ({ fontSize: "0.7rem", fontWeight: 800, padding: "4px 12px", borderRadius: "20px", background: status === "Paid After due date" ? "#fee2e2" : "#dcfce7", color: status === "Paid After due date" ? "#ef4444" : "#10b981" });
const addBtnStyle = { width: "100%", height: "44px", borderRadius: "12px", border: "none", background: "#10b981", color: "white", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" };
const menuItemStyle = { width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "none", cursor: "pointer", textAlign: "left" as const, fontSize: "0.875rem", color: "#1e293b" };
const statCardStyle = (theme: string) => ({ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", padding: "28px", borderRadius: "24px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}` });
const cardHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontSize: "0.875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const };
const cardVal = { fontSize: "2.5rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" };
const cardSub = { margin: "8px 0 0 0", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 };
const iconBox = (color: string) => ({ background: `${color}10`, padding: "10px", borderRadius: "12px", color });
const chartFilterBarStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", background: "#1e293b", padding: "24px", borderRadius: "24px", color: "white" };
const labelLight = { display: "block", marginBottom: "8px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)" };
const chartInputStyle = { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "white", fontSize: "0.875rem", cursor: "pointer" };
const chartContainerStyle = (theme: string) => ({ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", padding: "28px", borderRadius: "24px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}` });
const modalOverlay = { position: "fixed" as const, inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" };
const modalBox = (theme: string) => ({ background: theme === 'DARK' ? "#1e293b" : "white", borderRadius: "28px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 50px rgba(0,0,0,0.3)" });
const modalHeader = { padding: "28px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" };
const closeBtn = { background: "#f1f5f9", border: "none", color: "#64748b", cursor: "pointer", width: "36px", height: "36px", borderRadius: "12px" };
const tagInputBoxStyle = { display: "flex", flexWrap: "wrap" as const, gap: "8px", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", minHeight: "48px" };
const tagStyle = { display: "flex", alignItems: "center", gap: "6px", background: "#eff6ff", color: "#3b82f6", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8125rem", fontWeight: 700 };
const tagGhostInputStyle = { border: "none", outline: "none", flex: 1, fontSize: "0.875rem", minWidth: "120px" };
const formatBtnStyle = (active: boolean) => ({ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${active ? "#3b82f6" : "#e2e8f0"}`, background: active ? "#eff6ff" : "white", color: active ? "#3b82f6" : "#64748b", fontWeight: 700, cursor: "pointer" });
const primaryBtnStyle = { width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: "#3b82f6", color: "white", fontWeight: 700, cursor: "pointer" };

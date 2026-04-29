"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Calendar, Filter, PieChart as PieIcon, 
  BarChart3, TrendingUp, Info, Table as TableIcon, 
  ArrowUpRight, ArrowDownRight, Wallet, Activity,
  ChevronDown, X, Trash2, CheckCircle2, AlertCircle,
  Zap, ArrowRight, Download, FileSpreadsheet, FileText, Mail, Share2
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

interface ManualEntry {
  id: number;
  entity_name: string;
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
    subject: "Treasury Performance & Analytics Report"
  });
  const [isSharing, setIsSharing] = useState(false);

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
    fromDate: firstDay, toDate: lastDay, entity: 'ALL', type: 'ALL', status: 'ALL', search: ''
  });

  const [chartFilters, setChartFilters] = useState({
    fromDate: firstDay, toDate: lastDay, entity: 'ALL', type: 'ALL', status: 'ALL'
  });

  const [newEntry, setNewEntry] = useState({
    entity_name: "", payment_type: "", frequency: "M", amount: "", status: "Paid on due date", transaction_count: "1", payment_date: new Date().toISOString().split('T')[0]
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
        body: JSON.stringify({ ...newEntry, amount: parseFloat(newEntry.amount), transactionCount: parseInt(newEntry.transaction_count) })
      });
      if (res.ok) {
        showNotification("Entry added!");
        setShowAddEntry(false);
        fetchManualEntries();
        setNewEntry({ ...newEntry, amount: "", transaction_count: "1", entity_name: "", payment_type: "" });
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
    const trackerPaid = trackerOccurrences
      .filter(o => o.isPaid)
      .map(o => ({
        id: `tracker-${o.id}`, entity_name: o.entityName, payment_type: o.paymentType, frequency: o.frequency, amount: Number(o.amountPaid) || 0,
        status: (() => {
          const due = new Date(o.dueDate); const actual = new Date(o.actualDate);
          due.setHours(0,0,0,0); actual.setHours(0,0,0,0);
          if (actual.getTime() === due.getTime()) return "Paid on due date";
          if (actual.getTime() < due.getTime()) return "Paid Before due date";
          return "Paid After due date";
        })(),
        transaction_count: 1, payment_date: o.actualDate ? new Date(o.actualDate).toISOString().split('T')[0] : o.dueDate, isTracker: true
      }));
    const manual = manualEntries.map(e => ({ ...e, id: `manual-${e.id}`, amount: Number(e.amount), isTracker: false }));
    return [...trackerPaid, ...manual];
  }, [trackerOccurrences, manualEntries]);

  const filteredTableData = useMemo(() => {
    return combinedData.filter(d => {
      const dateInRange = d.payment_date >= tableFilters.fromDate && d.payment_date <= tableFilters.toDate;
      const entityMatch = tableFilters.entity === 'ALL' || d.entity_name === tableFilters.entity;
      const typeMatch = tableFilters.type === 'ALL' || d.payment_type === tableFilters.type;
      const statusMatch = tableFilters.status === 'ALL' || d.status === tableFilters.status;
      const searchMatch = !tableFilters.search || d.entity_name.toLowerCase().includes(tableFilters.search.toLowerCase());
      return dateInRange && entityMatch && typeMatch && statusMatch && searchMatch;
    }).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [combinedData, tableFilters]);

  const filteredChartData = useMemo(() => {
    return combinedData.filter(d => {
      const dateInRange = d.payment_date >= chartFilters.fromDate && d.payment_date <= chartFilters.toDate;
      const entityMatch = chartFilters.entity === 'ALL' || d.entity_name === chartFilters.entity;
      const typeMatch = chartFilters.type === 'ALL' || d.payment_type === chartFilters.type;
      const statusMatch = chartFilters.status === 'ALL' || d.status === chartFilters.status;
      return dateInRange && entityMatch && typeMatch && statusMatch;
    });
  }, [combinedData, chartFilters]);

  const stats = useMemo(() => {
    const totalAmount = filteredChartData.reduce((sum, d) => sum + Number(d.amount), 0);
    const totalCount = filteredChartData.reduce((sum, d) => sum + d.transaction_count, 0);
    const onTimeCount = filteredChartData.filter(d => d.status !== "Paid After due date").reduce((sum, d) => sum + d.transaction_count, 0);
    const healthScore = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0;
    const statusMap: Record<string, number> = {};
    filteredChartData.forEach(d => { statusMap[d.status] = (statusMap[d.status] || 0) + d.transaction_count; });
    const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const entityMap: Record<string, number> = {};
    filteredChartData.forEach(d => { entityMap[d.entity_name] = (entityMap[d.entity_name] || 0) + d.amount; });
    const barData = Object.entries(entityMap).map(([name, amount]) => ({ name, amount })).sort((a,b) => b.amount - a.amount).slice(0, 8);
    const trendMap: Record<string, number> = {};
    filteredChartData.forEach(d => { const key = d.payment_date.substring(0, 7); trendMap[key] = (trendMap[key] || 0) + d.amount; });
    const trendData = Object.entries(trendMap).map(([date, amount]) => ({ 
      date: new Date(date + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), amount 
    })).sort((a,b) => a.date.localeCompare(b.date));
    return { totalAmount, totalCount, healthScore, pieData, barData, trendData };
  }, [filteredChartData]);

  const insights = useMemo(() => {
    if (filteredChartData.length === 0) return "Select a wider date range to see intelligence insights.";
    return `In this period, ₹${stats.totalAmount.toLocaleString('en-IN')} was processed across ${stats.totalCount} transactions. ${stats.barData[0]?.name || "N/A"} represents your highest financial volume. ${stats.healthScore >= 80 ? "Strong on-time performance." : "Delays detected in payments."}`;
  }, [stats, filteredChartData]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899", "#06b6d4"];

  // TAG MANAGEMENT
  const handleRecipientKeyDown = (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ',') && recipientInput.trim()) { e.preventDefault(); const val = recipientInput.trim().replace(',', ''); if (val.includes('@') && !recipientTags.includes(val)) { setRecipientTags([...recipientTags, val]); setRecipientInput(""); } } };
  const handleCcKeyDown = (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ',') && ccInput.trim()) { e.preventDefault(); const val = ccInput.trim().replace(',', ''); if (val.includes('@') && !ccTags.includes(val)) { setCcTags([...ccTags, val]); setCcInput(""); } } };

  // REPORT ENGINE
  const captureCharts = async () => {
    const trend = document.getElementById('trend-chart');
    const pie = document.getElementById('pie-chart');
    const images: { trend?: string, pie?: string } = {};
    if (trend) images.trend = (await html2canvas(trend)).toDataURL('image/png');
    if (pie) images.pie = (await html2canvas(pie)).toDataURL('image/png');
    return images;
  };

  const generateExcel = async (isForEmail = false) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payment Analytics');
    sheet.columns = [
      { header: 'Entity', key: 'entity', width: 25 }, { header: 'Payment Type', key: 'type', width: 20 },
      { header: 'Amount (INR)', key: 'amount', width: 15 }, { header: 'Status', key: 'status', width: 20 },
      { header: 'Txn Count', key: 'count', width: 10 }, { header: 'Date', key: 'date', width: 15 }
    ];
    filteredTableData.forEach(d => { sheet.addRow({ entity: d.entity_name, type: d.payment_type, amount: d.amount, status: d.status, count: d.transaction_count, date: d.payment_date }); });
    const buffer = await workbook.xlsx.writeBuffer();
    if (isForEmail) return buffer;
    saveAs(new Blob([buffer]), `Payments_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generatePDF = async (isForEmail = false) => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("Treasury Analytics Report", 14, 22);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${chartFilters.fromDate} to ${chartFilters.toDate}`, 14, 30);
    
    doc.setFontSize(14); doc.text("Executive Summary", 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Amount: INR ${stats.totalAmount.toLocaleString('en-IN')}`, 14, 52);
    doc.text(`Total Transactions: ${stats.totalCount}`, 14, 58);
    doc.text(`Health Index: ${stats.healthScore}%`, 14, 64);

    // Add Charts to PDF
    const chartImages = await captureCharts();
    if (chartImages.trend) {
      doc.text("Spending Velocity Trend", 14, 75);
      doc.addImage(chartImages.trend, 'PNG', 14, 80, 180, 60);
    }
    if (chartImages.pie) {
      doc.text("Payment Health Breakdown", 14, 150);
      doc.addImage(chartImages.pie, 'PNG', 14, 155, 80, 60);
    }

    doc.addPage();
    doc.text("Detailed Transaction Records", 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Entity', 'Type', 'Amount', 'Status', 'Count', 'Date']],
      body: filteredTableData.map(d => [d.entity_name, d.payment_type, d.amount.toLocaleString('en-IN'), d.status, d.transaction_count, d.payment_date]),
      theme: 'grid', headStyles: { fillColor: [59, 130, 246] }
    });

    if (isForEmail) return doc.output('arraybuffer');
    doc.save(`Payments_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleShareEmail = async () => {
    if (recipientTags.length === 0) return showNotification("Add at least one recipient email tag.");
    setIsSharing(true);
    try {
      const attachments = [];
      const chartImages = await captureCharts();
      
      if (shareConfig.format === 'PDF' || shareConfig.format === 'BOTH') {
        const pdfBuffer = await generatePDF(true) as ArrayBuffer;
        attachments.push({ filename: `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`, content: Buffer.from(pdfBuffer).toString('base64'), contentType: 'application/pdf' });
      }
      if (shareConfig.format === 'EXCEL' || shareConfig.format === 'BOTH') {
        const excelBuffer = await generateExcel(true) as ArrayBuffer;
        attachments.push({ filename: `Analytics_Data_${new Date().toISOString().split('T')[0]}.xlsx`, content: Buffer.from(excelBuffer).toString('base64'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }

      // Visual Email Body
      const emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #1e293b;">Treasury Intelligence Summary</h2>
          <p>Here is the analytics overview for the period <b>${chartFilters.fromDate}</b> to <b>${chartFilters.toDate}</b>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <p style="margin:0; color: #64748b;">Total Amount Paid</p>
            <h1 style="margin:5px 0; color: #3b82f6;">₹${stats.totalAmount.toLocaleString('en-IN')}</h1>
            <p style="margin:0; color: #64748b;">Health Index: <b>${stats.healthScore}%</b></p>
          </div>
          ${chartImages.trend ? `<h3>Spending Trends</h3><img src="${chartImages.trend}" style="width:100%; border-radius:12px; border: 1px solid #e2e8f0;" />` : ''}
          ${chartImages.pie ? `<h3>Health Distribution</h3><img src="${chartImages.pie}" style="width:100%; max-width: 300px; border-radius:12px; border: 1px solid #e2e8f0;" />` : ''}
          <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Detailed PDF and Excel reports are attached for your reference.</p>
        </div>
      `;

      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: recipientTags.join(','), ccEmail: ccTags.join(','), subject: shareConfig.subject, body: emailBody, attachments })
      });
      if (res.ok) { showNotification("Analytics report shared successfully!"); setShowShareModal(false); }
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
      <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } select option { background: white !important; color: #1e293b !important; }` }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", padding: "20px 24px", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", padding: "12px", borderRadius: "14px" }}><Activity size={24} /></div>
          <div><h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Finance Analytics Hub</h2><p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>Real-time treasury & performance tracking</p></div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", background: theme === 'DARK' ? "rgba(30, 41, 59, 0.4)" : "#f8fafc", padding: "24px", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#e2e8f0"}` }}>
            <div><label style={filterLabelStyle}>From Date</label><input type="date" value={tableFilters.fromDate} onChange={e => setTableFilters({...tableFilters, fromDate: e.target.value})} style={filterInputStyle(theme)} /></div>
            <div><label style={filterLabelStyle}>To Date</label><input type="date" value={tableFilters.toDate} onChange={e => setTableFilters({...tableFilters, toDate: e.target.value})} style={filterInputStyle(theme)} /></div>
            <div><label style={filterLabelStyle}>By Entity</label><select value={tableFilters.entity} onChange={e => setTableFilters({...tableFilters, entity: e.target.value})} style={filterInputStyle(theme)}><option value="ALL">All Entities</option>{settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}</select></div>
            <div><label style={filterLabelStyle}>By Type</label><select value={tableFilters.type} onChange={e => setTableFilters({...tableFilters, type: e.target.value})} style={filterInputStyle(theme)}><option value="ALL">All Types</option>{settings.masterPaymentTypes.split(',').map((t: string) => <option key={t} value={t.trim()}>{t.trim()}</option>)}</select></div>
            <div style={{ display: "flex", alignItems: "flex-end" }}><button onClick={() => setShowAddEntry(true)} style={addBtnStyle}><Plus size={18} /> Add Entry</button></div>
          </div>
          <div style={{ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#f8fafc" }}><th style={thStyle}>Entity</th><th style={thStyle}>Type</th><th style={thStyle}>Amount</th><th style={thStyle}>Status</th><th style={thStyle}>Txn Count</th><th style={thStyle}>Date</th><th style={thStyle}></th></tr></thead>
              <tbody>
                {filteredTableData.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{d.entity_name}</td><td style={tdStyle}><span style={badgeStyle}>{d.payment_type}</span></td><td style={{ ...tdStyle, fontWeight: 800 }}>₹{d.amount.toLocaleString('en-IN')}</td><td style={tdStyle}><span style={statusBadgeStyle(d.status)}>{d.status}</span></td><td style={tdStyle}>{d.transaction_count}</td><td style={tdStyle}>{new Date(d.payment_date).toLocaleDateString('en-GB')}</td><td style={tdStyle}>{!d.isTracker && <button onClick={() => handleDeleteEntry(parseInt(d.id.split('-')[1]))} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={16} /></button>}</td>
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
            <div><label style={labelLight}>Entity focus</label><select value={chartFilters.entity} onChange={e => setChartFilters({...chartFilters, entity: e.target.value})} style={chartInputStyle}><option value="ALL">All Entities</option>{settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}</select></div>
            <div><label style={labelLight}>By Type</label><select value={chartFilters.type} onChange={e => setChartFilters({...chartFilters, type: e.target.value})} style={chartInputStyle}><option value="ALL">All Types</option>{settings.masterPaymentTypes.split(',').map((t: string) => <option key={t} value={t.trim()}>{t.trim()}</option>)}</select></div>
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

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
            <div id="trend-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Spending Velocity</h4>
              <div style={{ height: "350px" }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.trendData}><defs><linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tick={{dy: 10}} /><YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fill="url(#colorAmt)" animationDuration={1000} /></AreaChart></ResponsiveContainer></div>
            </div>
            <div id="pie-chart" style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Health Breakdown</h4>
              <div style={{ height: "350px" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.pieData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>{stats.pieData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={modalOverlay}><div style={modalBox(theme)}><div style={modalHeader}><h3 style={{ margin: 0 }}>Share Analytics Report</h3><button onClick={() => setShowShareModal(false)} style={closeBtn}><X size={20} /></button></div><div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div><label style={filterLabelStyle}>Recipient Emails (Hit Enter/Comma)</label><div style={tagInputBoxStyle}>{recipientTags.map(tag => (<span key={tag} style={tagStyle}>{tag} <X size={12} style={{ cursor: "pointer" }} onClick={() => setRecipientTags(recipientTags.filter(t => t !== tag))} /></span>))}<input type="text" value={recipientInput} onChange={e => setRecipientInput(e.target.value)} onKeyDown={handleRecipientKeyDown} placeholder="Type email..." style={tagGhostInputStyle} /></div></div>
              <div><label style={filterLabelStyle}>CC Emails (Hit Enter/Comma)</label><div style={tagInputBoxStyle}>{ccTags.map(tag => (<span key={tag} style={tagStyle}>{tag} <X size={12} style={{ cursor: "pointer" }} onClick={() => setCcTags(ccTags.filter(t => t !== tag))} /></span>))}<input type="text" value={ccInput} onChange={e => setCcInput(e.target.value)} onKeyDown={handleCcKeyDown} placeholder="Type email..." style={tagGhostInputStyle} /></div></div>
              <div><label style={filterLabelStyle}>Subject</label><input type="text" value={shareConfig.subject} onChange={e => setShareConfig({...shareConfig, subject: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Format</label><div style={{ display: "flex", gap: "10px" }}>{['PDF', 'EXCEL', 'BOTH'].map(f => (<button key={f} onClick={() => setShareConfig({...shareConfig, format: f as any})} style={formatBtnStyle(shareConfig.format === f)}>{f}</button>))}</div></div>
              <button onClick={handleShareEmail} disabled={isSharing} style={primaryBtnStyle}>{isSharing ? "Capturing Charts & Sending..." : "Share Report Now"}</button>
        </div></div></div>
      )}

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div style={modalOverlay}><div style={modalBox(theme)}><div style={modalHeader}><h3>Add Entry</h3><button onClick={() => setShowAddEntry(false)} style={closeBtn}><X size={20} /></button></div><form onSubmit={handleAddEntry} style={{ padding: "28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ gridColumn: "span 2" }}><label style={filterLabelStyle}>Entity</label><select required value={newEntry.entity_name} onChange={e => setNewEntry({...newEntry, entity_name: e.target.value})} style={filterInputStyle(theme)}><option value="">Select Entity</option>{settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}</select></div>
              <div style={{ gridColumn: "span 2" }}><label style={filterLabelStyle}>Type</label><select required value={newEntry.payment_type} onChange={e => setNewEntry({...newEntry, payment_type: e.target.value})} style={filterInputStyle(theme)}><option value="">Select Type</option>{settings.masterPaymentTypes.split(',').map((t: string) => <option key={t} value={t.trim()}>{t.trim()}</option>)}</select></div>
              <div><label style={filterLabelStyle}>Amount</label><input required type="number" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Txn Count</label><input required type="number" value={newEntry.transaction_count} onChange={e => setNewEntry({...newEntry, transaction_count: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Date</label><input required type="date" value={newEntry.payment_date} onChange={e => setNewEntry({...newEntry, payment_date: e.target.value})} style={filterInputStyle(theme)} /></div>
              <div><label style={filterLabelStyle}>Status</label><select value={newEntry.status} onChange={e => setNewEntry({...newEntry, status: e.target.value})} style={filterInputStyle(theme)}><option value="Paid on due date">Paid on due date</option><option value="Paid Before due date">Paid Before due date</option><option value="Paid After due date">Paid After due date</option></select></div>
              <button type="submit" style={{ gridColumn: "span 2", padding: "14px", borderRadius: "14px", border: "none", background: "#3b82f6", color: "white", fontWeight: 700 }}>Add Entry</button>
        </form></div></div>
      )}
    </div>
  );
}

// STYLES
const filterLabelStyle = { display: "block", marginBottom: "8px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#94a3b8" };
const filterInputStyle = (theme: string) => ({ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: "white", color: "#1e293b", fontSize: "0.875rem", outline: "none" });
const tabStyle = (active: boolean) => ({ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "10px", border: "none", background: active ? "#3b82f6" : "transparent", color: active ? "white" : "#64748b", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", transition: "all 0.3s" });
const thStyle = { padding: "20px 24px", textAlign: "left" as const, fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.1em" };
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
const chartFilterBarStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", background: "#1e293b", padding: "24px", borderRadius: "24px", color: "white" };
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

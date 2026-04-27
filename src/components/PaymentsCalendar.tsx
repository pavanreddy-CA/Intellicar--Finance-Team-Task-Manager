"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, Calendar, Users, Briefcase, Filter, Search, ChevronRight, ListChecks, StopCircle, Download, Share2, FileText, Table as TableIcon, Eye, EyeOff, ArrowUp, ArrowDown, ChevronDown, Mail, X, FileSpreadsheet, Send, Wallet, ArrowRight } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentTemplate {
  id: number;
  entityName: string;
  paymentDescription: string;
  vendorName: string;
  paymentType: string;
  departmentName: string;
  financeFunction: string;
  frequency: string;
  vendorEmail: string;
  prodEmail: string;
  defaultOwner: string;
  defaultReviewer: string;
  dueDay?: number;
  weeklyDay?: string;
  startDate: string;
  endDate: string;
  stopDate: string;
  isStopped: boolean;
  lastGeneratedPeriod?: string;
}

interface PaymentOccurrence {
  id: number;
  templateId: number;
  dueDate: string;
  actualDate?: string;
  amountPaid?: number;
  isPaid: boolean;
  entityName: string;
  vendorName: string;
  paymentDescription: string;
  paymentType: string;
  departmentName: string;
  financeFunction: string;
  frequency: string;
  isHold: boolean;
  holdReason?: string;
  editRequested: boolean;
  editApproved: boolean;
  editRequestReason?: string;
}

import { resolveTaskName, getPeriodKey, getOccurrencesBetween } from "@/lib/recurringUtils";

export default function PaymentsCalendar({ user, isAdmin, t, theme, settings }: { user: any; isAdmin: boolean; t: any; theme: string; settings: any }) {
  const [activeTab, setActiveTab] = useState<'TRACKER' | 'MASTER'>('TRACKER');
  const [templates, setTemplates] = useState<PaymentTemplate[]>([]);
  const [occurrences, setOccurrences] = useState<PaymentOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PaymentTemplate | null>(null);
  
  // Tracker Filtering
  const [trackerSearch, setTrackerSearch] = useState("");
  const [trackerStatusFilter, setTrackerStatusFilter] = useState("ALL");
  const [trackerEntityFilter, setTrackerEntityFilter] = useState("ALL");
  const [trackerTypeFilter, setTrackerTypeFilter] = useState("ALL");
  const [trackerFreqFilter, setTrackerFreqFilter] = useState("ALL");
  
  // Date range defaults: 1st of current month to last of current month
  const getInitialDates = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    
    // First day of current month
    const firstDayDate = new Date(y, m, 1);
    const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    
    // Last day of current month
    const lastDayDate = new Date(y, m + 1, 0);
    const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    
    return { firstDay, lastDay };
  };
  
  const { firstDay, lastDay } = getInitialDates();
  const [trackerFromDate, setTrackerFromDate] = useState(firstDay);
  const [trackerToDate, setTrackerToDate] = useState(lastDay);
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'dueDate', direction: 'asc' });

  // Form State
  const [formData, setFormData] = useState({
    entityName: "",
    paymentDescription: "",
    vendorName: "",
    paymentType: "",
    departmentName: "Finance",
    financeFunction: "",
    frequency: "M",
    vendorEmail: "",
    prodEmail: "production@intellicar.in",
    defaultOwner: user?.name || "",
    defaultReviewer: "",
    dueDay: 1,
    weeklyDay: "Monday",
    startDate: "",
    endDate: ""
  });

  const [showPayModal, setShowPayModal] = useState(false);
  const [activeOccurrence, setActiveOccurrence] = useState<PaymentOccurrence | null>(null);
  const [payData, setPayData] = useState({ actualDate: new Date().toISOString().split('T')[0], amountPaid: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showStopModal, setShowStopModal] = useState(false);
  const [stoppingTemplate, setStoppingTemplate] = useState<PaymentTemplate | null>(null);
  const [stopDate, setStopDate] = useState(new Date().toISOString().split('T')[0]);

  // Report Export & Share State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientTags, setRecipientTags] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [ccTags, setCcTags] = useState<string[]>([]);
  const [shareData, setShareData] = useState({
    subject: "Finance Payment Tracker Report",
    format: "excel" as 'excel' | 'pdf',
    type: 'payments'
  });
  const [isSharing, setIsSharing] = useState(false);

  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdData, setHoldData] = useState({ reason: "" });
  
  const [showRequestEditModal, setShowRequestEditModal] = useState(false);
  const [requestEditData, setRequestEditData] = useState({ reason: "" });
  
  const [showEditOccModal, setShowEditOccModal] = useState(false);
  const [editOccData, setEditOccData] = useState({ actualDate: "", amountPaid: "" });

  useEffect(() => {
    if (settings?.paymentReportEmail) {
      setRecipientTags(settings.paymentReportEmail.split(',').map((e: string) => e.trim()).filter(Boolean));
    }
  }, [settings]);

  useEffect(() => {
    fetchData();
  }, [trackerToDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, oRes] = await Promise.all([
        fetch("/api/payments/master"),
        fetch("/api/payments/tracker")
      ]);
      const allTemplates: PaymentTemplate[] = await tRes.json();
      const allOccurrences: PaymentOccurrence[] = await oRes.json();
      
      setTemplates(allTemplates);
      setOccurrences(allOccurrences);

      // --- Auto-Generation Logic ---
      // Generate up to trackerToDate to show all requested activities in the view
      const lookAheadEnd = new Date(trackerToDate);
      lookAheadEnd.setHours(23, 59, 59, 999);
      
      const staging: any[] = [];

      allTemplates.forEach(t => {
        if (t.isStopped) return;
        
        // Start generating from template start date up to the filtered end date
        const potential = getOccurrencesBetween(t, new Date(t.startDate), lookAheadEnd);
        
        potential.forEach(p => {
          // Check if already exists in current state or DB
          const exists = allOccurrences.find(o => 
            o.templateId === t.id && 
            getPeriodKey(t.frequency as any, new Date(o.dueDate)) === p.periodKey
          );
          
          if (!exists) {
            staging.push({
              templateId: t.id,
              dueDate: p.date.toISOString().split('T')[0],
              periodKey: p.periodKey
            });
          }
        });
      });

      if (staging.length > 0) {
        console.log("Generating payments up to:", trackerToDate, "Count:", staging.length);
        const genRes = await fetch("/api/payments/tracker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payments: staging })
        });
        if (genRes.ok) {
          const freshOcc = await fetch("/api/payments/tracker");
          setOccurrences(await freshOcc.json());
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate ? { ...formData, id: editingTemplate.id } : formData)
      });
      if (res.ok) {
        setShowForm(false);
        setEditingTemplate(null);
        fetchData();
      } else {
        alert("Failed to save template");
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopTemplate = async () => {
    if (!stoppingTemplate) return;
    try {
      const res = await fetch("/api/payments/master/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stoppingTemplate.id, stopDate })
      });
      if (res.ok) {
        setShowStopModal(false);
        setStoppingTemplate(null);
        fetchData();
      }
    } catch (err) {
      console.error("Stop error:", err);
    }
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOccurrence) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/tracker/${activeOccurrence.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payData)
      });
      if (res.ok) {
        setShowPayModal(false);
        setActiveOccurrence(null);
        fetchData();
      }
    } catch (err) {
      console.error("Pay error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHoldPayment = async () => {
    if (!activeOccurrence || !holdData.reason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/tracker/${activeOccurrence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHold: true, holdReason: holdData.reason })
      });
      if (res.ok) {
        setShowHoldModal(false);
        setHoldData({ reason: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Hold error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseHold = async (occ: PaymentOccurrence) => {
    if (!confirm("Release this payment from hold?")) return;
    try {
      await fetch(`/api/payments/tracker/${occ.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHold: false, holdReason: "" })
      });
      fetchData();
    } catch (err) {
      console.error("Release hold error:", err);
    }
  };

  const handleRequestEdit = async () => {
    if (!activeOccurrence || !requestEditData.reason.trim()) return;
    setIsSubmitting(true);
    console.log("Requesting edit for occurrence:", activeOccurrence.id, "Reason:", requestEditData.reason);
    try {
      const res = await fetch(`/api/payments/tracker/${activeOccurrence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editRequested: true, editRequestReason: requestEditData.reason })
      });
      if (res.ok) {
        alert("Edit request sent successfully!");
        setShowRequestEditModal(false);
        setRequestEditData({ reason: "" });
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to send request'}`);
      }
    } catch (err: any) {
      console.error("Request edit error:", err);
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSaveEditOcc = async () => {
    if (!activeOccurrence) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/tracker/${activeOccurrence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualDate: editOccData.actualDate || null,
          amountPaid: editOccData.amountPaid || null
        })
      });
      if (res.ok) {
        setShowEditOccModal(false);
        setActiveOccurrence(null);
        fetchData();
      }
    } catch (err) {
      console.error("Save edit occ error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatus = (occ: PaymentOccurrence) => {
    if (occ.isHold) return "ON HOLD";
    if (occ.isPaid) {
      const due = new Date(occ.dueDate);
      const actual = new Date(occ.actualDate!);
      due.setHours(0,0,0,0);
      actual.setHours(0,0,0,0);
      
      if (actual.getTime() === due.getTime()) return "Paid on due date";
      if (actual.getTime() < due.getTime()) return "Paid Before due date";
      return "Paid After due date";
    }
    const due = new Date(occ.dueDate);
    const today = new Date();
    due.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return today > due ? "OVERDUE" : "NOT YET DUE";
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "OVERDUE": return { bg: "#fee2e2", text: "#ef4444", border: "#fecaca" };
      case "Paid on due date": return { bg: "#dcfce7", text: "#22c55e", border: "#bbf7d0" };
      case "Paid Before due date": return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
      case "Paid After due date": return { bg: "#fef3c7", text: "#f59e0b", border: "#fde68a" };
      case "ON HOLD": return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
      case "NOT YET DUE": return { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" };
      default: return { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const filteredOccurrences = occurrences
    .filter(o => {
      const search = trackerSearch.toLowerCase();
      const status = getStatus(o);
      const matchesSearch = o.vendorName.toLowerCase().includes(search) || o.paymentDescription.toLowerCase().includes(search) || o.entityName.toLowerCase().includes(search);
      const matchesStatus = trackerStatusFilter === "ALL" || status === trackerStatusFilter;
      const matchesEntity = trackerEntityFilter === "ALL" || o.entityName === trackerEntityFilter;
      const matchesType = trackerTypeFilter === "ALL" || o.paymentType === trackerTypeFilter;
      const matchesFreq = trackerFreqFilter === "ALL" || o.frequency === trackerFreqFilter;
      
      const occDate = new Date(o.dueDate);
      const from = new Date(trackerFromDate);
      const to = new Date(trackerToDate);
      from.setHours(0,0,0,0);
      to.setHours(23,59,59,999);
      const matchesDate = occDate >= from && occDate <= to;
      
      return matchesSearch && matchesStatus && matchesEntity && matchesType && matchesFreq && matchesDate;
    })
    .sort((a: any, b: any) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      let valA = a[key];
      let valB = b[key];
      
      if (key === 'dueDate' || key === 'actualDate') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }
      
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payments");

    worksheet.columns = [
      { header: "Entity", key: "entity", width: 20 },
      { header: "Vendor", key: "vendor", width: 25 },
      { header: "Description", key: "desc", width: 35 },
      { header: "Type", key: "type", width: 15 },
      { header: "Frequency", key: "freq", width: 15 },
      { header: "Due Date", key: "due", width: 15 },
      { header: "Actual Date", key: "actual", width: 15 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Status", key: "status", width: 20 },
      { header: "Remarks", key: "remarks", width: 30 }
    ];

    filteredOccurrences.forEach(occ => {
      worksheet.addRow({
        entity: occ.entityName,
        vendor: occ.vendorName,
        desc: occ.paymentDescription,
        type: occ.paymentType,
        freq: occ.frequency,
        due: new Date(occ.dueDate).toLocaleDateString('en-GB'),
        actual: occ.actualDate ? new Date(occ.actualDate).toLocaleDateString('en-GB') : "--",
        amount: occ.amountPaid || 0,
        status: getStatus(occ),
        remarks: occ.isHold ? `HOLD: ${occ.holdReason}` : (occ.editRequested ? `EDIT REQ: ${occ.editRequestReason}` : "")
      });
    });

    // Formatting
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Payments_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowDownloadMenu(false);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Finance Payments Tracker Report", 14, 15);
    
    const tableData = filteredOccurrences.map(occ => [
      occ.entityName,
      occ.vendorName,
      occ.paymentDescription,
      occ.paymentType,
      occ.frequency,
      new Date(occ.dueDate).toLocaleDateString('en-GB'),
      occ.actualDate ? new Date(occ.actualDate).toLocaleDateString('en-GB') : "--",
      occ.amountPaid ? formatCurrency(occ.amountPaid) : "--",
      getStatus(occ)
    ]);

    autoTable(doc, {
      head: [['Entity', 'Vendor', 'Description', 'Type', 'Freq', 'Due Date', 'Actual Date', 'Amount', 'Status', 'Remarks']],
      body: filteredOccurrences.map(occ => [
        occ.entityName, occ.vendorName, occ.paymentDescription, occ.paymentType, occ.frequency,
        new Date(occ.dueDate).toLocaleDateString('en-GB'),
        occ.actualDate ? new Date(occ.actualDate).toLocaleDateString('en-GB') : "--",
        occ.amountPaid ? formatCurrency(occ.amountPaid) : "--",
        getStatus(occ),
        occ.holdReason || ""
      ]),
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Payments_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowDownloadMenu(false);
  };

  const handleShareReport = async () => {
    if (recipientTags.length === 0) {
      alert("Please add at least one recipient email");
      return;
    }
    setIsSharing(true);
    try {
      let buffer: ArrayBuffer | Uint8Array;
      let contentType = "";
      let attachmentName = "";
      const dateStr = new Date().toISOString().split('T')[0];

      if (shareData.format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Payments");
        worksheet.columns = [
          { header: "Entity", key: "entity", width: 20 },
          { header: "Vendor", key: "vendor", width: 25 },
          { header: "Description", key: "desc", width: 35 },
          { header: "Type", key: "type", width: 15 },
          { header: "Frequency", key: "freq", width: 15 },
          { header: "Due Date", key: "due", width: 15 },
          { header: "Actual Date", key: "actual", width: 15 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Status", key: "status", width: 20 }
        ];
        filteredOccurrences.forEach(occ => {
          worksheet.addRow({
            entity: occ.entityName,
            vendor: occ.vendorName,
            desc: occ.paymentDescription,
            type: occ.paymentType,
            freq: occ.frequency,
            due: new Date(occ.dueDate).toLocaleDateString('en-GB'),
            actual: occ.actualDate ? new Date(occ.actualDate).toLocaleDateString('en-GB') : "--",
            amount: occ.amountPaid || 0,
            status: getStatus(occ)
          });
        });
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        buffer = await workbook.xlsx.writeBuffer();
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        attachmentName = `Payments_Report_${dateStr}.xlsx`;
      } else {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.text("Finance Payments Tracker Report", 14, 15);
        const tableData = filteredOccurrences.map(occ => [
          occ.entityName, occ.vendorName, occ.paymentDescription, occ.paymentType, occ.frequency,
          new Date(occ.dueDate).toLocaleDateString('en-GB'),
          occ.actualDate ? new Date(occ.actualDate).toLocaleDateString('en-GB') : "--",
          occ.amountPaid ? formatCurrency(occ.amountPaid) : "--",
          getStatus(occ)
        ]);
        autoTable(doc, {
          head: [['Entity', 'Vendor', 'Description', 'Type', 'Freq', 'Due Date', 'Actual Date', 'Amount', 'Status']],
          body: tableData,
          startY: 20,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] }
        });
        buffer = doc.output('arraybuffer');
        contentType = 'application/pdf';
        attachmentName = `Payments_Report_${dateStr}.pdf`;
      }

      // Convert buffer to base64
      const base64Buffer = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientTags.join(','),
          ccEmail: ccTags.join(','),
          subject: shareData.subject,
          attachmentName,
          attachmentBuffer: base64Buffer,
          contentType
        })
      });

      if (res.ok) {
        alert("Report shared successfully via email!");
        setShowShareModal(false);
      } else {
        const errData = await res.json();
        alert(`Failed to share report: ${errData.message}`);
      }
    } catch (err: any) {
      console.error("Share error:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (!sortConfig || sortConfig.key !== column) return <ArrowUp size={12} style={{ opacity: 0.2 }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", alignItems: "center", gap: "12px" }}>
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            style={{ 
              padding: "8px", borderRadius: "10px", border: "none", background: "#dcfce7", color: "#16a34a", 
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" 
            }}
            title="Download/Share Reports"
          >
            <Download size={20} />
          </button>
          
          {showDownloadMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "white", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", border: `1px solid ${t.border}`, zIndex: 100, minWidth: "180px", overflow: "hidden" }}>
              <button onClick={handleDownloadExcel} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "none", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", color: t.text }}>
                <FileSpreadsheet size={16} color="#16a34a" /> Download Excel
              </button>
              <button onClick={handleDownloadPDF} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", borderTop: `1px solid ${t.border}`, background: "none", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", color: t.text }}>
                <FileText size={16} color="#ef4444" /> Download PDF
              </button>
              <button onClick={() => { setShowShareModal(true); setShowDownloadMenu(false); }} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", borderTop: `1px solid ${t.border}`, background: "none", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", color: t.text }}>
                <Mail size={16} color="#2563eb" /> Share via Email
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", background: t.card, padding: "4px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
          <button 
            onClick={() => setActiveTab('TRACKER')}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: activeTab === 'TRACKER' ? "#2563eb" : "transparent", color: activeTab === 'TRACKER' ? "white" : t.textMuted, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", transition: "all 0.2s" }}
          >
            Payments Tracker
          </button>
          <button 
            onClick={() => setActiveTab('MASTER')}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: activeTab === 'MASTER' ? "#2563eb" : "transparent", color: activeTab === 'MASTER' ? "white" : t.textMuted, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", transition: "all 0.2s" }}
          >
            Payments Master Sheet
          </button>
        </div>
      </div>

      {activeTab === 'TRACKER' ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Tracker Filters */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={trackerSearch}
                onChange={e => setTrackerSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 8px 8px 34px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", fontSize: "0.8125rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 600 }}>From:</span>
              <input 
                type="date" 
                value={trackerFromDate}
                onChange={e => setTrackerFromDate(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: "0.8125rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 600 }}>To:</span>
              <input 
                type="date" 
                value={trackerToDate}
                onChange={e => setTrackerToDate(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: "0.8125rem" }}
              />
            </div>

            <select 
              value={trackerStatusFilter}
              onChange={e => setTrackerStatusFilter(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", fontSize: "0.8125rem", minWidth: "120px" }}
            >
              <option value="ALL">All Status</option>
              <option value="ON HOLD">On Hold</option>
              <option value="OVERDUE">Overdue</option>
              <option value="NOT YET DUE">Upcoming</option>
              <option value="Paid Before due date">Paid Before due date</option>
              <option value="Paid on due date">Paid on due date</option>
              <option value="Paid After due date">Paid After due date</option>
            </select>

            <select 
              value={trackerTypeFilter}
              onChange={e => setTrackerTypeFilter(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", fontSize: "0.8125rem", minWidth: "120px" }}
            >
              <option value="ALL">All Types</option>
              {(settings.masterPaymentTypes || "AMC,Rent,Security,Utility,Salaries,Other").split(',').map((type: string) => (
                <option key={type.trim()} value={type.trim()}>{type.trim()}</option>
              ))}
            </select>

            <select 
              value={trackerFreqFilter}
              onChange={e => setTrackerFreqFilter(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", fontSize: "0.8125rem", minWidth: "120px" }}
            >
              <option value="ALL">All Freq</option>
              <option value="M">Monthly</option>
              <option value="Q">Quarterly</option>
              <option value="Y">Yearly</option>
              <option value="W">Weekly</option>
              <option value="BW">Bi-Weekly</option>
              <option value="D">Daily</option>
            </select>

            <select 
              value={trackerEntityFilter}
              onChange={e => setTrackerEntityFilter(e.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", fontSize: "0.8125rem", minWidth: "120px" }}
            >
              <option value="ALL">All Entities</option>
              {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
            </select>
          </div>

          {/* Tracker Table */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme === 'DARK' ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('entityName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Entity <SortIcon column="entityName" /></div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('vendorName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Vendor <SortIcon column="vendorName" /></div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('paymentDescription')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Description <SortIcon column="paymentDescription" /></div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('paymentType')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Type <SortIcon column="paymentType" /></div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('frequency')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Freq <SortIcon column="frequency" /></div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('dueDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Due Date <SortIcon column="dueDate" /></div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => requestSort('actualDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>Actual Date <SortIcon column="actualDate" /></div>
                  </th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Hold</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOccurrences.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No payment records found.</td></tr>
                ) : (
                  filteredOccurrences.map(occ => {
                    const status = getStatus(occ);
                    const style = getStatusStyle(status);
                    return (
                      <tr key={occ.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.background = theme === 'DARK' ? "rgba(255,255,255,0.02)" : "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <td style={tdStyle}>{occ.entityName}</td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{occ.vendorName}</div>
                        </td>
                        <td style={tdStyle}>{occ.paymentDescription}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: "0.7rem", color: t.textMuted, background: theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>{occ.paymentType}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#2563eb" }}>{occ.frequency}</span>
                        </td>
                        <td style={tdStyle}>{new Date(occ.dueDate).toLocaleDateString('en-GB')}</td>
                        <td style={tdStyle}>{occ.actualDate ? new Date(occ.actualDate).toLocaleDateString('en-GB') : "--"}</td>
                        <td style={tdStyle}>{occ.amountPaid ? formatCurrency(occ.amountPaid) : "--"}</td>
                        <td style={tdStyle}>
                          <span style={{ 
                            padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700,
                            background: style.bg, color: style.text, border: `1px solid ${style.border}`
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {occ.isHold ? (
                            <button 
                              onClick={() => handleReleaseHold(occ)}
                              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: "0.7rem", cursor: "pointer" }}
                            >
                              Release
                            </button>
                          ) : (
                            !occ.isPaid && (
                              <button 
                                onClick={() => { setActiveOccurrence(occ); setShowHoldModal(true); }}
                                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", color: "#ef4444", fontSize: "0.7rem", cursor: "pointer" }}
                              >
                                Hold
                              </button>
                            )
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {!occ.isPaid && !occ.isHold && (
                              <button 
                                onClick={() => { setActiveOccurrence(occ); setShowPayModal(true); }}
                                style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                              >
                                Mark Paid
                              </button>
                            )}
                            
                            {occ.isPaid && !occ.editRequested && !occ.editApproved && (
                                <button 
                                    onClick={() => { setActiveOccurrence(occ); setShowRequestEditModal(true); }}
                                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "0.7rem", cursor: "pointer" }}
                                >
                                    Request Edit
                                </button>
                            )}

                            {occ.editRequested && !occ.editApproved && (
                                <span style={{ fontSize: "0.65rem", color: "#f59e0b", fontStyle: "italic" }}>Pending Approval</span>
                            )}

                            {occ.editApproved && (
                                <button 
                                    onClick={() => { 
                                        setActiveOccurrence(occ); 
                                        setEditOccData({ actualDate: occ.actualDate || "", amountPaid: occ.amountPaid?.toString() || "" });
                                        setShowEditOccModal(true); 
                                    }}
                                    style={{ padding: "6px", borderRadius: "8px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", cursor: "pointer" }}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Master Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => { setEditingTemplate(null); setFormData({ ...formData, entityName: "", paymentDescription: "", vendorName: "", vendorEmail: "", startDate: "", endDate: "" }); setShowForm(true); }}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" }}
            >
              <Plus size={18} /> Add New Payment Info
            </button>
          </div>

          {/* Master Table */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme === 'DARK' ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Vendor</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Frequency</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No payment templates found.</td></tr>
                ) : (
                  templates.map((temp: PaymentTemplate) => (
                    <tr key={temp.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={tdStyle}>{temp.entityName}</td>
                      <td style={tdStyle}>{temp.paymentDescription}</td>
                      <td style={tdStyle}>{temp.vendorName}</td>
                      <td style={tdStyle}>{temp.paymentType}</td>
                      <td style={tdStyle}>{temp.frequency}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700,
                          background: temp.isStopped ? "#fee2e2" : "#dcfce7", color: temp.isStopped ? "#ef4444" : "#22c55e"
                        }}>
                          {temp.isStopped ? "STOPPED" : "ACTIVE"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => { setEditingTemplate(temp); setFormData(temp as any); setShowForm(true); }} style={iconBtnStyle}><Edit2 size={16} /></button>
                          {!temp.isStopped && <button onClick={() => { setStoppingTemplate(temp); setShowStopModal(true); }} style={{ ...iconBtnStyle, color: "#ef4444" }} title="Stop Recurring Payment"><StopCircle size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Setup Form Modal */}
      {showForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "600px" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{editingTemplate ? "Edit Payment Info" : "Add New Payment Info"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
            </div>
            <form onSubmit={handleSaveTemplate} style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Entity Name</label>
                <select 
                  required
                  value={formData.entityName}
                  onChange={e => setFormData({...formData, entityName: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">Select Entity</option>
                  {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Payment Description</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Monthly Office Rent"
                  value={formData.paymentDescription}
                  onChange={e => setFormData({...formData, paymentDescription: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Vendor Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Acme Corp"
                  value={formData.vendorName}
                  onChange={e => setFormData({...formData, vendorName: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Type of Payment</label>
                <select 
                  required
                  value={formData.paymentType}
                  onChange={e => setFormData({...formData, paymentType: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">Select Type</option>
                  {settings.masterPaymentTypes?.split(',').map((type: string) => <option key={type} value={type.trim()}>{type.trim()}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Department</label>
                <select 
                  value={formData.departmentName}
                  onChange={e => setFormData({...formData, departmentName: e.target.value})}
                  style={inputStyle}
                >
                  {settings.masterDepartments.split(',').map((d: string) => <option key={d} value={d.trim()}>{d.trim()}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Finance Function</label>
                <select 
                  value={formData.financeFunction}
                  onChange={e => setFormData({...formData, financeFunction: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">Select Function</option>
                  {settings.masterRequestTypes.split(',').map((f: string) => <option key={f} value={f.trim()}>{f.trim()}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Frequency</label>
                <select 
                  value={formData.frequency}
                  onChange={e => setFormData({...formData, frequency: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">Select Frequency</option>
                  {(settings.masterFrequencies || "").split(',').map((f: string) => {
                    const label = f.trim() === 'M' ? 'Monthly' : 
                                f.trim() === 'Q' ? 'Quarterly' : 
                                f.trim() === 'Y' ? 'Yearly' : 
                                f.trim() === 'W' ? 'Weekly' : 
                                f.trim() === 'BW' ? 'Bi-Weekly' : 
                                f.trim() === 'H' ? 'Half-Yearly' : 
                                f.trim() === 'D' ? 'Daily' : f.trim();
                    return <option key={f} value={f.trim()}>{label}</option>;
                  })}
                </select>
              </div>

              {['M', 'Q', 'H', 'Y', '2Y'].includes(formData.frequency) && (
                <div>
                  <label style={labelStyle}>Due Day (Date of Month)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31"
                    placeholder="e.g. 5"
                    value={formData.dueDay || ""}
                    onChange={e => setFormData({...formData, dueDay: Number(e.target.value)})}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "4px" }}>Payment will be due on this date every period.</p>
                </div>
              )}

              {formData.frequency === 'W' && (
                <div>
                  <label style={labelStyle}>Weekly Day</label>
                  <select 
                    value={formData.weeklyDay}
                    onChange={e => setFormData({...formData, weeklyDay: e.target.value})}
                    style={inputStyle}
                  >
                    {(settings.masterWeekDays || "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday").split(',').map((day: string) => (
                      <option key={day.trim()} value={day.trim()}>{day.trim()}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={labelStyle}>Vendor Email ID</label>
                <input 
                  type="email" 
                  placeholder="vendor@example.com"
                  value={formData.vendorEmail}
                  onChange={e => setFormData({...formData, vendorEmail: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Intellicar Production Mail ID</label>
                <input 
                  type="email" 
                  value={formData.prodEmail}
                  onChange={e => setFormData({...formData, prodEmail: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Start Date</label>
                <input 
                  required
                  type="date" 
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>End Date</label>
                <input 
                  type="date" 
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", marginTop: "12px", display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "white", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", fontWeight: 600 }}>
                  {isSubmitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showPayModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "400px" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Record Payment</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
            </div>
            <form onSubmit={handleMarkAsPaid} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Actual Payment Date</label>
                <input 
                  required
                  type="date" 
                  value={payData.actualDate}
                  onChange={e => setPayData({...payData, actualDate: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Amount Paid (INR)</label>
                <input 
                  required
                  type="number" 
                  placeholder="Enter amount"
                  value={payData.amountPaid}
                  onChange={e => setPayData({...payData, amountPaid: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "white", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#22c55e", color: "white", fontWeight: 600 }}>
                  {isSubmitting ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stop Modal */}
      {showStopModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "400px" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: "#ef4444" }}>Stop Schedule</h3>
              <button onClick={() => setShowStopModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: t.textMuted }}>Specify a stop date. No new payment occurrences will be generated after this date.</p>
              <input 
                type="date" 
                value={stopDate}
                onChange={e => setStopDate(e.target.value)}
                style={inputStyle}
              />
              <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                <button onClick={() => setShowStopModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "white", fontWeight: 600 }}>Cancel</button>
                <button onClick={handleStopTemplate} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#ef4444", color: "white", fontWeight: 600 }}>Stop Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Share Payments Report</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>Send the current payment tracker as an attachment.</p>
              </div>
              <button onClick={() => setShowShareModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Recipient Emails *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", minHeight: "45px", background: "#f8fafc" }}>
                  {recipientTags.map((email, idx) => (
                    <div key={idx} style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      {email}
                      <X size={14} style={{ cursor: "pointer" }} onClick={() => setRecipientTags(prev => prev.filter((_, i) => i !== idx))} />
                    </div>
                  ))}
                  <input 
                    type="text" 
                    placeholder={recipientTags.length === 0 ? "Type email and press Enter..." : ""}
                    value={recipientInput}
                    onChange={e => setRecipientInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const email = recipientInput.trim().toLowerCase();
                            if (email && email.includes('@') && !recipientTags.includes(email)) {
                              setRecipientTags([...recipientTags, email]);
                              setRecipientInput("");
                            }
                        }
                    }}
                    style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", flex: 1, minWidth: "120px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>CC Emails (Optional)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", minHeight: "45px", background: "#f8fafc" }}>
                  {ccTags.map((email, idx) => (
                    <div key={idx} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      {email}
                      <X size={14} style={{ cursor: "pointer" }} onClick={() => setCcTags(prev => prev.filter((_, i) => i !== idx))} />
                    </div>
                  ))}
                  <input 
                    type="text" 
                    placeholder={ccTags.length === 0 ? "Type email and press Enter..." : ""}
                    value={ccInput}
                    onChange={e => setCcInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const email = ccInput.trim().toLowerCase();
                            if (email && email.includes('@') && !ccTags.includes(email)) {
                              setCcTags([...ccTags, email]);
                              setCcInput("");
                            }
                        }
                    }}
                    style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", flex: 1, minWidth: "120px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Report Format</label>
                  <select 
                    value={shareData.format}
                    onChange={e => setShareData({...shareData, format: e.target.value as any})}
                    style={inputStyle}
                  >
                    <option value="excel">Excel Spreadsheet (.xlsx)</option>
                    <option value="pdf">PDF Document (.pdf)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Subject</label>
                <input 
                  type="text" 
                  value={shareData.subject}
                  onChange={e => setShareData({...shareData, subject: e.target.value})}
                  style={inputStyle} 
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button 
                  onClick={() => setShowShareModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleShareReport}
                  disabled={isSharing}
                  style={{ 
                    flex: 1, padding: "12px", borderRadius: "10px", border: "none", 
                    background: isSharing ? "#94a3b8" : "#16a34a", color: "white", 
                    fontWeight: 600, cursor: isSharing ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                  }}
                >
                  {isSharing ? "Sharing..." : <><Send size={18} /> Share Report</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hold Modal */}
      {showHoldModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "450px" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef2f2" }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: "#ef4444" }}>Hold Payment</h3>
              <button onClick={() => setShowHoldModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
            </div>
            <div style={{ padding: "24px" }}>
              <label style={labelStyle}>Reason for Hold</label>
              <textarea 
                value={holdData.reason}
                onChange={e => setHoldData({ reason: e.target.value })}
                style={{ ...inputStyle, minHeight: "100px", resize: "none" }}
                placeholder="e.g., Discrepancy in invoice amount..."
              />
              <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                <button onClick={() => setShowHoldModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "white", fontWeight: 600 }}>Cancel</button>
                <button onClick={handleHoldPayment} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#ef4444", color: "white", fontWeight: 600 }}>
                  {isSubmitting ? "Holding..." : "Confirm Hold"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Edit Modal */}
      {showRequestEditModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "450px" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fffbeb" }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: "#f59e0b" }}>Request Payment Edit</h3>
              <button onClick={() => setShowRequestEditModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
            </div>
            <div style={{ padding: "24px" }}>
              <label style={labelStyle}>Reason for Edit</label>
              <textarea 
                value={requestEditData.reason}
                onChange={e => setRequestEditData({ reason: e.target.value })}
                style={{ ...inputStyle, minHeight: "100px", resize: "none" }}
                placeholder="e.g., Wrong payment date entered..."
              />
              <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                <button onClick={() => setShowRequestEditModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "white", fontWeight: 600 }}>Cancel</button>
                <button onClick={handleRequestEdit} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#f59e0b", color: "white", fontWeight: 600 }}>
                  {isSubmitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Occurrence Modal (The "Pen" action) */}
      {showEditOccModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "450px" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eff6ff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Edit2 size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontWeight: 700, color: "#2563eb" }}>Edit Payment Details</h3>
              </div>
              <button onClick={() => setShowEditOccModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Actual Payment Date</label>
                <input 
                  type="date" 
                  value={editOccData.actualDate ? new Date(editOccData.actualDate).toISOString().split('T')[0] : ""}
                  onChange={e => setEditOccData({ ...editOccData, actualDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Amount Paid</label>
                <input 
                  type="number" 
                  value={editOccData.amountPaid}
                  onChange={e => setEditOccData({ ...editOccData, amountPaid: e.target.value })}
                  style={inputStyle}
                  placeholder="Enter amount..."
                />
              </div>
              <p style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                Note: Clearing both fields will mark this as unpaid.
              </p>
              <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
                <button onClick={() => setShowEditOccModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "white", fontWeight: 600 }}>Cancel</button>
                <button onClick={handleSaveEditOcc} disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", fontWeight: 600 }}>
                  {isSubmitting ? "Saving..." : "Update Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = { padding: "12px 16px", textAlign: "left" as const, fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const tdStyle = { padding: "16px", fontSize: "0.875rem" };
const iconBtnStyle = { background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" };
const modalOverlayStyle = { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" };
const modalContentStyle = { background: "white", borderRadius: "20px", width: "100%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" };
const labelStyle = { display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.875rem", outline: "none" };

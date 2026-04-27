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
  leadTime: number;
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
    leadTime: 7,
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

  useEffect(() => {
    fetchData();
  }, []);

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
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Check up to end of next month
      const staging: any[] = [];

      allTemplates.forEach(t => {
        if (t.isStopped) return;
        const potential = getOccurrencesBetween(t, new Date(t.startDate), nextMonth);
        potential.forEach(p => {
          // Check if within lead time (using template's custom leadTime)
          const diffDays = Math.ceil((new Date(p.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= (t.leadTime || 7)) {
            // Check if already exists
            const exists = allOccurrences.find(o => o.templateId === t.id && getPeriodKey(t.frequency as any, new Date(o.dueDate)) === p.periodKey);
            if (!exists) {
              staging.push({
                templateId: t.id,
                dueDate: p.date.toISOString().split('T')[0],
                periodKey: p.periodKey
              });
            }
          }
        });
      });

      if (staging.length > 0) {
        console.log("Generating payments:", staging.length);
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

  const getStatus = (occ: PaymentOccurrence) => {
    if (occ.isPaid) {
      const due = new Date(occ.dueDate);
      const actual = new Date(occ.actualDate!);
      due.setHours(0,0,0,0);
      actual.setHours(0,0,0,0);
      return actual > due ? "PAID (DELAYED)" : "PAID (ON TIME)";
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
      case "PAID (ON TIME)": return { bg: "#dcfce7", text: "#22c55e", border: "#bbf7d0" };
      case "PAID (DELAYED)": return { bg: "#fef3c7", text: "#f59e0b", border: "#fde68a" };
      case "NOT YET DUE": return { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" };
      default: return { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const filteredOccurrences = occurrences.filter(o => {
    const search = trackerSearch.toLowerCase();
    const status = getStatus(o);
    const matchesSearch = o.vendorName.toLowerCase().includes(search) || o.paymentDescription.toLowerCase().includes(search) || o.entityName.toLowerCase().includes(search);
    const matchesStatus = trackerStatusFilter === "ALL" || status === trackerStatusFilter;
    const matchesEntity = trackerEntityFilter === "ALL" || o.entityName === trackerEntityFilter;
    return matchesSearch && matchesStatus && matchesEntity;
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header & Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: t.text }}>Payments Calendar</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: t.textMuted }}>Manage recurring vendor payments and track execution.</p>
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
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input 
                type="text" 
                placeholder="Search vendor, description..." 
                value={trackerSearch}
                onChange={e => setTrackerSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 10px 10px 40px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none" }}
              />
            </div>
            <select 
              value={trackerStatusFilter}
              onChange={e => setTrackerStatusFilter(e.target.value)}
              style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", minWidth: "150px" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OVERDUE">Overdue</option>
              <option value="NOT YET DUE">Not Yet Due</option>
              <option value="PAID (ON TIME)">Paid (On Time)</option>
              <option value="PAID (DELAYED)">Paid (Delayed)</option>
            </select>
            <select 
              value={trackerEntityFilter}
              onChange={e => setTrackerEntityFilter(e.target.value)}
              style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.card, color: t.text, outline: "none", minWidth: "150px" }}
            >
              <option value="ALL">All Entities</option>
              {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
            </select>
          </div>

          {/* Tracker Table */}
          <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme === 'DARK' ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Vendor</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Actual Date</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
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
                      <tr key={occ.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={tdStyle}>{occ.entityName}</td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{occ.vendorName}</div>
                          <div style={{ fontSize: "0.7rem", color: t.textMuted }}>{occ.paymentType}</div>
                        </td>
                        <td style={tdStyle}>{occ.paymentDescription}</td>
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
                          {!occ.isPaid && (
                            <button 
                              onClick={() => { setActiveOccurrence(occ); setShowPayModal(true); }}
                              style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                            >
                              Mark Paid
                            </button>
                          )}
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
                  <option value="M">Monthly</option>
                  <option value="Q">Quarterly</option>
                  <option value="Y">Yearly</option>
                  <option value="W">Weekly</option>
                  <option value="BW">Bi-Weekly</option>
                  <option value="H">Half-Yearly</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Lead Time (Days)</label>
                <input 
                  type="number" 
                  value={formData.leadTime}
                  onChange={e => setFormData({...formData, leadTime: Number(e.target.value)})}
                  style={inputStyle}
                />
              </div>

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

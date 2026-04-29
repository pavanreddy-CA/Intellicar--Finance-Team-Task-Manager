"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Calendar, Filter, PieChart as PieIcon, 
  BarChart3, TrendingUp, Info, Table as TableIcon, 
  ArrowUpRight, ArrowDownRight, Wallet, Activity,
  ChevronDown, X, Trash2, CheckCircle2, AlertCircle,
  Zap, ArrowRight
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
  Sector
} from "recharts";

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
  const [activeIndex, setActiveIndex] = useState(0);

  // Table Filters
  const [tableFilters, setTableFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    entity: 'ALL',
    type: 'ALL',
    status: 'ALL',
    search: ''
  });

  // Chart Filters
  const [chartFilters, setChartFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    entity: 'ALL',
    type: 'ALL',
    status: 'ALL'
  });

  // New Entry Form State
  const [newEntry, setNewEntry] = useState({
    entity_name: "",
    payment_type: "",
    frequency: "M",
    amount: "",
    status: "Paid on due date",
    transaction_count: "1",
    payment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchManualEntries();
  }, []);

  const fetchManualEntries = async () => {
    try {
      const res = await fetch('/api/payments/analytics/manual');
      if (res.ok) {
        const data = await res.json();
        setManualEntries(data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
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
          transactionCount: parseInt(newEntry.transaction_count)
        })
      });
      if (res.ok) {
        showNotification("Entry added successfully!");
        setShowAddEntry(false);
        fetchManualEntries();
        setNewEntry({
          ...newEntry,
          amount: "",
          transaction_count: "1",
          entity_name: "",
          payment_type: ""
        });
      }
    } catch (error) {
      showNotification("Failed to add entry.");
    } finally {
      setIsSubmitting(false);
    }
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
        id: `tracker-${o.id}`,
        entity_name: o.entityName,
        payment_type: o.paymentType,
        frequency: o.frequency,
        amount: o.amountPaid || 0,
        status: (() => {
          const due = new Date(o.dueDate);
          const actual = new Date(o.actualDate);
          due.setHours(0,0,0,0);
          actual.setHours(0,0,0,0);
          if (actual.getTime() === due.getTime()) return "Paid on due date";
          if (actual.getTime() < due.getTime()) return "Paid Before due date";
          return "Paid After due date";
        })(),
        transaction_count: 1,
        payment_date: o.actualDate ? new Date(o.actualDate).toISOString().split('T')[0] : o.dueDate,
        isTracker: true
      }));

    const manual = manualEntries.map(e => ({
      ...e,
      id: `manual-${e.id}`,
      isTracker: false
    }));

    return [...trackerPaid, ...manual];
  }, [trackerOccurrences, manualEntries]);

  const filteredTableData = useMemo(() => {
    return combinedData.filter(d => {
      const dateInRange = d.payment_date >= tableFilters.fromDate && d.payment_date <= tableFilters.toDate;
      const entityMatch = tableFilters.entity === 'ALL' || d.entity_name === tableFilters.entity;
      const typeMatch = tableFilters.type === 'ALL' || d.payment_type === tableFilters.type;
      const statusMatch = tableFilters.status === 'ALL' || d.status === tableFilters.status;
      const searchMatch = !tableFilters.search || 
        d.entity_name.toLowerCase().includes(tableFilters.search.toLowerCase()) ||
        d.payment_type.toLowerCase().includes(tableFilters.search.toLowerCase());
      
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
    const totalAmount = filteredChartData.reduce((sum, d) => sum + d.amount, 0);
    const totalCount = filteredChartData.reduce((sum, d) => sum + d.transaction_count, 0);
    const onTimeCount = filteredChartData.filter(d => d.status !== "Paid After due date").reduce((sum, d) => sum + d.transaction_count, 0);
    const healthScore = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0;

    const statusMap: Record<string, number> = {};
    filteredChartData.forEach(d => {
      statusMap[d.status] = (statusMap[d.status] || 0) + d.transaction_count;
    });
    const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const entityMap: Record<string, number> = {};
    filteredChartData.forEach(d => {
      entityMap[d.entity_name] = (entityMap[d.entity_name] || 0) + d.amount;
    });
    const barData = Object.entries(entityMap).map(([name, amount]) => ({ name, amount })).sort((a,b) => b.amount - a.amount).slice(0, 8);

    const trendMap: Record<string, number> = {};
    filteredChartData.forEach(d => {
      const key = d.payment_date.substring(0, 7);
      trendMap[key] = (trendMap[key] || 0) + d.amount;
    });
    const trendData = Object.entries(trendMap).map(([date, amount]) => ({ 
      date: new Date(date + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), 
      amount 
    })).sort((a,b) => a.date.localeCompare(b.date));

    return { totalAmount, totalCount, healthScore, pieData, barData, trendData };
  }, [filteredChartData]);

  const insights = useMemo(() => {
    if (filteredChartData.length === 0) return "Select a wider date range to see intelligence insights.";
    
    const topEntity = stats.barData[0]?.name || "N/A";
    const statusMsg = stats.healthScore >= 95 ? "Outstanding payment health! Your team is remarkably punctual." : 
                     stats.healthScore >= 80 ? "Your payment health is strong. Minor late payments detected." : 
                     "Attention required: Payment delays are impacting your health score.";
    
    return `In this period, ₹${stats.totalAmount.toLocaleString()} was processed across ${stats.totalCount.toLocaleString()} transactions. 
            ${topEntity} represents your highest financial volume. ${statusMsg}`;
  }, [stats, filteredChartData]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899", "#06b6d4"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: theme === 'DARK' ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          padding: "12px 16px",
          borderRadius: "16px",
          border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
        }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{label}</p>
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#3b82f6" }}>₹{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fade-in 0.5s ease-out" }}>
      {/* Styles for Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .recharts-area-path { filter: drop-shadow(0 4px 6px rgba(59, 130, 246, 0.3)); }
        .recharts-pie-sector { transition: all 0.3s ease; }
        .recharts-pie-sector:hover { cursor: pointer; opacity: 0.8; }
      `}} />

      {/* Navigation Header */}
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", 
        padding: "20px 24px", borderRadius: "20px", 
        border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", padding: "12px", borderRadius: "14px", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)" }}>
            <Activity size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Finance Analytics Hub</h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>Real-time treasury intelligence & performance</p>
          </div>
        </div>

        <div style={{ display: "flex", background: theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "4px", borderRadius: "14px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}` }}>
          <button 
            onClick={() => setActiveTab('TABLE')}
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "10px", border: "none",
              background: activeTab === 'TABLE' ? "#3b82f6" : "transparent",
              color: activeTab === 'TABLE' ? "white" : "#64748b",
              cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            <TableIcon size={18} /> Detailed Records
          </button>
          <button 
            onClick={() => setActiveTab('CHARTS')}
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "10px", border: "none",
              background: activeTab === 'CHARTS' ? "#3b82f6" : "transparent",
              color: activeTab === 'CHARTS' ? "white" : "#64748b",
              cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            <PieIcon size={18} /> Visual Dashboard
          </button>
        </div>
      </div>

      {activeTab === 'TABLE' ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Table Filters */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", background: theme === 'DARK' ? "rgba(30, 41, 59, 0.4)" : "#f8fafc", padding: "24px", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#e2e8f0"}` }}>
            <div>
              <label style={filterLabelStyle}>From Date</label>
              <input type="date" value={tableFilters.fromDate} onChange={e => setTableFilters({...tableFilters, fromDate: e.target.value})} style={filterInputStyle(theme)} />
            </div>
            <div>
              <label style={filterLabelStyle}>To Date</label>
              <input type="date" value={tableFilters.toDate} onChange={e => setTableFilters({...tableFilters, toDate: e.target.value})} style={filterInputStyle(theme)} />
            </div>
            <div>
              <label style={filterLabelStyle}>By Entity</label>
              <select value={tableFilters.entity} onChange={e => setTableFilters({...tableFilters, entity: e.target.value})} style={filterInputStyle(theme)}>
                <option value="ALL">All Entities</option>
                {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
              </select>
            </div>
            <div>
              <label style={filterLabelStyle}>By Type</label>
              <select value={tableFilters.type} onChange={e => setTableFilters({...tableFilters, type: e.target.value})} style={filterInputStyle(theme)}>
                <option value="ALL">All Types</option>
                {settings.masterPaymentTypes.split(',').map((t: string) => <option key={t} value={t.trim()}>{t.trim()}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button 
                onClick={() => setShowAddEntry(true)}
                style={{ width: "100%", height: "44px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", transition: "all 0.2s" }}
              >
                <Plus size={18} /> Add Entry
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", borderRadius: "20px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme === 'DARK' ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                  <th style={thStyle}>Entity Name</th>
                  <th style={thStyle}>Payment Type</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Txn Count</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTableData.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "64px", textAlign: "center", color: "#64748b", fontWeight: 500 }}>No analytical records found. Change filters or add an entry.</td></tr>
                ) : (
                  filteredTableData.map((d) => (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`, transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = theme === 'DARK' ? "rgba(255,255,255,0.02)" : "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <td style={tdStyle}>{d.entity_name}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: theme === 'DARK' ? "rgba(59, 130, 246, 0.15)" : "#eff6ff", color: "#3b82f6" }}>{d.payment_type}</span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>₹{d.amount.toLocaleString()}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          fontSize: "0.7rem", fontWeight: 800, padding: "4px 12px", borderRadius: "20px",
                          background: d.status === "Paid After due date" ? "#fee2e2" : "#dcfce7",
                          color: d.status === "Paid After due date" ? "#ef4444" : "#10b981",
                          border: `1px solid ${d.status === "Paid After due date" ? "#fecaca" : "#bbf7d0"}`
                        }}>
                          {d.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{d.transaction_count}</td>
                      <td style={tdStyle}>{new Date(d.payment_date).toLocaleDateString('en-GB')}</td>
                      <td style={tdStyle}>
                        {!d.isTracker && (
                          <button onClick={() => handleDeleteEntry(parseInt(d.id.split('-')[1]))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6 }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Graphical Filters */}
          <div style={{ 
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", 
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", padding: "24px", borderRadius: "24px", color: "white",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
          }}>
            <div>
              <label style={{ ...filterLabelStyle, color: "rgba(255,255,255,0.6)" }}>Analysis From</label>
              <input type="date" value={chartFilters.fromDate} onChange={e => setChartFilters({...chartFilters, fromDate: e.target.value})} style={chartFilterInputStyle} />
            </div>
            <div>
              <label style={{ ...filterLabelStyle, color: "rgba(255,255,255,0.6)" }}>Analysis To</label>
              <input type="date" value={chartFilters.toDate} onChange={e => setChartFilters({...chartFilters, toDate: e.target.value})} style={chartFilterInputStyle} />
            </div>
            <div>
              <label style={{ ...filterLabelStyle, color: "rgba(255,255,255,0.6)" }}>Entity Focus</label>
              <select value={chartFilters.entity} onChange={e => setChartFilters({...chartFilters, entity: e.target.value})} style={chartFilterInputStyle}>
                <option value="ALL">All Entities</option>
                {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...filterLabelStyle, color: "rgba(255,255,255,0.6)" }}>Payment Status</label>
              <select value={chartFilters.status} onChange={e => setChartFilters({...chartFilters, status: e.target.value})} style={chartFilterInputStyle}>
                <option value="ALL">All Status</option>
                <option value="Paid on due date">On Due Date</option>
                <option value="Paid Before due date">Before Due Date</option>
                <option value="Paid After due date">After Due Date</option>
              </select>
            </div>
          </div>

          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div style={statCardStyle(theme)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Health Index</span>
                <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px", borderRadius: "12px", color: "#10b981" }}><CheckCircle2 size={22} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <div style={{ fontSize: "3rem", fontWeight: 900, color: theme === 'DARK' ? "white" : "#1e293b", letterSpacing: "-0.05em" }}>{stats.healthScore}%</div>
                <ArrowUpRight size={24} color="#10b981" />
              </div>
              <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ width: `${stats.healthScore}%`, height: "100%", background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)", borderRadius: "3px", transition: "width 1s ease-out" }}></div>
              </div>
            </div>

            <div style={statCardStyle(theme)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Volume</span>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "10px", borderRadius: "12px", color: "#3b82f6" }}><Wallet size={22} /></div>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 900, color: theme === 'DARK' ? "white" : "#1e293b", letterSpacing: "-0.02em" }}>₹{stats.totalAmount.toLocaleString()}</div>
              <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{stats.totalCount.toLocaleString()} Transactions processed</p>
            </div>

            <div style={{ ...statCardStyle(theme), background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", color: "white", border: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Zap size={20} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase" }}>Strategic Intelligence</span>
              </div>
              <p style={{ margin: 0, fontSize: "1rem", lineHeight: "1.7", fontWeight: 500, color: "#e2e8f0" }}>{insights}</p>
              <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa", cursor: "pointer" }}>
                View Actionable Recommendations <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
            <div style={chartContainerStyle(theme)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Spending Velocity</h4>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", background: "#f8fafc", padding: "4px 10px", borderRadius: "8px" }}>Monthly Trends</div>
              </div>
              <div style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trendData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tick={{dy: 10}} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" animationBegin={300} animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={chartContainerStyle(theme)}>
              <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Health Breakdown</h4>
              <div style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={stats.pieData} 
                      innerRadius={70} 
                      outerRadius={100} 
                      paddingAngle={8} 
                      dataKey="value"
                      stroke="none"
                      animationBegin={500}
                      animationDuration={1500}
                      cornerRadius={10}
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={chartContainerStyle(theme)}>
            <h4 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 800 }}>Top Entity Financial Footprint</h4>
            <div style={{ height: "350px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.barData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tick={{dy: 10}} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={40} animationDuration={2000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: theme === 'DARK' ? "#1e293b" : "white", borderRadius: "28px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", overflow: "hidden", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}` }}>
            <div style={{ padding: "28px", borderBottom: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>Create Record</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>Add a manual entry to your financial analytics pool.</p>
              </div>
              <button onClick={() => setShowAddEntry(false)} style={{ background: theme === 'DARK' ? "rgba(255,255,255,0.05)" : "#f1f5f9", border: "none", color: "#64748b", cursor: "pointer", width: "36px", height: "36px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddEntry} style={{ padding: "28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={filterLabelStyle}>Company Entity</label>
                <select required value={newEntry.entity_name} onChange={e => setNewEntry({...newEntry, entity_name: e.target.value})} style={filterInputStyle(theme)}>
                  <option value="">Select Company</option>
                  {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={filterLabelStyle}>Payment Type</label>
                <select required value={newEntry.payment_type} onChange={e => setNewEntry({...newEntry, payment_type: e.target.value})} style={filterInputStyle(theme)}>
                  <option value="">Select Nature of Payment</option>
                  {settings.masterPaymentTypes.split(',').map((t: string) => <option key={t} value={t.trim()}>{t.trim()}</option>)}
                </select>
              </div>
              <div>
                <label style={filterLabelStyle}>Amount (INR)</label>
                <input required type="number" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} style={filterInputStyle(theme)} placeholder="₹ 0.00" />
              </div>
              <div>
                <label style={filterLabelStyle}>Trans. Count</label>
                <input required type="number" value={newEntry.transaction_count} onChange={e => setNewEntry({...newEntry, transaction_count: e.target.value})} style={filterInputStyle(theme)} placeholder="e.g. 520" />
              </div>
              <div>
                <label style={filterLabelStyle}>Payment Date</label>
                <input required type="date" value={newEntry.payment_date} onChange={e => setNewEntry({...newEntry, payment_date: e.target.value})} style={filterInputStyle(theme)} />
              </div>
              <div>
                <label style={filterLabelStyle}>Status</label>
                <select value={newEntry.status} onChange={e => setNewEntry({...newEntry, status: e.target.value})} style={filterInputStyle(theme)}>
                  <option value="Paid on due date">Paid on due date</option>
                  <option value="Paid Before due date">Paid Before due date</option>
                  <option value="Paid After due date">Paid After due date</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2", marginTop: "16px", display: "flex", gap: "16px" }}>
                <button type="button" onClick={() => setShowAddEntry(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: "transparent", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: "14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)" }}>
                  {isSubmitting ? "Finalizing..." : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const filterLabelStyle = { display: "block", marginBottom: "8px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#94a3b8" };
const filterInputStyle = (theme: string) => ({ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: theme === 'DARK' ? "rgba(15, 23, 42, 0.4)" : "white", color: theme === 'DARK' ? "white" : "#1e293b", fontSize: "0.875rem", outline: "none", transition: "border-color 0.2s" });
const chartFilterInputStyle = { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "0.875rem", outline: "none" };
const thStyle = { padding: "20px 24px", textAlign: "left" as const, fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.1em" };
const tdStyle = { padding: "18px 24px", fontSize: "0.875rem", color: "inherit" };
const statCardStyle = (theme: string) => ({ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", padding: "28px", borderRadius: "24px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" });
const chartContainerStyle = (theme: string) => ({ background: theme === 'DARK' ? "rgba(30, 41, 59, 0.7)" : "white", padding: "28px", borderRadius: "24px", border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" });

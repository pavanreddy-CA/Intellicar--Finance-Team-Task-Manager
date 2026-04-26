"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, Calendar, Users, Briefcase, Filter, Search, ChevronRight, ListChecks } from "lucide-react";
import { resolveTaskName, getPeriodKey, isWithinLeadTime, FREQUENCIES, Frequency } from "@/lib/recurringUtils";

type RecurringTemplate = {
  id: number;
  taskNamePattern: string;
  entityName: string;
  taskType: string;
  departmentName: string;
  frequency: Frequency;
  dayOffset: number;
  monthOffset: number;
  defaultOwner: string | null;
  defaultReviewer: string | null;
  isActive: boolean;
  lastGeneratedPeriod: string | null;
};

type StagingTask = {
  templateId: number;
  taskName: string;
  entityName: string;
  taskType: string;
  frequency: Frequency;
  periodKey: string;
  dueDate: string;
  ownerName: string;
  reviewerName: string;
  isReady: boolean;
  isDuplicate?: boolean;
};

export default function RecurringActivities({ settings, usersList = [] }: { settings: any; usersList: any[] }) {
  const [activeSubTab, setActiveSubTab] = useState<'STAGING' | 'MASTER' | 'DAILY'>('STAGING');
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [stagingTasks, setStagingTasks] = useState<StagingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [bulkAssign, setBulkAssign] = useState({ owner: "", reviewer: "", dueDate: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]); // Indices of stagingTasks
  const [templateForm, setTemplateForm] = useState<Partial<RecurringTemplate>>({
    taskNamePattern: "",
    entityName: "",
    taskType: "External",
    frequency: "MONTHLY",
    dayOffset: 15,
    monthOffset: 0,
    defaultOwner: "",
    defaultReviewer: "",
    isActive: true
  });

  const financeUsers = usersList.filter(u => u.department === 'Finance' && u.isApproved !== false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring-templates");
      const data = await res.json();
      setTemplates(data);
      generateStagingTasks(data);
    } catch (err) {
      console.error("Fetch templates error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateStagingTasks = (allTemplates: RecurringTemplate[]) => {
    const staging: StagingTask[] = [];
    const today = new Date();
    
    allTemplates.filter(t => t.isActive && t.frequency !== 'DAILY').forEach(t => {
      // Logic: Calculate next due date based on frequency and offsets
      // For this MVP, we will calculate the NEXT instance
      const periodDate = new Date(today);
      periodDate.setMonth(today.getMonth() + t.monthOffset);
      
      const dueDate = new Date(today);
      dueDate.setDate(t.dayOffset || 1);
      
      if (isWithinLeadTime(t.frequency, dueDate)) {
        const periodKey = getPeriodKey(t.frequency, periodDate);
        
        // Skip if already generated (simple check against template's lastGeneratedPeriod)
        if (t.lastGeneratedPeriod === periodKey) return;

        staging.push({
          templateId: t.id,
          taskName: resolveTaskName(t.taskNamePattern, periodDate),
          entityName: t.entityName,
          taskType: t.taskType,
          frequency: t.frequency,
          periodKey: periodKey,
          dueDate: dueDate.toISOString().split('T')[0],
          ownerName: t.defaultOwner || "",
          reviewerName: t.defaultReviewer || "",
          isReady: !!t.defaultOwner
        });
      }
    });
    setStagingTasks(staging);
  };

  const handleBulkApply = () => {
    const updated = [...stagingTasks];
    selectedTasks.forEach(idx => {
      if (bulkAssign.owner) updated[idx].ownerName = bulkAssign.owner;
      if (bulkAssign.reviewer) updated[idx].reviewerName = bulkAssign.reviewer;
      if (bulkAssign.dueDate) updated[idx].dueDate = bulkAssign.dueDate;
      updated[idx].isReady = !!updated[idx].ownerName;
    });
    setStagingTasks(updated);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.taskNamePattern || !templateForm.entityName) {
      alert("Please fill all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const url = editingTemplate ? `/api/recurring-templates/${editingTemplate.id}` : "/api/recurring-templates";
      const method = editingTemplate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm)
      });
      if (res.ok) {
        setShowTemplateForm(false);
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      console.error("Save template error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await fetch(`/api/recurring-templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch (err) {
      console.error("Delete template error:", err);
    }
  };

  const handleGenerateTasks = async () => {
    const tasksToPost = stagingTasks.filter((_, idx) => selectedTasks.includes(idx) && _.isReady);
    if (tasksToPost.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/recurring-tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksToPost })
      });
      const result = await res.json();
      alert(`Successfully generated ${result.successCount} tasks. ${result.errorCount > 0 ? `Errors: ${result.errorCount}` : ""}`);
      fetchTemplates(); // Refresh to clear generated items
      setSelectedTasks([]);
    } catch (err) {
      alert("Failed to generate tasks");
    } finally {
      setLoading(false);
    }
  };

  const openEditTemplate = (t: RecurringTemplate) => {
    setEditingTemplate(t);
    setTemplateForm(t);
    setShowTemplateForm(true);
  };

  const thStyle = { padding: "12px 16px", textAlign: "left" as const, fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
  const tdStyle = { padding: "12px 16px", fontSize: "0.875rem", color: "#334155" };
  const inputStyle = { padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8125rem", outline: "none", width: "100%" };

  return (
    <div style={{ padding: "24px" }}>
      {/* Sub-Tabs */}
      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e2e8f0", marginBottom: "24px" }}>
        <button 
          onClick={() => setActiveSubTab('STAGING')}
          style={{ padding: "12px 4px", fontSize: "0.875rem", fontWeight: 600, color: activeSubTab === 'STAGING' ? "#2563eb" : "#64748b", borderBottom: activeSubTab === 'STAGING' ? "2px solid #2563eb" : "none", background: "none", cursor: "pointer" }}
        >
          Upcoming Tasks (30-Day Outlook)
        </button>
        <button 
          onClick={() => setActiveSubTab('MASTER')}
          style={{ padding: "12px 4px", fontSize: "0.875rem", fontWeight: 600, color: activeSubTab === 'MASTER' ? "#2563eb" : "#64748b", borderBottom: activeSubTab === 'MASTER' ? "2px solid #2563eb" : "none", background: "none", cursor: "pointer" }}
        >
          Master Template Registry
        </button>
        <button 
          onClick={() => setActiveSubTab('DAILY')}
          style={{ padding: "12px 4px", fontSize: "0.875rem", fontWeight: 600, color: activeSubTab === 'DAILY' ? "#2563eb" : "#64748b", borderBottom: activeSubTab === 'DAILY' ? "2px solid #2563eb" : "none", background: "none", cursor: "pointer" }}
        >
          Daily Checklist Module
        </button>
      </div>

      {activeSubTab === 'STAGING' && (
        <div>
          {/* Bulk Action Bar */}
          {selectedTasks.length > 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", animation: "slideDown 0.3s ease" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>{selectedTasks.length} selected</span>
              <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                <select value={bulkAssign.owner} onChange={e => setBulkAssign({...bulkAssign, owner: e.target.value})} style={{...inputStyle, width: "180px"}}>
                  <option value="">Assign Owner...</option>
                  {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <select value={bulkAssign.reviewer} onChange={e => setBulkAssign({...bulkAssign, reviewer: e.target.value})} style={{...inputStyle, width: "180px"}}>
                  <option value="">Assign Reviewer...</option>
                  <option value="Not Applicable">Not Applicable</option>
                  {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <input type="date" value={bulkAssign.dueDate} onChange={e => setBulkAssign({...bulkAssign, dueDate: e.target.value})} style={{...inputStyle, width: "150px"}} />
                <button onClick={handleBulkApply} style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>Apply All</button>
              </div>
              <button 
                onClick={handleGenerateTasks}
                disabled={loading}
                style={{ padding: "8px 20px", background: "#2563eb", color: "white", borderRadius: "8px", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <CheckCircle2 size={18} />
                Generate Selected Tasks
              </button>
            </div>
          )}

          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ width: "40px", padding: "12px 16px" }}>
                    <input 
                      type="checkbox" 
                      onChange={e => setSelectedTasks(e.target.checked ? stagingTasks.map((_, i) => i) : [])}
                      checked={selectedTasks.length === stagingTasks.length && stagingTasks.length > 0}
                    />
                  </th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Task Name</th>
                  <th style={thStyle}>Frequency</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Reviewer</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stagingTasks.map((task, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTasks.includes(idx)}
                        onChange={e => setSelectedTasks(e.target.checked ? [...selectedTasks, idx] : selectedTasks.filter(i => i !== idx))}
                      />
                    </td>
                    <td style={tdStyle}>{task.entityName}</td>
                    <td style={{...tdStyle, fontWeight: 500, color: "#0f172a"}}>{task.taskName}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "2px 8px", background: "#f1f5f9", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>{task.frequency}</span>
                    </td>
                    <td style={tdStyle}>
                      <select 
                        value={task.ownerName} 
                        onChange={e => {
                          const updated = [...stagingTasks];
                          updated[idx].ownerName = e.target.value;
                          updated[idx].isReady = !!e.target.value;
                          setStagingTasks(updated);
                        }}
                        style={inputStyle}
                      >
                        <option value="">Choose...</option>
                        {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select 
                        value={task.reviewerName} 
                        onChange={e => {
                          const updated = [...stagingTasks];
                          updated[idx].reviewerName = e.target.value;
                          setStagingTasks(updated);
                        }}
                        style={inputStyle}
                      >
                        <option value="Not Applicable">Not Applicable</option>
                        {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input 
                        type="date" 
                        value={task.dueDate} 
                        onChange={e => {
                          const updated = [...stagingTasks];
                          updated[idx].dueDate = e.target.value;
                          setStagingTasks(updated);
                        }}
                        style={inputStyle} 
                      />
                    </td>
                    <td style={tdStyle}>
                      {task.isReady ? (
                        <span style={{ color: "#059669", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Ready
                        </span>
                      ) : (
                        <span style={{ color: "#d97706", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                          <AlertTriangle size={14} /> Assign Owner
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {stagingTasks.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                      No recurring tasks are due within your lead-time windows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'MASTER' && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>Recurring Template Master Registry</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>Define the rules for automatic task generation.</p>
            </div>
            <button 
              onClick={() => { 
                setEditingTemplate(null); 
                setTemplateForm({
                  taskNamePattern: "",
                  entityName: "",
                  taskType: "External",
                  frequency: "MONTHLY",
                  dayOffset: 15,
                  monthOffset: 0,
                  defaultOwner: "",
                  defaultReviewer: "",
                  isActive: true
                });
                setShowTemplateForm(true); 
              }}
              style={{ padding: "10px 20px", background: "#2563eb", color: "white", borderRadius: "10px", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
            >
              <Plus size={18} /> Add New Template
            </button>
          </div>

          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={thStyle}>Rule Name / Pattern</th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Frequency</th>
                  <th style={thStyle}>Lead Time Settings</th>
                  <th style={thStyle}>Default Assignments</th>
                  <th style={thStyle}>Status</th>
                  <th style={{...thStyle, textAlign: "right"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="table-row">
                    <td style={{...tdStyle, fontWeight: 600, color: "#0f172a"}}>{t.taskNamePattern}</td>
                    <td style={tdStyle}>{t.entityName}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "4px 10px", background: "#eff6ff", color: "#2563eb", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700 }}>{t.frequency}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Due: Day {t.dayOffset}<br/>
                        Offset: {t.monthOffset} month(s)
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "0.75rem" }}><strong>Owner:</strong> {t.defaultOwner || "--"}</span>
                        <span style={{ fontSize: "0.75rem" }}><strong>Rev:</strong> {t.defaultReviewer || "--"}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: "4px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 800,
                        background: t.isActive ? "#dcfce7" : "#fee2e2",
                        color: t.isActive ? "#15803d" : "#b91c1c"
                      }}>
                        {t.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td style={{...tdStyle, textAlign: "right"}}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button onClick={() => openEditTemplate(t)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteTemplate(t.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
                      <div style={{ marginBottom: "12px" }}><Briefcase size={40} strokeWidth={1} style={{ opacity: 0.5 }} /></div>
                      No recurring rules defined yet. Create your first template to begin automation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "600px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", animation: "modalIn 0.3s ease-out" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{editingTemplate ? "Edit Template" : "Add New Recurring Rule"}</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.8 }}>Define how the system should generate this activity.</p>
              </div>
              <button onClick={() => setShowTemplateForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px" }}>×</button>
            </div>
            
            <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Task Name Pattern</label>
                  <input 
                    type="text" 
                    placeholder="e.g. GSTR 3B for {{MONTH}} {{YEAR}}" 
                    value={templateForm.taskNamePattern} 
                    onChange={e => setTemplateForm({...templateForm, taskNamePattern: e.target.value})} 
                    style={inputStyle} 
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.7rem", color: "#94a3b8" }}>Tip: Use placeholders like {'{{MONTH}}'}, {'{{YEAR}}'}, {'{{QUARTER}}'}</p>
                </div>

                <div>
                  <label style={labelStyle}>Entity Name</label>
                  <select value={templateForm.entityName} onChange={e => setTemplateForm({...templateForm, entityName: e.target.value})} style={inputStyle}>
                    <option value="">Select Entity...</option>
                    {(settings.masterEntities || "").split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Frequency</label>
                  <select value={templateForm.frequency} onChange={e => setTemplateForm({...templateForm, frequency: e.target.value as any})} style={inputStyle}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Day of Month (Due Date)</label>
                  <input type="number" min="1" max="31" value={templateForm.dayOffset} onChange={e => setTemplateForm({...templateForm, dayOffset: parseInt(e.target.value)})} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Month Offset</label>
                  <select value={templateForm.monthOffset} onChange={e => setTemplateForm({...templateForm, monthOffset: parseInt(e.target.value)})} style={inputStyle}>
                    <option value={0}>Current Month</option>
                    <option value={1}>Next Month (+1)</option>
                    <option value={-1}>Previous Month (-1)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Default Owner</label>
                  <select value={templateForm.defaultOwner || ""} onChange={e => setTemplateForm({...templateForm, defaultOwner: e.target.value})} style={inputStyle}>
                    <option value="">Select Owner...</option>
                    {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Default Reviewer</label>
                  <select value={templateForm.defaultReviewer || ""} onChange={e => setTemplateForm({...templateForm, defaultReviewer: e.target.value})} style={inputStyle}>
                    <option value="">Select Reviewer...</option>
                    <option value="Not Applicable">Not Applicable</option>
                    {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                  <input type="checkbox" checked={templateForm.isActive} onChange={e => setTemplateForm({...templateForm, isActive: e.target.checked})} style={{ width: "20px", height: "20px" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>Template is Active</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Inactive templates will not appear in the staging area.</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button onClick={() => setShowTemplateForm(false)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button 
                  onClick={handleSaveTemplate} 
                  disabled={isSaving}
                  style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
                >
                  {isSaving ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {activeSubTab === 'DAILY' && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
             <h2 style={{ fontSize: "1.5rem", color: "#0f172a", marginBottom: "8px" }}>Daily Task Checklist</h2>
             <p style={{ color: "#64748b" }}>Complete your repetitive daily activities with a single click.</p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
             {/* Mock daily items */}
             {[1,2,3].map(i => (
               <div key={i} style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", transition: "transform 0.2s" }} className="hover-scale">
                  <input type="checkbox" style={{ width: "24px", height: "24px", cursor: "pointer" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>Daily Bank Statement Reconciliation - {i === 1 ? 'ICICI' : i === 2 ? 'HDFC' : 'SBI'}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Required by 11:00 AM daily</div>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Last completed: Yesterday</div>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.025em" };


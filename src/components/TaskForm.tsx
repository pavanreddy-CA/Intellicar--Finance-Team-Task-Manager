"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";

type TaskFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  settings: any;
  usersList?: any[];
  initialData?: any;
  user: any;
  isDarkMode?: boolean;
  showNotification: any; showConfirm: any;};

export default function TaskForm({   onClose, onSuccess, settings, usersList = [], initialData, user , isDarkMode = false, showNotification , showConfirm }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [changeRequestType, setChangeRequestType] = useState(false);
  const [newRequestType, setNewRequestType] = useState("");
  const [transferring, setTransferring] = useState(false);
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState({
    taskName: initialData?.taskName || "",
    taskType: initialData?.taskType || "",
    departmentName: initialData?.departmentName || "",
    requestFrom: initialData?.requestFrom || "",
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "",
    mailLink: initialData?.mailLink || "",
    linkedRequestId: initialData?.linkedRequestId || null,
    transferStatus: initialData?.transferStatus || 'O',
    originalRequestType: initialData?.originalRequestType || null,
    frequency: initialData?.frequency || "Ad",
    transferredBy: initialData?.transferredBy || null,
    transferredAt: initialData?.transferredAt || null
  });

  const [selectedEntities, setSelectedEntities] = useState<string[]>(initialData?.entityName ? [initialData.entityName] : []);
  const [assignments, setAssignments] = useState<any[]>(initialData?.id ? [{
    entityName: initialData.entityName,
    ownerName: initialData.ownerName,
    reviewerName: initialData.reviewerName || ""
  }] : []);
  const [allowedEntities, setAllowedEntities] = useState<string[]>([]);

  // Initialize allowed entities based on Matrix C
  useState(() => {
    const matrix = JSON.parse(settings.entityMatrix || '{}');
    const userPerms = matrix[user.id] || [];
    const allEntities = settings?.masterEntities?.split(',').map((e: string) => e.trim()).filter((e: string) => e) || [];
    
    if (userPerms.includes('ALL')) {
      setAllowedEntities(allEntities);
    } else {
      setAllowedEntities(allEntities.filter((e: string) => userPerms.includes(e)));
    }
  });

  // Sync assignments when selectedEntities change
  useState(() => {
    const newAssignments = selectedEntities.map(entity => {
      const existing = assignments.find(a => a.entityName === entity);
      return existing || { entityName: entity, ownerName: "", reviewerName: "" };
    });
    setAssignments(newAssignments);
  });

  // We use useEffect to keep assignments in sync with selectedEntities
  useEffect(() => {
    setAssignments(prev => {
      return selectedEntities.map(entity => {
        const existing = prev.find(a => a.entityName === entity);
        return existing || { entityName: entity, ownerName: "", reviewerName: "" };
      });
    });
  }, [selectedEntities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAssignmentChange = (entityName: string, field: string, value: string) => {
    setAssignments(prev => prev.map(a => 
      a.entityName === entityName ? { ...a, [field]: value } : a
    ));
  };

  const handleEntityToggle = (entity: string) => {
    setSelectedEntities(current => 
      current.includes(entity) ? current.filter(e => e !== entity) : [...current, entity]
    );
  };

  const handleSelectAll = () => {
    setSelectedEntities(selectedEntities.length === allowedEntities.length ? [] : [...allowedEntities]);
  };

  const handleTransferRequest = async () => {
    if (!newRequestType || !initialData?.linkedRequestId) return;
    setTransferring(true);
    setError("");
    try {
      const res = await fetch(`/api/external-requests/${initialData.linkedRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          requestType: newRequestType, 
          status: "Pending",
          transferredBy: user.name || user.email
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || "Failed to transfer request");
      }
      showNotification(`Request transferred successfully!`);
      onSuccess();
    } catch (err: any) {
      setError(`Transfer Failed: ${err.message}`);
    } finally {
      setTransferring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntities.length === 0) {
      setError("Please select at least one entity.");
      return;
    }
    const missingAssignment = assignments.find(a => !a.ownerName);
    if (missingAssignment) {
      setError(`Please select an owner for ${missingAssignment.entityName}`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = isEditing ? `/api/tasks/${initialData.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { 
        ...formData, 
        entityName: assignments[0].entityName,
        ownerName: assignments[0].ownerName,
        reviewerName: assignments[0].reviewerName
      } : { ...formData, assignments, requestStatus: "Pending" };

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Failed to ${isEditing ? 'update' : 'create'} tasks`);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const t = isDarkMode ? {
    bg: "#0f172a",
    card: "#1e293b",
    text: "#f8fafc",
    textMuted: "#94a3b8",
    border: "#334155",
    input: "#1e293b",
    accent: "#3b82f6",
    hover: "#334155"
  } : {
    bg: "#f8fafc",
    card: "#ffffff",
    text: "#111827",
    textMuted: "#64748b",
    border: "#e2e8f0",
    input: "#ffffff",
    accent: "#2563eb",
    hover: "#f1f5f9"
  };

  const dynamicInputStyle = {
    ...inputStyle,
    background: t.input,
    color: t.text,
    borderColor: t.border
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000,
      padding: "40px 20px"
    }}>
      <div style={{
        background: t.card, borderRadius: "24px", width: "100%", maxWidth: "650px",
        maxHeight: "90vh", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        position: "relative", border: `1px solid ${t.border}`, overflow: "hidden",
        display: "flex", flexDirection: "column",
        animation: "modalIn 0.3s ease-out"
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        ` }} />
        
        <div style={{ 
          padding: "24px 32px", 
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
          color: "white", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          flexShrink: 0,
          zIndex: 10
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{isEditing ? "Edit Task" : "Create New Task"}</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.8 }}>Assign tasks to specific entities and owners.</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}> 
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "16px" }}>{error}</div>}
          
          {/* Request Type Transfer Option - Only show when converting from external request */}
          {initialData?.linkedRequestId && (
            <div style={{ 
              background: "#f0f9ff", 
              border: "1px solid #bae6fd", 
              borderRadius: "8px", 
              padding: "16px",
              marginBottom: "8px"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Current Finance Function</label>
                  <div style={{ padding: "8px 12px", background: "white", border: "1px solid #bae6fd", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 700, color: "#0369a1" }}>
                    {initialData?.taskType || "N/A"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={18} color="#0284c7" />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0369a1" }}>
                    Any change in finance function?
                  </span>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "12px", marginBottom: changeRequestType ? "12px" : "0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="changeType" 
                    checked={!changeRequestType} 
                    onChange={() => { setChangeRequestType(false); setNewRequestType(""); }}
                    style={{ accentColor: "#2563eb" }}
                  />
                  <span style={{ fontSize: "0.875rem", color: t.text }}>No</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="changeType" 
                    checked={changeRequestType} 
                    onChange={() => setChangeRequestType(true)}
                    style={{ accentColor: "#2563eb" }}
                  />
                  <span style={{ fontSize: "0.875rem", color: t.text }}>Yes</span>
                </label>
              </div>

              {changeRequestType && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "0.8125rem", fontWeight: 500, color: t.textMuted }}>
                      Select New Finance Function
                    </label>
                    <select 
                      value={newRequestType} 
                      onChange={(e) => setNewRequestType(e.target.value)}
                      style={dynamicInputStyle}
                    >
                      <option value="">Choose finance function...</option>
                      {settings?.masterRequestTypes?.split(',').filter((t: string) => t.trim()).map((type: string) => (
                        <option key={type.trim()} value={type.trim()}>{type.trim()}</option>
                      ))}
                    </select>
                  </div>
                  
                  {newRequestType && (
                    <button 
                      type="button"
                      onClick={handleTransferRequest}
                      disabled={transferring}
                      style={{ 
                        padding: "10px 16px", 
                        borderRadius: "6px", 
                        border: "none", 
                        background: "#f59e0b", 
                        color: "white", 
                        fontWeight: 500, 
                        cursor: transferring ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      {transferring ? "Transferring..." : `Transfer to ${newRequestType} Allocator`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!changeRequestType ? (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Task Name *</label>
                <input 
                  name="taskName" 
                  required 
                  value={formData.taskName} 
                  onChange={handleChange} 
                  style={{ 
                    ...dynamicInputStyle, 
                    background: !!initialData?.linkedRequestId ? "#f8fafc" : t.input,
                    color: !!initialData?.linkedRequestId ? "#64748b" : t.text,
                    cursor: !!initialData?.linkedRequestId ? "not-allowed" : "text",
                    borderColor: !!initialData?.linkedRequestId ? "#e2e8f0" : t.border
                  }} 
                  readOnly={!!initialData?.linkedRequestId}
                  placeholder="Enter task name" 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Select Entities *</label>
                    {!initialData?.linkedRequestId && (
                      <button 
                        type="button" 
                        onClick={() => !isEditing && handleSelectAll()}
                        style={{ 
                          fontSize: "0.7rem", 
                          color: isEditing ? t.textMuted : t.accent, 
                          background: "none", 
                          border: "none", 
                          cursor: isEditing ? "default" : "pointer", 
                          fontWeight: 700, 
                          textTransform: "uppercase" 
                        }}
                      >
                        {selectedEntities.length === allowedEntities.length ? "Deselect All" : "Consolidate (Select All)"}
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", 
                    gap: "8px", 
                    maxHeight: "120px", 
                    overflowY: "auto",
                    padding: "12px",
                    background: !!initialData?.linkedRequestId ? "#f8fafc" : t.bg,
                    borderRadius: "8px",
                    border: `1px solid ${!!initialData?.linkedRequestId ? "#e2e8f0" : t.border}`,
                    pointerEvents: (isEditing || initialData?.linkedRequestId) ? "none" : "auto",
                    opacity: (isEditing || initialData?.linkedRequestId) ? 0.9 : 1
                  }}>
                    {allowedEntities
                      .filter(entity => {
                        // During conversion, only show the pre-filled entity
                        if (!!initialData?.linkedRequestId) {
                          return entity === initialData.entityName;
                        }
                        return true;
                      })
                      .map(entity => (
                        <label key={entity} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", cursor: (isEditing || initialData?.linkedRequestId) ? "not-allowed" : "pointer", padding: "4px", borderRadius: "4px", color: t.text }}>
                          <input 
                            type="checkbox" 
                            checked={selectedEntities.includes(entity)} 
                            onChange={() => !(isEditing || initialData?.linkedRequestId) && handleEntityToggle(entity)}
                            style={{ width: "16px", height: "16px", accentColor: t.accent }}
                          />
                          {entity}
                        </label>
                      ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Task Type *</label>
                  <select name="taskType" required value={formData.taskType} onChange={handleChange} style={dynamicInputStyle}>
                    <option value="">Choose</option>
                    {settings?.masterTaskTypes?.split(',').filter((t: string) => t.trim()).map((type: string) => (
                      <option key={type.trim()} value={type.trim()}>{type.trim()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Frequency (Freq) *</label>
                  <select 
                    name="frequency" 
                    required 
                    value={formData.frequency} 
                    onChange={handleChange} 
                    style={{ 
                      ...dynamicInputStyle, 
                      background: (!isEditing && !!initialData?.linkedRequestId) ? "#f8fafc" : t.input,
                      color: (!isEditing && !!initialData?.linkedRequestId) ? "#64748b" : t.text,
                      cursor: (!isEditing && !!initialData?.linkedRequestId) ? "not-allowed" : "pointer",
                      borderColor: (!isEditing && !!initialData?.linkedRequestId) ? "#e2e8f0" : t.border
                    }}
                    disabled={!isEditing && !!initialData?.linkedRequestId}
                  >
                    <option value="">Choose Frequency</option>
                    {settings?.masterFrequencies?.split(',').filter((t: string) => t.trim()).map((freq: string) => {
                      // Only show 'Ad' for new tasks or conversions
                      const isAd = freq.trim() === 'Ad';
                      if (!isEditing && !isAd) return null;
                      return (
                        <option key={freq.trim()} value={freq.trim()}>{freq.trim()}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Department *</label>
                  <select 
                    name="departmentName" 
                    required 
                    value={formData.departmentName} 
                    onChange={handleChange} 
                    style={{ 
                      ...dynamicInputStyle, 
                      background: !!initialData?.linkedRequestId ? "#f8fafc" : t.input,
                      color: !!initialData?.linkedRequestId ? "#64748b" : t.text,
                      cursor: !!initialData?.linkedRequestId ? "not-allowed" : "pointer",
                      borderColor: !!initialData?.linkedRequestId ? "#e2e8f0" : t.border,
                      pointerEvents: initialData?.linkedRequestId ? "none" : "auto"
                    }}
                    tabIndex={initialData?.linkedRequestId ? -1 : 0}
                  >
                    <option value="">Choose</option>
                    {settings?.masterDepartments?.split(',').filter((d: string) => d.trim()).map((dept: string) => (
                      <option key={dept.trim()} value={dept.trim()}>{dept.trim()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignment Grid */}
              {selectedEntities.length > 0 && (
                <div style={{ marginTop: "4px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Manual Assignment Grid (Owner & Reviewer per Entity)</label>
                  <div style={{ border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                      <thead style={{ background: t.bg }}>
                        <tr>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${t.border}`, color: t.textMuted }}>Entity</th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${t.border}`, color: t.textMuted }}>Owner *</th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${t.border}`, color: t.textMuted }}>Reviewer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(a => (
                          <tr key={a.entityName}>
                            <td style={{ padding: "8px", fontWeight: 600, color: t.textMuted, background: t.bg, width: "100px" }}>{a.entityName}</td>
                            <td style={{ padding: "4px" }}>
                              <select 
                                required 
                                value={a.ownerName} 
                                onChange={(e) => handleAssignmentChange(a.entityName, 'ownerName', e.target.value)}
                                style={{ ...dynamicInputStyle, padding: "6px 8px" }}
                              >
                                <option value="">Owner</option>
                                {usersList.filter(u => u.department === 'Finance' && u.isApproved !== false).map(u => (
                                  <option key={u.email} value={u.name || u.email}>{u.name || u.email}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "4px" }}>
                              <select 
                                value={a.reviewerName} 
                                onChange={(e) => handleAssignmentChange(a.entityName, 'reviewerName', e.target.value)}
                                style={{ ...dynamicInputStyle, padding: "6px 8px" }}
                              >
                                <option value="">N/A</option>
                                {usersList.filter(u => u.department === 'Finance' && u.isApproved !== false).map(u => (
                                  <option key={u.email} value={u.name || u.email}>{u.name || u.email}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Request From *</label>
                 <input 
                   name="requestFrom" 
                   required 
                   value={formData.requestFrom} 
                   onChange={handleChange} 
                   style={{ 
                     ...dynamicInputStyle, 
                     background: !!initialData?.linkedRequestId ? "#f8fafc" : t.input,
                     color: !!initialData?.linkedRequestId ? "#64748b" : t.text,
                     cursor: !!initialData?.linkedRequestId ? "not-allowed" : "text",
                     borderColor: !!initialData?.linkedRequestId ? "#e2e8f0" : t.border,
                     pointerEvents: initialData?.linkedRequestId ? "none" : "auto" 
                   }}
                   readOnly={!!initialData?.linkedRequestId}
                   placeholder="Your answer" 
                 />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Due Date</label>
                  <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} style={dynamicInputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: t.text }}>Mail Sub</label>
                  <input name="mailLink" value={formData.mailLink} onChange={handleChange} style={dynamicInputStyle} placeholder="Optional email subject" />
                </div>
              </div>

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.card, color: t.text, fontWeight: 500, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: t.accent, color: "white", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Task")}
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.card, color: t.text, fontWeight: 500, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "inherit"
};

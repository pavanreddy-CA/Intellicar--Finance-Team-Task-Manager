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
};

<<<<<<< HEAD
export default function TaskForm({ onClose, onSuccess, settings, usersList = [], initialData }: TaskFormProps) {
=======
export default function TaskForm({ onClose, onSuccess, settings, usersList = [], initialData, user }: TaskFormProps) {
>>>>>>> 72d784980c559b53ba095da66d5223e7b7ce6bba
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [changeRequestType, setChangeRequestType] = useState(false);
  const [newRequestType, setNewRequestType] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [formData, setFormData] = useState({
    taskName: initialData?.taskName || "",
    taskType: initialData?.taskType || "",
    departmentName: initialData?.departmentName || "",
    requestFrom: initialData?.requestFrom || "",
<<<<<<< HEAD
    ownerName: "",
    reviewerName: "",
    dueDate: "",
    mailLink: "",
=======
    dueDate: initialData?.dueDate || "",
    mailLink: initialData?.mailLink || "",
>>>>>>> 72d784980c559b53ba095da66d5223e7b7ce6bba
    linkedRequestId: initialData?.linkedRequestId || null,
    transferStatus: initialData?.transferStatus || 'O',
    originalRequestType: initialData?.originalRequestType || null
  });

  const [selectedEntities, setSelectedEntities] = useState<string[]>(initialData?.entityName ? [initialData.entityName] : []);
  const [assignments, setAssignments] = useState<any[]>([]);
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
        body: JSON.stringify({ requestType: newRequestType, status: "Pending" }),
      });
      if (!res.ok) throw new Error("Failed to transfer request");
      alert(`Request transferred successfully!`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
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
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, assignments }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create tasks");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      padding: "20px"
    }}>
      <div style={{
        background: "white", borderRadius: "12px", width: "100%", maxWidth: "600px",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        position: "relative"
      }}>
        <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827" }}>Create New Task</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "0.875rem" }}>{error}</div>}
          
          {/* Request Type Transfer Option - Only show when converting from external request */}
          {initialData?.linkedRequestId && (
            <div style={{ 
              background: "#f0f9ff", 
              border: "1px solid #bae6fd", 
              borderRadius: "8px", 
              padding: "16px",
              marginBottom: "8px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <AlertCircle size={18} color="#0284c7" />
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0369a1" }}>
                  Any change in finance function?
                </span>
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
                  <span style={{ fontSize: "0.875rem", color: "#374151" }}>No</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="changeType" 
                    checked={changeRequestType} 
                    onChange={() => setChangeRequestType(true)}
                    style={{ accentColor: "#2563eb" }}
                  />
                  <span style={{ fontSize: "0.875rem", color: "#374151" }}>Yes</span>
                </label>
              </div>

              {changeRequestType && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "0.8125rem", fontWeight: 500, color: "#374151" }}>
                      Select New Finance Function
                    </label>
                    <select 
                      value={newRequestType} 
                      onChange={(e) => setNewRequestType(e.target.value)}
                      style={{ ...inputStyle, background: "white" }}
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
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Task Name *</label>
                <input name="taskName" required value={formData.taskName} onChange={handleChange} style={inputStyle} placeholder="Enter task name" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
<<<<<<< HEAD
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Entity Name *</label>
                  <select name="entityName" required value={formData.entityName} onChange={handleChange} style={inputStyle}>
                    <option value="">Choose</option>
                    {settings?.masterEntities?.split(',').filter((e: string) => e.trim()).map((entity: string) => (
                      <option key={entity.trim()} value={entity.trim()}>{entity.trim()}</option>
                    ))}
                  </select>
=======
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Select Entities *</label>
                    <button 
                      type="button" 
                      onClick={handleSelectAll}
                      style={{ fontSize: "0.7rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}
                    >
                      {selectedEntities.length === allowedEntities.length ? "Deselect All" : "Consolidate (Select All)"}
                    </button>
                  </div>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", 
                    gap: "8px", 
                    maxHeight: "120px", 
                    overflowY: "auto",
                    padding: "12px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}>
                    {allowedEntities.map(entity => (
                      <label key={entity} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", cursor: "pointer", padding: "4px", borderRadius: "4px" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedEntities.includes(entity)} 
                          onChange={() => handleEntityToggle(entity)}
                          style={{ width: "16px", height: "16px", accentColor: "#2563eb" }}
                        />
                        {entity}
                      </label>
                    ))}
                  </div>
>>>>>>> 72d784980c559b53ba095da66d5223e7b7ce6bba
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Task Type *</label>
                  <select name="taskType" required value={formData.taskType} onChange={handleChange} style={inputStyle}>
                    <option value="">Choose</option>
                    {settings?.masterTaskTypes?.split(',').filter((t: string) => t.trim()).map((type: string) => (
                      <option key={type.trim()} value={type.trim()}>{type.trim()}</option>
                    ))}
                  </select>
                </div>
              </div>

<<<<<<< HEAD
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Department *</label>
                  <select name="departmentName" required value={formData.departmentName} onChange={handleChange} style={inputStyle}>
                    <option value="">Choose</option>
                    {settings?.masterDepartments?.split(',').filter((d: string) => d.trim()).map((dept: string) => (
                      <option key={dept.trim()} value={dept.trim()}>{dept.trim()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Request From *</label>
                  <input name="requestFrom" required value={formData.requestFrom} onChange={handleChange} style={inputStyle} placeholder="Your answer" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Owner Name *</label>
                  <select name="ownerName" required value={formData.ownerName} onChange={handleChange} style={inputStyle}>
                    <option value="">Choose</option>
                    {usersList
                      .filter(u => u.department === 'Finance' && u.isApproved !== false)
                      .map(u => (
                        <option key={u.email} value={u.name || u.email}>{u.name || u.email}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Reviewer Name</label>
                  <select name="reviewerName" value={formData.reviewerName} onChange={handleChange} style={inputStyle}>
                    <option value="">Not Applicable / None</option>
                    {usersList
                      .filter(u => u.department === 'Finance' && u.isApproved !== false)
                      .map(u => (
                        <option key={u.email} value={u.name || u.email}>{u.name || u.email}</option>
                      ))
                    }
                  </select>
=======
              {/* Assignment Grid */}
              {selectedEntities.length > 0 && (
                <div style={{ marginTop: "4px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Manual Assignment Grid (Owner & Reviewer per Entity)</label>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Entity</th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Owner *</th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Reviewer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(a => (
                          <tr key={a.entityName}>
                            <td style={{ padding: "8px", fontWeight: 600, color: "#475569", background: "#f8fafc", width: "100px" }}>{a.entityName}</td>
                            <td style={{ padding: "4px" }}>
                              <select 
                                required 
                                value={a.ownerName} 
                                onChange={(e) => handleAssignmentChange(a.entityName, 'ownerName', e.target.value)}
                                style={{ ...inputStyle, padding: "6px 8px" }}
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
                                style={{ ...inputStyle, padding: "6px 8px" }}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Department *</label>
                  <select name="departmentName" required value={formData.departmentName} onChange={handleChange} style={inputStyle}>
                    <option value="">Choose</option>
                    {settings?.masterDepartments?.split(',').filter((d: string) => d.trim()).map((dept: string) => (
                      <option key={dept.trim()} value={dept.trim()}>{dept.trim()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Request From *</label>
                  <input name="requestFrom" required value={formData.requestFrom} onChange={handleChange} style={inputStyle} placeholder="Your answer" />
>>>>>>> 72d784980c559b53ba095da66d5223e7b7ce6bba
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Due Date</label>
                  <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Mail Link</label>
                  <input name="mailLink" value={formData.mailLink} onChange={handleChange} style={inputStyle} placeholder="Optional email link" />
                </div>
              </div>

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "6px", border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 500, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#2563eb", color: "white", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "6px", border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 500, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </form>
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

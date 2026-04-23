"use client";

import { useState } from "react";
import { X } from "lucide-react";

type SystemSettings = {
  masterEntities?: string;
  masterTaskTypes?: string;
  masterDepartments?: string;
  masterTeamMembers?: string;
  masterCommunicationModes?: string;
};

type TaskFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  settings?: SystemSettings;
};

export default function TaskForm({ onClose, onSuccess, settings }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    taskName: "",
    entityName: "",
    taskType: "",
    departmentName: "",
    requestFrom: "",
    ownerName: "",
    reviewerName: "",
    dueDate: "",
    mailLink: "",
  });

  // Parse settings or use defaults
  const entities = settings?.masterEntities?.split(',').filter(Boolean) || 
    ['Intellicar-BLR', 'Intellicar-Delhi', 'Fabric IoT-BLR', 'Ratch-AI', 'Consolidation'];
  
  const taskTypes = settings?.masterTaskTypes?.split(',').filter(Boolean) || 
    ['Accounts Receivable', 'Accounts Payable', 'MIS', 'Inventory', 'Banking & Treasury', 'Customer Reconciliations', 'Vendor Reconciliation', 'Reporting', 'Financial Audit', 'Tax Audit', 'Other Audits', 'Assements & Notices', 'Month Closure', 'Corporate Taxation', 'GST', 'Employee Laws', 'Due Diligence', 'Presentations & Trainings', 'Other Reconcillitions', 'MCA Filings', 'Miscellaneous Activities'];
  
  const departments = settings?.masterDepartments?.split(',').filter(Boolean) || 
    ['SW - Engineering', 'Manufacturing and Supply Chain', 'Field Operations Technicians', 'HW - Engineering', 'Operations', 'CSM & Sales', 'Finance', 'HR and Admin', 'External People'];
  
  const teamMembers = settings?.masterTeamMembers?.split(',').filter(Boolean) || 
    ['Venkat', 'Saikath', 'Nikhat', 'Sami', 'Pavan', 'Sharath', 'Sreenivas', 'Hanusha', 'Chandana', 'Sidharth Saneja'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create task");
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
          
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Task Name *</label>
            <input name="taskName" required value={formData.taskName} onChange={handleChange} style={inputStyle} placeholder="Enter task name" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Entity Name *</label>
              <select name="entityName" required value={formData.entityName} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                {entities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Task Type *</label>
              <select name="taskType" required value={formData.taskType} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                {taskTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Department *</label>
              <select name="departmentName" required value={formData.departmentName} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
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
                {teamMembers.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Reviewer Name</label>
              <select name="reviewerName" value={formData.reviewerName} onChange={handleChange} style={inputStyle}>
                <option value="">Not Applicable / None</option>
                {teamMembers.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
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

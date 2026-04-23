"use client";

import { useState } from "react";
import { X } from "lucide-react";

type TaskFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  settings: any;
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
                {settings?.masterEntities?.split(',').filter((e: string) => e.trim()).map((entity: string) => (
                  <option key={entity.trim()} value={entity.trim()}>{entity.trim()}</option>
                ))}
              </select>
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
                <option value="Venkat">Venkat</option>
                <option value="Saikath">Saikath</option>
                <option value="Nikhat">Nikhat</option>
                <option value="Sami">Sami</option>
                <option value="Pavan">Pavan</option>
                <option value="Sharath">Sharath</option>
                <option value="Sreenivas">Sreenivas</option>
                <option value="Hanusha">Hanusha</option>
                <option value="Chandana">Chandana</option>
                <option value="Sidharth Saneja">Sidharth Saneja</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Reviewer Name</label>
              <select name="reviewerName" value={formData.reviewerName} onChange={handleChange} style={inputStyle}>
                <option value="">Not Applicable / None</option>
                <option value="Venkat">Venkat</option>
                <option value="Saikath">Saikath</option>
                <option value="Nikhat">Nikhat</option>
                <option value="Sami">Sami</option>
                <option value="Pavan">Pavan</option>
                <option value="Sharath">Sharath</option>
                <option value="Sreenivas">Sreenivas</option>
                <option value="Hanusha">Hanusha</option>
                <option value="Chandana">Chandana</option>
                <option value="Sidharth Saneja">Sidharth Saneja</option>
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

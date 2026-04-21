"use client";

import { useState } from "react";
import { X } from "lucide-react";

type LOFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const EMPLOYEES = [
  "Venkat", "Pavan", "Sharath", "Sami", "Sreenivas", 
  "Siddharth", "Nikhat", "Chandana", "Saikath", "Hanusha"
];

export default function LOForm({ onClose, onSuccess }: LOFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    entity: "",
    dateOfIdentification: new Date().toISOString().split('T')[0],
    learningOpportunity: "",
    identifiedBy: "",
    committedBy: "",
    resolutionProvided: "",
    modeOfCommunication: "",
    emailSub: "",
    comments: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/lo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to submit LO");
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
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "20px"
    }}>
      <div style={{
        background: "white", borderRadius: "16px", width: "100%", maxWidth: "700px",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        position: "relative"
      }}>
        <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827", fontWeight: 600 }}>LO Submit Form (Learning Opportunity)</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", fontSize: "0.875rem" }}>{error}</div>}
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Entity *</label>
              <select name="entity" required value={formData.entity} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                <option value="Intellicar-BLR">Intellicar-BLR</option>
                <option value="Intellicar Delhi">Intellicar Delhi</option>
                <option value="Fabric IOT-Blr">Fabric IOT-Blr</option>
                <option value="Reltch AI">Reltch AI</option>
                <option value="Consolidation">Consolidation</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date of Identification *</label>
              <input type="date" name="dateOfIdentification" required value={formData.dateOfIdentification} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Learning Opportunity *</label>
            <textarea 
              name="learningOpportunity" 
              required 
              value={formData.learningOpportunity} 
              onChange={handleChange} 
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} 
              placeholder="Describe the mistake/learning opportunity"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Identified By *</label>
              <select name="identifiedBy" required value={formData.identifiedBy} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                {EMPLOYEES.map(emp => <option key={emp} value={emp}>{emp}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Committed By *</label>
              <select name="committedBy" required value={formData.committedBy} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                {EMPLOYEES.map(emp => <option key={emp} value={emp}>{emp}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Resolution Provided *</label>
            <textarea 
              name="resolutionProvided" 
              required 
              value={formData.resolutionProvided} 
              onChange={handleChange} 
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} 
              placeholder="Describe the resolution provided"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Mode Of Communication *</label>
              <select name="modeOfCommunication" required value={formData.modeOfCommunication} onChange={handleChange} style={inputStyle}>
                <option value="">Choose</option>
                <option value="Email">Email</option>
                <option value="Verbal Discussion">Verbal Discussion</option>
                <option value="Hangouts">Hangouts</option>
                <option value="Whatsapp IC Group">Whatsapp IC Group</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Email Sub</label>
              <input name="emailSub" value={formData.emailSub} onChange={handleChange} style={inputStyle} placeholder="Optional email subject" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Comments</label>
            <textarea 
              name="comments" 
              value={formData.comments} 
              onChange={handleChange} 
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} 
              placeholder="Any additional comments"
            />
          </div>

          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Submitting..." : "Submit LO Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#374151"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
  transition: "border-color 0.2s",
  backgroundColor: "#f9fafb"
};

"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";

type ExternalRequestFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  settings: any;
  user: any;
};

export default function ExternalRequestForm({ onClose, onSuccess, settings, user }: ExternalRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    requestFrom: user?.name || "",
    requesterEmail: user?.email || "",
    natureOfRequest: "",
    departmentName: "",
    requestType: "",
  });

  useState(() => {
    if (user?.department) {
      setFormData(prev => ({ ...prev, departmentName: user.department }));
    }
  });

  useEffect(() => {
    if (user?.department && !formData.departmentName) {
      setFormData(prev => ({ ...prev, departmentName: user.department }));
    }
  }, [user, formData.departmentName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/external-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to submit request");
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
        background: "white", borderRadius: "20px", width: "100%", maxWidth: "600px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden"
      }}>
        <div style={{ padding: "24px", background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Submit New Request</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>Request information or documents from the Finance team.</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", fontSize: "0.875rem" }}>{error}</div>}
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Request From</label>
              <input 
                type="text" 
                readOnly 
                value={formData.requestFrom} 
                style={{ ...inputStyle, background: "#f8fafc", cursor: "not-allowed" }} 
              />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input 
                type="text" 
                readOnly 
                value={formData.departmentName} 
                style={{ ...inputStyle, background: "#f8fafc", cursor: "not-allowed" }} 
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Request Type *</label>
            <select 
              name="requestType" 
              required 
              value={formData.requestType} 
              onChange={handleChange} 
              style={inputStyle}
            >
              <option value="">Select Type</option>
              {settings?.masterRequestTypes?.split(',').filter((t: string) => t.trim()).map((type: string) => (
                <option key={type.trim()} value={type.trim()}>{type.trim()}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Nature of Request *</label>
            <textarea 
              name="natureOfRequest" 
              required 
              value={formData.natureOfRequest} 
              onChange={handleChange} 
              style={{ ...inputStyle, minHeight: "120px", resize: "none" }} 
              placeholder="Describe what you need from the Finance team..."
            />
          </div>

          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ 
              padding: "10px 24px", borderRadius: "8px", border: "none", 
              background: "#4f46e5", color: "white", fontWeight: 600, 
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "8px"
            }}>
              {loading ? "Submitting..." : <><Send size={18} /> Submit Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase" as const
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s",
  color: "#1e293b"
};

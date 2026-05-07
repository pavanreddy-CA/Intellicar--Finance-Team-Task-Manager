"use client";

import { useState, useEffect } from "react";
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
    reasonForRequest: "",
    departmentName: "",
    requestType: "",
    entityNames: [] as string[],
    mailSubject: "",
  });

  const [allowedEntities, setAllowedEntities] = useState<string[]>([]);

  useEffect(() => {
    const matrix = JSON.parse(settings.entityMatrix || '{}');
    const userPerms = matrix[user.id] || [];
    const allEntities = settings?.masterEntities?.split(',').map((e: string) => e.trim()).filter((e: string) => e) || [];
    
    if (userPerms.includes('ALL')) {
      setAllowedEntities(allEntities);
    } else {
      setAllowedEntities(allEntities.filter((e: string) => userPerms.includes(e)));
    }
  }, [settings, user.id]);

  useEffect(() => {
    if (user?.department && !formData.departmentName) {
      setFormData(prev => ({ ...prev, departmentName: user.department }));
    }
  }, [user, formData.departmentName]);

  const handleEntityToggle = (entity: string) => {
    setFormData(prev => {
      const current = prev.entityNames;
      const updated = current.includes(entity) 
        ? current.filter(e => e !== entity) 
        : [...current, entity];
      return { ...prev, entityNames: updated };
    });
  };

  const handleSelectAll = () => {
    setFormData(prev => {
      const isAllSelected = prev.entityNames.length === allowedEntities.length;
      return { ...prev, entityNames: isAllSelected ? [] : [...allowedEntities] };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.natureOfRequest || !formData.reasonForRequest) {
      setError("Both 'What is Needed' and 'Reason for Request' are mandatory.");
      return;
    }
    if (formData.entityNames.length === 0) {
      setError("Please select at least one entity.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Calculate assigned allocator
      const matrix = JSON.parse(settings.allocationMatrix || '{}');
      const allocData = matrix[formData.requestType];
      let assignedAllocatorEmail = null;
      if (allocData && typeof allocData === 'object' && !Array.isArray(allocData)) {
        assignedAllocatorEmail = allocData.primary || null;
      } else if (Array.isArray(allocData)) {
        assignedAllocatorEmail = allocData[0] || null;
      } else if (typeof allocData === 'string') {
        assignedAllocatorEmail = allocData || null;
      }

      const res = await fetch("/api/external-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, assignedAllocatorEmail }),
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Select Entities *</label>
              <button 
                type="button" 
                onClick={handleSelectAll}
                style={{ fontSize: "0.7rem", color: "#4f46e5", background: "none", border: "none", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}
              >
                {formData.entityNames.length === allowedEntities.length ? "Deselect All" : "Consolidate (Select All)"}
              </button>
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
              gap: "8px", 
              maxHeight: "150px", 
              overflowY: "auto",
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }}>
              {allowedEntities.map(entity => (
                <label key={entity} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", cursor: "pointer", padding: "4px", borderRadius: "4px", transition: "background 0.2s" }}>
                  <input 
                    type="checkbox" 
                    checked={formData.entityNames.includes(entity)} 
                    onChange={() => handleEntityToggle(entity)}
                    style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  />
                  {entity}
                </label>
              ))}
              {allowedEntities.length === 0 && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No entities assigned to you.</span>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Finance Function *</label>
              <select 
                name="requestType" 
                required 
                value={formData.requestType} 
                onChange={handleChange} 
                style={inputStyle}
              >
                <option value="">Select Finance Function</option>
                {settings?.masterRequestTypes?.split(',').filter((t: string) => t.trim()).map((type: string) => (
                  <option key={type.trim()} value={type.trim()}>{type.trim()}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>What is Needed *</label>
            <textarea 
              name="natureOfRequest" 
              required 
              value={formData.natureOfRequest} 
              onChange={handleChange} 
              style={{ ...inputStyle, minHeight: "80px", resize: "none" }} 
              placeholder="Describe what you need from the Finance team..."
            />
          </div>

          <div>
            <label style={labelStyle}>Reason for Request *</label>
            <textarea 
              name="reasonForRequest" 
              required 
              value={formData.reasonForRequest} 
              onChange={handleChange} 
              style={{ ...inputStyle, minHeight: "80px", resize: "none" }} 
              placeholder="Explain why this information or document is needed..."
            />
          </div>

          <div>
            <label style={labelStyle}>Mail Subject (Optional)</label>
            <input 
              name="mailSubject" 
              type="text"
              value={formData.mailSubject} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="Enter subject for this request..."
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

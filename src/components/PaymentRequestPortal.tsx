"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Filter, ChevronRight, FileText, CheckCircle2, XCircle, Clock, 
  Eye, Download, MoreHorizontal, ArrowRight, User, Users, ShieldCheck, 
  AlertCircle, Calendar, CreditCard, Building2, Tag, Check, X, Mail, 
  FileCheck, FileSearch, ArrowUpRight, History, Wallet, Upload, Trash2, Paperclip, RefreshCw
} from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter';

interface PaymentRequest {
  id: number;
  requesterName: string;
  requesterEmail: string;
  department: string;
  entityName: string;
  vendorName: string;
  description: string;
  paymentType: string;
  frequency: string;
  amount: number;
  dueDate: string;
  isNewVendor: boolean;
  kycDocuments: any;
  supportings: any;
  status: 'PENDING_DEPT' | 'PENDING_FINANCE' | 'APPROVED' | 'REJECTED';
  dateStatus?: 'DUE TODAY' | 'OVERDUE' | 'UPCOMING';
  approvedBy?: string;
  processedBy?: string;
  deptHeadComments?: string;
  financeComments?: string;
  createdAt: string;
  updatedAt: string;
}

// Multi-file Upload Component
function FileUpload({ 
  label, 
  files, 
  onFilesChange, 
  maxFiles = 5, 
  maxSizeMB = 5, 
  accept = ".pdf,image/*",
  t 
}: { 
  label: string; 
  files: { name: string; data: string; type: string }[]; 
  onFilesChange: (files: { name: string; data: string; type: string }[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  t: any;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload a maximum of ${maxFiles} documents.`);
      return;
    }

    selectedFiles.forEach(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File ${file.name} exceeds ${maxSizeMB}MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onFilesChange([...files, { name: file.name, data: base64, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div 
        onClick={() => files.length < maxFiles && fileInputRef.current?.click()}
        style={{ 
          border: `2px dashed ${t.border}`, borderRadius: '12px', padding: '20px', 
          textAlign: 'center', cursor: files.length < maxFiles ? 'pointer' : 'not-allowed', 
          background: t.card, opacity: files.length < maxFiles ? 1 : 0.6,
          transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
        }}
        onMouseOver={e => files.length < maxFiles && (e.currentTarget.style.borderColor = '#2563eb')}
        onMouseOut={e => e.currentTarget.style.borderColor = t.border}
      >
        <Upload size={24} color="#64748b" />
        <div style={{ fontSize: '0.8125rem', color: t.textMuted }}>
          {files.length < maxFiles ? (
            <><span style={{ color: '#2563eb', fontWeight: 700 }}>Click to upload</span> or drag and drop</>
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 700 }}>Maximum {maxFiles} files reached</span>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: t.textMuted }}>PDF or Image (Max {maxSizeMB}MB each)</div>
        <input 
          type="file" ref={fileInputRef} hidden multiple accept={accept}
          onChange={handleFileChange} 
          disabled={files.length >= maxFiles}
        />
      </div>
      
      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {files.map((f, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', 
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' 
            }}>
              <FileText size={14} color="#2563eb" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaymentRequestPortal({ 
  user, theme, t, settings, showNotification, showConfirm 
}: { 
  user: any; theme: string; t: any; settings: any; showNotification: any; showConfirm: any;
}) {
  const isAdmin = user?.role === 'ADMIN';
  const isFinance = user?.department === 'Finance' || isAdmin;
  
  const deptHeadMatrix = JSON.parse(settings.departmentHeadMatrix || '{}');
  const userIsDeptHead = Object.values(deptHeadMatrix).some((heads: any) => 
    Array.isArray(heads) && heads.includes(user?.email)
  ) || isAdmin;

  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM' | 'FINANCE'>(
    isAdmin ? 'FINANCE' : (userIsDeptHead ? 'TEAM' : 'MY')
  );
  
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewRequest, setViewRequest] = useState<PaymentRequest | null>(null);
  
  const [formData, setFormData] = useState({
    entityName: '',
    vendorName: '',
    description: '',
    paymentType: '',
    frequency: 'Ad-hoc',
    amount: '',
    dueDate: '',
    isNewVendor: false,
    kycDocuments: [] as { name: string; data: string; type: string }[],
    supportings: [] as { name: string; data: string; type: string }[]
  });

  const [activeMaster, setActiveMaster] = useState<PaymentRequest | null>(null);
  const [selectedPaymentForView, setSelectedPaymentForView] = useState<PaymentRequest | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [filters, setFilters] = useState({
    search: '',
    department: [] as string[],
    status: [] as string[],
    entity: [] as string[],
    vendor: [] as string[],
    startDate: '',
    endDate: ''
  });

  // Stabilize the fetch effect by using primitive values
  const filterString = JSON.stringify(filters);
  useEffect(() => {
    fetchRequests();
  }, [activeTab, filterString]);

  const handleQuickDownload = async (req: PaymentRequest) => {
    try {
      const res = await fetch(`/api/payments/requests/${req.id}`);
      if (res.ok) {
        const fullData = await res.json();
        const docs = [
          ...(Array.isArray(fullData.supportings) ? fullData.supportings : []),
          ...(Array.isArray(fullData.kycDocuments) ? fullData.kycDocuments : [])
        ];
        
        if (docs.length === 0) {
          showNotification("No documents found for this request", "info");
          return;
        }

        // Trigger download for each document
        docs.forEach((f: any) => {
          const link = document.createElement('a');
          link.href = f.data;
          link.download = f.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
        showNotification(`Downloading ${docs.length} file(s)...`);
      }
    } catch (err) {
      showNotification("Failed to download documents", "error");
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const type = activeTab === 'MY' ? 'MY' : (activeTab === 'TEAM' ? 'TEAM' : 'INTER');
      const params = new URLSearchParams({ type });
      if (filters.search) params.append('search', filters.search);
      if (filters.department.length > 0) params.append('department', filters.department.join(','));
      if (filters.status.length > 0) params.append('status', filters.status.join(','));
      if (filters.entity.length > 0) params.append('entity', filters.entity.join(','));
      if (filters.vendor.length > 0) params.append('vendor', filters.vendor.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`/api/payments/requests?${params.toString()}`);
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error("Fetch requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityName || !formData.vendorName || !formData.amount || !formData.dueDate) {
      showNotification("Please fill all required fields", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showNotification("Payment request submitted successfully!");
        setShowForm(false);
        fetchRequests();
        setFormData({
          entityName: '', vendorName: '', description: '', paymentType: '',
          frequency: 'Ad-hoc', amount: '', dueDate: '', isNewVendor: false,
          kycDocuments: [], supportings: []
        });
      } else {
        const errData = await res.json();
        showNotification(errData.error || "Failed to submit request", "error");
      }
    } catch (err) {
      showNotification("Failed to submit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (requestId: number, action: 'APPROVE' | 'REJECT' | 'PROCESS') => {
    if (action === 'REJECT' && !reviewComments) {
      showNotification("Please add comments for rejection", "error");
      return;
    }

    try {
      const res = await fetch("/api/payments/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, action, comments: reviewComments })
      });
      if (res.ok) {
        showNotification(`Request ${action.toLowerCase()}ed successfully!`);
        setViewRequest(null);
        setReviewComments("");
        fetchRequests();
      }
    } catch (err) {
      showNotification("Action failed", "error");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING_DEPT': return { bg: '#fff7ed', text: '#c2410c', label: 'Pending Dept Head' };
      case 'PENDING_FINANCE': return { bg: '#eff6ff', text: '#1d4ed8', label: 'Pending Finance' };
      case 'APPROVED': return { bg: '#f0fdf4', text: '#15803d', label: 'Processed' };
      case 'REJECTED': return { bg: '#fef2f2', text: '#b91c1c', label: 'Rejected' };
      default: return { bg: '#f1f5f9', text: '#475569', label: status };
    }
  };

  const getDateStatusStyle = (status?: string) => {
    switch (status) {
      case 'DUE TODAY': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'OVERDUE': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { color: '#64748b', bg: 'transparent' };
    }
  };

  const renderTimeline = (req: PaymentRequest) => {
    const steps = [
      { id: 'SUBMITTED', label: 'Submitted', date: req.createdAt, completed: true },
      { id: 'DEPT', label: 'Dept Head', date: req.status !== 'PENDING_DEPT' ? req.updatedAt : null, completed: req.status !== 'PENDING_DEPT' },
      { id: 'FINANCE', label: 'Finance', date: req.status === 'APPROVED' ? req.updatedAt : null, completed: req.status === 'APPROVED' }
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ 
                width: '18px', height: '18px', borderRadius: '50%', 
                background: step.completed ? '#10b981' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                {step.completed ? <Check size={10} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />}
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: t.textMuted }}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ height: '2px', width: '20px', background: step.completed && steps[idx+1].completed ? '#10b981' : '#e2e8f0', marginTop: '-12px' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const deptOptions = settings.masterDepartments.split(',').map((d: string) => d.trim());
  const entityOptions = settings.masterEntities.split(',').map((e: string) => e.trim());
  const statusOptions = ['PENDING_DEPT', 'PENDING_FINANCE', 'APPROVED', 'REJECTED'];
  const vendorOptions = Array.from(new Set(requests.map(r => r.vendorName))).sort();

  const renderRequestsTable = (list: PaymentRequest[]) => (
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
        <thead>
          <tr style={{ background: theme === 'DARK' ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
            <th style={thStyle}>Entity</th>
            <th style={thStyle}>Vendor</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>Due Date</th>
            {activeTab === 'FINANCE' && <th style={thStyle}>User</th>}
            <th style={thStyle}>Approver</th>
            <th style={thStyle}>Status</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} style={{ padding: '60px', textAlign: 'center', color: t.textMuted }}>
              <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              Loading requests...
            </td></tr>
          ) : list.length === 0 ? (
            <tr><td colSpan={10} style={{ padding: '60px', textAlign: 'center', color: t.textMuted }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: t.text, marginBottom: '8px' }}>No Pending payment requests</div>
              <p style={{ margin: 0 }}>Try adjusting your filters or check other tabs.</p>
            </td></tr>
          ) : (
            list.map(req => {
              const status = getStatusStyle(req.status);
              const dateStyle = getDateStatusStyle(req.dateStatus);
              return (
                <tr key={req.id} style={{ borderBottom: `1px solid ${t.border}`, transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button 
                          onClick={() => setSelectedPaymentForView(req)}
                          style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Quick View"
                      >
                        <Eye size={14} />
                      </button>
                      <span style={{ color: '#3b82f6', fontWeight: 700 }}>{req.entityName}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{req.vendorName}</td>
                  <td style={{ ...tdStyle, color: t.textMuted, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.description}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, color: t.text }}>₹{Number(req.amount).toLocaleString()}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{new Date(req.dueDate).toLocaleDateString('en-GB')}</div>
                    {req.dateStatus && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: dateStyle.color, background: dateStyle.bg, padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                        {req.dateStatus}
                      </div>
                    )}
                  </td>
                  {activeTab === 'FINANCE' && (
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{req.requesterName}</div>
                      <div style={{ fontSize: '0.7rem', color: t.textMuted }}>{req.department}</div>
                    </td>
                  )}
                  <td style={tdStyle}>
                    {req.processedBy ? (
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb' }}>{req.processedBy}</div>
                        <div style={{ fontSize: '0.65rem', color: t.textMuted }}>Admin / Finance</div>
                      </div>
                    ) : req.approvedBy ? (
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981' }}>{req.approvedBy}</div>
                        <div style={{ fontSize: '0.65rem', color: t.textMuted }}>Dept Head</div>
                      </div>
                    ) : (
                      <div style={{ color: t.textMuted }}>--</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ padding: '4px 10px', borderRadius: '8px', background: status.bg, color: status.text, fontSize: '0.75rem', fontWeight: 700, display: 'inline-block' }}>
                      {status.label}
                    </div>
                    {renderTimeline(req)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleQuickDownload(req)}
                        style={{ padding: '8px', borderRadius: '10px', background: 'transparent', border: `1px solid ${t.border}`, color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Quick Download"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const res = await fetch(`/api/payments/requests/${req.id}`);
                            if (res.ok) {
                              const fullData = await res.json();
                              setViewRequest(fullData);
                            } else {
                              showNotification("Failed to load request details", "error");
                            }
                          } catch (err) {
                            showNotification("Error loading details", "error");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: 'transparent', border: `1px solid ${t.border}`, color: t.text, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                        onMouseOut={e => e.currentTarget.style.borderColor = t.border}
                      >
                        <Eye size={14} /> Review
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: '24px', color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '16px', letterSpacing: '-0.02em' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.4)' }}>
              <Wallet size={28} color="white" />
            </div>
            Payment Request Portal
          </h2>
          <p style={{ margin: '8px 0 0 0', color: t.textMuted, fontSize: '1rem', fontWeight: 500 }}>Submit and manage inter-departmental ad-hoc payment requests.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          style={{ padding: '12px 24px', borderRadius: '14px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)', transition: 'transform 0.2s' }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          <Plus size={22} /> New Request
        </button>
      </div>

      {/* Navigation & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', background: theme === 'DARK' ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9', padding: '6px', borderRadius: '16px', width: 'fit-content', border: `1px solid ${t.border}` }}>
          <button 
            onClick={() => setActiveTab('MY')}
            style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'MY' ? t.card : 'transparent', color: activeTab === 'MY' ? '#2563eb' : t.textMuted, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: activeTab === 'MY' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}
          >
            <User size={18} /> My Submissions
          </button>
          {userIsDeptHead && (
            <button 
              onClick={() => setActiveTab('TEAM')}
              style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'TEAM' ? t.card : 'transparent', color: activeTab === 'TEAM' ? '#2563eb' : t.textMuted, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: activeTab === 'TEAM' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}
            >
              <Users size={18} /> Team Approvals
            </button>
          )}
          {isFinance && (
            <button 
              onClick={() => setActiveTab('FINANCE')}
              style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: activeTab === 'FINANCE' ? t.card : 'transparent', color: activeTab === 'FINANCE' ? '#2563eb' : t.textMuted, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: activeTab === 'FINANCE' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}
            >
              <ShieldCheck size={18} /> Inter-Dept Review
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <div style={{ position: 'relative', maxWidth: '350px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} />
            <input 
              type="text" 
              placeholder="Quick search..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              style={{ ...inputStyle(t), paddingLeft: '44px', height: '48px', borderRadius: '14px' }}
            />
          </div>
          <button 
            onClick={fetchRequests}
            style={{ height: '48px', width: '48px', borderRadius: '14px', background: t.card, border: `1px solid ${t.border}`, color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      
      {/* Advanced Multi-Filters Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: t.card, padding: '20px', borderRadius: '20px', border: `1px solid ${t.border}`, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Entity</label>
          <MultiSelectFilter 
            options={entityOptions} 
            selected={filters.entity} 
            onChange={selected => setFilters({...filters, entity: selected})} 
            placeholder="All Entities" t={t} theme={theme}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Vendor</label>
          <MultiSelectFilter 
            options={vendorOptions} 
            selected={filters.vendor} 
            onChange={selected => setFilters({...filters, vendor: selected})} 
            placeholder="All Vendors" t={t} theme={theme}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Department</label>
          <MultiSelectFilter 
            options={deptOptions} 
            selected={filters.department} 
            onChange={selected => setFilters({...filters, department: selected})} 
            placeholder="All Depts" t={t} theme={theme}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Status</label>
          <MultiSelectFilter 
            options={statusOptions} 
            selected={filters.status} 
            onChange={selected => setFilters({...filters, status: selected})} 
            placeholder="All Statuses" t={t} theme={theme}
            labelMapping={{
              'PENDING_DEPT': 'Pending Dept Head',
              'PENDING_FINANCE': 'Pending Finance',
              'APPROVED': 'Processed',
              'REJECTED': 'Rejected'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>Date Range</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              style={{ ...inputStyle(t), width: '150px', height: '36px', padding: '6px 10px' }}
            />
            <span style={{ color: t.textMuted, fontWeight: 700 }}>to</span>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              style={{ ...inputStyle(t), width: '150px', height: '36px', padding: '6px 10px' }}
            />
          </div>
        </div>

        <button 
          onClick={() => setFilters({ search: '', department: [], status: [], entity: [], vendor: [], startDate: '', endDate: '' })}
          style={{ height: '36px', padding: '0 20px', borderRadius: '10px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      {/* Main Content Area with Scroll Support */}
      <div style={{ background: t.card, borderRadius: '24px', border: `1px solid ${t.border}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {renderRequestsTable(requests)}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, background: t.card, maxWidth: '650px' }}>
            <div style={{ padding: '28px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Submit Payment Request</h3>
                <p style={{ margin: '4px 0 0 0', color: t.textMuted, fontSize: '0.875rem' }}>Fill in the details below to initiate the approval workflow.</p>
              </div>
              <button onClick={() => setShowForm(false)} style={closeBtnStyle}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '28px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>ENTITY <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    required value={formData.entityName} 
                    onChange={e => setFormData({...formData, entityName: e.target.value})} 
                    style={inputStyle(t)}
                  >
                    <option value="">Select Entity</option>
                    {settings.masterEntities.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>VENDOR NAME <span style={{ color: '#ef4444' }}>*</span></label>
                  <input required placeholder="Enter vendor name" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} style={inputStyle(t)} />
                </div>
                <div>
                  <label style={labelStyle}>AMOUNT (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" required placeholder="100,000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={inputStyle(t)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>DESCRIPTION <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea required placeholder="Brief explanation of the payment purpose..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ ...inputStyle(t), height: '100px', resize: 'none' }} />
                </div>
                <div>
                  <label style={labelStyle}>PAYMENT TYPE <span style={{ color: '#ef4444' }}>*</span></label>
                  <select required value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value})} style={inputStyle(t)}>
                    <option value="">Select Type</option>
                    {settings.masterPaymentTypes.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>DUE DATE <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} style={inputStyle(t)} />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '12px', background: formData.isNewVendor ? 'rgba(37, 99, 235, 0.05)' : 'transparent', border: `1px solid ${formData.isNewVendor ? '#3b82f6' : t.border}`, transition: 'all 0.2s' }}>
                    <input type="checkbox" checked={formData.isNewVendor} onChange={e => setFormData({...formData, isNewVendor: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, color: formData.isNewVendor ? '#2563eb' : t.text }}>IS THIS A NEW VENDOR?</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'none', color: t.textMuted }}>Requires KYC document attachments</span>
                    </div>
                  </label>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <FileUpload 
                    label={formData.isNewVendor ? "Supportings & KYC Documents (Max 5)" : "Supportings Documents (Max 5)"} 
                    files={formData.supportings} 
                    onFilesChange={files => setFormData({...formData, supportings: files})} 
                    t={t} 
                  />
                </div>
              </div>
              <div style={{ marginTop: '32px', display: 'flex', gap: '16px', position: 'sticky', bottom: 0, background: t.card, padding: '10px 0' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'transparent', color: t.textMuted, border: `1px solid ${t.border}`, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: '14px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.4)' }}>
                  {isSubmitting ? "Submitting Request..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {viewRequest && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, background: t.card, maxWidth: '800px' }}>
            <div style={{ padding: '28px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  Review Request <span style={{ padding: '4px 10px', borderRadius: '8px', background: getStatusStyle(viewRequest.status).bg, color: getStatusStyle(viewRequest.status).text, fontSize: '0.75rem' }}>#{viewRequest.id}</span>
                </h3>
              </div>
              <button onClick={() => setViewRequest(null)} style={closeBtnStyle}><X size={24} /></button>
            </div>
            <div style={{ padding: '28px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <DetailBox label="Entity" value={viewRequest.entityName} />
                <DetailBox label="Vendor" value={viewRequest.vendorName} />
                <DetailBox label="Amount" value={`₹${Number(viewRequest.amount).toLocaleString()}`} />
                <DetailBox label="Due Date" value={new Date(viewRequest.dueDate).toLocaleDateString('en-GB')} />
                <DetailBox label="Requested By" value={viewRequest.requesterName} />
                <DetailBox label="Department" value={viewRequest.department} />
                <div style={{ gridColumn: 'span 3' }}><DetailBox label="Purpose / Description" value={viewRequest.description} /></div>
              </div>

              {/* Attachments Section */}
              <div style={{ marginBottom: '32px', padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 800 }}>
                  <Paperclip size={20} color="#2563eb" /> Attached Documents
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {(() => {
                    const docs = [
                      ...(Array.isArray(viewRequest.supportings) ? viewRequest.supportings : []),
                      ...(Array.isArray(viewRequest.kycDocuments) ? viewRequest.kycDocuments : [])
                    ];
                    return docs.length > 0 ? (
                      docs.map((f: any, idx: number) => (
                        <a key={idx} href={f.data} download={f.name} style={{ padding: '12px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: '#1e293b', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}>
                          <FileText size={18} color="#2563eb" /> 
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                          <Download size={14} color="#64748b" />
                        </a>
                      ))
                    ) : (
                      <div style={{ gridColumn: 'span 2', color: t.textMuted, fontSize: '0.875rem', textAlign: 'center', padding: '20px' }}>No documents attached</div>
                    );
                  })()}
                </div>
              </div>

              {/* Approval Workflow */}
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '28px' }}>
                <h5 style={labelStyle}>Processing History</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {viewRequest.deptHeadComments && (
                    <div style={{ padding: '14px', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bcf0da' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Dept Head Review ({viewRequest.approvedBy || 'Unknown'})
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#065f46' }}>{viewRequest.deptHeadComments}</div>
                    </div>
                  )}
                  {viewRequest.financeComments && (
                    <div style={{ padding: '14px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Finance / Admin Processing ({viewRequest.processedBy || 'Unknown'})
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>{viewRequest.financeComments}</div>
                    </div>
                  )}
                </div>

                {viewRequest.status === 'PENDING_DEPT' && activeTab === 'TEAM' && (
                  <div style={{ marginTop: '24px' }}>
                    <label style={labelStyle}>Approval / Rejection Comments</label>
                    <textarea value={reviewComments} onChange={e => setReviewComments(e.target.value)} style={{ ...inputStyle(t), height: '100px', marginBottom: '16px' }} placeholder="Add UTR reference or reason for rejection..." />
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button onClick={() => handleAction(viewRequest.id, 'APPROVE')} style={{ flex: 2, padding: '14px', borderRadius: '14px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.4)' }}>Approve Request</button>
                      <button onClick={() => handleAction(viewRequest.id, 'REJECT')} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                    </div>
                  </div>
                )}

                {viewRequest.status === 'PENDING_FINANCE' && activeTab === 'FINANCE' && (
                  <div style={{ marginTop: '24px' }}>
                    <label style={labelStyle}>Finance Processing Comments</label>
                    <textarea value={reviewComments} onChange={e => setReviewComments(e.target.value)} style={{ ...inputStyle(t), height: '100px', marginBottom: '16px' }} placeholder="Add UTR reference or reason for rejection..." />
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button onClick={() => handleAction(viewRequest.id, 'PROCESS')} style={{ flex: 2, padding: '14px', borderRadius: '14px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.4)' }}>Mark as Processed</button>
                      <button onClick={() => handleAction(viewRequest.id, 'REJECT')} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Quick View: Payment Request Details ────────────────────────── */}
      {selectedPaymentForView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", padding: "24px" }}>
          <div style={{ background: "white", width: "100%", maxWidth: "700px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "#eef2ff", padding: "10px", borderRadius: "12px", color: "#4f46e5" }}>
                  <Eye size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>Quick View: Payment Request</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>Request ID: #{selectedPaymentForView.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedPaymentForView(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", borderRadius: "10px" }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: "32px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <DetailBox label="Payment Description" value={selectedPaymentForView.description} />
                </div>
                
                <DetailBox label="Entity" value={selectedPaymentForView.entityName} />
                <DetailBox label="Vendor" value={selectedPaymentForView.vendorName} />
                <DetailBox label="Amount" value={`₹${Number(selectedPaymentForView.amount).toLocaleString()}`} />
                <DetailBox label="Due Date" value={new Date(selectedPaymentForView.dueDate).toLocaleDateString('en-GB')} />
                <DetailBox label="Requested By" value={selectedPaymentForView.requesterName} />
                <DetailBox label="Department" value={selectedPaymentForView.department} />
                <DetailBox label="Status" value={getStatusStyle(selectedPaymentForView.status).label} />
                <DetailBox label="Payment Type" value={selectedPaymentForView.paymentType} />
                
                {selectedPaymentForView.financeComments && (
                  <div style={{ gridColumn: "span 2" }}>
                    <DetailBox label="Finance Comments" value={selectedPaymentForView.financeComments} />
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", textAlign: "right", background: "#f8fafc" }}>
              <button 
                onClick={() => setSelectedPaymentForView(null)} 
                style={{ padding: '12px 24px', borderRadius: '12px', background: '#4f46e5', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBox({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' };
const tdStyle: React.CSSProperties = { padding: '20px', fontSize: '0.875rem', verticalAlign: 'middle' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '24px' };
const modalContentStyle: React.CSSProperties = { borderRadius: '28px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' };
const inputStyle = (t: any): React.CSSProperties => ({ width: '100%', padding: '14px 16px', borderRadius: '14px', border: `1px solid ${t.border}`, background: t.bg, color: t.text, outline: 'none', fontSize: '0.9375rem', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' });
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' };

"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, ChevronRight, FileText, CheckCircle2, XCircle, Clock, 
  Eye, Download, MoreHorizontal, ArrowRight, User, Users, ShieldCheck, 
  AlertCircle, Calendar, CreditCard, Building2, Tag, Check, X, Mail, 
  FileCheck, FileSearch, ArrowUpRight, History, Wallet
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
  status: 'PENDING_DEPT' | 'PENDING_FINANCE' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  processedBy?: string;
  deptHeadComments?: string;
  financeComments?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentRequestPortal({ 
  user, theme, t, settings, showNotification, showConfirm 
}: { 
  user: any; theme: string; t: any; settings: any; showNotification: any; showConfirm: any;
}) {
  const isAdmin = user?.role === 'ADMIN';
  const isFinance = user?.department === 'Finance' || isAdmin;
  
  // Check if user is a Dept Head for any department
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
  
  // Form State
  const [formData, setFormData] = useState({
    entityName: '',
    vendorName: '',
    description: '',
    paymentType: '',
    frequency: 'Ad-hoc',
    amount: '',
    dueDate: '',
    isNewVendor: false,
    kycDocuments: {
      registration: null as string | null,
      gst: null as string | null,
      msme: null as string | null,
      cheque: null as string | null,
      pan: null as string | null
    }
  });

  const [reviewComments, setReviewComments] = useState("");
  const [filters, setFilters] = useState({
    search: '',
    department: 'ALL',
    status: 'ALL',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [activeTab, filters]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const type = activeTab === 'MY' ? 'MY' : (activeTab === 'TEAM' ? 'TEAM' : 'INTER');
      const params = new URLSearchParams({ type });
      if (filters.search) params.append('search', filters.search);
      if (filters.department !== 'ALL') params.append('department', filters.department);
      if (filters.status !== 'ALL') params.append('status', filters.status);
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
          kycDocuments: { registration: null, gst: null, msme: null, cheque: null, pan: null }
        });
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

  const renderTimeline = (req: PaymentRequest) => {
    const steps = [
      { id: 'SUBMITTED', label: 'Submitted', date: req.createdAt, completed: true },
      { id: 'DEPT', label: 'Dept Head', date: req.status !== 'PENDING_DEPT' ? req.updatedAt : null, completed: req.status !== 'PENDING_DEPT' },
      { id: 'FINANCE', label: 'Finance', date: req.status === 'APPROVED' ? req.updatedAt : null, completed: req.status === 'APPROVED' }
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ 
                width: '24px', height: '24px', borderRadius: '50%', 
                background: step.completed ? '#10b981' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                {step.completed ? <Check size={14} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: t.textMuted }}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ height: '2px', width: '30px', background: step.completed && steps[idx+1].completed ? '#10b981' : '#e2e8f0', marginTop: '-15px' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Wallet size={32} color="#2563eb" /> Payment Request Portal
          </h2>
          <p style={{ margin: '4px 0 0 0', color: t.textMuted, fontSize: '0.9rem' }}>Submit and manage inter-departmental ad-hoc payment requests.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', borderRadius: '12px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
        >
          <Plus size={20} /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: theme === 'DARK' ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9', padding: '6px', borderRadius: '14px', width: 'fit-content' }}>
        <button 
          onClick={() => setActiveTab('MY')}
          style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'MY' ? t.card : 'transparent', color: activeTab === 'MY' ? '#2563eb' : t.textMuted, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <User size={18} /> My Submissions
        </button>
        {userIsDeptHead && (
          <button 
            onClick={() => setActiveTab('TEAM')}
            style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'TEAM' ? t.card : 'transparent', color: activeTab === 'TEAM' ? '#2563eb' : t.textMuted, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <Users size={18} /> Team Approvals
          </button>
        )}
        {isFinance && (
          <button 
            onClick={() => setActiveTab('FINANCE')}
            style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'FINANCE' ? t.card : 'transparent', color: activeTab === 'FINANCE' ? '#2563eb' : t.textMuted, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <ShieldCheck size={18} /> Inter-Dept Review
          </button>
        )}
      </div>
      
      {/* Filters Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', background: t.card, padding: '16px', borderRadius: '16px', border: `1px solid ${t.border}`, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} />
          <input 
            type="text" 
            placeholder="Search vendor, entity or description..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            style={{ ...inputStyle(t), paddingLeft: '36px' }}
          />
        </div>

        <select 
          value={filters.department}
          onChange={(e) => setFilters({...filters, department: e.target.value})}
          style={{ ...inputStyle(t), width: '160px' }}
        >
          <option value="ALL">All Departments</option>
          {settings.masterDepartments.split(',').map((d: string) => <option key={d} value={d.trim()}>{d.trim()}</option>)}
        </select>

        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          style={{ ...inputStyle(t), width: '160px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_DEPT">Pending Dept Head</option>
          <option value="PENDING_FINANCE">Pending Finance</option>
          <option value="APPROVED">Processed</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color={t.textMuted} />
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            style={{ ...inputStyle(t), width: '140px' }}
          />
          <span style={{ color: t.textMuted }}>to</span>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            style={{ ...inputStyle(t), width: '140px' }}
          />
        </div>

        <button 
          onClick={() => setFilters({ search: '', department: 'ALL', status: 'ALL', startDate: '', endDate: '' })}
          style={{ padding: '8px 12px', borderRadius: '10px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>


      {/* Table */}
      <div style={{ background: t.card, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: theme === 'DARK' ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${t.border}` }}>
              <th style={thStyle}>Entity & Vendor</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Due Date</th>
              {activeTab === 'FINANCE' && <th style={thStyle}>User</th>}
              {activeTab === 'FINANCE' && <th style={thStyle}>Approver</th>}
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>No requests found in this category.</td></tr>
            ) : (
              requests.map(req => {
                const status = getStatusStyle(req.status);
                return (
                  <tr key={req.id} style={{ borderBottom: `1px solid ${t.border}`, transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{req.vendorName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>{req.entityName}</div>
                    </td>
                    <td style={tdStyle}>{req.description}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>₹{Number(req.amount).toLocaleString()}</td>
                    <td style={tdStyle}>{new Date(req.dueDate).toLocaleDateString()}</td>
                    {activeTab === 'FINANCE' && (
                      <td style={tdStyle}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{req.requesterName}</div>
                        <div style={{ fontSize: '0.7rem', color: t.textMuted }}>{req.department}</div>
                      </td>
                    )}
                    {activeTab === 'FINANCE' && (
                      <td style={tdStyle}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{req.approvedBy || '--'}</div>
                      </td>
                    )}
                    <td style={tdStyle}>
                      <div style={{ padding: '4px 10px', borderRadius: '8px', background: status.bg, color: status.text, fontSize: '0.75rem', fontWeight: 700, display: 'inline-block' }}>
                        {status.label}
                      </div>
                      {(activeTab === 'MY' || activeTab === 'TEAM') && renderTimeline(req)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button 
                        onClick={() => setViewRequest(req)}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.text, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, background: t.card, maxWidth: '600px' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Submit Payment Request</h3>
              <button onClick={() => setShowForm(false)} style={closeBtnStyle}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Entity</label>
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
                  <label style={labelStyle}>Vendor Name</label>
                  <input required value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} style={inputStyle(t)} />
                </div>
                <div>
                  <label style={labelStyle}>Amount (₹)</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={inputStyle(t)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ ...inputStyle(t), height: '80px', resize: 'none' }} />
                </div>
                <div>
                  <label style={labelStyle}>Payment Type</label>
                  <select required value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value})} style={inputStyle(t)}>
                    <option value="">Select Type</option>
                    {settings.masterPaymentTypes.split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} style={inputStyle(t)} />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.isNewVendor} onChange={e => setFormData({...formData, isNewVendor: e.target.checked})} />
                    Is this a New Vendor? (Requires KYC)
                  </label>
                </div>

                {formData.isNewVendor && (
                  <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.875rem' }}>KYC Document Links (Paste URLs)</h5>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <input placeholder="Registration Proof URL" onChange={e => setFormData({...formData, kycDocuments: {...formData.kycDocuments, registration: e.target.value}})} style={inputStyle(t)} />
                      <input placeholder="GST Certificate URL" onChange={e => setFormData({...formData, kycDocuments: {...formData.kycDocuments, gst: e.target.value}})} style={inputStyle(t)} />
                      <input placeholder="Cancelled Cheque URL" onChange={e => setFormData({...formData, kycDocuments: {...formData.kycDocuments, cheque: e.target.value}})} style={inputStyle(t)} />
                      <input placeholder="PAN Card URL" onChange={e => setFormData({...formData, kycDocuments: {...formData.kycDocuments, pan: e.target.value}})} style={inputStyle(t)} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {viewRequest && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, background: t.card, maxWidth: '700px' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Review Payment Request</h3>
              <button onClick={() => setViewRequest(null)} style={closeBtnStyle}>×</button>
            </div>
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <DetailBox label="Entity" value={viewRequest.entityName} />
                <DetailBox label="Vendor" value={viewRequest.vendorName} />
                <DetailBox label="Amount" value={`₹${Number(viewRequest.amount).toLocaleString()}`} />
                <DetailBox label="Due Date" value={new Date(viewRequest.dueDate).toLocaleDateString()} />
                <div style={{ gridColumn: 'span 2' }}><DetailBox label="Description" value={viewRequest.description} /></div>
                <DetailBox label="Requested By" value={viewRequest.requesterName} />
                <DetailBox label="Department" value={viewRequest.department} />
              </div>

              {viewRequest.isNewVendor && (
                <div style={{ marginBottom: '24px' }}>
                  <h5 style={{ margin: '0 0 12px 0' }}>KYC Documents</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {Object.entries(viewRequest.kycDocuments || {}).map(([key, url]: [string, any]) => (
                      url && (
                        <a key={key} href={url} target="_blank" style={{ padding: '8px 12px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} /> View {key.toUpperCase()}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {viewRequest.status === 'PENDING_DEPT' && activeTab === 'TEAM' && (
                <div>
                  <label style={labelStyle}>Approval/Rejection Comments</label>
                  <textarea value={reviewComments} onChange={e => setReviewComments(e.target.value)} style={{ ...inputStyle(t), height: '80px' }} placeholder="Add notes for the team or finance..." />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={() => handleAction(viewRequest.id, 'APPROVE')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Approve & Forward</button>
                    <button onClick={() => handleAction(viewRequest.id, 'REJECT')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              )}

              {viewRequest.status === 'PENDING_FINANCE' && activeTab === 'FINANCE' && (
                <div>
                  <label style={labelStyle}>Finance Processing Comments</label>
                  <textarea value={reviewComments} onChange={e => setReviewComments(e.target.value)} style={{ ...inputStyle(t), height: '80px' }} placeholder="UTR info or rejection reason..." />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={() => handleAction(viewRequest.id, 'PROCESS')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Process Payment</button>
                    <button onClick={() => handleAction(viewRequest.id, 'REJECT')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBox({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' };
const tdStyle: React.CSSProperties = { padding: '16px 20px', fontSize: '0.8125rem' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px' };
const modalContentStyle: React.CSSProperties = { borderRadius: '24px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' };
const inputStyle = (t: any): React.CSSProperties => ({ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg, color: t.text, outline: 'none', fontSize: '0.875rem' });
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' };

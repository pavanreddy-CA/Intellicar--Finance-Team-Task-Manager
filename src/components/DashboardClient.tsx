"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, LogOut, Plus, Trash2, Users, Send, Sliders, Mail } from "lucide-react";

type Task = {
  id: number;
  taskName: string;
  entityName: string;
  taskType: string;
  departmentName: string;
  requestFrom: string;
  ownerName: string;
  reviewerName: string | null;
  dueDate: string | null;
  taskStatus: string;
  reviewStatus: string;
  createdAt: string;
  completionDate: string | null;
  reviewCompletionDate: string | null;
  mailLink: string | null;
  ownerComments: string | null;
  reviewerComments: string | null;
  editRequested?: boolean;
  editRequestBy?: string | null;
  editRequestReason?: string | null;
};

const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minutes = ["00", "15", "30", "45"];
const ampm = ["AM", "PM"];

const convertTo12h = (time24: string) => {
  if (!time24 || !time24.includes(':')) return { h: "09", m: "00", s: "AM" };
  const [h, m] = time24.split(':');
  const hours = parseInt(h);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return { h: String(h12), m, s: suffix };
};

const convertTo24h = (h12: string, m: string, suffix: string) => {
  let h = parseInt(h12);
  if (suffix === 'PM' && h < 12) h += 12;
  if (suffix === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
};

export default function DashboardClient({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_ACTION' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [activeOptionsTab, setActiveOptionsTab] = useState<'USERS' | 'MAILS' | 'SCHEDULE' | 'EDIT_REQUESTS'>('SCHEDULE');
  const [settings, setSettings] = useState({
    reminderFrequency: 'DAILY',
    reminderTimes: '09:00,18:00',
    managerReportFrequency: 'DAILY',
    managerReportTimes: '10:00'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const isAdmin = user?.email === "pavanreddy@intellicar.in" || user?.role === "ADMIN";

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (isAdmin) fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings.");
      }
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchUsersList = async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        fetchUsersList(); // Refresh
      } else {
        alert("Failed to update user role.");
      }
    } catch (error) {
      console.error("Failed to update role", error);
    }
  };

  const handleUpdate = async (taskId: number, field: string, value: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        fetchTasks();
      } else {
        alert("Failed to update. You may not have permission.");
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
    setEditingCell(null);
  };

  const handleDelete = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to completely delete this task? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
      } else {
        alert("Failed to delete. You do not have permission.");
      }
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const handleRequestDelete = async (taskId: number) => {
    const comment = window.prompt("Please provide a reason for deleting this task:");
    if (comment === null) return; // User cancelled
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/request-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      });
      if (res.ok) {
        alert("Deletion request sent to Master Admin successfully.");
      } else {
        alert("Failed to send deletion request.");
      }
    } catch (error) {
      console.error("Failed to request delete", error);
    }
  };

  const handleRequestEdit = async (taskId: number, roleType: 'OWNER' | 'REVIEWER') => {
    const reason = window.prompt("Please provide a reason for editing this completed task:");
    if (!reason) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/request-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, requestedBy: roleType })
      });
      if (res.ok) {
        alert("Edit request sent to Admin successfully.");
        fetchTasks();
      } else {
        alert("Failed to send edit request.");
      }
    } catch (error) {
      console.error("Failed to request edit", error);
    }
  };

  const handleApproveEdit = async (taskId: number, action: 'APPROVE' | 'REJECT') => {
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this edit request?`)) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Edit request ${action.toLowerCase()}d successfully.`);
        fetchTasks();
      } else {
        alert("Failed to process edit request.");
      }
    } catch (error) {
      console.error("Failed to process edit", error);
    }
  };

  const handleTriggerEmail = async (type: "users" | "manager") => {
    if (!window.confirm(`Are you sure you want to send the ${type === 'users' ? 'Employee Reminders' : 'Manager Report'} now?`)) return;
    
    try {
      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60 * 1000;
      const localIso = new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
      
      const res = await fetch(`/api/cron/daily-summary?type=${type}&clientDate=${localIso}`, {
        headers: { "Authorization": "Bearer intellicar-cron-123" }
      });
      if (res.ok) {
        alert("Emails sent successfully!");
      } else {
        alert("Failed to send emails.");
      }
    } catch (error) {
      console.error("Failed to trigger emails", error);
    }
  };

  const pendingActionCount = tasks.filter(t => t.taskStatus !== "Completed").length;
  const pendingReviewCount = tasks.filter(t => t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner").length;
  const completedCount = tasks.filter(t => t.taskStatus === "Completed" && (t.reviewStatus === "Completed" || t.reviewStatus === "Review Not Required")).length;

  // Format date as DD-MMM-YYYY
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "--";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date and time as DD-MMM-YYYY HH:mm
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "--";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const filteredTasksToDisplay = tasks.filter(t => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING_ACTION') return t.taskStatus !== "Completed";
    if (activeFilter === 'PENDING_REVIEW') return t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner";
    if (activeFilter === 'COMPLETED') return t.taskStatus === "Completed" && (t.reviewStatus === "Completed" || t.reviewStatus === "Review Not Required");
    return true;
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "16px 32px", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/logo.png" alt="Intellicar Logo" style={{ height: "45px", width: "auto" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.025em" }}>Intellicar Telematics</h1>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>Finance Task Management</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0f172a" }}>{user.name || "Master Admin"}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{user.email}</div>
          </div>
          
          {isAdmin && (
            <button onClick={() => { setShowOptionsModal(true); fetchUsersList(); fetchSettings(); }} style={{ padding: "10px 20px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.background = "#f8fafc"}>
              <Sliders size={18} /> Options
            </button>
          )}

          <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", transition: "all 0.2s" }} className="btn-primary">
            <Plus size={16} /> New Task
          </button>
          <a href="/api/auth/signout" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", transition: "color 0.2s" }} className="btn-logout">
            <LogOut size={18} /> <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Sign Out</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px" }}>
        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          <MetricCard title="Total Tasks" value={tasks.length} icon={<LayoutDashboard size={20} color="#3b82f6" />} bg="#eff6ff" isActive={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
          <MetricCard title="Pending Action" value={pendingActionCount} icon={<Clock size={20} color="#f59e0b" />} bg="#fffbeb" isActive={activeFilter === 'PENDING_ACTION'} onClick={() => setActiveFilter('PENDING_ACTION')} />
          <MetricCard title="Pending Review" value={pendingReviewCount} icon={<AlertCircle size={20} color="#ef4444" />} bg="#fef2f2" isActive={activeFilter === 'PENDING_REVIEW'} onClick={() => setActiveFilter('PENDING_REVIEW')} />
          <MetricCard title="Fully Completed" value={completedCount} icon={<CheckCircle2 size={20} color="#10b981" />} bg="#ecfdf5" isActive={activeFilter === 'COMPLETED'} onClick={() => setActiveFilter('COMPLETED')} />
        </div>

        {/* Data Table */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Created At</th>
                  <th style={thStyle}>Task Name</th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Completion Date</th>
                  <th style={thStyle}>Task Status</th>
                  <th style={thStyle}>Reviewer</th>
                  <th style={thStyle}>Review Status</th>
                  <th style={thStyle}>Review Date</th>
                  <th style={thStyle}>Owner Comments</th>
                  <th style={thStyle}>Reviewer Comments</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading tasks...</td></tr>
                ) : filteredTasksToDisplay.length === 0 ? (
                  <tr><td colSpan={14} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No tasks found in the system.</td></tr>
                ) : (
                  filteredTasksToDisplay.map((task) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = task.taskStatus !== "Completed" && task.dueDate && new Date(task.dueDate) < today;
                    const isOwnerLocked = task.taskStatus === "Completed" && !isAdmin;
                    const isReviewerLocked = (task.reviewStatus === "Completed" || task.reviewStatus === "Review Not Required") && !isAdmin;
                    
                    return (
                    <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s", backgroundColor: isOverdue ? "#fee2e2" : undefined }} className="table-row">
                      <td style={tdStyle}><span style={{ color: "#94a3b8", fontWeight: 500 }}>#{task.id}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}><span style={{ color: "#64748b" }}>{formatDateTime(task.createdAt)}</span></td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "#0f172a", minWidth: "400px", maxWidth: "750px", whiteSpace: "normal", wordWrap: "break-word" }}>{task.taskName}</td>
                      <td style={tdStyle}>{task.entityName}</td>
                      <td style={tdStyle}>{task.ownerName}</td>
                      <td style={tdStyle}>{task.dueDate ? formatDate(task.dueDate) : <span style={{ color: "#cbd5e1" }}>--</span>}</td>
                      
                      {/* Editable Completion Date */}
                      <td 
                        style={{ ...tdStyle, cursor: isOwnerLocked ? "not-allowed" : "pointer", minWidth: "140px" }}
                        onClick={() => { 
                          if (isOwnerLocked) return;
                          setEditingCell({ id: task.id, field: "completionDate" }); 
                          setEditValue(task.completionDate ? task.completionDate.split("T")[0] : ""); 
                        }}
                      >
                        {editingCell?.id === task.id && editingCell.field === "completionDate" ? (
                          <input 
                            type="date"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleUpdate(task.id, "completionDate", editValue)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(task.id, "completionDate", editValue)}
                            style={inputStyle}
                          />
                        ) : (
                          <span style={{ color: task.completionDate ? "#0f172a" : "#cbd5e1", fontWeight: 500 }}>
                            {formatDate(task.completionDate)}
                            {isOwnerLocked && <span style={{ marginLeft: "4px", fontSize: "10px" }}>🔒</span>}
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <StatusPill 
                          status={task.taskStatus} 
                          type="task" 
                          taskId={task.id} 
                          onUpdate={handleUpdate} 
                          disabled={isOwnerLocked}
                        />
                      </td>
                      <td style={tdStyle}>{task.reviewerName === "Not Applicable" ? <span style={{ color: "#94a3b8" }}>N/A</span> : task.reviewerName}</td>
                      <td style={tdStyle}>
                        <StatusPill 
                          status={task.reviewerName === "Not Applicable" ? "Review Not Required" : task.reviewStatus} 
                          type="review" 
                          taskId={task.id} 
                          onUpdate={handleUpdate} 
                          disabled={isReviewerLocked}
                        />
                      </td>

                      {/* Editable Review Completion Date */}
                      <td 
                        style={{ ...tdStyle, cursor: task.reviewerName === "Not Applicable" || isReviewerLocked ? "not-allowed" : "pointer", minWidth: "140px" }}
                        onClick={() => { 
                          if (task.reviewerName === "Not Applicable" || isReviewerLocked) return;
                          setEditingCell({ id: task.id, field: "reviewCompletionDate" }); 
                          setEditValue(task.reviewCompletionDate ? task.reviewCompletionDate.split("T")[0] : ""); 
                        }}
                      >
                        {task.reviewerName === "Not Applicable" ? (
                          <span style={{ color: "#94a3b8", fontWeight: 500 }}>N/A</span>
                        ) : editingCell?.id === task.id && editingCell.field === "reviewCompletionDate" ? (
                          <input 
                            type="date"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleUpdate(task.id, "reviewCompletionDate", editValue)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(task.id, "reviewCompletionDate", editValue)}
                            style={inputStyle}
                          />
                        ) : (
                          <span style={{ color: task.reviewCompletionDate ? "#0f172a" : "#cbd5e1", fontWeight: 500 }}>
                            {formatDate(task.reviewCompletionDate)}
                            {isReviewerLocked && <span style={{ marginLeft: "4px", fontSize: "10px" }}>🔒</span>}
                          </span>
                        )}
                      </td>
                      
                      {/* Editable Owner Comments */}
                      <td 
                        style={{ ...tdStyle, cursor: isOwnerLocked ? "not-allowed" : "text", minWidth: "200px", maxWidth: "380px", whiteSpace: "normal" }}
                        onClick={() => { 
                          if (isOwnerLocked) return;
                          setEditingCell({ id: task.id, field: "ownerComments" }); 
                          setEditValue(task.ownerComments || ""); 
                        }}
                      >
                        {editingCell?.id === task.id && editingCell.field === "ownerComments" ? (
                          <input 
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleUpdate(task.id, "ownerComments", editValue)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(task.id, "ownerComments", editValue)}
                            style={inputStyle}
                          />
                        ) : (
                          <span style={{ color: task.ownerComments ? "#475569" : "#cbd5e1" }}>{task.ownerComments || "Click to add..."}</span>
                        )}
                      </td>

                      {/* Editable Reviewer Comments */}
                      <td 
                        style={{ ...tdStyle, cursor: isReviewerLocked ? "not-allowed" : "text", minWidth: "200px", maxWidth: "380px", whiteSpace: "normal" }}
                        onClick={() => { 
                          if (isReviewerLocked) return;
                          setEditingCell({ id: task.id, field: "reviewerComments" }); 
                          setEditValue(task.reviewerComments || ""); 
                        }}
                      >
                        {editingCell?.id === task.id && editingCell.field === "reviewerComments" ? (
                          <input 
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleUpdate(task.id, "reviewerComments", editValue)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(task.id, "reviewerComments", editValue)}
                            style={inputStyle}
                          />
                        ) : (
                          <span style={{ color: task.reviewerComments ? "#475569" : "#cbd5e1" }}>{task.reviewerComments || "Click to add..."}</span>
                        )}
                      </td>

                      {/* Delete / Request Edit / Request Delete Action */}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          {isAdmin ? (
                            <button 
                              onClick={() => handleDelete(task.id)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", padding: "6px", borderRadius: "6px", transition: "all 0.2s" }}
                              title="Delete Task"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRequestDelete(task.id)}
                              style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 }}
                              title="Request Delete"
                            >
                              Del Req
                            </button>
                          )}
                          
                          {/* Request Edit buttons for locked tasks */}
                          {!isAdmin && isOwnerLocked && (
                            <button 
                              onClick={() => handleRequestEdit(task.id, "OWNER")}
                              disabled={task.editRequested && task.editRequestBy === "OWNER"}
                              style={{ background: task.editRequested && task.editRequestBy === "OWNER" ? "#e2e8f0" : "#eff6ff", color: task.editRequested && task.editRequestBy === "OWNER" ? "#94a3b8" : "#3b82f6", border: task.editRequested && task.editRequestBy === "OWNER" ? "1px solid #cbd5e1" : "1px solid #bfdbfe", cursor: task.editRequested && task.editRequestBy === "OWNER" ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 }}
                              title="Request Edit (Owner)"
                            >
                              {task.editRequested && task.editRequestBy === "OWNER" ? "Requested" : "Edit Req"}
                            </button>
                          )}
                          {!isAdmin && isReviewerLocked && task.reviewerName !== "Not Applicable" && (
                            <button 
                              onClick={() => handleRequestEdit(task.id, "REVIEWER")}
                              disabled={task.editRequested && task.editRequestBy === "REVIEWER"}
                              style={{ background: task.editRequested && task.editRequestBy === "REVIEWER" ? "#e2e8f0" : "#fdf4ff", color: task.editRequested && task.editRequestBy === "REVIEWER" ? "#94a3b8" : "#d946ef", border: task.editRequested && task.editRequestBy === "REVIEWER" ? "1px solid #cbd5e1" : "1px solid #f5d0fe", cursor: task.editRequested && task.editRequestBy === "REVIEWER" ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 }}
                              title="Request Edit (Reviewer)"
                            >
                              {task.editRequested && task.editRequestBy === "REVIEWER" ? "Requested" : "Rev Edit"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <TaskForm 
          onClose={() => setShowForm(false)} 
          onSuccess={() => {
            setShowForm(false);
            fetchTasks();
          }} 
        />
      )}

      {showOptionsModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "800px", height: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>Admin Options</h2>
              <button onClick={() => setShowOptionsModal(false)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.5rem" }}>×</button>
            </div>
            
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Sidebar Tabs */}
              <div style={{ width: "200px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", padding: "16px" }}>
                <button 
                  onClick={() => setActiveOptionsTab('SCHEDULE')} 
                  style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'SCHEDULE' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'SCHEDULE' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginBottom: "8px" }}
                >
                  Automation
                </button>
                <button 
                  onClick={() => setActiveOptionsTab('MAILS')} 
                  style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'MAILS' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'MAILS' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginBottom: "8px" }}
                >
                  Manual Mails
                </button>
                <button 
                  onClick={() => setActiveOptionsTab('USERS')} 
                  style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'USERS' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'USERS' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginBottom: "8px" }}
                >
                  User Management
                </button>
                <button 
                  onClick={() => setActiveOptionsTab('EDIT_REQUESTS')} 
                  style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'EDIT_REQUESTS' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'EDIT_REQUESTS' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer" }}
                >
                  Edit Requests
                  {tasks.filter(t => t.editRequested).length > 0 && (
                    <span style={{ marginLeft: "8px", background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "bold" }}>
                      {tasks.filter(t => t.editRequested).length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, padding: "32px", overflow: "auto" }}>
                {activeOptionsTab === 'SCHEDULE' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Auto-Email Frequency</h3>
                    
                    {/* Reminders Schedule */}
                    <div style={{ marginBottom: "32px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 600 }}>Pending Reminders (Owners)</h4>
                        <select 
                          value={settings.reminderFrequency}
                          onChange={(e) => setSettings({...settings, reminderFrequency: e.target.value})}
                          style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="CUSTOM">Custom</option>
                          <option value="OFF">Turn Off</option>
                        </select>
                      </div>

                      {settings.reminderFrequency !== 'OFF' && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                          {settings.reminderTimes.split(',').map((t, idx) => {
                            const timeObj = convertTo12h(t.trim());
                            return (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <select 
                                  value={timeObj.h}
                                  onChange={(e) => {
                                    const times = settings.reminderTimes.split(',');
                                    times[idx] = convertTo24h(e.target.value, timeObj.m, timeObj.s);
                                    setSettings({...settings, reminderTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600 }}
                                >
                                  {hours12.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span>:</span>
                                <select 
                                  value={timeObj.m}
                                  onChange={(e) => {
                                    const times = settings.reminderTimes.split(',');
                                    times[idx] = convertTo24h(timeObj.h, e.target.value, timeObj.s);
                                    setSettings({...settings, reminderTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600 }}
                                >
                                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select 
                                  value={timeObj.s}
                                  onChange={(e) => {
                                    const times = settings.reminderTimes.split(',');
                                    times[idx] = convertTo24h(timeObj.h, timeObj.m, e.target.value);
                                    setSettings({...settings, reminderTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", color: "#2563eb", fontWeight: 700 }}
                                >
                                  {ampm.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button 
                                  onClick={() => {
                                    const times = settings.reminderTimes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, reminderTimes: times.join(',') || "09:00"});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "4px", fontSize: "1.25rem", padding: "0 4px" }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => setSettings({...settings, reminderTimes: settings.reminderTimes + ",09:00"})}
                            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px dashed #cbd5e1", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "0.875rem" }}
                          >
                            + Add Time
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Manager Report Schedule */}
                    <div style={{ marginBottom: "32px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 600 }}>Manager Report Summary</h4>
                        <select 
                          value={settings.managerReportFrequency}
                          onChange={(e) => setSettings({...settings, managerReportFrequency: e.target.value})}
                          style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="OFF">Turn Off</option>
                        </select>
                      </div>

                      {settings.managerReportFrequency !== 'OFF' && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                          {settings.managerReportTimes.split(',').map((t, idx) => {
                            const timeObj = convertTo12h(t.trim());
                            return (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <select 
                                  value={timeObj.h}
                                  onChange={(e) => {
                                    const times = settings.managerReportTimes.split(',');
                                    times[idx] = convertTo24h(e.target.value, timeObj.m, timeObj.s);
                                    setSettings({...settings, managerReportTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600 }}
                                >
                                  {hours12.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span>:</span>
                                <select 
                                  value={timeObj.m}
                                  onChange={(e) => {
                                    const times = settings.managerReportTimes.split(',');
                                    times[idx] = convertTo24h(timeObj.h, e.target.value, timeObj.s);
                                    setSettings({...settings, managerReportTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600 }}
                                >
                                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select 
                                  value={timeObj.s}
                                  onChange={(e) => {
                                    const times = settings.managerReportTimes.split(',');
                                    times[idx] = convertTo24h(timeObj.h, timeObj.m, e.target.value);
                                    setSettings({...settings, managerReportTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", color: "#2563eb", fontWeight: 700 }}
                                >
                                  {ampm.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button 
                                  onClick={() => {
                                    const times = settings.managerReportTimes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, managerReportTimes: times.join(',') || "10:00"});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "4px", fontSize: "1.25rem", padding: "0 4px" }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => setSettings({...settings, managerReportTimes: settings.managerReportTimes + ",10:00"})}
                            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px dashed #cbd5e1", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "0.875rem" }}
                          >
                            + Add Time
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ background: "#2563eb", color: "white", padding: "12px 32px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
                      >
                        {isSavingSettings ? "Saving..." : "Save Automation Settings"}
                      </button>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'MAILS' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Manual Triggers</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <button onClick={() => handleTriggerEmail("users")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send Pending Reminders</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Instantly mail all owners about their pending tasks.</div>
                        </div>
                      </button>
                      <button onClick={() => handleTriggerEmail("manager")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send Manager Report</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Instantly mail the consolidated summary to Admin.</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'USERS' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>User Management</h3>
                    {usersLoading ? (
                      <p>Loading users...</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                            <th style={{ padding: "12px 8px" }}>Name</th>
                            <th style={{ padding: "12px 8px" }}>Email</th>
                            <th style={{ padding: "12px 8px" }}>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(u => (
                            <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px 8px" }}>{u.name || "--"}</td>
                              <td style={{ padding: "12px 8px" }}>{u.email}</td>
                              <td style={{ padding: "12px 8px" }}>
                                <select 
                                  value={u.role}
                                  onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                >
                                  <option value="USER">USER</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeOptionsTab === 'EDIT_REQUESTS' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Pending Edit Requests</h3>
                    <p style={{ color: "#64748b", marginBottom: "24px" }}>Manage requests from users to unlock and edit completed tasks.</p>
                    
                    {tasks.filter(t => t.editRequested).length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                        <p style={{ color: "#64748b", margin: 0 }}>No pending edit requests.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {tasks.filter(t => t.editRequested).map(task => (
                          <div key={task.id} style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                              <div>
                                <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: "#0f172a" }}>Task #{task.id}: {task.taskName}</h4>
                                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                                  Requested by: <strong style={{ color: "#0f172a" }}>{task.editRequestBy === "OWNER" ? task.ownerName : task.reviewerName}</strong> ({task.editRequestBy})
                                </p>
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button 
                                  onClick={() => handleApproveEdit(task.id, 'APPROVE')}
                                  style={{ background: "#22c55e", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}
                                >
                                  Approve & Unlock
                                </button>
                                <button 
                                  onClick={() => handleApproveEdit(task.id, 'REJECT')}
                                  style={{ background: "#fef2f2", color: "#ef4444", padding: "8px 16px", borderRadius: "8px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                            <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "8px" }}>
                              <p style={{ margin: 0, fontSize: "0.875rem", color: "#475569" }}>
                                <strong style={{ color: "#0f172a" }}>Reason:</strong> {task.editRequestReason || "No reason provided."}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .table-row:hover { background-color: #f8fafc; }
        .btn-primary:hover { background-color: #1d4ed8 !important; }
        .btn-logout:hover { color: #0f172a !important; }
      `}} />
    </div>
  );
}

// Subcomponents

function MetricCard({ title, value, icon, bg, isActive, onClick }: { title: string, value: number, icon: any, bg: string, isActive?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        background: "white", 
        padding: "24px", 
        borderRadius: "12px", 
        border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0", 
        boxShadow: isActive ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "0 1px 3px 0 rgb(0 0 0 / 0.1)", 
        display: "flex", 
        alignItems: "center", 
        gap: "16px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s"
      }}
    >
      <div style={{ background: bg, padding: "16px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>{title}</p>
        <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em" }}>{value}</p>
      </div>
    </div>
  );
}

function StatusPill({ status, type, taskId, onUpdate, disabled }: { status: string, type: "task" | "review", taskId: number, onUpdate: any, disabled?: boolean }) {
  let bg = "#f1f5f9";
  let color = "#475569";

  if (status === "Completed") {
    bg = "#dcfce7";
    color = "#166534";
  } else if (status === "Pending" || status.includes("Pending")) {
    bg = "#fef9c3";
    color = "#854d0e";
  } else if (status === "In Progress") {
    bg = "#e0f2fe";
    color = "#0369a1";
  }

  const pillStyle = {
    background: bg,
    color: color,
    padding: "6px 12px",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    display: "inline-block",
    border: "none",
    outline: "none",
    appearance: "none" as const,
    cursor: type === "task" && !disabled ? "pointer" : disabled ? "not-allowed" : "default",
  };

  if (type === "task") {
    return (
      <select 
        value={status} 
        onChange={(e) => onUpdate(taskId, "taskStatus", e.target.value)}
        style={pillStyle}
        disabled={disabled}
      >
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
      </select>
    );
  }

  return <span style={pillStyle}>{status}</span>;
}

// Styles

const thStyle = {
  background: "#f8fafc",
  color: "#64748b",
  padding: "16px 24px",
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap" as const,
};

const tdStyle = {
  padding: "16px 24px",
  verticalAlign: "middle" as const,
};

const inputStyle = {
  width: "100%", 
  border: "1px solid #cbd5e1", 
  borderRadius: "6px", 
  padding: "8px 12px", 
  fontSize: "0.875rem", 
  outline: "none", 
  boxShadow: "0 0 0 2px rgba(59,130,246,0.2)",
  fontFamily: "inherit"
};

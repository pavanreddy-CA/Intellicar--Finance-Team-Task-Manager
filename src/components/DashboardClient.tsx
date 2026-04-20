"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, LogOut, Plus, Trash2 } from "lucide-react";

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
};

export default function DashboardClient({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_ACTION' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');

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
  }, []);

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

  const handleTriggerEmail = async (type: "users" | "manager") => {
    if (!window.confirm(`Are you sure you want to send the ${type === 'users' ? 'Employee Reminders' : 'Manager Report'} now?`)) return;
    
    try {
      // Pass the token so the frontend can trigger it even if CRON_SECRET is required
      const res = await fetch(`/api/cron/daily-summary?type=${type}`, {
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px" }}>
            <LayoutDashboard color="white" size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.025em" }}>Intellicar Operations</h1>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>Enterprise Task Management</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0f172a" }}>{user.name || "Master Admin"}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{user.email}</div>
          </div>
          
          {isAdmin && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => handleTriggerEmail("users")} style={{ background: "#f1f5f9", color: "#334155", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: 500, fontSize: "0.75rem", transition: "all 0.2s" }} className="btn-secondary">
                Send Reminders
              </button>
              <button onClick={() => handleTriggerEmail("manager")} style={{ background: "#f1f5f9", color: "#334155", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: 500, fontSize: "0.75rem", transition: "all 0.2s" }} className="btn-secondary">
                Send Manager Report
              </button>
            </div>
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
                  {isAdmin && <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isAdmin ? 14 : 13} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading tasks...</td></tr>
                ) : filteredTasksToDisplay.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 14 : 13} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No tasks found in the system.</td></tr>
                ) : (
                  filteredTasksToDisplay.map((task) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = task.taskStatus !== "Completed" && task.dueDate && new Date(task.dueDate) < today;
                    return (
                    <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s", backgroundColor: isOverdue ? "#fee2e2" : undefined }} className="table-row">
                      <td style={tdStyle}><span style={{ color: "#94a3b8", fontWeight: 500 }}>#{task.id}</span></td>
                      <td style={tdStyle}><span style={{ color: "#64748b" }}>{formatDate(task.createdAt)}</span></td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "#0f172a", maxWidth: "250px", whiteSpace: "normal" }}>{task.taskName}</td>
                      <td style={tdStyle}>{task.entityName}</td>
                      <td style={tdStyle}>{task.ownerName}</td>
                      <td style={tdStyle}>{task.dueDate ? formatDate(task.dueDate) : <span style={{ color: "#cbd5e1" }}>--</span>}</td>
                      
                      {/* Editable Completion Date */}
                      <td 
                        style={{ ...tdStyle, cursor: "pointer", minWidth: "140px" }}
                        onClick={() => { setEditingCell({ id: task.id, field: "completionDate" }); setEditValue(task.completionDate ? task.completionDate.split("T")[0] : ""); }}
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
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <StatusPill 
                          status={task.taskStatus} 
                          type="task" 
                          taskId={task.id} 
                          onUpdate={handleUpdate} 
                        />
                      </td>
                      <td style={tdStyle}>{task.reviewerName === "Not Applicable" ? <span style={{ color: "#94a3b8" }}>N/A</span> : task.reviewerName}</td>
                      <td style={tdStyle}>
                        <StatusPill 
                          status={task.reviewStatus} 
                          type="review" 
                          taskId={task.id} 
                          onUpdate={handleUpdate} 
                        />
                      </td>

                      {/* Editable Review Completion Date */}
                      <td 
                        style={{ ...tdStyle, cursor: "pointer", minWidth: "140px" }}
                        onClick={() => { setEditingCell({ id: task.id, field: "reviewCompletionDate" }); setEditValue(task.reviewCompletionDate ? task.reviewCompletionDate.split("T")[0] : ""); }}
                      >
                        {editingCell?.id === task.id && editingCell.field === "reviewCompletionDate" ? (
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
                            {task.reviewCompletionDate ? new Date(task.reviewCompletionDate).toLocaleDateString() : "--"}
                          </span>
                        )}
                      </td>
                      
                      {/* Editable Owner Comments */}
                      <td 
                        style={{ ...tdStyle, cursor: "text", minWidth: "200px", maxWidth: "300px", whiteSpace: "normal" }}
                        onClick={() => { setEditingCell({ id: task.id, field: "ownerComments" }); setEditValue(task.ownerComments || ""); }}
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
                        style={{ ...tdStyle, cursor: "text", minWidth: "200px", maxWidth: "300px", whiteSpace: "normal" }}
                        onClick={() => { setEditingCell({ id: task.id, field: "reviewerComments" }); setEditValue(task.reviewerComments || ""); }}
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

                      {/* Delete Action (Admin Only) */}
                      {isAdmin && (
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button 
                            onClick={() => handleDelete(task.id)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", padding: "6px", borderRadius: "6px", transition: "all 0.2s" }}
                            className="btn-delete"
                            title="Delete Task"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
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

function StatusPill({ status, type, taskId, onUpdate }: { status: string, type: "task" | "review", taskId: number, onUpdate: any }) {
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
    cursor: type === "task" ? "pointer" : "default",
  };

  if (type === "task") {
    return (
      <select 
        value={status} 
        onChange={(e) => onUpdate(taskId, "taskStatus", e.target.value)}
        style={pillStyle}
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

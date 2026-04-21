"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import LOForm from "@/components/LOForm";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, LogOut, Plus, Trash2, Users, Send, Sliders, Mail, Download, FileText, ChevronLeft, ChevronRight, FileSpreadsheet, Lightbulb, Edit2, Quote, UserCheck, BookOpen, Search, ArrowUp, ArrowDown, Home } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

type LearningOpportunity = {
  id: number;
  entity: string;
  dateOfIdentification: string;
  learningOpportunity: string;
  identifiedBy: string;
  committedBy: string;
  resolutionProvided: string;
  modeOfCommunication: string;
  emailSub: string | null;
  comments: string | null;
  createdAt: string;
  editRequested?: boolean;
  editApproved?: boolean;
  editRequestReason?: string | null;
  createdByEmail?: string | null;
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

const EMAIL_TO_NAME: Record<string, string> = {
  "pavanreddy@intellicar.in": "Pavan",
  "saikatdas@intellicar.in": "Saikath",
  "sami@intellicar.in": "Sami",
  "hanusha@intellicar.in": "Hanusha",
  "sreenivasulu.t@intellicar.in": "Sreenivas",
  "sharath.shetty@intellicar.in": "Sharath",
  "chandanak@intellicar.in": "Chandana",
  "nikhat@intellicar.in": "Nikhat",
  "venkata.g@intellicar.in": "Venkat",
  "saneja@intellicar.in": "Siddharth"
};

export default function DashboardClient({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [activeValue, setActiveValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_ACTION' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');
  const [activeView, setActiveView] = useState<'TASKS' | 'LOS'>('TASKS');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showLOForm, setShowLOForm] = useState(false);
  const [los, setLos] = useState<LearningOpportunity[]>([]);
  const [loLoading, setLoLoading] = useState(false);
  const [activeOptionsTab, setActiveOptionsTab] = useState<'USERS' | 'MAILS' | 'SCHEDULE' | 'EDIT_REQUESTS' | 'LO_REPORT' | 'ACCOUNT' | 'DATA'>('ACCOUNT');
  const [settings, setSettings] = useState({
    reminderFrequency: 'DAILY',
    reminderTimes: '09:00,18:00',
    managerReportFrequency: 'DAILY',
    managerReportTimes: '10:00',
    loReportFrequency: 'WEEKLY',
    loReportTimes: '10:00'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editingLO, setEditingLO] = useState<LearningOpportunity | null>(null);

  // Advanced Controls State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFilterPreset, setDateFilterPreset] = useState("ALL_TIME");
  const [loActiveFilter, setLoActiveFilter] = useState<'ALL' | 'REPORTS' | 'LEARNINGS'>('ALL');
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sorting and Filtering State
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskEntityFilter, setTaskEntityFilter] = useState("ALL");
  const [taskOwnerFilter, setTaskOwnerFilter] = useState("ALL");
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL");
  const [taskSortConfig, setTaskSortConfig] = useState<{ key: keyof Task; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  const [loSearchQuery, setLoSearchQuery] = useState("");
  const [loEntityFilter, setLoEntityFilter] = useState("ALL");
  const [loSortConfig, setLoSortConfig] = useState<{ key: keyof LearningOpportunity; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [editRequestSubTab, setEditRequestSubTab] = useState<'TASK' | 'LO'>('TASK');

  const handlePresetChange = (preset: string) => {
    setDateFilterPreset(preset);
    const today = new Date();
    
    if (preset === "ALL_TIME") {
      setStartDate("");
      setEndDate("");
      return;
    }

    if (preset === "CUSTOM") {
      return; // Leave dates as they are, let user pick
    }

    let start = new Date(today);
    let end = new Date(today);

    if (preset === "CURRENT_MONTH") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === "LAST_MONTH") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of last month
    } else if (preset === "LAST_3_MONTHS") {
      start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else if (preset === "LAST_6_MONTHS") {
      start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    } else if (preset === "LAST_FY") {
      const currentMonth = today.getMonth(); // 0-11
      const currentYear = today.getFullYear();
      let lastFyStartYear = currentMonth >= 3 ? currentYear - 1 : currentYear - 2;
      start = new Date(lastFyStartYear, 3, 1); // April 1
      end = new Date(lastFyStartYear + 1, 2, 31); // March 31
    }

    const toIsoDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    setStartDate(toIsoDate(start));
    setEndDate(toIsoDate(end));
  };

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

  const fetchLOs = async () => {
    setLoLoading(true);
    try {
      const res = await fetch("/api/lo");
      if (res.ok) {
        const data = await res.json();
        setLos(data);
      }
    } catch (error) {
      console.error("Failed to fetch LOs", error);
    } finally {
      setLoLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchLOs();
    if (isAdmin) {
      fetchUsersList();
      fetchSettings();
    }
  }, [isAdmin]);

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

  const downloadBulkTemplate = async (type: 'tasks' | 'lo') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type === 'tasks' ? 'Tasks' : 'LOs');
    
    if (type === 'tasks') {
      worksheet.columns = [
        { header: 'Task Name', key: 'taskName', width: 25 },
        { header: 'Entity', key: 'entityName', width: 20 },
        { header: 'Type', key: 'taskType', width: 15 },
        { header: 'Dept', key: 'departmentName', width: 15 },
        { header: 'Requester', key: 'requestFrom', width: 20 },
        { header: 'Owner', key: 'ownerName', width: 20 },
        { header: 'Reviewer', key: 'reviewerName', width: 20 },
        { header: 'Due Date (YYYY-MM-DD)', key: 'dueDate', width: 25 },
      ];
    } else {
      worksheet.columns = [
        { header: 'Entity', key: 'entity', width: 20 },
        { header: 'Date (YYYY-MM-DD)', key: 'dateOfIdentification', width: 25 },
        { header: 'LO Description', key: 'learningOpportunity', width: 40 },
        { header: 'Identified By', key: 'identifiedBy', width: 20 },
        { header: 'Committed By', key: 'committedBy', width: 20 },
        { header: 'Resolution', key: 'resolutionProvided', width: 40 },
      ];
    }

    // Add sample row
    if (type === 'tasks') {
      worksheet.addRow(['Sample Task', 'Sample Entity', 'Daily', 'Finance', 'Manager', 'Owner Name', 'Reviewer Name', '2026-12-31']);
    } else {
      worksheet.addRow(['Sample Entity', '2026-04-21', 'Sample LO description...', 'Name A', 'Name B', 'Done']);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${type}_import_template.xlsx`);
  };

  const handleExcelBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'tasks' | 'lo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1);
    
    const rows: any[] = [];
    worksheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip headers
      const values = row.values as any[];
      if (type === 'tasks') {
        rows.push({
          taskName: values[1],
          entityName: values[2],
          taskType: values[3],
          departmentName: values[4],
          requestFrom: values[5],
          ownerName: values[6],
          reviewerName: values[7],
          dueDate: values[8],
        });
      } else {
        rows.push({
          entity: values[1],
          dateOfIdentification: values[2],
          learningOpportunity: values[3],
          identifiedBy: values[4],
          committedBy: values[5],
          resolutionProvided: values[6],
        });
      }
    });

    if (confirm(`Detected ${rows.length} records. Proceed with import?`)) {
      const endpoint = type === 'tasks' ? '/api/tasks/bulk' : '/api/lo/bulk';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows)
      });
      if (res.ok) {
        alert("Import successful!");
        if (type === 'tasks') fetchTasks(); else fetchLOs();
      } else {
        alert("Import failed. Please check template format.");
      }
    }
    e.target.value = ""; // Clear input
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      alert("Passwords do not match!");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordData.current, newPassword: passwordData.new }),
      });
      if (res.ok) {
        alert("Password updated successfully!");
        setPasswordData({ current: "", new: "", confirm: "" });
      } else {
        const data = await res.json();
        alert(data.message || "Failed to update password.");
      }
    } catch (error) {
      console.error("Failed to change password", error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleBulkAddUsers = async () => {
    if (!window.confirm("Are you sure you want to import all predefined employees? This will create accounts with the default password 'Intellicar@123' for those who don't have one yet.")) return;
    
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/bulk-add-users", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message + "\n\nDefault Password: " + data.defaultPassword);
        fetchUsersList();
      } else {
        alert("Failed to bulk add users.");
      }
    } catch (error) {
      console.error("Failed to bulk add users", error);
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

  const handleRequestEditLO = async (loId: number) => {
    const reason = window.prompt("Please provide a reason for editing this LO submission:");
    if (!reason) return;
    try {
      const res = await fetch(`/api/lo/${loId}/request-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert("Edit request sent to Admin successfully.");
        fetchLOs();
      }
    } catch (error) {
      console.error("Failed to request edit for LO", error);
    }
  };

  const handleApproveEditLO = async (loId: number, action: 'APPROVE' | 'REJECT') => {
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this edit request?`)) return;
    try {
      const res = await fetch(`/api/lo/${loId}/approve-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Edit request ${action.toLowerCase()}d successfully.`);
        fetchLOs();
      }
    } catch (error) {
      console.error("Failed to process edit for LO", error);
    }
  };

  const handleTriggerEmail = async (type: "users" | "manager" | "lo") => {
    const label = type === 'users' ? 'Employee Reminders' : type === 'manager' ? 'Manager Report' : 'LO Report';
    if (!window.confirm(`Are you sure you want to send the ${label} now?`)) return;
    
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
  const formatDate = (date: string | Date | null) => {
    if (!date) return "--";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "--";
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date and time as DD-MMM-YYYY HH:mm
  const formatDateTime = (date: string | Date | null) => {
    if (!date) return "--";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "--";
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const filteredTasksToDisplay = tasks.filter(t => {
    // 1. Status Filter (Metric Cards)
    let statusMatch = true;
    if (activeFilter === 'PENDING_ACTION') statusMatch = t.taskStatus !== "Completed";
    if (activeFilter === 'PENDING_REVIEW') statusMatch = t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner";
    if (activeFilter === 'COMPLETED') statusMatch = t.taskStatus === "Completed" && (t.reviewStatus === "Completed" || t.reviewStatus === "Review Not Required");
    
    // 2. Date Filter (by createdAt)
    let dateMatch = true;
    if (startDate || endDate) {
      const taskDate = new Date(t.createdAt);
      taskDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (taskDate < start) dateMatch = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (taskDate > end) dateMatch = false;
      }
    }

    // 3. Search Query
    let searchMatch = true;
    if (taskSearchQuery) {
      const q = taskSearchQuery.toLowerCase();
      searchMatch = 
        t.taskName.toLowerCase().includes(q) || 
        t.entityName.toLowerCase().includes(q) || 
        t.ownerName.toLowerCase().includes(q) ||
        (t.reviewerName || "").toLowerCase().includes(q);
    }

    // 4. Dropdown Filters
    let dropdownMatch = true;
    if (taskEntityFilter !== "ALL" && t.entityName !== taskEntityFilter) dropdownMatch = false;
    if (taskOwnerFilter !== "ALL" && t.ownerName !== taskOwnerFilter) dropdownMatch = false;
    if (taskStatusFilter !== "ALL" && t.taskStatus !== taskStatusFilter) dropdownMatch = false;

    return statusMatch && dateMatch && searchMatch && dropdownMatch;
  });

  // Sorting logic for Tasks
  const sortedTasks = [...filteredTasksToDisplay].sort((a, b) => {
    if (!taskSortConfig) return 0;
    const { key, direction } = taskSortConfig;
    let valA = a[key];
    let valB = b[key];

    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Unique values for task filters
  const uniqueTaskEntities = Array.from(new Set(tasks.map(t => t.entityName))).sort();
  const uniqueTaskOwners = Array.from(new Set(tasks.map(t => t.ownerName))).sort();
  const uniqueTaskStatuses = Array.from(new Set(tasks.map(t => t.taskStatus))).sort();

  // Learning Opportunity Filtering and Sorting
  const filteredLOsToDisplay = los.filter(lo => {
    // 1. Metric Filter (My Reports / My Learnings)
    let typeMatch = true;
    if (loActiveFilter === 'REPORTS') {
      const myName = EMAIL_TO_NAME[user?.email || ''] || user?.name;
      typeMatch = lo.identifiedBy === myName;
    } else if (loActiveFilter === 'LEARNINGS') {
      const myName = EMAIL_TO_NAME[user?.email || ''] || user?.name;
      typeMatch = lo.committedBy === myName;
    }

    // 2. Search Query
    let searchMatch = true;
    if (loSearchQuery) {
      const q = loSearchQuery.toLowerCase();
      searchMatch = 
        lo.learningOpportunity.toLowerCase().includes(q) || 
        lo.entity.toLowerCase().includes(q) || 
        lo.identifiedBy.toLowerCase().includes(q) ||
        lo.committedBy.toLowerCase().includes(q) ||
        (lo.comments || "").toLowerCase().includes(q);
    }

    // 3. Entity Filter
    let entityMatch = true;
    if (loEntityFilter !== "ALL" && lo.entity !== loEntityFilter) entityMatch = false;

    return typeMatch && searchMatch && entityMatch;
  });

  const sortedLOs = [...filteredLOsToDisplay].sort((a, b) => {
    if (!loSortConfig) return 0;
    const { key, direction } = loSortConfig;
    let valA = a[key];
    let valB = b[key];

    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueLOEntities = Array.from(new Set(los.map(l => l.entity))).sort();

  const handleTaskSort = (key: keyof Task) => {
    setTaskSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleLOSort = (key: keyof LearningOpportunity) => {
    setLoSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Pagination Logic
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, startDate, endDate, itemsPerPage, taskSearchQuery, taskEntityFilter, taskOwnerFilter, taskStatusFilter]);

  // Export Handlers
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks");

    // Row 1: Main Title (Dark Blue background, White text)
    worksheet.mergeCells('A1:Q1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ITPL - Finance Task Management';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const dateStr = `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
    
    // Row 2: Subtitle (Light Blue background, Italicized Blue text)
    worksheet.mergeCells('A2:Q2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Task Report - As of ${dateStr}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; 
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Define Columns and Widths
    worksheet.columns = [
      { width: 8 },  // SI No
      { width: 20 }, // Timestamp
      { width: 45 }, // Task Name
      { width: 25 }, // Entity
      { width: 20 }, // Type
      { width: 20 }, // Department
      { width: 20 }, // Requested By
      { width: 25 }, // Owner
      { width: 18 }, // Due Date
      { width: 18 }, // Completion Date
      { width: 18 }, // Status
      { width: 25 }, // Reviewer
      { width: 25 }, // Review Status
      { width: 18 }, // Review Date
      { width: 40 }, // Owner Comments
      { width: 40 }, // Reviewer Comments
      { width: 30 }  // Mail Link
    ];

    // Row 3: Column Headers (Dark Blue background, White text)
    const headerRow = worksheet.getRow(3);
    const headers = [
      'SI No', 'Timestamp', 'Task Name', 'Entity', 'Type', 
      'Department', 'Requested By', 'Owner', 'Due Date', 
      'Completion Date', 'Status', 'Reviewer', 'Review Status', 
      'Review Date', 'Owner Comments', 'Reviewer Comments', 'Mail Link'
    ];
    
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
      };
    });

    // Add Data
    sortedTasks.forEach((t, index) => {
      const row = worksheet.addRow([
        index + 1,
        formatDateTime(t.createdAt),
        t.taskName,
        t.entityName,
        t.taskType,
        t.departmentName,
        t.requestFrom,
        t.ownerName,
        formatDate(t.dueDate),
        formatDate(t.completionDate),
        t.taskStatus,
        t.reviewerName,
        t.reviewStatus,
        formatDate(t.reviewCompletionDate),
        t.ownerComments || "",
        t.reviewerComments || "",
        t.mailLink || ""
      ]);
      row.alignment = { vertical: 'middle', wrapText: true };
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Intellicar_Tasks_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportLOsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Learning Opportunities");

    // Row 1: Main Title
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ITPL - Finance Learning Opportunity Report';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const dateStr = `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
    
    // Row 2: Subtitle (Light Blue background, Italicized Blue text)
    worksheet.mergeCells('A2:K2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Consolidated Report (All Entries) - As of ${dateStr}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Define column widths
    worksheet.columns = [
      { width: 8 },  // SI No
      { width: 20 }, // Timestamp
      { width: 20 }, // Entity
      { width: 20 }, // Date of Identification
      { width: 45 }, // Learning Opportunity
      { width: 20 }, // Identified By
      { width: 20 }, // Committed By
      { width: 45 }, // Resolution Provided
      { width: 20 }, // Mode Of Communication
      { width: 30 }, // Email Sub
      { width: 40 }  // Comments
    ];

    // Row 3: Column Headers (Dark Blue background, White text)
    const headerRow = worksheet.getRow(3);
    const headers = [
      'SI No', 'Timestamp', 'Entity', 'Date of Identification', 'Learning Opportunity', 
      'Identified by', 'Commited By', 'Resolution Provided', 'Mode Of Communication', 
      'Email Sub', 'Comments'
    ];
    
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
      };
    });

    // Add Data rows
    sortedLOs.forEach((lo, index) => {
      const row = worksheet.addRow([
        index + 1,
        formatDateTime(lo.createdAt),
        lo.entity,
        formatDate(lo.dateOfIdentification),
        lo.learningOpportunity,
        lo.identifiedBy,
        lo.committedBy,
        lo.resolutionProvided,
        lo.modeOfCommunication,
        lo.emailSub || "Not Applicable",
        lo.comments || "NA"
      ]);
      row.alignment = { vertical: 'middle', wrapText: true };
      row.eachCell((cell) => {
          cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
          };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Intellicar_LO_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text("Intellicar Finance Task Management - Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["ID", "Task Name", "Entity", "Owner", "Due Date", "Task Status", "Reviewer", "Rev. Status"];
    const tableRows = sortedTasks.map(t => [
      t.id,
      t.taskName,
      t.entityName,
      t.ownerName,
      formatDate(t.dueDate),
      t.taskStatus,
      t.reviewerName || "N/A",
      t.reviewStatus
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Intellicar_Tasks_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#f8fafc", color: "#0f172a", overflow: "hidden" }}>
      {/* Sidebar Navigation (Keka Style) */}
      <nav style={{ width: "110px", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, boxShadow: "4px 0 10px rgba(0,0,0,0.1)", zIndex: 10 }}>
        {/* Logo at Top of Sidebar */}
        <div style={{ width: "100%", height: "80px", background: "white", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "32px" }}>
          <img src="/logo.png" alt="Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
        </div>

        {/* Sidebar Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
          <button 
            onClick={() => setActiveView('TASKS')}
            style={{ 
              display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
              background: "transparent", border: "none", color: activeView === 'TASKS' ? "white" : "#94a3b8", 
              cursor: "pointer", padding: "12px 0", transition: "all 0.2s", width: "100%",
              borderLeft: activeView === 'TASKS' ? "4px solid #2563eb" : "4px solid transparent"
            }}
          >
            <Home size={24} color={activeView === 'TASKS' ? "white" : "#94a3b8"} />
            <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>Tasks</span>
          </button>

          <button 
            onClick={() => setActiveView('LOS')}
            style={{ 
              display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
              background: "transparent", border: "none", color: activeView === 'LOS' ? "white" : "#94a3b8", 
              cursor: "pointer", padding: "12px 0", transition: "all 0.2s", width: "100%",
              borderLeft: activeView === 'LOS' ? "4px solid #2563eb" : "4px solid transparent"
            }}
          >
            <Lightbulb size={24} color={activeView === 'LOS' ? "white" : "#94a3b8"} />
            <span style={{ fontSize: "0.7rem", fontWeight: 500, textAlign: "center", padding: "0 4px" }}>Learning</span>
          </button>
        </div>
      </nav>

      {/* Main Container (Header + Content) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "16px 32px", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", height: "80px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.025em" }}>
                {activeView === 'TASKS' ? "Tasks Dashboard" : "Learning Opportunities"}
              </h1>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Intellicar Telematics • Finance Team</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>{user.name || "Master Admin"}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{user.email}</div>
            </div>
            
            <button onClick={() => { setShowOptionsModal(true); if (isAdmin) { fetchUsersList(); fetchSettings(); } else { setActiveOptionsTab('ACCOUNT'); } }} style={{ padding: "8px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.875rem" }}>
              <Sliders size={16} /> Options
            </button>

            <button onClick={() => setShowLOForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", color: "#475569", padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}>
              <Lightbulb size={16} /> Update LO
            </button>

            <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}>
              <Plus size={16} /> New Task
            </button>
            <a href="/api/auth/signout" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
            <LogOut size={18} /> <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Sign Out</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: "auto", padding: "32px", background: "#f1f5f9" }}>
        
        {/* Metric Cards / Motivational Quote */}
        {activeView === 'TASKS' ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
            <MetricCard title="Total Tasks" value={tasks.length} icon={<LayoutDashboard size={24} color="#ffffff" />} bg="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" isActive={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
            <MetricCard title="Pending Action" value={pendingActionCount} icon={<Clock size={24} color="#ffffff" />} bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" isActive={activeFilter === 'PENDING_ACTION'} onClick={() => setActiveFilter('PENDING_ACTION')} />
            <MetricCard title="Pending Review" value={pendingReviewCount} icon={<AlertCircle size={24} color="#ffffff" />} bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" isActive={activeFilter === 'PENDING_REVIEW'} onClick={() => setActiveFilter('PENDING_REVIEW')} />
            <MetricCard title="Fully Completed" value={completedCount} icon={<CheckCircle2 size={24} color="#ffffff" />} bg="linear-gradient(135deg, #10b981 0%, #059669 100%)" isActive={activeFilter === 'COMPLETED'} onClick={() => setActiveFilter('COMPLETED')} />
          </div>
        ) : (
          <div style={{ 
            marginBottom: "32px", 
            padding: "40px", 
            borderRadius: "24px", 
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
            color: "white", 
            boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.2)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}>
            <div style={{ position: "absolute", top: -20, left: -20, opacity: 0.1 }}>
              <Quote size={120} />
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: "2rem", 
                fontWeight: 700, 
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                maxWidth: "800px",
                fontFamily: "'Outfit', 'Inter', sans-serif"
              }}>
                "We don’t track mistakes, we track learning and improvement"
              </h2>
              <div style={{ marginTop: "16px", height: "4px", width: "60px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "16px auto 0" }}></div>
            </div>
          </div>
        )}



        {activeView === 'TASKS' ? (
          <>
        {/* Action Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "16px" }}>
          
          {/* Date Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "white", padding: "8px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>Filter by Date:</span>
            <select
              value={dateFilterPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "0.875rem", outline: "none", color: "#0f172a", background: "#f8fafc" }}
            >
              <option value="ALL_TIME">All Time</option>
              <option value="CURRENT_MONTH">Current Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="LAST_3_MONTHS">Last 3 Months</option>
              <option value="LAST_6_MONTHS">Last 6 Months</option>
              <option value="LAST_FY">Last Financial Year</option>
              <option value="CUSTOM">Custom Range</option>
            </select>

            {dateFilterPreset === "CUSTOM" && (
              <>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "0.875rem", outline: "none", color: "#0f172a" }}
                />
                <span style={{ color: "#94a3b8" }}>to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "0.875rem", outline: "none", color: "#0f172a" }}
                />
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(""); setEndDate(""); setDateFilterPreset("ALL_TIME"); }}
                    style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, padding: "4px 8px" }}
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>
          
          {/* Filter Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", marginBottom: "16px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
              <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
              <input 
                type="text" 
                placeholder="Search tasks, entities, owners..." 
                value={taskSearchQuery}
                onChange={e => setTaskSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 10px 10px 40px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", background: "#f8fafc" }} 
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <select 
                value={taskEntityFilter} 
                onChange={e => setTaskEntityFilter(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", background: "#f8fafc", color: "#475569" }}
              >
                <option value="ALL">All Entities</option>
                {uniqueTaskEntities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>

              <select 
                value={taskOwnerFilter} 
                onChange={e => setTaskOwnerFilter(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", background: "#f8fafc", color: "#475569" }}
              >
                <option value="ALL">All Owners</option>
                {uniqueTaskOwners.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              <select 
                value={taskStatusFilter} 
                onChange={e => setTaskStatusFilter(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", background: "#f8fafc", color: "#475569" }}
              >
                <option value="ALL">All Statuses</option>
                {uniqueTaskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px", borderLeft: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Rows:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  style={{ border: "none", background: "transparent", fontWeight: 700, color: "#2563eb", outline: "none", cursor: "pointer" }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

        {/* Data Table */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('id')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      ID {taskSortConfig?.key === 'id' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('createdAt')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Created At {taskSortConfig?.key === 'createdAt' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('taskName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Task Name {taskSortConfig?.key === 'taskName' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('entityName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Entity {taskSortConfig?.key === 'entityName' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('ownerName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Owner {taskSortConfig?.key === 'ownerName' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('dueDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Due Date {taskSortConfig?.key === 'dueDate' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('completionDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Completion Date {taskSortConfig?.key === 'completionDate' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('taskStatus')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Task Status {taskSortConfig?.key === 'taskStatus' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
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
                ) : paginatedTasks.length === 0 ? (
                  <tr><td colSpan={14} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No tasks found for the current filters.</td></tr>
                ) : (
                  paginatedTasks.map((task) => {
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
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTasksToDisplay.length)} of {filteredTasksToDisplay.length} tasks
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: "white", border: "1px solid #cbd5e1", borderRadius: "6px", color: currentPage === 1 ? "#94a3b8" : "#0f172a", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, padding: "0 12px" }}>
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: "white", border: "1px solid #cbd5e1", borderRadius: "6px", color: currentPage === totalPages ? "#94a3b8" : "#0f172a", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
        </>
        ) : (
          /* LO View */
          <div style={{ background: "white", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
             <div style={{ padding: "28px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Learning Opportunities</h3>
                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <button 
                      onClick={() => setLoActiveFilter('ALL')}
                      style={{ 
                        padding: "6px 14px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, 
                        border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                        background: loActiveFilter === 'ALL' ? "#2563eb" : "white",
                        borderColor: loActiveFilter === 'ALL' ? "#2563eb" : "#e2e8f0",
                        color: loActiveFilter === 'ALL' ? "white" : "#64748b",
                        boxShadow: loActiveFilter === 'ALL' ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "none"
                      }}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setLoActiveFilter('REPORTS')}
                      style={{ 
                        padding: "6px 14px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, 
                        border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                        background: loActiveFilter === 'REPORTS' ? "#3b82f6" : "white",
                        borderColor: loActiveFilter === 'REPORTS' ? "#3b82f6" : "#e2e8f0",
                        color: loActiveFilter === 'REPORTS' ? "white" : "#64748b",
                        boxShadow: loActiveFilter === 'REPORTS' ? "0 4px 6px -1px rgba(59, 130, 246, 0.2)" : "none"
                      }}
                    >
                      My Reports
                    </button>
                    <button 
                      onClick={() => setLoActiveFilter('LEARNINGS')}
                      style={{ 
                        padding: "6px 14px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, 
                        border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                        background: loActiveFilter === 'LEARNINGS' ? "#ef4444" : "white",
                        borderColor: loActiveFilter === 'LEARNINGS' ? "#ef4444" : "#e2e8f0",
                        color: loActiveFilter === 'LEARNINGS' ? "white" : "#64748b",
                        boxShadow: loActiveFilter === 'LEARNINGS' ? "0 4px 6px -1px rgba(239, 68, 68, 0.2)" : "none"
                      }}
                    >
                      My Learnings
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", minWidth: "250px" }}>
                    <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={16} />
                    <input 
                      type="text" 
                      placeholder="Search LOs, entities, names..." 
                      value={loSearchQuery}
                      onChange={e => setLoSearchQuery(e.target.value)}
                      style={{ padding: "8px 8px 8px 32px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none", fontSize: "0.8125rem", width: "100%", background: "white" }} 
                    />
                  </div>
                  <select 
                    value={loEntityFilter} 
                    onChange={e => setLoEntityFilter(e.target.value)}
                    style={{ padding: "8px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none", fontSize: "0.8125rem", background: "white", color: "#475569" }}
                  >
                    <option value="ALL">All Entities</option>
                    {uniqueLOEntities.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button onClick={exportLOsToExcel} style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", color: "#475569", padding: "8px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                    <FileSpreadsheet size={16} color="#059669" /> Export Excel
                  </button>
                </div>
             </div>
             <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>SI No</th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('dateOfIdentification')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Date {loSortConfig?.key === 'dateOfIdentification' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('entity')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Entity {loSortConfig?.key === 'entity' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={thStyle}>Mistake / LO</th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('identifiedBy')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Identified By {loSortConfig?.key === 'identifiedBy' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('committedBy')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Committed By {loSortConfig?.key === 'committedBy' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={thStyle}>Resolution</th>
                      <th style={thStyle}>Communication Mode</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loLoading ? (
                      <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading Learning Opportunities...</td></tr>
                    ) : los.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No Learning Opportunities recorded.</td></tr>
                    ) : (
                      sortedLOs.map((lo, idx) => (
                        <tr key={lo.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s" }} className="table-row">
                          <td style={tdStyle}><span style={{ color: "#94a3b8", fontWeight: 500 }}>{idx + 1}</span></td>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatDate(lo.dateOfIdentification)}</td>
                          <td style={tdStyle}>{lo.entity}</td>
                          <td style={{ ...tdStyle, minWidth: "300px", maxWidth: "500px", whiteSpace: "normal", wordWrap: "break-word" }}>{lo.learningOpportunity}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {lo.identifiedBy}
                              {lo.identifiedBy === (EMAIL_TO_NAME[user?.email || ''] || user?.name) && (
                                <span style={{ background: "#eff6ff", color: "#3b82f6", padding: "2px 6px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}>Reported</span>
                              )}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {lo.committedBy}
                              {lo.committedBy === (EMAIL_TO_NAME[user?.email || ''] || user?.name) && (
                                <span style={{ background: "#fef2f2", color: "#ef4444", padding: "2px 6px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}>Learning</span>
                              )}
                            </div>
                          </td>
                          <td style={{ ...tdStyle, minWidth: "300px", maxWidth: "500px", whiteSpace: "normal", wordWrap: "break-word" }}>{lo.resolutionProvided}</td>
                          <td style={tdStyle}>{lo.modeOfCommunication}</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              {/* Show Edit Button if Admin OR if Approved for User */}
                              {(isAdmin || lo.editApproved) ? (
                                <button 
                                  onClick={() => setEditingLO(lo)}
                                  style={{ 
                                    padding: "6px 12px", borderRadius: "6px", border: "1px solid #2563eb",
                                    background: "#2563eb", color: "white", fontSize: "0.75rem", fontWeight: 600,
                                    cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "4px"
                                  }}
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleRequestEditLO(lo.id)}
                                  disabled={lo.editRequested}
                                  style={{ 
                                    padding: "6px 12px", borderRadius: "6px", border: "1px solid",
                                    background: lo.editRequested ? "#f1f5f9" : "white",
                                    color: lo.editRequested ? "#94a3b8" : "#475569",
                                    borderColor: "#cbd5e1",
                                    fontSize: "0.75rem", fontWeight: 600,
                                    cursor: lo.editRequested ? "not-allowed" : "pointer",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseOver={e => !lo.editRequested && (e.currentTarget.style.background = "#f8fafc")}
                                  onMouseOut={e => !lo.editRequested && (e.currentTarget.style.background = "white")}
                                >
                                  {lo.editRequested ? "Edit Requested" : "Request Edit"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

      {showForm && (
        <TaskForm 
          onClose={() => setShowForm(false)} 
          onSuccess={() => {
            setShowForm(false);
            fetchTasks();
          }} 
        />
      )}
      {showLOForm && (
        <LOForm 
          onClose={() => setShowLOForm(false)} 
          onSuccess={() => {
            setShowLOForm(false);
            fetchLOs();
            alert("LO Update submitted successfully!");
          }} 
        />
      )}
      {editingLO && (
        <LOForm 
          initialData={editingLO}
          onClose={() => setEditingLO(null)} 
          onSuccess={() => {
            setEditingLO(null);
            fetchLOs();
            alert("LO entry updated successfully!");
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
                  onClick={() => setActiveOptionsTab('ACCOUNT')} 
                  style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'ACCOUNT' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'ACCOUNT' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginBottom: "8px" }}
                >
                  Account
                </button>
                {isAdmin && (
                  <>
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
                      Edit Request
                      {(tasks.filter(t => t.editRequested).length + los.filter(l => l.editRequested).length) > 0 && (
                        <span style={{ marginLeft: "8px", background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "bold" }}>
                          {tasks.filter(t => t.editRequested).length + los.filter(l => l.editRequested).length}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => setActiveOptionsTab('DATA')} 
                      style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'DATA' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'DATA' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                    >
                      <Download size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} /> Bulk Import
                    </button>
                  </>
                )}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, padding: "32px", overflow: "auto" }}>
                {activeOptionsTab === 'ACCOUNT' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Account Settings</h3>
                    <p style={{ color: "#64748b", marginBottom: "24px" }}>Update your password to keep your account secure.</p>
                    
                    <form onSubmit={handlePasswordChange} style={{ maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Current Password</label>
                        <input 
                          type="password" 
                          required
                          value={passwordData.current}
                          onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>New Password</label>
                        <input 
                          type="password" 
                          required
                          value={passwordData.new}
                          onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Confirm New Password</label>
                        <input 
                          type="password" 
                          required
                          value={passwordData.confirm}
                          onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} 
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={passwordLoading}
                        style={{ background: "#2563eb", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: passwordLoading ? "not-allowed" : "pointer", fontWeight: 600 }}
                      >
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  </div>
                )}

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

                    {/* LO Report Schedule */}
                    <div style={{ marginBottom: "32px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 600 }}>LO Report (Learning Opportunities)</h4>
                        <select 
                          value={settings.loReportFrequency}
                          onChange={(e) => setSettings({...settings, loReportFrequency: e.target.value})}
                          style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="OFF">Turn Off</option>
                        </select>
                      </div>

                      {settings.loReportFrequency !== 'OFF' && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                          {settings.loReportTimes.split(',').map((t, idx) => {
                            const timeObj = convertTo12h(t.trim());
                            return (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <select 
                                  value={timeObj.h}
                                  onChange={(e) => {
                                    const times = settings.loReportTimes.split(',');
                                    times[idx] = convertTo24h(e.target.value, timeObj.m, timeObj.s);
                                    setSettings({...settings, loReportTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600 }}
                                >
                                  {hours12.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span>:</span>
                                <select 
                                  value={timeObj.m}
                                  onChange={(e) => {
                                    const times = settings.loReportTimes.split(',');
                                    times[idx] = convertTo24h(timeObj.h, e.target.value, timeObj.s);
                                    setSettings({...settings, loReportTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600 }}
                                >
                                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select 
                                  value={timeObj.s}
                                  onChange={(e) => {
                                    const times = settings.loReportTimes.split(',');
                                    times[idx] = convertTo24h(timeObj.h, timeObj.m, e.target.value);
                                    setSettings({...settings, loReportTimes: times.join(',')});
                                  }}
                                  style={{ border: "none", outline: "none", fontWeight: 600, color: "#2563eb" }}
                                >
                                  {ampm.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button 
                                  onClick={() => {
                                    const times = settings.loReportTimes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, loReportTimes: times.join(',') || "10:00"});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "4px", fontSize: "1.25rem", padding: "0 4px" }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                          <button 
                            onClick={() => setSettings({...settings, loReportTimes: settings.loReportTimes + ",10:00"})}
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
                      <button onClick={() => handleTriggerEmail("lo")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send LO Report</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Instantly mail the Learning Opportunity summary to Admin.</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'USERS' && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                      <h3 style={{ margin: 0 }}>User Management</h3>
                      <button 
                        onClick={handleBulkAddUsers}
                        style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <Users size={16} /> Import All Employees
                      </button>
                    </div>
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
                    <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                      <button 
                        onClick={() => setEditRequestSubTab('TASK')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: editRequestSubTab === 'TASK' ? "#2563eb" : "#f1f5f9",
                          color: editRequestSubTab === 'TASK' ? "white" : "#64748b",
                          fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <LayoutDashboard size={16} /> Edit Task Request
                        {tasks.filter(t => t.editRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'TASK' ? "white" : "#ef4444", color: editRequestSubTab === 'TASK' ? "#2563eb" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {tasks.filter(t => t.editRequested).length}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => setEditRequestSubTab('LO')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: editRequestSubTab === 'LO' ? "#2563eb" : "#f1f5f9",
                          color: editRequestSubTab === 'LO' ? "white" : "#64748b",
                          fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <BookOpen size={16} /> Edit LO Request
                        {los.filter(l => l.editRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'LO' ? "white" : "#ef4444", color: editRequestSubTab === 'LO' ? "#2563eb" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {los.filter(l => l.editRequested).length}
                          </span>
                        )}
                      </button>
                    </div>

                    {editRequestSubTab === 'TASK' ? (
                      <div>
                        <h3 style={{ margin: "0 0 16px 0", color: "#0f172a" }}>Pending Task Edit Requests</h3>
                        <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "0.875rem" }}>Review and manage requests from users to unlock and edit completed tasks.</p>
                        
                        {tasks.filter(t => t.editRequested).length === 0 ? (
                          <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                            <p style={{ color: "#64748b", margin: 0 }}>No pending task edit requests.</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {tasks.filter(t => t.editRequested).map(task => (
                              <div key={`task-${task.id}`} style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
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
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleApproveEdit(task.id, 'REJECT')}
                                      style={{ background: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "0.875rem", borderLeft: "4px solid #cbd5e1" }}>
                                  <strong>Reason:</strong> {task.editRequestReason}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <div>
                            <h3 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>Learning Opportunity (LO) Admin</h3>
                            <p style={{ color: "#64748b", margin: 0, fontSize: "0.875rem" }}>Manage LO edit requests and view/export all records.</p>
                          </div>
                          <button onClick={exportLOsToExcel} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                            <FileSpreadsheet size={18} /> Export All
                          </button>
                        </div>

                        {/* LO Edit Requests Section */}
                        <div style={{ marginBottom: "32px" }}>
                          <h4 style={{ fontSize: "0.9375rem", color: "#475569", marginBottom: "12px", fontWeight: 600 }}>Pending LO Edit Requests</h4>
                          {los.filter(l => l.editRequested).length === 0 ? (
                            <div style={{ padding: "24px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                              <p style={{ color: "#64748b", margin: 0, fontSize: "0.875rem" }}>No pending LO edit requests.</p>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              {los.filter(l => l.editRequested).map(lo => (
                                <div key={`lo-${lo.id}`} style={{ padding: "16px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                    <div>
                                      <h5 style={{ margin: "0 0 4px 0", fontSize: "0.9375rem", color: "#0f172a" }}>LO #{lo.id}: {lo.entity}</h5>
                                      <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>Submitted by: <strong>{lo.identifiedBy}</strong></p>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <button onClick={() => handleApproveEditLO(lo.id, 'APPROVE')} style={{ background: "#22c55e", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}>Approve</button>
                                      <button onClick={() => handleApproveEditLO(lo.id, 'REJECT')} style={{ background: "#ef4444", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}>Reject</button>
                                    </div>
                                  </div>
                                  <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.8125rem", borderLeft: "3px solid #cbd5e1" }}>
                                    <strong>Reason:</strong> {lo.editRequestReason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* All records Table */}
                        <div>
                          <h4 style={{ fontSize: "0.9375rem", color: "#475569", marginBottom: "12px", fontWeight: 600 }}>All Learning Opportunities</h4>
                          <div style={{ overflowX: "auto", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", background: "#f8fafc" }}>
                                  <th style={{ padding: "12px 16px" }}>Entity</th>
                                  <th style={{ padding: "12px 16px" }}>LO Description</th>
                                  <th style={{ padding: "12px 16px" }}>Identified By</th>
                                  <th style={{ padding: "12px 16px" }}>Resolution</th>
                                </tr>
                              </thead>
                              <tbody>
                                {los.length === 0 ? (
                                  <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center" }}>No LOs found.</td></tr>
                                ) : (
                                  los.map(lo => (
                                    <tr key={lo.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{lo.entity}</td>
                                      <td style={{ padding: "12px 16px", minWidth: "200px" }}>{lo.learningOpportunity}</td>
                                      <td style={{ padding: "12px 16px" }}>{lo.identifiedBy}</td>
                                      <td style={{ padding: "12px 16px", minWidth: "200px" }}>{lo.resolutionProvided}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeOptionsTab === 'DATA' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Bulk Data Import</h3>
                    <p style={{ color: "#64748b", marginBottom: "32px" }}>Download the template, fill it with your data, and upload it back. Alternatively, use the quick paste method.</p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                      
                      {/* Task Import Section */}
                      <div style={{ padding: "28px", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#0f172a" }}>
                            <LayoutDashboard size={24} color="#2563eb" /> Task Bulk Import
                          </h4>
                          <button 
                            onClick={() => downloadBulkTemplate('tasks')}
                            style={{ background: "#f8fafc", color: "#2563eb", padding: "8px 16px", borderRadius: "8px", border: "1px solid #2563eb", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}
                          >
                            <Download size={16} /> Download Template
                          </button>
                        </div>

                        <div style={{ padding: "30px", background: "#f1f5f9", borderRadius: "12px", border: "2px dashed #cbd5e1", textAlign: "center" }}>
                          <p style={{ fontWeight: 600, fontSize: "1rem", margin: "0 0 16px 0", color: "#475569" }}>Upload Excel File</p>
                          <input 
                            type="file" 
                            accept=".xlsx" 
                            onChange={(e) => handleExcelBulkUpload(e, 'tasks')}
                            style={{ fontSize: "0.875rem" }}
                          />
                          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "12px" }}>Ensure you use the template provided above.</p>
                        </div>
                      </div>

                      {/* LO Import Section */}
                      <div style={{ padding: "28px", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#0f172a" }}>
                            <BookOpen size={24} color="#2563eb" /> LO Bulk Import
                          </h4>
                          <button 
                            onClick={() => downloadBulkTemplate('lo')}
                            style={{ background: "#f8fafc", color: "#2563eb", padding: "8px 16px", borderRadius: "8px", border: "1px solid #2563eb", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}
                          >
                            <Download size={16} /> Download Template
                          </button>
                        </div>

                        <div style={{ padding: "30px", background: "#f1f5f9", borderRadius: "12px", border: "2px dashed #cbd5e1", textAlign: "center" }}>
                          <p style={{ fontWeight: 600, fontSize: "1rem", margin: "0 0 16px 0", color: "#475569" }}>Upload Excel File</p>
                          <input 
                            type="file" 
                            accept=".xlsx" 
                            onChange={(e) => handleExcelBulkUpload(e, 'lo')}
                            style={{ fontSize: "0.875rem" }}
                          />
                          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "12px" }}>Ensure you use the template provided above.</p>
                        </div>
                      </div>

                    </div>
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
    </main>
  </div>
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

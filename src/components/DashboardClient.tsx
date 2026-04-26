"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import LOForm from "@/components/LOForm";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, LogOut, Plus, Trash2, Users, Send, Sliders, Mail, Download, FileText, ChevronLeft, ChevronRight, FileSpreadsheet, Lightbulb, Edit2, Quote, UserCheck, BookOpen, Search, ArrowUp, ArrowDown, Home, ChevronDown, Building2, Tag, ShieldCheck, ListFilter, Shield, X, Key, Repeat, Briefcase } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExternalRequestForm from "@/components/ExternalRequestForm";
import RecurringActivities from "@/components/RecurringActivities";

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
  deleteRequested?: boolean;
  deleteRequestReason?: string | null;
  linkedRequestId?: number | null;
  requestStatus?: string | null;
  transferStatus: string | null;
  originalRequestType: string | null;
};

type ExternalRequest = {
  id: number;
  requestFrom: string;
  requesterEmail: string;
  requestDate: string;
  natureOfRequest: string;
  departmentName: string;
  requestType: string;
  status: string;
  assignedAllocatorEmail: string | null;
  convertedTaskId: number | null;
  originalRequestType: string | null;
  transferStatus: string | null;
  createdAt: string;
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
  deleteRequested?: boolean;
  deleteRequestReason?: string | null;
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

export default function DashboardClient({ user: initialUser }: { user: any }) {
  const [user, setUser] = useState(initialUser);
  const isAdmin = user?.role === 'ADMIN' || user?.email === 'pavanreddy@intellicar.in';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [activeValue, setActiveValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_ACTION' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');
  const [activeView, setActiveView] = useState<'TASKS' | 'RECURRING' | 'LOS'>('TASKS');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showLOForm, setShowLOForm] = useState(false);
  const [los, setLos] = useState<LearningOpportunity[]>([]);
  const [loLoading, setLoLoading] = useState(false);
  const [activeOptionsTab, setActiveOptionsTab] = useState<'USERS' | 'MAILS' | 'SCHEDULE' | 'EDIT_REQUESTS' | 'LO_REPORT' | 'ACCOUNT' | 'DATA' | 'MASTER_DATA' | 'MATRICES'>('ACCOUNT');
  const [activeMatrixTab, setActiveMatrixTab] = useState<'ACCESS' | 'ALLOCATION' | 'ENTITY' | ''>('ACCESS');
  const [isTasksMenuOpen, setIsTasksMenuOpen] = useState(true);
  const [activeSubView, setActiveSubView] = useState<'MAIN' | 'OTHER_DEPT'>('MAIN');
  const [activeMainView, setActiveMainView] = useState<'DASHBOARD' | 'ADMIN_MATRIX'>('DASHBOARD');
  const [settings, setSettings] = useState({
    reminderFrequency: 'DAILY',
    reminderTimes: '09:00,18:00',
    managerReportFrequency: 'DAILY',
    managerReportTimes: '10:00',
    loReportFrequency: 'WEEKLY',
    loReportTimes: '10:00',
    managerEmail: '',
    loReportEmail: '',
    masterDepartments: 'SW - Engineering,Manufacturing and Supply Chain,Field Operations Technicians,HW - Engineering,Operations,CSM & Sales,Finance,HR and Admin,External People',
    masterEntities: 'Intellicar-BLR,Intellicar-MUM,Intellicar-DEL',
    masterTaskTypes: 'Accounts Receivable,Accounts Payable,MIS,Inventory,Banking & Treasury,Customer Reconciliations,Vendor Reconciliation,Reporting,Financial Audit,Tax Audit,Other Audits,Assements & Notices,Month Closure,Corporate Taxation,GST,Employee Laws,Due Diligence,Presentations & Trainings,Other Reconciallitions,MCA Filings,Miscellaneous Activities,Month End Billing,Credit Cards & Debt,Customizations / Automations',
    masterCommunicationModes: 'Email,Verbal Discussion,Hangouts,Whatsapp-IC Group',
    masterRequestTypes: 'Accounts Receivable,Accounts Payable,General & Administration,Payroll',
    masterRequestStatuses: 'Under Process,Pending for Review,Processed',
    moduleAccessMatrix: '{}',
    allocationMatrix: '{}',
    entityMatrix: '{}'
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState({
    recipientEmail: '',
    ccEmail: '',
    subject: '',
    type: 'task' as 'task' | 'lo' | 'request',
    format: 'excel' as 'excel' | 'pdf'
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
  const [newManagerEmailInput, setNewManagerEmailInput] = useState("");
  const [newLOEmailInput, setNewLOEmailInput] = useState("");

  // Sorting and Filtering State
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskEntityFilter, setTaskEntityFilter] = useState("ALL");
  const [taskOwnerFilter, setTaskOwnerFilter] = useState("ALL");
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL");
  const [taskSortConfig, setTaskSortConfig] = useState<{ key: keyof Task; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  const [loSearchQuery, setLoSearchQuery] = useState("");

  // External Requests State
  const [externalRequests, setExternalRequests] = useState<ExternalRequest[]>([]);
  const [extReqLoading, setExtReqLoading] = useState(false);
  const [showExtReqForm, setShowExtReqForm] = useState(false);
  const [extReqFilter, setExtReqFilter] = useState<'ALL' | 'ALLOCATION' | 'PROCESS' | 'PROCESSED' | 'REJECTED' | 'CONVERT_PENDING'>('ALL');
  const [extReqSearch, setExtReqSearch] = useState("");
  const [extReqStatusFilter, setExtReqStatusFilter] = useState("ALL");
  const [loEntityFilter, setLoEntityFilter] = useState("ALL");
  const [loSortConfig, setLoSortConfig] = useState<{ key: keyof LearningOpportunity; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [editRequestSubTab, setEditRequestSubTab] = useState<'TASK_EDIT' | 'TASK_DELETE' | 'LO'>('TASK_EDIT');
  const [showTaskDownloadDropdown, setShowTaskDownloadDropdown] = useState(false);
  const [showLODownloadDropdown, setShowLODownloadDropdown] = useState(false);
  const [showExtReqDownloadDropdown, setShowExtReqDownloadDropdown] = useState(false);
  const [extReqSortConfig, setExtReqSortConfig] = useState<{ key: keyof ExternalRequest; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [showLOCaptureModal, setShowLOCaptureModal] = useState(false);
  const [loCaptureForm, setLOCaptureForm] = useState({
    taskId: 0,
    entity: "",
    dateOfIdentification: "",
    identifiedBy: "",
    committedBy: "",
    learningOpportunity: "",
    resolutionProvided: "",
    modeOfCommunication: "Official Internal Mail",
    comments: ""
  });
  
  // Rejection Logic State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingReq, setRejectingReq] = useState<ExternalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [hoveredRejectId, setHoveredRejectId] = useState<number | null>(null);

  // Dropdown Refs
  const taskDropdownRef = useState<HTMLDivElement | null>(null)[0]; // Actually I should use useRef
  // Wait, I'll use a simpler approach since I can't easily add refs everywhere without more edits.
  // I'll use event.target check.
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If clicking a download button or inside a dropdown, don't close immediately here
      // or better: only close if target is NOT part of the dropdown logic
      };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTaskDownloadDropdown, showLODownloadDropdown]);



  // Smart Permission Helpers
  const matrixAllocators = JSON.parse(settings.allocationMatrix || '{}');
  const userAllocatedDepts = Object.entries(matrixAllocators)
    .filter(([_, allocators]) => {
      const emailList = Array.isArray(allocators) ? allocators : [allocators];
      return emailList.some(email => typeof email === 'string' && email.toLowerCase().trim() === user?.email?.toLowerCase().trim());
    })
    .map(([dept, _]) => dept.trim());
  
  const canAllocateAnything = isAdmin || (user as any).isAllocator || userAllocatedDepts.length > 0;

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


  const [pendingUserUpdates, setPendingUserUpdates] = useState<Record<string, { role?: string; department?: string; isSuspended?: boolean }>>({});
  const [isSavingUsers, setIsSavingUsers] = useState(false);
  
  // New Filters
  const [taskTypeFilter, setTaskTypeFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'ALL' | 'ORIGINAL' | 'TRANSFERRED'>('ALL');

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
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

  const fetchExternalRequests = async () => {
    setExtReqLoading(true);
    try {
      const params = new URLSearchParams({
        email: user?.email || '',
        department: user?.department || '',
        role: isAdmin ? 'ADMIN' : 'USER'
      });
      const res = await fetch(`/api/external-requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExternalRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch external requests", error);
    } finally {
      setExtReqLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const latestUser = await res.json();
        setUser(latestUser);
      }
    } catch (err) {
      console.error("Failed to sync user data", err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
    fetchLOs();
    fetchExternalRequests();
    fetchSettings();
    fetchUsersList();
  }, [isAdmin]);

  // SMART REDIRECTION LOGIC
  useEffect(() => {
    if (settings.moduleAccessMatrix && settings.moduleAccessMatrix !== '{}' && user?.department) {
      try {
        const matrix = JSON.parse(settings.moduleAccessMatrix);
        const canSeeTasks = isAdmin || (matrix['Tasks'] && matrix['Tasks'].includes(user.department));
        
        // If user is on TASKS dashboard but not allowed, push to Inter-Dept Requests
        if (!canSeeTasks && activeView === 'TASKS' && activeSubView === 'MAIN') {
          const canSeeRequests = isAdmin || (matrix['Requests'] && matrix['Requests'].includes(user.department));
          if (canSeeRequests) {
            setActiveView('TASKS');
            setActiveSubView('OTHER_DEPT');
            setIsTasksMenuOpen(false);
          } else {
            // If even requests are not allowed, maybe push to LO or just hide everything
            setActiveView('LOS');
          }
        }
      } catch (err) {
        console.error("Matrix parse error during redirect", err);
      }
    }
  }, [settings.moduleAccessMatrix, user?.department, activeView, activeSubView]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  // FINAL LOADING RELEASE
  useEffect(() => {
    if (!settingsLoading) {
      // Small delay to allow the Redirection useEffect to fire
      const timer = setTimeout(() => {
        setLoading(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [settingsLoading, activeView, activeSubView]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Matrix settings saved successfully!");
      } else {
        const errData = await res.json();
        alert(`Failed to save matrix settings: ${errData.details || errData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [preFilledTask, setPreFilledTask] = useState<any>(null);

  const handleConvertToTask = (req: ExternalRequest) => {
    setPreFilledTask({
      taskName: req.natureOfRequest,
      departmentName: req.departmentName,
      requestFrom: req.requestFrom,
      linkedRequestId: req.id,
      transferStatus: req.transferStatus,
      originalRequestType: req.originalRequestType
    });
    setShowForm(true);
  };

  const handleUpdateExtRequestStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/external-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchExternalRequests();
      }
    } catch (error) {
      console.error("Failed to update request status", error);
    }
  };

  const handleDeleteExtRequest = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this request?")) return;
    try {
      const res = await fetch(`/api/external-requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExternalRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleRejectExtRequest = async () => {
    if (!rejectingReq || !rejectReason.trim()) return;
    try {
      const res = await fetch(`/api/external-requests/${rejectingReq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected", rejectReason: rejectReason.trim() }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        setRejectingReq(null);
        setRejectReason("");
        fetchExternalRequests();
      }
    } catch (err) {
      console.error("Reject error:", err);
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
      console.error("Bulk add failed", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleResetUserPassword = async (userId: number, userName: string) => {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (!newPassword || newPassword.trim().length < 6) {
      if (newPassword !== null) alert("Password must be at least 6 characters.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });

      if (res.ok) {
        alert(`Password for ${userName} has been reset successfully!`);
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to reset password"}`);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Network error. Failed to reset password.");
    }
  };

  const handleApproveUser = async (id: string) => {
    if (!window.confirm("Approve this user for access?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, { method: "POST" });
      if (res.ok) {
        alert("User approved successfully!");
        fetchUsersList();
      } else {
        alert("Failed to approve user.");
      }
    } catch (error) {
      console.error("Approval failed", error);
    }
  };

  const handleRejectUser = async (id: string) => {
    const comment = window.prompt("Please provide a reason for rejecting this access request (this will be emailed to the user):");
    if (comment === null) return; // User cancelled
    
    try {
      const res = await fetch(`/api/admin/users/${id}/reject`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      });
      if (res.ok) {
        alert("Request rejected.");
        fetchUsersList();
      } else {
        alert("Failed to reject request.");
      }
    } catch (error) {
      console.error("Rejection failed", error);
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY remove this employee? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Employee removed successfully.");
        fetchUsersList();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to remove employee.");
      }
    } catch (error) {
      console.error("Removal failed", error);
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

  const handleSaveUserUpdates = async () => {
    if (Object.keys(pendingUserUpdates).length === 0) return;
    setIsSavingUsers(true);
    try {
      const updates = Object.entries(pendingUserUpdates).map(([userId, fields]) => ({
        userId,
        ...fields
      }));

      const res = await fetch("/api/users/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        setPendingUserUpdates({});
        fetchUsersList();
        alert("User updates saved successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to save user updates.");
      }
    } catch (error) {
      console.error("Save users error", error);
      alert("An error occurred while saving user updates.");
    } finally {
      setIsSavingUsers(false);
    }
  };

  const handleUpdateUserDepartment = (userId: string, newDept: string) => {
    setPendingUserUpdates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], department: newDept }
    }));
  };

  const handleUpdateUserRole = (userId: string, newRole: string) => {
    setPendingUserUpdates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], role: newRole }
    }));
  };

  const handleUpdateUserSuspension = (userId: string, isSuspended: boolean) => {
    setPendingUserUpdates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], isSuspended }
    }));
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

  const handleApproveDelete = async (taskId: number, action: 'APPROVE' | 'REJECT') => {
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this deletion request?`)) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Deletion request ${action.toLowerCase()}d successfully.`);
        fetchTasks();
      } else {
        alert("Failed to process deletion request.");
      }
    } catch (error) {
      console.error("Failed to process deletion", error);
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

  const handleSubmitLOCapture = async () => {
    if (!loCaptureForm.learningOpportunity || !loCaptureForm.resolutionProvided) {
      alert("Please fill in the Learning Opportunity and Resolution fields.");
      return;
    }

    try {
      const res = await fetch("/api/lo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loCaptureForm),
      });

      if (res.ok) {
        alert("Learning Opportunity captured successfully!");
        setShowLOCaptureModal(false);
        fetchLOs(); // Refresh LO list
      } else {
        alert("Failed to capture Learning Opportunity.");
      }
    } catch (error) {
      console.error("Failed to submit LO capture", error);
      alert("An error occurred while saving the LO.");
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
        const data = await res.json();
        alert(`Failed to send emails: ${data.error || data.message || "Unknown error"}`);
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
        t.taskType.toLowerCase().includes(q) || 
        t.entityName.toLowerCase().includes(q) || 
        t.ownerName.toLowerCase().includes(q) ||
        (t.reviewerName || "").toLowerCase().includes(q);
    }

    // 4. Dropdown Filters
    let dropdownMatch = true;
    if (taskEntityFilter !== "ALL" && t.entityName !== taskEntityFilter) dropdownMatch = false;
    if (taskOwnerFilter !== "ALL" && t.ownerName !== taskOwnerFilter) dropdownMatch = false;
    if (taskStatusFilter !== "ALL" && t.taskStatus !== taskStatusFilter) dropdownMatch = false;
    
    // 5. Task Type Filter
    const isActuallyExternal = !!t.linkedRequestId && t.departmentName !== "Finance";
    
    if (taskTypeFilter === "INTERNAL" && isActuallyExternal) dropdownMatch = false;
    if (taskTypeFilter === "EXTERNAL" && !isActuallyExternal) dropdownMatch = false;

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

  const handleExtReqSort = (key: keyof ExternalRequest) => {
    setExtReqSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Base visibility filter for External Requests
  const visibleExternalRequests = externalRequests.filter(r => {
    // Admins and Super Admins see everything
    if (isAdmin || user?.role === 'SUPER_ADMIN') return true;
    
    // Show if user is the requester
    const isRequester = r.requesterEmail?.toLowerCase().trim() === user?.email?.toLowerCase().trim();
    if (isRequester) return true;
    
    // Show if user is an allocator for this specific Finance Function (requestType)
    const isAllocatorForThis = userAllocatedDepts.some(dept => dept.toLowerCase() === r.requestType?.toLowerCase().trim());
    if (isAllocatorForThis) return true;
    
    return false;
  });

  // External Requests Filtering and Sorting
  const filteredExternalRequests = visibleExternalRequests.filter(r => {
    if (extReqSearch) {
      const q = extReqSearch.toLowerCase();
      if (!r.natureOfRequest.toLowerCase().includes(q) && !r.requestFrom.toLowerCase().includes(q)) return false;
    }
    
    if (extReqStatusFilter !== 'ALL' && r.status !== extReqStatusFilter) return false;

    if (extReqFilter === 'ALLOCATION') {
      return r.status === 'Pending' || !r.status || r.status === 'New';
    }
    if (extReqFilter === 'PROCESS') {
      return r.status === 'Under Process';
    }
    if (extReqFilter === 'PROCESSED') {
      return r.status === 'Processed';
    }
    if (extReqFilter === 'REJECTED') {
      return r.status === 'Rejected';
    }
    if (extReqFilter === 'CONVERT_PENDING') {
      return (r.status === 'Pending' || r.status === 'Under Process' || !r.status || r.status === 'New') && !r.convertedTaskId;
    }

    // New Request Type Filter (Original vs Transferred)
    if (requestTypeFilter === 'ORIGINAL' && r.transferStatus === 'T') return false;
    if (requestTypeFilter === 'TRANSFERRED' && r.transferStatus !== 'T') return false;

    return true;
  });

  const sortedExternalRequests = [...filteredExternalRequests].sort((a, b) => {
    if (!extReqSortConfig) return 0;
    const { key, direction } = extReqSortConfig;
    let valA = a[key];
    let valB = b[key];

    if (valA === null || valA === undefined) valA = "";
    if (valB === null || valB === undefined) valB = "";

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

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

  const exportExtRequestsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inter-Dept Requests");
    
    worksheet.columns = [
      { header: 'Sl No.', key: 'sl', width: 10 },
      { header: 'Request From', key: 'requestFrom', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Finance Function', key: 'type', width: 20 },
      { header: 'Request From', key: 'requestFrom', width: 25 },
      { header: 'Nature of Request', key: 'nature', width: 40 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    const filteredReqs = externalRequests.filter(r => {
      const isPrimaryAdmin = isAdmin || (user as any).isAllocator;
      const isRelevantToUser = (r.requesterEmail?.toLowerCase().trim() === user?.email?.toLowerCase().trim()) || 
        userAllocatedDepts.some(dept => dept.toLowerCase() === r.requestType?.toLowerCase().trim());
      if (!isPrimaryAdmin && !isRelevantToUser) return false;
      if (extReqSearch && !r.natureOfRequest.toLowerCase().includes(extReqSearch.toLowerCase()) && !r.requestFrom.toLowerCase().includes(extReqSearch.toLowerCase())) return false;
      if (extReqStatusFilter !== 'ALL' && r.status !== extReqStatusFilter && (extReqStatusFilter !== 'New' || (r.status !== 'New' && r.status !== ''))) {
         if (extReqStatusFilter === 'New' && (r.status === 'New' || r.status === '' || !r.status)) {} else return false;
      }
      return true;
    });

    filteredReqs.forEach((r, idx) => {
      worksheet.addRow({
        sl: idx + 1,
        requestFrom: r.requestFrom,
        email: r.requesterEmail,
        date: new Date(r.createdAt).toLocaleDateString(),
        type: r.requestType,
        nature: r.natureOfRequest,
        status: r.status || "New"
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `InterDept_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportExtRequestsToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text("Intellicar Finance - Inter-Departmental Requests", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const filteredReqs = externalRequests.filter(r => {
      const isPrimaryAdmin = isAdmin || (user as any).isAllocator;
      const isRelevantToUser = (r.requesterEmail?.toLowerCase().trim() === user?.email?.toLowerCase().trim()) || 
        userAllocatedDepts.some(dept => dept.toLowerCase() === r.requestType?.toLowerCase().trim());
      if (!isPrimaryAdmin && !isRelevantToUser) return false;
      if (extReqSearch && !r.natureOfRequest.toLowerCase().includes(extReqSearch.toLowerCase()) && !r.requestFrom.toLowerCase().includes(extReqSearch.toLowerCase())) return false;
      if (extReqStatusFilter !== 'ALL' && r.status !== extReqStatusFilter && (extReqStatusFilter !== 'New' || (r.status !== 'New' && r.status !== ''))) {
         if (extReqStatusFilter === 'New' && (r.status === 'New' || r.status === '' || !r.status)) {} else return false;
      }
      return true;
    });

    const tableColumn = ["Sl No.", "From", "Date", "Type", "Nature", "Status"];
    const tableRows = filteredReqs.map((r, idx) => [
      idx + 1,
      r.requestFrom,
      new Date(r.createdAt).toLocaleDateString(),
      r.requestType,
      r.natureOfRequest,
      r.status || "New"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`InterDept_Requests_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportLOsToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text("Intellicar Finance - Learning Opportunity Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["ID", "Entity", "Date", "Mistake / LO", "Identified By", "Committed By", "Mode"];
    const tableRows = sortedLOs.map(l => [
      l.id,
      l.entity,
      formatDate(l.dateOfIdentification),
      l.learningOpportunity,
      l.identifiedBy,
      l.committedBy,
      l.modeOfCommunication
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Intellicar_LO_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  const handleShareReport = async () => {
    if (!shareData.recipientEmail) {
      alert("Please enter a recipient email address.");
      return;
    }
    setShareLoading(true);
    try {
      let buffer: ArrayBuffer | Uint8Array;
      let contentType = "";
      let attachmentName = "";
      let subject = shareData.subject || `Shared ${shareData.type === 'task' ? 'Task' : 'LO'} Report`;

      if (shareData.type === 'task') {
        if (shareData.format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("Tasks");
          // ... (simplified excel logic or reuse)
          // For now, let's just copy the logic briefly or use a helper
          // I will use a simplified version for sharing to keep it clean
          worksheet.addRow(['Shared Task Report']);
          sortedTasks.forEach((t, i) => worksheet.addRow([i+1, t.taskName, t.entityName, t.ownerName, t.taskStatus]));
          buffer = await workbook.xlsx.writeBuffer();
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          attachmentName = `Tasks_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
          const doc = new jsPDF('landscape');
          doc.text("Shared Task Report", 14, 15);
          autoTable(doc, {
            head: [["ID", "Task Name", "Entity", "Owner", "Status"]],
            body: sortedTasks.map(t => [t.id, t.taskName, t.entityName, t.ownerName, t.taskStatus]),
            startY: 20
          });
          buffer = doc.output('arraybuffer');
          contentType = 'application/pdf';
          attachmentName = `Tasks_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        }
      } else if (shareData.type === 'lo') {
        if (shareData.format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("LOs");
          worksheet.addRow(['Shared LO Report']);
          sortedLOs.forEach((l, i) => worksheet.addRow([i+1, l.entity, l.learningOpportunity, l.identifiedBy, l.committedBy]));
          buffer = await workbook.xlsx.writeBuffer();
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          attachmentName = `LO_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
          const doc = new jsPDF('landscape');
          doc.text("Shared LO Report", 14, 15);
          autoTable(doc, {
            head: [["ID", "Entity", "Date", "Mistake / LO", "Identified By"]],
            body: sortedLOs.map(l => [l.id, l.entity, formatDate(l.dateOfIdentification), l.learningOpportunity, l.identifiedBy]),
            startY: 20
          });
          buffer = doc.output('arraybuffer');
          contentType = 'application/pdf';
          attachmentName = `LO_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        }
      } else if (shareData.type === 'request') {
        if (shareData.format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("Requests");
          worksheet.addRow(['Shared Inter-Dept Requests Report']);
          externalRequests.forEach((r, i) => worksheet.addRow([i+1, r.requestFrom, r.requestType, r.natureOfRequest, r.status]));
          buffer = await workbook.xlsx.writeBuffer();
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          attachmentName = `Requests_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
          const doc = new jsPDF('landscape');
          doc.text("Shared Inter-Dept Requests Report", 14, 15);
          autoTable(doc, {
            head: [["ID", "From", "Type", "Nature", "Status"]],
            body: externalRequests.map(r => [r.id, r.requestFrom, r.requestType, r.natureOfRequest, r.status]),
            startY: 20
          });
          buffer = doc.output('arraybuffer');
          contentType = 'application/pdf';
          attachmentName = `Requests_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        }
      }

      // Convert buffer to base64 (Robust browser-compatible method)
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.readAsDataURL(new Blob([buffer as any]));
      });

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: shareData.recipientEmail,
          ccEmail: shareData.ccEmail,
          subject,
          attachmentName,
          attachmentBuffer: base64,
          contentType
        })
      });

      if (res.ok) {
        alert("Report shared successfully via email!");
        setShowShareModal(false);
      } else {
        alert("Failed to share report.");
      }
    } catch (error) {
      console.error("Share error", error);
      alert("An error occurred while sharing the report.");
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", overflow: "hidden" }}>
      {/* Top Navigation Bar (Full Width) */}
      <header style={{ 
        height: "80px", width: "100%", background: "#ffffff", display: "flex", 
        alignItems: "center", justifyContent: "space-between", padding: "0 32px", 
        borderBottom: "1px solid #e2e8f0", zIndex: 100, flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        {/* Brand Area */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src="/logo.png" alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
        </div>

        {/* Global Actions Area */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>{user.name || "Master Admin"}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{user.email}</div>
          </div>
          
          <div style={{ height: "30px", width: "1px", background: "#f1f5f9" }}></div>


          <button onClick={() => { setShowOptionsModal(true); if (isAdmin) { fetchUsersList(); fetchSettings(); } else { setActiveOptionsTab('ACCOUNT'); } }} style={{ padding: "8px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.875rem" }}>
            {isAdmin ? <ShieldCheck size={16} /> : <Sliders size={16} />}
            {isAdmin ? "Control Center" : "Account Settings"}
          </button>
          
          <button 
            onClick={async () => {
              await fetch("/api/logout", { method: "POST", credentials: "include" });
              document.cookie = "session-token=; path=/; max-age=0";
              window.location.href = "/login";
            }} 
            style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Body (Sidebar + Content) */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <nav style={{ 
          width: "110px", background: "#0f172a", display: "flex", 
          flexDirection: "column", alignItems: "center", paddingTop: "32px", 
          flexShrink: 0, zIndex: 90, borderRight: "1px solid rgba(255,255,255,0.05)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", padding: "0 12px" }}>
            {/* Logic: Check if module is allowed for user's department */}
            {(() => {
              const matrix = JSON.parse(settings.moduleAccessMatrix || '{}');
              const canSeeTasks = isAdmin || matrix['Tasks']?.includes(user?.department);
              const canSeeRequests = isAdmin || matrix['Requests']?.includes(user?.department);
              const canSeeLearning = isAdmin || matrix['Learning']?.includes(user?.department);

              return (
                <>
                  {canSeeTasks && (
                    <div style={{ width: "100%" }}>
                      <button 
                        onClick={() => {
                          setActiveView('TASKS');
                          setIsTasksMenuOpen(!isTasksMenuOpen);
                          setActiveMainView('DASHBOARD');
                        }}
                        style={{ 
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                          background: activeView === 'TASKS' && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                          border: "none", color: activeView === 'TASKS' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8", 
                          cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                          width: "100%", borderRadius: "16px",
                          boxShadow: activeView === 'TASKS' && activeMainView === 'DASHBOARD' ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
                          position: "relative"
                        }}
                      >
                        <Home size={24} color={activeView === 'TASKS' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8"} />
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Tasks</span>
                        <ChevronDown size={14} style={{ position: "absolute", bottom: "12px", right: "12px", transform: isTasksMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }} />
                      </button>
                      
                      {isTasksMenuOpen && (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px", padding: "0 8px" }}>
                          <button 
                            onClick={() => { setActiveView('TASKS'); setActiveSubView('MAIN'); setActiveMainView('DASHBOARD'); }}
                            style={{ 
                              padding: "10px", borderRadius: "8px", border: "none", textAlign: "left", fontSize: "0.7rem", fontWeight: 600,
                              background: activeView === 'TASKS' && activeSubView === 'MAIN' && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.2)" : "transparent",
                              color: activeView === 'TASKS' && activeSubView === 'MAIN' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            Task Dashboard
                          </button>
                          {(() => {
                            // Check Matrix for Recurring Activities access
                            const matrix = JSON.parse(settings.moduleAccessMatrix || '{}');
                            const canSeeRecurring = isAdmin || (matrix['Recurring Activities'] && matrix['Recurring Activities'].includes(user?.department));
                            if (!canSeeRecurring) return null;
                            return (
                              <button 
                                onClick={() => { setActiveView('RECURRING'); setActiveMainView('DASHBOARD'); }}
                                style={{ 
                                  padding: "10px", borderRadius: "8px", border: "none", textAlign: "left", fontSize: "0.7rem", fontWeight: 600,
                                  background: activeView === 'RECURRING' ? "rgba(59, 130, 246, 0.2)" : "transparent",
                                  color: activeView === 'RECURRING' ? "#60a5fa" : "#94a3b8",
                                  cursor: "pointer", transition: "all 0.2s"
                                }}
                              >
                                Recurring Activities
                              </button>
                            );
                          })()}
                          {canSeeRequests && (
                            <button 
                              onClick={() => { setActiveView('TASKS'); setActiveSubView('OTHER_DEPT'); setActiveMainView('DASHBOARD'); }}
                              style={{ 
                                padding: "10px", borderRadius: "8px", border: "none", textAlign: "left", fontSize: "0.7rem", fontWeight: 600,
                                background: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.2)" : "transparent",
                                color: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8",
                                cursor: "pointer", transition: "all 0.2s"
                              }}
                            >
                              Inter Dept Request
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!canSeeTasks && canSeeRequests && (
                    <button 
                      onClick={() => { setActiveView('TASKS'); setActiveSubView('OTHER_DEPT'); setActiveMainView('DASHBOARD'); }}
                      style={{ 
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                        background: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                        border: "none", color: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8", 
                        cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                        width: "100%", borderRadius: "16px"
                      }}
                    >
                      <Users size={24} color={activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "#60a5fa" : "#94a3b8"} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em", textAlign: "center" }}>Inter Dept Request</span>
                    </button>
                  )}

                  {canSeeLearning && (
                    <button 
                      onClick={() => { setActiveView('LOS'); setActiveMainView('DASHBOARD'); }}
                      style={{ 
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                        background: activeView === 'LOS' && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                        border: "none", color: activeView === 'LOS' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8", 
                        cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                        width: "100%", borderRadius: "16px",
                        boxShadow: activeView === 'LOS' && activeMainView === 'DASHBOARD' ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none"
                      }}
                    >
                      <Lightbulb size={24} color={activeView === 'LOS' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8"} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Learning</span>
                    </button>
                  )}

                </>
              );
            })()}
          </div>
        </nav>

        {/* Content Area */}
        <main style={{ flex: 1, overflow: "auto", padding: activeView === 'RECURRING' ? "0" : "32px", background: "#f8fafc" }}>
          {activeView === 'RECURRING' && (
            <RecurringActivities settings={settings} usersList={usersList} />
          )}

          {activeView !== 'RECURRING' && (
            <>
          {/* Active View Title/Context Area */}
          <div style={{ 
            marginBottom: "32px", 
            paddingBottom: "24px", 
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>Finance Hub</span>
                <span style={{ color: "#cbd5e1" }}>/</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>
                  {activeView === 'TASKS' ? (activeSubView === 'MAIN' ? "Workplace" : "Collaboration") : "Development"}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {activeView === 'TASKS' ? (activeSubView === 'MAIN' ? "Task Dashboard" : "Inter Department Request") : "Learning Opportunities"}
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.95rem", fontWeight: 500 }}>
                {activeView === 'TASKS' ? 
                  (activeSubView === 'MAIN' ? "Track team productivity and operational milestones." : "View and manage incoming tasks from other departments.") 
                  : "Turning challenges into structured growth opportunities."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(activeView === 'TASKS' && activeSubView === 'MAIN') ? (
                <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 10px -2px rgba(37, 99, 235, 0.3)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                  <Plus size={18} /> New Task
                </button>
              ) : activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? null : (
                <button onClick={() => setShowLOForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", color: "#0f172a", padding: "10px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "#ffffff"}>
                  <Lightbulb size={18} color="#f59e0b" /> Update LO
                </button>
              )}
            </div>
          </div>

        {/* Metric Cards / Motivational Quote */}
        {activeView === 'TASKS' ? (
          activeSubView === 'MAIN' ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
              <MetricCard title="Total Tasks" value={tasks.length} icon={<LayoutDashboard size={24} color="#ffffff" />} bg="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" isActive={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
              <MetricCard title="Pending Action" value={pendingActionCount} icon={<Clock size={24} color="#ffffff" />} bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" isActive={activeFilter === 'PENDING_ACTION'} onClick={() => setActiveFilter('PENDING_ACTION')} />
              <MetricCard title="Pending Review" value={pendingReviewCount} icon={<AlertCircle size={24} color="#ffffff" />} bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" isActive={activeFilter === 'PENDING_REVIEW'} onClick={() => setActiveFilter('PENDING_REVIEW')} />
              <MetricCard title="Fully Completed" value={completedCount} icon={<CheckCircle2 size={24} color="#ffffff" />} bg="linear-gradient(135deg, #10b981 0%, #059669 100%)" isActive={activeFilter === 'COMPLETED'} onClick={() => setActiveFilter('COMPLETED')} />
            </div>
          ) : null
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

        {activeView === 'TASKS' && activeSubView === 'MAIN' && (
          <div className="main-tasks-view">
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
                placeholder="Search tasks, types, entities, owners..." 
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

              <select 
                value={taskTypeFilter} 
                onChange={e => setTaskTypeFilter(e.target.value as any)}
                style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", background: "#f8fafc", color: "#475569", fontWeight: 600 }}
              >
                <option value="ALL">All Task Types</option>
                <option value="INTERNAL">Internal Only</option>
                <option value="EXTERNAL">External Only</option>
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
                </select>
              </div>
            </div>
              
            <div className="download-container" style={{ display: "flex", gap: "8px", marginLeft: "auto", position: "relative" }}>
                <button 
                  onClick={() => setShowTaskDownloadDropdown(!showTaskDownloadDropdown)}
                  style={{ 
                    display: "flex", alignItems: "center", gap: "8px", background: "white", color: "#475569", 
                    padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", 
                    cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s" 
                  }} 
                  onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}
                >
                  <Download size={18} color="#2563eb" /> Download Report
                </button>
                
                {showTaskDownloadDropdown && (
                  <div style={{ 
                    position: "absolute", top: "100%", right: 0, marginTop: "8px", 
                    background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 1000, 
                    minWidth: "160px", overflow: "hidden" 
                  }}>
                    <button 
                      onClick={() => { exportToExcel(); setShowTaskDownloadDropdown(false); }}
                      style={{ 
                        width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                        padding: "12px 16px", border: "none", background: "white", 
                        color: "#475569", cursor: "pointer", fontSize: "0.875rem", 
                        textAlign: "left", transition: "background 0.2s" 
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                      onMouseOut={e => e.currentTarget.style.background = "white"}
                    >
                      <FileSpreadsheet size={16} color="#166534" /> Excel Format
                    </button>
                    <button 
                      onClick={() => { exportToPDF(); setShowTaskDownloadDropdown(false); }}
                      style={{ 
                        width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                        padding: "12px 16px", border: "none", background: "white", 
                        color: "#475569", cursor: "pointer", fontSize: "0.875rem", 
                        textAlign: "left", transition: "background 0.2s" 
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                      onMouseOut={e => e.currentTarget.style.background = "white"}
                    >
                      <FileText size={16} color="#991b1b" /> PDF Document
                    </button>
                    <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }}></div>
                    <button 
                      onClick={() => { 
                        setShareData({...shareData, type: 'task', format: 'excel', subject: `Task Report - ${new Date().toISOString().split('T')[0]}`});
                        setShowShareModal(true); 
                        setShowTaskDownloadDropdown(false); 
                      }}
                      style={{ 
                        width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                        padding: "12px 16px", border: "none", background: "white", 
                        color: "#2563eb", cursor: "pointer", fontSize: "0.875rem", 
                        textAlign: "left", transition: "background 0.2s", fontWeight: 600
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseOut={e => e.currentTarget.style.background = "white"}
                    >
                      <Mail size={16} color="#2563eb" /> Share via Email
                    </button>
                  </div>
                )}
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
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('entityName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Entity {taskSortConfig?.key === 'entityName' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('taskName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Task Name {taskSortConfig?.key === 'taskName' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('taskType')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Task Type {taskSortConfig?.key === 'taskType' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('requestFrom')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Request From {taskSortConfig?.key === 'requestFrom' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
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
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('reviewerName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Reviewer {taskSortConfig?.key === 'reviewerName' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('reviewCompletionDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Review Date {taskSortConfig?.key === 'reviewCompletionDate' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('reviewStatus')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Review Status {taskSortConfig?.key === 'reviewStatus' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={thStyle}>Capture LO?</th>
                  <th style={thStyle}>Owner Comments</th>
                  <th style={thStyle}>Reviewer Comments</th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleTaskSort('requestStatus')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Request Status {taskSortConfig?.key === 'requestStatus' && (taskSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={17} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading tasks...</td></tr>
                ) : paginatedTasks.length === 0 ? (
                  <tr><td colSpan={17} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No tasks found for the current filters.</td></tr>
                ) : (
                  paginatedTasks.map((task) => {
                    const currentUserName = EMAIL_TO_NAME[user?.email || ""];
                    const isCurrentUserOwner = task.ownerName === currentUserName;
                    const isCurrentUserReviewer = task.reviewerName === currentUserName;

                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const isOverdue = task.taskStatus !== "Completed" && task.dueDate && new Date(task.dueDate) < todayDate;

                    const isOwnerLocked = task.taskStatus === "Completed" && !isAdmin;
                    const isReviewerLocked = (task.reviewStatus === "Completed" || task.reviewStatus === "Review Not Required") && !isAdmin;
                    
                    const canEditReviewFields = isAdmin || isCurrentUserReviewer;
                    const canEditOwnerFields = isAdmin || isCurrentUserOwner;
                    
                    return (
                    <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s", backgroundColor: isOverdue ? "#fee2e2" : undefined }} className="table-row">
                      <td style={tdStyle}><span style={{ color: "#94a3b8", fontWeight: 500 }}>#{task.id}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}><span style={{ color: "#64748b" }}>{formatDateTime(task.createdAt)}</span></td>
                      <td style={tdStyle}>{task.entityName}</td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "#0f172a", minWidth: "300px", maxWidth: "600px", whiteSpace: "normal", wordWrap: "break-word" }}>{task.taskName}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ padding: "4px 8px", background: "#f1f5f9", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>
                            {task.taskType}
                          </span>
                          {(isAdmin || (user as any).isAllocator || userAllocatedDepts.length > 0) && task.linkedRequestId && (
                            task.transferStatus === 'T' ? (
                              <span 
                                title={`Transferred Request (Original: ${task.originalRequestType || 'Unknown'})`}
                                style={{ cursor: "help", fontSize: "1rem" }}
                              >
                                🔴
                              </span>
                            ) : (
                              <span 
                                title="Original Request"
                                style={{ cursor: "help", fontSize: "1rem" }}
                              >
                                🟢
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>{task.requestFrom}</td>
                      <td style={tdStyle}>{task.ownerName}</td>
                      <td style={tdStyle}>{task.dueDate ? formatDate(task.dueDate) : <span style={{ color: "#cbd5e1" }}>--</span>}</td>
                      
                      {/* Editable Completion Date */}
                      <td 
                        style={{ ...tdStyle, cursor: isOwnerLocked || !canEditOwnerFields ? "not-allowed" : "pointer", minWidth: "140px" }}
                        onClick={() => { 
                          if (isOwnerLocked || !canEditOwnerFields) return;
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
                            {(isOwnerLocked || !canEditOwnerFields) && <span style={{ marginLeft: "4px", fontSize: "10px" }} title={!canEditOwnerFields ? "Only Owner can edit" : "Task Completed"}>🔒</span>}
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
                      
                      <td 
                        style={{ ...tdStyle, cursor: task.reviewerName === "Not Applicable" || isReviewerLocked || !canEditReviewFields ? "not-allowed" : "pointer", minWidth: "140px" }}
                        onClick={() => { 
                          if (task.reviewerName === "Not Applicable" || isReviewerLocked || !canEditReviewFields) return;
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
                            {(isReviewerLocked || !canEditReviewFields) && task.reviewerName !== "Not Applicable" && <span style={{ marginLeft: "4px", fontSize: "10px" }} title={!canEditReviewFields ? "Only Reviewer can edit" : "Review Completed"}>🔒</span>}
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <StatusPill 
                          status={task.reviewerName === "Not Applicable" ? "Review Not Required" : task.reviewStatus} 
                          type="review" 
                          taskId={task.id} 
                          onUpdate={handleUpdate} 
                          disabled={isReviewerLocked || !canEditReviewFields}
                        />
                      </td>

                      <td style={tdStyle}>
                        {task.reviewerName === "Not Applicable" ? (
                          <span style={{ color: "#94a3b8", fontWeight: 500 }}>N/A</span>
                        ) : (isAdmin || isCurrentUserReviewer) && (task.reviewStatus === 'Completed') ? (
                          <select 
                            onChange={(e) => {
                              if (e.target.value === 'YES') {
                                setLOCaptureForm({
                                  ...loCaptureForm,
                                  taskId: task.id,
                                  entity: task.entityName || "",
                                  dateOfIdentification: task.reviewCompletionDate ? task.reviewCompletionDate.split("T")[0] : new Date().toISOString().split("T")[0],
                                  identifiedBy: task.reviewerName || "",
                                  committedBy: task.ownerName || "",
                                  learningOpportunity: "",
                                  resolutionProvided: "",
                                  modeOfCommunication: "Email",
                                  comments: ""
                                });
                                setShowLOCaptureModal(true);
                              }
                            }}
                            style={{ 
                              padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", 
                              fontSize: "0.75rem", fontWeight: 600, background: "#f8fafc", color: "#475569", cursor: "pointer" 
                            }}
                          >
                            <option value="NO">No</option>
                            <option value="YES">Yes</option>
                          </select>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>--</span>
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

                      <td 
                        style={{ ...tdStyle, cursor: isReviewerLocked || !canEditReviewFields ? "not-allowed" : "text", minWidth: "200px", maxWidth: "380px", whiteSpace: "normal" }}
                        onClick={() => { 
                          if (isReviewerLocked || !canEditReviewFields) return;
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
                          <span style={{ color: task.reviewerComments ? "#475569" : "#cbd5e1" }}>
                            {task.reviewerComments || "Click to add..."}
                            {(isReviewerLocked || !canEditReviewFields) && <span style={{ marginLeft: "4px", fontSize: "10px" }}>🔒</span>}
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {task.linkedRequestId ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ 
                              padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700,
                              background: task.requestStatus === 'Processed' ? "#dcfce7" : "#fef3c7",
                              color: task.requestStatus === 'Processed' ? "#15803d" : "#b45309",
                              textAlign: "center"
                            }}>
                              {task.requestStatus || "Pending"}
                            </span>
                            {task.requestStatus !== 'Processed' && 
                             (task.reviewStatus === 'Completed' || task.reviewStatus === 'Review Not Required') && 
                             isCurrentUserOwner && (
                              <button 
                                onClick={async () => {
                                  // Update Task
                                  await handleUpdate(task.id, "requestStatus", "Processed");
                                  // Update External Request
                                  if (task.linkedRequestId) {
                                    await handleUpdateExtRequestStatus(task.linkedRequestId, "Processed");
                                  }
                                  alert("Marked as Processed and Requester notified!");
                                }}
                                style={{ 
                                  padding: "2px 6px", fontSize: "0.65rem", background: "#4f46e5", 
                                  color: "white", border: "none", borderRadius: "4px", cursor: "pointer" 
                                }}
                              >
                                Mark Processed
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontWeight: 500 }}>N/A</span>
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
        )}


        {activeMainView === 'DASHBOARD' && activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' && (
          <div className="other-dept-view">
            <div style={{ background: "white", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <div style={{ padding: "28px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Inter Dept Request</h3>
                <button 
                  onClick={() => setShowExtReqForm(true)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: "#4f46e5", color: "white", padding: "10px 20px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 10px -2px rgba(79, 70, 229, 0.3)" }}
                >
                  <Plus size={18} /> Submit New Request
                </button>
              </div>
              
              {/* Metric Cards for Inter-Dept */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", padding: "24px 32px", background: "white" }}>
                <MetricCard 
                  title="All Requests" 
                  value={visibleExternalRequests.length} 
                  icon={<FileText size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #475569 0%, #1e293b 100%)" 
                  isActive={extReqFilter === 'ALL'} 
                  onClick={() => setExtReqFilter('ALL')} 
                />
                <MetricCard 
                  title="Pending" 
                  value={visibleExternalRequests.filter(r => r.status === 'Pending' || !r.status || r.status === 'New' || r.status === '').length} 
                  icon={<Clock size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" 
                  isActive={extReqFilter === 'ALLOCATION'} 
                  onClick={() => setExtReqFilter('ALLOCATION')} 
                />
                <MetricCard 
                  title="Under Process" 
                  value={visibleExternalRequests.filter(r => r.status === 'Under Process').length} 
                  icon={<AlertCircle size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" 
                  isActive={extReqFilter === 'PROCESS'} 
                  onClick={() => setExtReqFilter('PROCESS')} 
                />
                <MetricCard 
                  title="Processed" 
                  value={visibleExternalRequests.filter(r => r.status === 'Processed').length} 
                  icon={<CheckCircle2 size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                  isActive={extReqFilter === 'PROCESSED'} 
                  onClick={() => setExtReqFilter('PROCESSED')} 
                />
                <MetricCard 
                  title="Rejected" 
                  value={visibleExternalRequests.filter(r => r.status === 'Rejected').length} 
                  icon={<Trash2 size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" 
                  isActive={extReqFilter === 'REJECTED'} 
                  onClick={() => setExtReqFilter('REJECTED')} 
                />
              </div>

              {/* Enhanced Filter Bar */}
              <div style={{ padding: "16px 32px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
                  <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email or request nature..." 
                    value={extReqSearch}
                    onChange={e => setExtReqSearch(e.target.value)}
                    style={{ padding: "8px 8px 8px 32px", borderRadius: "10px", border: "1px solid #e2e8f0", outline: "none", fontSize: "0.8125rem", width: "100%", background: "white" }} 
                  />
                </div>
                
                {/* Pending to Convert Dynamic Button */}
                <button 
                  onClick={() => setExtReqFilter(extReqFilter === 'CONVERT_PENDING' ? 'ALL' : 'CONVERT_PENDING')}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    background: extReqFilter === 'CONVERT_PENDING' ? "rgba(79, 70, 229, 0.1)" : "white", 
                    color: extReqFilter === 'CONVERT_PENDING' ? "#4f46e5" : "#64748b", 
                    border: extReqFilter === 'CONVERT_PENDING' ? "2px solid #4f46e5" : "1px solid #e2e8f0", 
                    padding: "8px 16px", 
                    borderRadius: "10px", 
                    fontSize: "0.875rem", 
                    fontWeight: 600, 
                    cursor: "pointer", 
                    transition: "all 0.2s" 
                  }}
                >
                  <ListFilter size={18} />
                  Pending to Convert
                  <span style={{ 
                    background: extReqFilter === 'CONVERT_PENDING' ? "#4f46e5" : "#f1f5f9", 
                    color: extReqFilter === 'CONVERT_PENDING' ? "white" : "#64748b", 
                    padding: "2px 8px", 
                    borderRadius: "999px", 
                    fontSize: "0.75rem" 
                  }}>
                    {visibleExternalRequests.filter(r => (r.status === 'Pending' || r.status === 'Under Process' || !r.status || r.status === 'New') && !r.convertedTaskId).length}
                  </span>
                </button>

                {(isAdmin || (user as any).isAllocator || userAllocatedDepts.length > 0) && (
                  <select 
                    value={requestTypeFilter} 
                    onChange={e => setRequestTypeFilter(e.target.value as any)}
                    style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", background: "white", color: "#475569", fontWeight: 600 }}
                  >
                    <option value="ALL">All Request Origins</option>
                    <option value="ORIGINAL">Original Only</option>
                    <option value="TRANSFERRED">Transferred Only</option>
                  </select>
                )}

                <div style={{ marginLeft: "auto", position: "relative" }}>
                  <button 
                    onClick={() => setShowExtReqDownloadDropdown(!showExtReqDownloadDropdown)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", color: "#2563eb", border: "1px solid #2563eb", padding: "10px 20px", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  >
                    <Download size={18} /> Download Report <ChevronDown size={16} />
                  </button>

                  {showExtReqDownloadDropdown && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "white", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", zIndex: 100, minWidth: "200px", overflow: "hidden" }}>
                      <button 
                        onClick={() => { exportExtRequestsToExcel(); setShowExtReqDownloadDropdown(false); }}
                        style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "white", color: "#166534", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500, transition: "background 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#f0fdf4"}
                        onMouseOut={(e) => e.currentTarget.style.background = "white"}
                      >
                        <FileSpreadsheet size={16} /> Excel Format
                      </button>
                      <button 
                        onClick={() => { exportExtRequestsToPDF(); setShowExtReqDownloadDropdown(false); }}
                        style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "white", color: "#991b1b", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500, transition: "background 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#fef2f2"}
                        onMouseOut={(e) => e.currentTarget.style.background = "white"}
                      >
                        <FileText size={16} /> PDF Document
                      </button>
                      <div style={{ borderTop: "1px solid #f1f5f9" }}></div>
                      <button 
                        onClick={() => {
                          setShareData({
                            ...shareData,
                            type: 'request',
                            subject: `Inter-Departmental Requests Report - ${new Date().toLocaleDateString()}`
                          });
                          setShowShareModal(true);
                          setShowExtReqDownloadDropdown(false);
                        }}
                        style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "white", color: "#1e40af", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500, transition: "background 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#eff6ff"}
                        onMouseOut={(e) => e.currentTarget.style.background = "white"}
                      >
                        <Mail size={16} /> Share via Email
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "32px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ ...thStyle, width: "50px" }}>Sl No.</th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleExtReqSort('requestFrom')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Request From {extReqSortConfig?.key === 'requestFrom' && (extReqSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleExtReqSort('createdAt')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Date {extReqSortConfig?.key === 'createdAt' && (extReqSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleExtReqSort('requestType')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Finance Function {extReqSortConfig?.key === 'requestType' && (extReqSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleExtReqSort('natureOfRequest')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Nature of Request {extReqSortConfig?.key === 'natureOfRequest' && (extReqSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleExtReqSort('status')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Request Status {extReqSortConfig?.key === 'status' && (extReqSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      {canAllocateAnything && <th style={thStyle}>Action</th>}
                      <th style={thStyle}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extReqLoading ? (
                      <tr><td colSpan={canAllocateAnything ? 8 : 7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading requests...</td></tr>
                    ) : sortedExternalRequests.length === 0 ? (
                      <tr><td colSpan={canAllocateAnything ? 8 : 7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No requests found.</td></tr>
                    ) : (
                      sortedExternalRequests.map((req, idx) => {
                        const matrix = JSON.parse(settings.allocationMatrix || '{}');
                        const allocators = Array.isArray(matrix[req.requestType]) ? matrix[req.requestType] : (matrix[req.requestType] ? [matrix[req.requestType]] : []);
                        const isAuthorizedAllocator = allocators.includes(user?.email) || isAdmin || (user as any).isAllocator;
                        
                        return (
                          <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={tdStyle}>{idx + 1}</td>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>{req.requestFrom}</div>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{req.departmentName}</div>
                            </td>
                            <td style={tdStyle}>{new Date(req.createdAt).toLocaleDateString()}</td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#f1f5f9", fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>
                                  {req.requestType}
                                </span>
                                {(isAdmin || (user as any).isAllocator || userAllocatedDepts.length > 0) && (
                                  req.transferStatus === 'T' ? (
                                    <span 
                                      title={`Transferred Request (Original: ${req.originalRequestType || 'Unknown'})`}
                                      style={{ cursor: "help", fontSize: "1rem" }}
                                    >
                                      🔴
                                    </span>
                                  ) : (
                                    <span 
                                      title="Original Request"
                                      style={{ cursor: "help", fontSize: "1rem" }}
                                    >
                                      🟢
                                    </span>
                                  )
                                )}
                              </div>
                            </td>
                            <td style={{ ...tdStyle, maxWidth: "300px", whiteSpace: "normal" }}>{req.natureOfRequest}</td>
                            <td style={tdStyle}>
                                {(!req.status || req.status === 'Pending' || req.status === 'New') && (
                                  <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#fff7ed", fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", border: "1px solid #ffedd5" }}>
                                    Pending
                                  </span>
                                )}
                                {req.status === 'Under Process' && (
                                  <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#eff6ff", fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", border: "1px solid #dbeafe" }}>
                                    Under Process
                                  </span>
                                )}
                                {req.status === 'Processed' && (
                                  <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#f0fdf4", fontSize: "0.75rem", fontWeight: 700, color: "#166534", border: "1px solid #dcfce7" }}>
                                    Processed
                                  </span>
                                )}
                                {req.status === 'Rejected' && (
                                  <div 
                                    style={{ position: "relative" }}
                                    onMouseEnter={() => setHoveredRejectId(req.id)}
                                    onMouseLeave={() => setHoveredRejectId(null)}
                                  >
                                    <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#fef2f2", fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", border: "1px solid #fee2e2", cursor: "help" }}>
                                      Rejected
                                    </span>
                                    {hoveredRejectId === req.id && (
                                      <div style={{
                                        position: "absolute",
                                        bottom: "100%",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        marginBottom: "8px",
                                        padding: "10px 14px",
                                        background: "#1e293b",
                                        color: "white",
                                        fontSize: "0.75rem",
                                        borderRadius: "10px",
                                        whiteSpace: "normal",
                                        width: "220px",
                                        zIndex: 100,
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        lineHeight: "1.4"
                                      }}>
                                        <div style={{ fontWeight: 700, marginBottom: "4px", color: "#f87171", fontSize: "0.65rem", textTransform: "uppercase" }}>Rejection Reason</div>
                                        { (req as any).rejectReason || "No reason specified" }
                                        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTopColor: "#1e293b" }}></div>
                                      </div>
                                    )}
                                  </div>
                                )}
                            </td>
                            {canAllocateAnything && (
                              <td style={tdStyle}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {(req.status === 'Pending' && !req.convertedTaskId && isAuthorizedAllocator) && (
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <button 
                                        onClick={() => handleConvertToTask(req)}
                                        style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                      >
                                        <Plus size={12} /> Convert to Task
                                      </button>
                                      <button 
                                        onClick={() => { setRejectingReq(req); setShowRejectModal(true); }}
                                        style={{ background: "white", color: "#ef4444", border: "1px solid #fee2e2", borderRadius: "8px", padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  
                                  {(req.status === 'Under Process' || req.status === 'Processed') && req.convertedTaskId && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#f0f9ff", fontSize: "0.7rem", fontWeight: 700, color: "#0369a1", border: "1px solid #bae6fd" }}>
                                        TASK CREATED
                                      </span>
                                      <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500 }}>ID: {req.convertedTaskId}</span>
                                    </div>
                                  )}

                                  {req.status === 'Rejected' && (
                                    <div style={{ fontSize: "0.7rem", color: "#ef4444", maxWidth: "200px", padding: "8px", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fee2e2" }}>
                                      <strong>Rejected:</strong> { (req as any).rejectReason || "No reason provided" }
                                    </div>
                                  )}

                                  {isAuthorizedAllocator && (
                                    <button 
                                      onClick={() => handleDeleteExtRequest(req.id)}
                                      style={{ alignSelf: "flex-start", marginTop: "4px", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px" }}
                                      onMouseOver={(e) => e.currentTarget.style.color = "#ef4444"}
                                      onMouseOut={(e) => e.currentTarget.style.color = "#94a3b8"}
                                    >
                                      <Trash2 size={12} /> <span style={{ fontSize: "0.65rem" }}>Delete Request</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                            <td style={{ ...tdStyle, maxWidth: "280px", whiteSpace: "normal", color: "#64748b", fontSize: "0.8rem" }}>
                              {req.status === 'Rejected' ? (
                                <span style={{ color: "#ef4444", fontWeight: 500 }}>
                                  {(req as any).rejectReason || "No reason specified"}
                                </span>
                              ) : req.status === 'Processed' ? (
                                <span style={{ color: "#10b981", fontWeight: 500 }}>N/A</span>
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>-</span>
                              )}
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
        )}

        {/* LO View */}
        {activeView === 'LOS' && (
          <div className="lo-view">
          {/* LO View */}
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
                  <div className="download-container" style={{ position: "relative" }}>
                    <button 
                      onClick={() => setShowLODownloadDropdown(!showLODownloadDropdown)}
                      style={{ 
                        display: "flex", alignItems: "center", gap: "8px", background: "white", color: "#475569", 
                        padding: "8px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", 
                        cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, 
                        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", transition: "all 0.2s" 
                      }} 
                      onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}
                    >
                      <Download size={16} color="#2563eb" /> Download
                    </button>
                    
                    {showLODownloadDropdown && (
                      <div style={{ 
                        position: "absolute", top: "100%", right: 0, marginTop: "8px", 
                        background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", 
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 1000, 
                        minWidth: "160px", overflow: "hidden" 
                      }}>
                        <button 
                          onClick={() => { exportLOsToExcel(); setShowLODownloadDropdown(false); }}
                          style={{ 
                            width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                            padding: "10px 16px", border: "none", background: "white", 
                            color: "#475569", cursor: "pointer", fontSize: "0.8125rem", 
                            textAlign: "left", transition: "background 0.2s" 
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseOut={e => e.currentTarget.style.background = "white"}
                        >
                          <FileSpreadsheet size={14} color="#059669" /> Excel Format
                        </button>
                        <button 
                          onClick={() => { exportLOsToPDF(); setShowLODownloadDropdown(false); }}
                          style={{ 
                            width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                            padding: "10px 16px", border: "none", background: "white", 
                            color: "#475569", cursor: "pointer", fontSize: "0.8125rem", 
                            textAlign: "left", transition: "background 0.2s" 
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseOut={e => e.currentTarget.style.background = "white"}
                        >
                          <FileText size={14} color="#991b1b" /> PDF Document
                        </button>
                        <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }}></div>
                        <button 
                          onClick={() => { 
                            setShareData({...shareData, type: 'lo', format: 'excel', subject: `LO Report - ${new Date().toISOString().split('T')[0]}`});
                            setShowShareModal(true); 
                            setShowLODownloadDropdown(false); 
                          }}
                          style={{ 
                            width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                            padding: "10px 16px", border: "none", background: "white", 
                            color: "#4f46e5", cursor: "pointer", fontSize: "0.8125rem", 
                            textAlign: "left", transition: "background 0.2s", fontWeight: 600
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#f5f3ff"}
                          onMouseOut={e => e.currentTarget.style.background = "white"}
                        >
                          <Mail size={14} color="#4f46e5" /> Share via Email
                        </button>
                      </div>
                    )}
                  </div>
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
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('learningOpportunity')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Learning Opportunity {loSortConfig?.key === 'learningOpportunity' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
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
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('resolutionProvided')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Resolution {loSortConfig?.key === 'resolutionProvided' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleLOSort('modeOfCommunication')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Communication Mode {loSortConfig?.key === 'modeOfCommunication' && (loSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
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
        </div>
      )}

      {showForm && (
        <TaskForm 
          settings={settings}
          usersList={usersList}
          initialData={preFilledTask}
          user={user}
          onClose={() => {
            setShowForm(false);
            setPreFilledTask(null);
          }} 
          onSuccess={() => {
            setShowForm(false);
            setPreFilledTask(null);
            fetchTasks();
            fetchExternalRequests();
          }} 
        />
      )}
      {showLOForm && (
        <LOForm 
          settings={settings}
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
          settings={settings}
          initialData={editingLO}
          onClose={() => setEditingLO(null)} 
          onSuccess={() => {
            setEditingLO(null);
            fetchLOs();
            alert("LO entry updated successfully!");
          }} 
        />
      )}
      {showExtReqForm && (
        <ExternalRequestForm 
          settings={settings}
          user={user}
          onClose={() => setShowExtReqForm(false)}
          onSuccess={() => {
            setShowExtReqForm(false);
            fetchExternalRequests();
            alert("Your request has been submitted to Finance team.");
          }}
        />
      )}
      {showLOCaptureModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "600px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Capture Learning Opportunity</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>Document mistakes and structured growth from review.</p>
              </div>
              <button onClick={() => setShowLOCaptureModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Entity</label>
                  <input type="text" readOnly value={loCaptureForm.entity} style={{ ...inputStyle, background: "#f8fafc", cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Date of Identification</label>
                  <input type="text" readOnly value={formatDate(loCaptureForm.dateOfIdentification)} style={{ ...inputStyle, background: "#f8fafc", cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Identified By</label>
                  <input type="text" readOnly value={loCaptureForm.identifiedBy} style={{ ...inputStyle, background: "#f8fafc", cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Committed By</label>
                  <input type="text" readOnly value={loCaptureForm.committedBy} style={{ ...inputStyle, background: "#f8fafc", cursor: "not-allowed" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Mistake / Learning Opportunity</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the learning opportunity..."
                  value={loCaptureForm.learningOpportunity}
                  onChange={e => setLOCaptureForm({...loCaptureForm, learningOpportunity: e.target.value})}
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Resolution Provided</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the resolution/correction..."
                  value={loCaptureForm.resolutionProvided}
                  onChange={e => setLOCaptureForm({...loCaptureForm, resolutionProvided: e.target.value})}
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Mode of Communication</label>
                <select 
                  value={loCaptureForm.modeOfCommunication}
                  onChange={e => setLOCaptureForm({...loCaptureForm, modeOfCommunication: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">Choose</option>
                  {settings?.masterCommunicationModes?.split(',').filter((m: string) => m.trim()).map((mode: string) => (
                    <option key={mode.trim()} value={mode.trim()}>{mode.trim()}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button 
                  onClick={() => setShowLOCaptureModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitLOCapture}
                  style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#4f46e5", color: "white", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)" }}
                >
                  Submit LO to Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOptionsModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "800px", height: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {isAdmin ? <ShieldCheck size={24} color="#4f46e5" /> : <Sliders size={24} color="#4f46e5" />}
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>{isAdmin ? "Control Center" : "Account Settings"}</h2>
              </div>
              <button onClick={() => setShowOptionsModal(false)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.5rem", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
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
                      Email Trigger
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
                      onClick={() => setActiveOptionsTab('MASTER_DATA')} 
                      style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'MASTER_DATA' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'MASTER_DATA' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                    >
                      Master Data
                    </button>
                    <button 
                      onClick={() => setActiveOptionsTab('DATA')} 
                      style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'DATA' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'DATA' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                    >
                      <Download size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} /> Bulk Import
                    </button>
                    <button 
                      onClick={() => setActiveOptionsTab('MATRICES')} 
                      style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'MATRICES' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'MATRICES' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                    >
                      Matrix Module
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

                    <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid #e2e8f0" }}>
                      <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "#0f172a", fontWeight: 700 }}>Profile Information</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "600px" }}>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Full Name</p>
                          <p style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 500 }}>{user?.name || "Not Set"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Email Address</p>
                          <p style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 500 }}>{user?.email}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Role</p>
                          <p style={{ margin: 0, fontSize: "0.875rem", display: "inline-block", padding: "4px 12px", background: "#f1f5f9", borderRadius: "9999px", color: "#475569", fontWeight: 600 }}>{user?.role || "USER"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Assigned Department</p>
                          <p style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 500 }}>{user?.department || "Finance (Default)"}</p>
                        </div>
                      </div>
                      <p style={{ marginTop: "24px", fontSize: "0.8125rem", color: "#94a3b8", fontStyle: "italic" }}>
                        Note: If your department is incorrect, please contact an Administrator to update it in User Management.
                      </p>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'SCHEDULE' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Email Trigger & Schedule</h3>
                    
                    {/* Dynamic Emails Control */}
                    <div style={{ marginBottom: "32px", padding: "20px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd" }}>
                      <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "#0369a1", fontWeight: 700 }}>Report Recipients</h4>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        {/* Task Report Managers */}
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>Primary Emails</label>
                          <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                              {(settings.managerEmail || "").split(',').filter(e => e.trim()).map((email, idx) => (
                                <div key={`m-${idx}`} style={{ background: "#f8fafc", color: "#334155", padding: "8px 12px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0" }}>
                                  <span style={{ fontFamily: "monospace" }}>{email.trim()}</span>
                                  <button 
                                    onClick={() => {
                                      const emails = (settings.managerEmail || "").split(',').filter((_, i) => i !== idx);
                                      setSettings({...settings, managerEmail: emails.join(',')});
                                    }}
                                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", padding: "4px" }}
                                    onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                                    onMouseOut={e => e.currentTarget.style.color = "#94a3b8"}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input 
                                type="email" 
                                placeholder="Add email..."
                                value={newManagerEmailInput}
                                onChange={(e) => setNewManagerEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newManagerEmailInput && newManagerEmailInput.includes('@')) {
                                      setSettings({...settings, managerEmail: (settings.managerEmail || "") + (settings.managerEmail?.trim() ? "," : "") + newManagerEmailInput.trim()});
                                      setNewManagerEmailInput("");
                                    }
                                  }
                                }}
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", outline: "none" }}
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const val = newManagerEmailInput.trim();
                                  if (val && val.includes('@')) {
                                    setSettings(prev => {
                                      const current = prev.managerEmail || "";
                                      return {...prev, managerEmail: current.trim() ? `${current},${val}` : val};
                                    });
                                    setNewManagerEmailInput("");
                                  }
                                }}
                                style={{ background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* LO Report Admins */}
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>Primary LO Mails</label>
                          <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                              {(settings.loReportEmail || "").split(',').filter(e => e.trim()).map((email, idx) => (
                                <div key={`l-${idx}`} style={{ background: "#fdf4ff", color: "#701a75", padding: "8px 12px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #fae8ff" }}>
                                  <span style={{ fontFamily: "monospace" }}>{email.trim()}</span>
                                  <button 
                                    onClick={() => {
                                      const emails = (settings.loReportEmail || "").split(',').filter((_, i) => i !== idx);
                                      setSettings({...settings, loReportEmail: emails.join(',')});
                                    }}
                                    style={{ background: "transparent", border: "none", color: "#d8b4fe", cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", padding: "4px" }}
                                    onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                                    onMouseOut={e => e.currentTarget.style.color = "#d8b4fe"}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input 
                                type="email" 
                                placeholder="Add email..."
                                value={newLOEmailInput}
                                onChange={(e) => setNewLOEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newLOEmailInput && newLOEmailInput.includes('@')) {
                                      setSettings({...settings, loReportEmail: (settings.loReportEmail || "") + (settings.loReportEmail?.trim() ? "," : "") + newLOEmailInput.trim()});
                                      setNewLOEmailInput("");
                                    }
                                  }
                                }}
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", outline: "none" }}
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const val = newLOEmailInput.trim();
                                  if (val && val.includes('@')) {
                                    setSettings(prev => {
                                      const current = prev.loReportEmail || "";
                                      return {...prev, loReportEmail: current.trim() ? `${current},${val}` : val};
                                    });
                                    setNewLOEmailInput("");
                                  }
                                }}
                                style={{ background: "#7c3aed", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                    <h3 style={{ margin: "0 0 24px 0" }}>User Management</h3>
                    
                    {/* Pending Access Requests Section */}
                    <div style={{ marginBottom: "40px", padding: "24px", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ padding: "8px", background: "#fef3c7", borderRadius: "10px" }}>
                            <UserCheck size={20} color="#d97706" />
                          </div>
                          <h4 style={{ margin: 0, fontSize: "1.125rem", color: "#1e293b" }}>Pending Access Requests</h4>
                        </div>
                        <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>
                          {usersList.filter(u => (u as any).isApproved === false).length} WAITING
                        </span>
                      </div>

                      {usersLoading ? (
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading requests...</p>
                      ) : usersList.filter(u => (u as any).isApproved === false).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", border: "1px dashed #e2e8f0", borderRadius: "12px", color: "#94a3b8" }}>
                           No pending access requests at the moment.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
                                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Name</th>
                                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Email</th>
                                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Requested Dept</th>
                                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usersList.filter(u => (u as any).isApproved === false).map(u => (
                                <tr key={u.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                                  <td style={{ padding: "16px", fontWeight: 500 }}>{u.name}</td>
                                  <td style={{ padding: "16px", color: "#64748b" }}>{u.email}</td>
                                  <td style={{ padding: "16px" }}>
                                    <select 
                                      value={pendingUserUpdates[u.id]?.department !== undefined ? pendingUserUpdates[u.id].department : (u.department || "")}
                                      onChange={(e) => handleUpdateUserDepartment(u.id, e.target.value)}
                                      style={{ padding: "6px 12px", borderRadius: "6px", border: pendingUserUpdates[u.id]?.department !== undefined ? "2px solid #10b981" : "1px solid #cbd5e1", width: "100%", maxWidth: "150px" }}
                                    >
                                      <option value="">Select Dept</option>
                                      {settings.masterDepartments.split(',').filter(d => d.trim()).map(dept => (
                                        <option key={dept.trim()} value={dept.trim()}>{dept.trim()}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: "16px", textAlign: "right" }}>
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                      <button 
                                        onClick={() => handleApproveUser(u.id)}
                                        style={{ padding: "6px 12px", background: "#10b981", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => handleRejectUser(u.id)}
                                        style={{ padding: "6px 12px", background: "white", color: "#ef4444", borderRadius: "8px", border: "1px solid #fee2e2", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ padding: "8px", background: "#dcfce7", borderRadius: "10px" }}>
                            <Users size={20} color="#166534" />
                          </div>
                          <h4 style={{ margin: 0, fontSize: "1.125rem", color: "#1e293b" }}>Active Employees</h4>
                        </div>
                        <div style={{ display: "flex", gap: "12px" }}>
                          {Object.keys(pendingUserUpdates).length > 0 && (
                            <button 
                              onClick={handleSaveUserUpdates}
                              disabled={isSavingUsers}
                              style={{ padding: "8px 24px", background: "#10b981", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, cursor: isSavingUsers ? "not-allowed" : "pointer", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)" }}
                            >
                              {isSavingUsers ? "Saving..." : "Save Changes"}
                            </button>
                          )}
                          <button 
                            onClick={handleBulkAddUsers}
                            style={{ background: "#f1f5f9", color: "#475569", padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: 500, fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <Users size={14} /> Import All Employees
                          </button>
                        </div>
                    </div>

                    {usersLoading ? (
                      <p>Loading users...</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                               <th style={{ padding: "12px 8px" }}>Name</th>
                               <th style={{ padding: "12px 8px" }}>Email</th>
                               <th style={{ padding: "12px 8px" }}>Department</th>
                               <th style={{ padding: "12px 8px" }}>Role</th>
                               <th style={{ padding: "12px 8px" }}>Account Status</th>
                               <th style={{ padding: "12px 8px", textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersList.filter(u => (u as any).isApproved !== false).map(u => (
                              <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px 8px" }}>{u.name || "--"}</td>
                                <td style={{ padding: "12px 8px" }}>{u.email}</td>
                                 <td style={{ padding: "12px 8px" }}>
                                  <select 
                                    value={pendingUserUpdates[u.id]?.department !== undefined ? pendingUserUpdates[u.id].department : (u.department || "")}
                                    onChange={(e) => handleUpdateUserDepartment(u.id, e.target.value)}
                                    style={{ padding: "6px 12px", borderRadius: "6px", border: pendingUserUpdates[u.id]?.department !== undefined ? "2px solid #10b981" : "1px solid #cbd5e1", width: "100%", maxWidth: "150px" }}
                                  >
                                    <option value="">Select Dept</option>
                                    {settings.masterDepartments.split(',').filter(d => d.trim()).map(dept => (
                                      <option key={dept.trim()} value={dept.trim()}>{dept.trim()}</option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: "12px 8px" }}>
                                  <select 
                                    value={pendingUserUpdates[u.id]?.role !== undefined ? pendingUserUpdates[u.id].role : (u.role || "USER")}
                                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                    style={{ padding: "6px 12px", borderRadius: "6px", border: pendingUserUpdates[u.id]?.role !== undefined ? "2px solid #10b981" : "1px solid #cbd5e1" }}
                                  >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                  </select>
                                </td>
                                <td style={{ padding: "12px 8px" }}>
                                  <div 
                                    onClick={() => {
                                      const currentVal = pendingUserUpdates[u.id]?.isSuspended !== undefined ? pendingUserUpdates[u.id].isSuspended : ((u as any).isSuspended || false);
                                      handleUpdateUserSuspension(u.id, !currentVal);
                                    }}
                                    style={{ 
                                      width: "44px", 
                                      height: "22px", 
                                      background: (pendingUserUpdates[u.id]?.isSuspended !== undefined ? pendingUserUpdates[u.id].isSuspended : (u as any).isSuspended) ? "#ef4444" : "#10b981", 
                                      borderRadius: "11px", 
                                      position: "relative", 
                                      cursor: "pointer", 
                                      transition: "all 0.2s ease",
                                      display: "flex",
                                      alignItems: "center",
                                      padding: "0 2px",
                                      boxSizing: "border-box",
                                      justifyContent: (pendingUserUpdates[u.id]?.isSuspended !== undefined ? pendingUserUpdates[u.id].isSuspended : (u as any).isSuspended) ? "flex-end" : "flex-start"
                                    }}
                                  >
                                    <div style={{ width: "18px", height: "18px", background: "white", borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}></div>
                                    <span style={{ 
                                      position: "absolute", 
                                      left: (pendingUserUpdates[u.id]?.isSuspended !== undefined ? pendingUserUpdates[u.id].isSuspended : (u as any).isSuspended) ? "6px" : "24px", 
                                      fontSize: "8px", 
                                      color: "white", 
                                      fontWeight: 800,
                                      pointerEvents: "none"
                                    }}>
                                      {(pendingUserUpdates[u.id]?.isSuspended !== undefined ? pendingUserUpdates[u.id].isSuspended : (u as any).isSuspended) ? "HOLD" : "LIVE"}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                    <button 
                                      onClick={() => handleResetUserPassword(u.id, u.name)}
                                      style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
                                      title="Reset Password"
                                      onMouseOver={e => e.currentTarget.style.background = "#eff6ff"}
                                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                    >
                                      <Key size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveUser(u.id)}
                                      style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
                                      title="Remove User"
                                      onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                                      onMouseOut={e => e.currentTarget.style.color = "#94a3b8"}
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeOptionsTab === 'EDIT_REQUESTS' && (
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                      <button 
                        onClick={() => setEditRequestSubTab('TASK_EDIT')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: editRequestSubTab === 'TASK_EDIT' ? "#2563eb" : "#f1f5f9",
                          color: editRequestSubTab === 'TASK_EDIT' ? "white" : "#64748b",
                          fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <LayoutDashboard size={16} /> Edit Task
                        {tasks.filter(t => t.editRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'TASK_EDIT' ? "white" : "#ef4444", color: editRequestSubTab === 'TASK_EDIT' ? "#2563eb" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {tasks.filter(t => t.editRequested).length}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => setEditRequestSubTab('TASK_DELETE')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: editRequestSubTab === 'TASK_DELETE' ? "#ef4444" : "#f1f5f9",
                          color: editRequestSubTab === 'TASK_DELETE' ? "white" : "#64748b",
                          fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <Trash2 size={16} /> Delete Task
                        {tasks.filter(t => t.deleteRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'TASK_DELETE' ? "white" : "#ef4444", color: editRequestSubTab === 'TASK_DELETE' ? "#ef4444" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {tasks.filter(t => t.deleteRequested).length}
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
                        <BookOpen size={16} /> Edit LO
                        {los.filter(l => l.editRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'LO' ? "white" : "#ef4444", color: editRequestSubTab === 'LO' ? "#2563eb" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {los.filter(l => l.editRequested).length}
                          </span>
                        )}
                      </button>
                    </div>

                    {editRequestSubTab === 'TASK_EDIT' ? (
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
                              <div key={`task-edit-${task.id}`} style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
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
                    ) : editRequestSubTab === 'TASK_DELETE' ? (
                      <div>
                        <h3 style={{ margin: "0 0 16px 0", color: "#0f172a" }}>Pending Task Deletion Requests</h3>
                        <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "0.875rem" }}>Review and manage requests from users to permanently delete tasks.</p>
                        
                        {tasks.filter(t => t.deleteRequested).length === 0 ? (
                          <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                            <p style={{ color: "#64748b", margin: 0 }}>No pending task deletion requests.</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {tasks.filter(t => t.deleteRequested).map(task => (
                              <div key={`task-del-${task.id}`} style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                  <div>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: "#0f172a" }}>Task #{task.id}: {task.taskName}</h4>
                                    <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                                      Requested by: <strong style={{ color: "#0f172a" }}>{task.ownerName}</strong>
                                    </p>
                                  </div>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    <button 
                                      onClick={() => handleApproveDelete(task.id, 'APPROVE')}
                                      style={{ background: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}
                                    >
                                      Approve Delete
                                    </button>
                                    <button 
                                      onClick={() => handleApproveDelete(task.id, 'REJECT')}
                                      style={{ background: "#64748b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" }}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                                <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "8px", fontSize: "0.875rem", borderLeft: "4px solid #ef4444" }}>
                                  <strong>Reason:</strong> {task.deleteRequestReason}
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
                        </div>
                      )}
                    </div>
                  )}

                {activeOptionsTab === 'MASTER_DATA' && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                      <h3 style={{ margin: 0, color: "#0f172a" }}>Master Data Hub</h3>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ padding: "8px 24px", background: "#2563eb", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, cursor: isSavingSettings ? "not-allowed" : "pointer" }}
                      >
                        {isSavingSettings ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                    <p style={{ color: "#64748b", marginBottom: "32px", fontSize: "0.875rem" }}>
                      Manage the global dropdown lists used across all forms (Task Submission, LO Identification, etc.). 
                      Changes here will reflect instantly across the entire platform.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                      {/* Departments */}
                      <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#0f172a" }}>
                          <Users size={18} color="#3b82f6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Departments</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {settings.masterDepartments.split(',').filter(d => d.trim()).map((dept, idx) => (
                              <div key={idx} style={{ background: "white", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {dept.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterDepartments.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterDepartments: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add department..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    setSettings({...settings, masterDepartments: (settings.masterDepartments || "") + (settings.masterDepartments?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...inputStyle, padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Entities */}
                      <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#0f172a" }}>
                          <Building2 size={18} color="#f59e0b" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Entities</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {settings.masterEntities.split(',').filter(e => e.trim()).map((ent, idx) => (
                              <div key={idx} style={{ background: "white", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {ent.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterEntities.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterEntities: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add entity..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    setSettings({...settings, masterEntities: (settings.masterEntities || "") + (settings.masterEntities?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...inputStyle, padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Task Types */}
                      <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#0f172a" }}>
                          <Tag size={18} color="#10b981" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Task Type</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {settings.masterTaskTypes.split(',').filter(t => t.trim()).map((type, idx) => (
                              <div key={idx} style={{ background: "white", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {type.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterTaskTypes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterTaskTypes: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add task type..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    setSettings({...settings, masterTaskTypes: (settings.masterTaskTypes || "") + (settings.masterTaskTypes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...inputStyle, padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>
                      {/* Communication Modes */}
                      <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#0f172a" }}>
                          <Send size={18} color="#8b5cf6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Communication Modes</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterCommunicationModes || "").split(',').filter(t => t.trim()).map((mode, idx) => (
                              <div key={idx} style={{ background: "white", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {mode.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterCommunicationModes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterCommunicationModes: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add mode..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    setSettings({...settings, masterCommunicationModes: (settings.masterCommunicationModes || "") + (settings.masterCommunicationModes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...inputStyle, padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Request Types */}
                      <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#0f172a" }}>
                          <FileText size={18} color="#8b5cf6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Finance Functions</h4>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0 0 12px 0" }}>Used in Inter Department Request form.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterRequestTypes || "").split(',').filter(t => t.trim()).map((type, idx) => (
                              <div key={idx} style={{ background: "white", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {type.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterRequestTypes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterRequestTypes: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add finance function..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    setSettings({...settings, masterRequestTypes: (settings.masterRequestTypes || "") + (settings.masterRequestTypes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...inputStyle, padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                    </div>
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

                {activeOptionsTab === 'MATRICES' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ margin: 0 }}>Matrix Module</h3>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "#10b981", color: "white", padding: "10px 20px", borderRadius: "10px", border: "none", cursor: isSavingSettings ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)" }}
                      >
                        <ShieldCheck size={18} /> {isSavingSettings ? "Saving..." : "Save Matrix Changes"}
                      </button>
                    </div>

                    {/* Finance Team Overview */}
                    <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ padding: "8px", background: "#eff6ff", borderRadius: "10px" }}>
                          <Users size={20} color="#2563eb" />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "1.125rem", color: "#1e293b" }}>Finance Team Members</h4>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>These users are available as Authorized Allocators.</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                        {usersList.filter(u => u.department === 'Finance' && (u as any).isApproved !== false).length === 0 ? (
                          <p style={{ fontSize: "0.875rem", color: "#94a3b8", italic: "true" } as any}>No users found in Finance department.</p>
                        ) : (
                          usersList.filter(u => u.department === 'Finance' && (u as any).isApproved !== false).map(u => (
                            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.875rem" }}>
                                {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{u.name || "--"}</div>
                                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{u.email}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Matrix A: Module Access (Accordion) */}
                    <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'ACCESS' ? '' : 'ACCESS')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'ACCESS' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'ACCESS' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'ACCESS' ? "#2563eb" : "#0f172a" }}>
                          <Shield size={20} /> Matrix A : Module Access
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'ACCESS' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: "#64748b" }} />
                      </div>
                      
                      {activeMatrixTab === 'ACCESS' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: "#64748b" }}>Define which departments have access to specific modules.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>Department</th>
                                  {['Tasks', 'Requests', 'Learning', 'Recurring Activities'].map(module => (
                                    <th key={module} style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>{module}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {settings.masterDepartments.split(',').filter(d => d.trim()).map((dept) => {
                                  const matrix = JSON.parse(settings.moduleAccessMatrix || '{}');
                                  return (
                                    <tr key={dept} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "12px", fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{dept}</td>
                                      {['Tasks', 'Requests', 'Learning', 'Recurring Activities'].map(module => (
                                        <td key={module} style={{ padding: "12px", textAlign: "center" }}>
                                          <input 
                                            type="checkbox" 
                                            checked={matrix[module]?.includes(dept)} 
                                            onChange={(e) => {
                                              const current = matrix[module] || [];
                                              const updated = e.target.checked 
                                                ? [...current, dept] 
                                                : current.filter((d: string) => d !== dept);
                                              setSettings({
                                                ...settings, 
                                                moduleAccessMatrix: JSON.stringify({ ...matrix, [module]: updated })
                                              });
                                            }}
                                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Matrix B: Request Allocation (Accordion) */}
                    <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'ALLOCATION' ? '' : 'ALLOCATION')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'ALLOCATION' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'ALLOCATION' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'ALLOCATION' ? "#2563eb" : "#0f172a" }}>
                          <Users size={20} /> Matrix B : Request Allocation
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'ALLOCATION' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: "#64748b" }} />
                      </div>

                      {activeMatrixTab === 'ALLOCATION' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: "#64748b" }}>Assign authorized allocators for each type of inter-departmental request.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>Finance Function</th>
                                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>Authorized Allocator</th>
                                </tr>
                              </thead>
                              <tbody>
                                {settings.masterRequestTypes.split(',').filter(t => t.trim()).map((type) => {
                                  const matrix = JSON.parse(settings.allocationMatrix || '{}');
                                  return (
                                    <tr key={type} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "12px", fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{type}</td>
                                      <td style={{ padding: "12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                            {(() => {
                                              const allocators = Array.isArray(matrix[type]) ? matrix[type] : (matrix[type] ? [matrix[type]] : []);
                                              if (allocators.length === 0) return <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>No Allocators Assigned</span>;
                                              return allocators.map((email: string) => (
                                                <div key={email} style={{ 
                                                  background: "#f0f9ff", border: "1px solid #bae6fd", 
                                                  padding: "2px 8px", borderRadius: "6px", 
                                                  fontSize: "0.75rem", color: "#0369a1", 
                                                  display: "flex", alignItems: "center", gap: "6px" 
                                                }}>
                                                  {usersList.find(u => u.email === email)?.name || email}
                                                  <button 
                                                    onClick={() => {
                                                      const updated = allocators.filter((e: string) => e !== email);
                                                      setSettings({ ...settings, allocationMatrix: JSON.stringify({ ...matrix, [type]: updated }) });
                                                    }}
                                                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, display: "flex" }}
                                                  >
                                                    <X size={12} />
                                                  </button>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                          <select 
                                            value=""
                                            onChange={(e) => {
                                              if (!e.target.value) return;
                                              const allocators = Array.isArray(matrix[type]) ? matrix[type] : (matrix[type] ? [matrix[type]] : []);
                                              if (allocators.includes(e.target.value)) return;
                                              setSettings({
                                                ...settings,
                                                allocationMatrix: JSON.stringify({ ...matrix, [type]: [...allocators, e.target.value] })
                                              });
                                            }}
                                            style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8125rem" }}
                                          >
                                            <option value="">+ Add Allocator</option>
                                            {usersList
                                              .filter(u => u.department === 'Finance' && (u as any).isApproved !== false)
                                              .map(u => (
                                                <option key={u.email} value={u.email}>{u.name || u.email} ({u.email})</option>
                                              ))
                                            }
                                          </select>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Matrix C: Entity Controls (Accordion) */}
                    <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'ENTITY' ? '' : 'ENTITY')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'ENTITY' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'ENTITY' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'ENTITY' ? "#2563eb" : "#0f172a" }}>
                          <Briefcase size={20} /> Matrix C : Entity Controls
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'ENTITY' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: "#64748b" }} />
                      </div>
                      
                      {activeMatrixTab === 'ENTITY' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: "#64748b" }}>Control which users have access to specific entities in Task and Request forms.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>User Name / Email</th>
                                  {settings.masterEntities.split(',').filter(e => e.trim()).map(entity => (
                                    <th key={entity} style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>{entity.trim()}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {usersList.filter(u => (u as any).isApproved !== false).map((u) => {
                                  const matrix = JSON.parse(settings.entityMatrix || '{}');
                                  const userEntities = matrix[u.id] || [];
                                  return (
                                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{u.name || "--"}</div>
                                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{u.email}</div>
                                      </td>
                                      {settings.masterEntities.split(',').filter(e => e.trim()).map(entity => {
                                        const entityName = entity.trim();
                                        return (
                                          <td key={entityName} style={{ padding: "12px", textAlign: "center" }}>
                                            <input 
                                              type="checkbox" 
                                              checked={userEntities.includes(entityName)} 
                                              onChange={(e) => {
                                                const updated = e.target.checked 
                                                  ? [...userEntities, entityName] 
                                                  : userEntities.filter((en: string) => en !== entityName);
                                                setSettings({
                                                  ...settings, 
                                                  entityMatrix: JSON.stringify({ ...matrix, [u.id]: updated })
                                                });
                                              }}
                                              style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Share Report via Email</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>Send the current report as an attachment.</p>
              </div>
              <button onClick={() => setShowShareModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Recipient Email</label>
                <input 
                  type="email" 
                  placeholder="recipient@example.com"
                  value={shareData.recipientEmail}
                  onChange={e => setShareData({...shareData, recipientEmail: e.target.value})}
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>CC (Optional)</label>
                <input 
                  type="email" 
                  placeholder="manager@example.com"
                  value={shareData.ccEmail}
                  onChange={e => setShareData({...shareData, ccEmail: e.target.value})}
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Subject</label>
                <input 
                  type="text" 
                  value={shareData.subject}
                  onChange={e => setShareData({...shareData, subject: e.target.value})}
                  style={inputStyle} 
                />
              </div>

              <div style={{ padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: "12px" }}>
                <FileSpreadsheet size={24} color="#0369a1" />
                <div>
                  <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#0369a1" }}>Attachment Info</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#0ea5e9" }}>
                    {shareData.type === 'task' ? 'Task Dashboard' : 'LO Dashboard'} Export ({shareData.format.toUpperCase()})
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button 
                  onClick={() => setShowShareModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleShareReport}
                  disabled={shareLoading}
                  style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: shareLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
                >
                  {shareLoading ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "#fef2f2", borderBottom: "1px solid #fee2e2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "#fee2e2", color: "#ef4444", padding: "10px", borderRadius: "12px" }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#991b1b" }}>Reject Request</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#b91c1c", opacity: 0.8 }}>Please provide a reason for rejection.</p>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} style={{ background: "white", border: "1px solid #fee2e2", color: "#ef4444", cursor: "pointer", width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Rejection Reason</label>
              <textarea 
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ ...inputStyle, minHeight: "120px", resize: "none", padding: "12px" }} 
              />
              
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button 
                  onClick={() => setShowRejectModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRejectExtRequest}
                  disabled={!rejectReason.trim()}
                  style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#ef4444", color: "white", fontWeight: 600, cursor: !rejectReason.trim() ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.2)" }}
                >
                  Confirm Rejection
                </button>
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
            </>
          )}
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

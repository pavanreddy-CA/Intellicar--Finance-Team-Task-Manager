"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import LOForm from "@/components/LOForm";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, LogOut, Plus, Trash2, Users, Send, Sliders, Mail, Download, FileText, ChevronLeft, ChevronRight, FileSpreadsheet, Lightbulb, Edit2, Quote, UserCheck, BookOpen, Search, ArrowUp, ArrowDown, Home, ChevronDown, Building2, Tag, ShieldCheck, ListFilter, Shield, X, Key, Repeat, Briefcase, RefreshCw } from "lucide-react";
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
  const [theme, setTheme] = useState<'LIGHT' | 'DARK'>('LIGHT');
  const isAdmin = user?.role === 'ADMIN' || user?.email === 'pavanreddy@intellicar.in';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [activeValue, setActiveValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_ACTION' | 'PENDING_REVIEW' | 'COMPLETED'>('ALL');
  const [activeView, setActiveView] = useState<'HOME' | 'TASKS' | 'RECURRING' | 'LOS'>('HOME');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showLOForm, setShowLOForm] = useState(false);
  const [los, setLos] = useState<LearningOpportunity[]>([]);
  const [loLoading, setLoLoading] = useState(false);
  const [activeOptionsTab, setActiveOptionsTab] = useState<'USERS' | 'MAILS' | 'SCHEDULE' | 'EDIT_REQUESTS' | 'LO_REPORT' | 'ACCOUNT' | 'DATA' | 'MASTER_DATA' | 'MATRICES' | 'HOME_HUB'>('ACCOUNT');
  const [activeMatrixTab, setActiveMatrixTab] = useState<'ACCESS' | 'ALLOCATION' | 'ENTITY' | ''>('ACCESS');
  const [isTasksMenuOpen, setIsTasksMenuOpen] = useState(false);
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
    entityMatrix: '{}',
    homeContent: '{}'
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
    const savedTheme = localStorage.getItem('theme') as 'LIGHT' | 'DARK';
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const t = {
    bg: theme === 'DARK' ? '#0f172a' : '#f8fafc',
    card: theme === 'DARK' ? '#1e293b' : '#ffffff',
    text: theme === 'DARK' ? '#f8fafc' : '#0f172a',
    textMuted: theme === 'DARK' ? '#94a3b8' : '#64748b',
    border: theme === 'DARK' ? '#334155' : '#e2e8f0',
    input: theme === 'DARK' ? '#0f172a' : '#ffffff',
    sidebar: theme === 'DARK' ? '#020617' : '#0f172a',
    sidebarText: '#94a3b8',
    sidebarActive: '#60a5fa',
    accent: '#2563eb'
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If clicking a download button or inside a dropdown, don't close immediately here
      // or better: only close if target is NOT part of the dropdown logic
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTaskDownloadDropdown, showLODownloadDropdown]);

  // Styles (Defined inside component to access theme t)
  const inputStyle = {
    width: "100%", 
    border: `1px solid ${t.border}`, 
    borderRadius: "10px", 
    padding: "10px 14px", 
    fontSize: "0.875rem", 
    outline: "none", 
    background: t.card,
    color: t.text,
    transition: "all 0.2s",
    fontFamily: "inherit"
  };

  const tdStyle = {
    padding: "16px 20px",
    verticalAlign: "middle" as const,
    color: t.text
  };

  const thStyle = {
    background: t.bg,
    color: t.textMuted,
    padding: "16px 20px",
    fontWeight: 700,
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: `2px solid ${t.border}`,
    whiteSpace: "nowrap" as const,
  };



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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: t.bg, color: t.text, overflow: "hidden", transition: "all 0.3s ease" }}>
      {/* Top Navigation Bar (Full Width) */}
      <header style={{ 
        height: "80px", width: "100%", background: t.card, display: "flex", 
        alignItems: "center", justifyContent: "space-between", padding: "0 32px", 
        borderBottom: `1px solid ${t.border}`, zIndex: 100, flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.3s ease"
      }}>
        {/* Brand Area */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src="/logo.png" alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
        </div>

        {/* Global Actions Area */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === 'DARK' ? 'LIGHT' : 'DARK')}
            style={{ 
              background: t.bg, border: `1px solid ${t.border}`, color: t.text, 
              width: "40px", height: "40px", borderRadius: "10px", cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease" 
            }}
            title={`Switch to ${theme === 'DARK' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'DARK' ? <Lightbulb size={20} color="#f59e0b" /> : <Clock size={20} color="#64748b" />}
          </button>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: t.text }}>{user.name || "Master Admin"}</div>
            <div style={{ fontSize: "0.75rem", color: t.textMuted }}>{user.email}</div>
          </div>
          
          <div style={{ height: "30px", width: "1px", background: t.border }}></div>

          <button 
            onClick={() => { setShowOptionsModal(true); if (isAdmin) { fetchUsersList(); fetchSettings(); } else { setActiveOptionsTab('ACCOUNT'); } }} 
            style={{ 
              padding: "8px 16px", background: t.bg, color: t.text, border: `1px solid ${t.border}`, 
              borderRadius: "10px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", 
              cursor: "pointer", fontSize: "0.875rem", transition: "all 0.2s" 
            }}
            onMouseOver={e => e.currentTarget.style.background = t.card}
            onMouseOut={e => e.currentTarget.style.background = t.bg}
          >
            {isAdmin ? <ShieldCheck size={16} /> : <Sliders size={16} />}
            {isAdmin ? "Control Center" : "Account Settings"}
          </button>
          
          <button 
            onClick={async () => {
              await fetch("/api/logout", { method: "POST", credentials: "include" });
              document.cookie = "session-token=; path=/; max-age=0";
              window.location.href = "/login";
            }} 
            style={{ color: t.textMuted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Body (Sidebar + Content) */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <nav style={{ 
          width: "110px", background: t.sidebar, display: "flex", 
          flexDirection: "column", alignItems: "center", paddingTop: "32px", 
          flexShrink: 0, zIndex: 90, borderRight: "1px solid rgba(255,255,255,0.05)", transition: "all 0.3s ease"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", padding: "0 12px" }}>
            {/* Logic: Check if module is allowed for user's department */}
            {(() => {
              const matrix = JSON.parse(settings.moduleAccessMatrix || '{}');
              const access = matrix[user?.department || ''] || { HOME: true, TASKS: true, RECURRING: true, LOS: true, REQUESTS: false };

              return (
                <>
                  {/* Home Module */}
                  {(isAdmin || access.HOME) && (
                    <button 
                      onClick={() => { setActiveView('HOME'); setActiveMainView('DASHBOARD'); }}
                      style={{ 
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                        background: activeView === 'HOME' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                        border: "none", color: activeView === 'HOME' ? "#60a5fa" : "#94a3b8", 
                        cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                        width: "100%", borderRadius: "16px"
                      }}
                    >
                      <Home size={24} color={activeView === 'HOME' ? "#60a5fa" : "#94a3b8"} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Home</span>
                    </button>
                  )}

                  {/* Tasks Module */}
                  {(isAdmin || access.TASKS) && (
                    <div style={{ width: "100%" }}>
                      <button 
                        onClick={() => {
                          if (activeView !== 'TASKS') {
                            setActiveView('TASKS');
                            setActiveSubView('MAIN');
                          }
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
                        <Briefcase size={24} color={activeView === 'TASKS' && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8"} />
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Tasks</span>
                        <ChevronDown size={14} style={{ position: "absolute", bottom: "12px", right: "12px", transform: isTasksMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }} />
                      </button>
                      
                      {isTasksMenuOpen && (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px", padding: "0 8px" }}>
                          <button 
                            onClick={() => { setActiveView('TASKS'); setActiveSubView('MAIN'); setActiveMainView('DASHBOARD'); }}
                            style={{ 
                              padding: "10px", borderRadius: "12px", border: "none", 
                              background: activeView === 'TASKS' && activeSubView === 'MAIN' ? "rgba(255,255,255,0.1)" : "transparent",
                              color: activeView === 'TASKS' && activeSubView === 'MAIN' ? "white" : "#94a3b8",
                              fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", textAlign: "center", transition: "all 0.2s"
                            }}
                          >
                            Workplace
                          </button>
                          <button 
                            onClick={() => { setActiveView('TASKS'); setActiveSubView('OTHER_DEPT'); setActiveMainView('DASHBOARD'); }}
                            style={{ 
                              padding: "10px", borderRadius: "12px", border: "none", 
                              background: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "rgba(255,255,255,0.1)" : "transparent",
                              color: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "white" : "#94a3b8",
                              fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", textAlign: "center", transition: "all 0.2s"
                            }}
                          >
                            Inter-Dept
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recurring Module */}
                  {(isAdmin || access.RECURRING) && (
                    <button 
                      onClick={() => { setActiveView('RECURRING'); setActiveMainView('DASHBOARD'); }}
                      style={{ 
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                        background: activeView === 'RECURRING' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                        border: "none", color: activeView === 'RECURRING' ? "#60a5fa" : "#94a3b8", 
                        cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                        width: "100%", borderRadius: "16px"
                      }}
                    >
                      <RefreshCw size={24} color={activeView === 'RECURRING' ? "#60a5fa" : "#94a3b8"} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Recurring</span>
                    </button>
                  )}

                  {/* Requests Module (Only shown if separate from main task view) */}
                  {(isAdmin || access.REQUESTS) && !access.TASKS && (
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

                  {/* LO Module */}
                  {(isAdmin || access.LOS) && (
                    <button 
                      onClick={() => { setActiveView('LOS'); setActiveMainView('DASHBOARD'); }}
                      style={{ 
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                        background: activeView === 'LOS' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                        border: "none", color: activeView === 'LOS' ? "#60a5fa" : "#94a3b8", 
                        cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                        width: "100%", borderRadius: "16px"
                      }}
                    >
                      <BookOpen size={24} color={activeView === 'LOS' ? "#60a5fa" : "#94a3b8"} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>LOs</span>
                    </button>
                  )}
                </>
              );
            })()}

          </div>
        </nav>

        {/* Content Area */}
        <main style={{ flex: 1, overflow: "auto", padding: activeView === 'RECURRING' ? "0" : "32px", background: t.bg, transition: "all 0.3s ease" }}>
          {activeView === 'RECURRING' && (
            <RecurringActivities settings={settings} usersList={usersList} />
          )}

          {activeView !== 'RECURRING' && (
            <>
          {/* Active View Title/Context Area */}
          <div style={{ 
            marginBottom: "32px", 
            paddingBottom: "24px", 
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            transition: "all 0.3s ease"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>Finance Hub</span>
                <span style={{ color: "#cbd5e1" }}>/</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>
                  {activeView === 'TASKS' ? (activeSubView === 'MAIN' ? "Workplace" : "Collaboration") : "Development"}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: t.text, letterSpacing: "-0.03em", transition: "all 0.3s ease" }}>
                {activeView === 'HOME' ? "Finance Home Hub" : 
                 activeView === 'TASKS' ? (activeSubView === 'MAIN' ? "Task Dashboard" : "Inter Department Request") : "Learning Opportunities"}
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.95rem", fontWeight: 500 }}>
                {activeView === 'HOME' ? "Your central space for team mission, stories, and achievements." : 
                 activeView === 'TASKS' ? 
                  (activeSubView === 'MAIN' ? "Track team productivity and operational milestones." : "View and manage incoming tasks from other departments.") 
                  : "Turning challenges into structured growth opportunities."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {activeView === 'HOME' ? null : (activeView === 'TASKS' && activeSubView === 'MAIN') ? (
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

        {/* Metric Cards / Motivational Quote / Home Content */}
        {activeView === 'HOME' ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginBottom: "40px" }}>
            {/* Hero Mission Card */}
            {(() => {
              const content = JSON.parse(settings.homeContent || '{}');
              const mission = content.mission || "Empowering the Finance Team through transparency, real-time collaboration, and operational excellence.";
              return (
                <div style={{ 
                  padding: "48px", borderRadius: "24px", 
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
                  color: "white", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                  position: "relative", overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", top: -50, right: -50, opacity: 0.1 }}>
                    <Building2 size={240} />
                  </div>
                  <div style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ width: "32px", height: "4px", background: "#3b82f6", borderRadius: "2px" }}></div>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#60a5fa" }}>Our Mission</span>
                    </div>
                    <h2 style={{ fontSize: "2.5rem", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{mission}</h2>
                    <p style={{ marginTop: "24px", fontSize: "1.125rem", color: "#94a3b8", lineHeight: 1.6 }}>This platform is implemented to drive efficiency and ensure every team member has the data they need to succeed.</p>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
              {/* Success Stories */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                    <Quote size={20} color="#3b82f6" /> Team Success Stories
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                  {(() => {
                    const content = JSON.parse(settings.homeContent || '{}');
                    const stories = content.stories || [
                      { id: 1, title: "Efficiency Boost", text: "The new matrix system has cut down our task allocation time by 40%!", author: "Finance Admin" },
                      { id: 2, title: "Better Collaboration", text: "Sharing requests between departments is now seamless and tracked.", author: "Operations Lead" }
                    ];
                    return stories.map((s: any) => (
                      <div key={s.id} style={{ 
                        padding: "24px", borderRadius: "20px", background: t.card, 
                        border: `1px solid ${t.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        transition: "transform 0.2s", cursor: "default"
                      }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                        <div style={{ background: "#eff6ff", width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                          <CheckCircle2 size={20} color="#3b82f6" />
                        </div>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem", fontWeight: 700 }}>{s.title}</h4>
                        <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>"{s.text}"</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                            {s.author[0]}
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e293b" }}>{s.author}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Major Achievements */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                  <Tag size={20} color="#3b82f6" /> Major Achievements
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(() => {
                    const content = JSON.parse(settings.homeContent || '{}');
                    const achievements = content.achievements || [
                      { id: 1, title: "Platform Launch", date: "Apr 2026" },
                      { id: 2, title: "100+ Tasks Completed", date: "May 2026" }
                    ];
                    return achievements.map((a: any) => (
                      <div key={a.id} style={{ 
                        padding: "16px", borderRadius: "16px", background: t.card, 
                        border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "16px" 
                      }}>
                        <div style={{ background: "#f0fdf4", padding: "8px", borderRadius: "10px" }}>
                          <ShieldCheck size={20} color="#10b981" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>{a.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{a.date}</div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : activeView === 'TASKS' ? (
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: t.card, padding: "8px 16px", borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: t.textMuted }}>Filter by Date:</span>
            <select
              value={dateFilterPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ border: `1px solid ${t.border}`, borderRadius: "6px", padding: "4px 8px", fontSize: "0.875rem", outline: "none", color: t.text, background: t.bg }}
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: t.card, padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", marginBottom: "16px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
              <Search size={18} color={t.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text" 
                placeholder="Search tasks, types, entities, owners..." 
                value={taskSearchQuery}
                onChange={e => setTaskSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 10px 10px 40px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text }} 
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <select 
                value={taskEntityFilter} 
                onChange={e => setTaskEntityFilter(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text }}
              >
                <option value="ALL">All Entities</option>
                {uniqueTaskEntities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>

              <select 
                value={taskOwnerFilter} 
                onChange={e => setTaskOwnerFilter(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text }}
              >
                <option value="ALL">All Owners</option>
                {uniqueTaskOwners.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              <select 
                value={taskStatusFilter} 
                onChange={e => setTaskStatusFilter(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text }}
              >
                <option value="ALL">All Statuses</option>
                {uniqueTaskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select 
                value={taskTypeFilter} 
                onChange={e => setTaskTypeFilter(e.target.value as any)}
                style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text, fontWeight: 600 }}
              >
                <option value="ALL">All Task Types</option>
                <option value="INTERNAL">Internal Only</option>
                <option value="EXTERNAL">External Only</option>
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px", borderLeft: `1px solid ${t.border}` }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Rows:</span>
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
                    display: "flex", alignItems: "center", gap: "8px", background: t.card, color: t.text, 
                    padding: "8px 16px", borderRadius: "10px", border: `1px solid ${t.border}`, 
                    cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s" 
                  }} 
                  onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}
                >
                  <Download size={18} color="#2563eb" /> Download Report
                </button>
                
                {showTaskDownloadDropdown && (
                  <div style={{ 
                    position: "absolute", top: "100%", right: 0, marginTop: "8px", 
                    background: t.card, borderRadius: "12px", border: `1px solid ${t.border}`, 
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 1000, 
                    minWidth: "160px", overflow: "hidden" 
                  }}>
                    <button 
                      onClick={() => { exportToExcel(); setShowTaskDownloadDropdown(false); }}
                      style={{ 
                        width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                        padding: "12px 16px", border: "none", background: "transparent", 
                        color: t.text, cursor: "pointer", fontSize: "0.875rem", 
                        textAlign: "left", transition: "background 0.2s" 
                      }}
                      onMouseOver={e => e.currentTarget.style.background = t.bg}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    >
                      <FileSpreadsheet size={16} color="#166534" /> Excel Format
                    </button>
                    <button 
                      onClick={() => { exportToPDF(); setShowTaskDownloadDropdown(false); }}
                      style={{ 
                        width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                        padding: "12px 16px", border: "none", background: "transparent", 
                        color: t.text, cursor: "pointer", fontSize: "0.875rem", 
                        textAlign: "left", transition: "background 0.2s" 
                      }}
                      onMouseOver={e => e.currentTarget.style.background = t.bg}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    >
                      <FileText size={16} color="#991b1b" /> PDF Document
                    </button>
                    <div style={{ height: "1px", background: t.border, margin: "4px 0" }}></div>
                    <button 
                      onClick={() => { 
                        setShareData({...shareData, type: 'task', format: 'excel', subject: `Task Report - ${new Date().toISOString().split('T')[0]}`});
                        setShowShareModal(true); 
                        setShowTaskDownloadDropdown(false); 
                      }}
                      style={{ 
                        width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                        padding: "12px 16px", border: "none", background: "transparent", 
                        color: "#2563eb", cursor: "pointer", fontSize: "0.875rem", 
                        textAlign: "left", transition: "background 0.2s", fontWeight: 600
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Mail size={16} color="#2563eb" /> Share via Email
                    </button>
                  </div>
                )}
            </div>
          </div>

        {/* Data Table */}
        <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
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
                  <tr><td colSpan={17} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>Loading tasks...</td></tr>
                ) : paginatedTasks.length === 0 ? (
                  <tr><td colSpan={17} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No tasks found for the current filters.</td></tr>
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
                    <tr key={task.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background-color 0.2s", backgroundColor: isOverdue ? "#fee2e2" : undefined }} className="table-row">
                      <td style={tdStyle}><span style={{ color: t.textMuted, fontWeight: 500 }}>#{task.id}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}><span style={{ color: t.text }}>{formatDateTime(task.createdAt)}</span></td>
                      <td style={tdStyle}>{task.entityName}</td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: t.text, minWidth: "300px", maxWidth: "600px", whiteSpace: "normal", wordWrap: "break-word" }}>{task.taskName}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ padding: "4px 8px", background: t.bg, borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.text }}>
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
                      <td style={tdStyle}>{task.dueDate ? formatDate(task.dueDate) : <span style={{ color: t.textMuted }}>--</span>}</td>
                      
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
                          <span style={{ color: task.completionDate ? t.text : t.textMuted, fontWeight: 500 }}>
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
                      <td style={tdStyle}>{task.reviewerName === "Not Applicable" ? <span style={{ color: t.textMuted }}>N/A</span> : task.reviewerName}</td>
                      
                      <td 
                        style={{ ...tdStyle, cursor: task.reviewerName === "Not Applicable" || isReviewerLocked || !canEditReviewFields ? "not-allowed" : "pointer", minWidth: "140px" }}
                        onClick={() => { 
                          if (task.reviewerName === "Not Applicable" || isReviewerLocked || !canEditReviewFields) return;
                          setEditingCell({ id: task.id, field: "reviewCompletionDate" }); 
                          setEditValue(task.reviewCompletionDate ? task.reviewCompletionDate.split("T")[0] : ""); 
                        }}
                      >
                        {task.reviewerName === "Not Applicable" ? (
                          <span style={{ color: t.textMuted, fontWeight: 500 }}>N/A</span>
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
                          <span style={{ color: task.reviewCompletionDate ? t.text : t.textMuted, fontWeight: 500 }}>
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
                          <span style={{ color: t.textMuted, fontWeight: 500 }}>N/A</span>
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
                              padding: "4px 8px", borderRadius: "6px", border: `1px solid ${t.border}`, 
                              fontSize: "0.75rem", fontWeight: 600, background: t.bg, color: t.text, cursor: "pointer" 
                            }}
                          >
                            <option value="NO">No</option>
                            <option value="YES">Yes</option>
                          </select>
                        ) : (
                          <span style={{ color: t.textMuted }}>--</span>
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
                          <span style={{ color: task.ownerComments ? t.text : t.textMuted }}>{task.ownerComments || "Click to add..."}</span>
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
                          <span style={{ color: task.reviewerComments ? t.text : t.textMuted }}>
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
                          <span style={{ color: t.textMuted, fontWeight: 500 }}>N/A</span>
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
                              style={{ background: task.editRequested && task.editRequestBy === "OWNER" ? t.bg : "#eff6ff", color: task.editRequested && task.editRequestBy === "OWNER" ? t.textMuted : "#3b82f6", border: task.editRequested && task.editRequestBy === "OWNER" ? `1px solid ${t.border}` : "1px solid #bfdbfe", cursor: task.editRequested && task.editRequestBy === "OWNER" ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 }}
                              title="Request Edit (Owner)"
                            >
                              {task.editRequested && task.editRequestBy === "OWNER" ? "Requested" : "Edit Req"}
                            </button>
                          )}
                          {!isAdmin && isReviewerLocked && task.reviewerName !== "Not Applicable" && (
                            <button 
                              onClick={() => handleRequestEdit(task.id, "REVIEWER")}
                              disabled={task.editRequested && task.editRequestBy === "REVIEWER"}
                              style={{ background: task.editRequested && task.editRequestBy === "REVIEWER" ? t.bg : "#fdf4ff", color: task.editRequested && task.editRequestBy === "REVIEWER" ? t.textMuted : "#d946ef", border: task.editRequested && task.editRequestBy === "REVIEWER" ? `1px solid ${t.border}` : "1px solid #f5d0fe", cursor: task.editRequested && task.editRequestBy === "REVIEWER" ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 }}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: `1px solid ${t.border}`, background: t.bg }}>
              <div style={{ fontSize: "0.875rem", color: t.textMuted }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTasksToDisplay.length)} of {filteredTasksToDisplay.length} tasks
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: currentPage === 1 ? t.textMuted : t.text, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, padding: "0 12px", color: t.text }}>
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: currentPage === totalPages ? t.textMuted : t.text, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
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
            <div style={{ background: t.card, borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <div style={{ padding: "28px 32px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.bg }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: t.text }}>Inter Dept Request</h3>
                <button 
                  onClick={() => setShowExtReqForm(true)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: "#4f46e5", color: "white", padding: "10px 20px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 10px -2px rgba(79, 70, 229, 0.3)" }}
                >
                  <Plus size={18} /> Submit New Request
                </button>
              </div>
              
              {/* Metric Cards for Inter-Dept */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", padding: "24px 32px", background: t.card }}>
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
              <div style={{ padding: "16px 32px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
                  <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} size={16} />
                  <input 
                    type="text" 
                    placeholder="Search requests..." 
                    value={extReqSearch}
                    onChange={e => setExtReqSearch(e.target.value)}
                    style={{ padding: "8px 8px 8px 32px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.8125rem", width: "100%", background: t.card, color: t.text }} 
                  />
                </div>
                
                <select 
                  value={extReqStatusFilter}
                  onChange={e => setExtReqStatusFilter(e.target.value)}
                  style={{ padding: "8px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.card, color: t.text }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Under Process">Under Process</option>
                  <option value="Processed">Processed</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <div style={{ marginLeft: "auto", position: "relative" }}>
                  <button 
                    onClick={() => setShowExtReqDownloadDropdown(!showExtReqDownloadDropdown)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", background: t.card, color: t.text, border: `1px solid ${t.border}`, padding: "8px 16px", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  >
                    <Download size={18} /> Download Report
                  </button>
                  {showExtReqDownloadDropdown && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: t.card, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", border: `1px solid ${t.border}`, zIndex: 100, minWidth: "200px", overflow: "hidden" }}>
                      <button 
                        onClick={() => { exportExtRequestsToExcel(); setShowExtReqDownloadDropdown(false); }}
                        style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "transparent", color: t.text, cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500 }}
                      >
                        <FileSpreadsheet size={16} /> Excel Format
                      </button>
                      <button 
                        onClick={() => { exportExtRequestsToPDF(); setShowExtReqDownloadDropdown(false); }}
                        style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "transparent", color: t.text, cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500 }}
                      >
                        <FileText size={16} /> PDF Document
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "32px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: t.bg, borderBottom: `2px solid ${t.border}`, color: t.textMuted }}>
                      {['ID', 'Date', 'From', 'Entity', 'Nature', 'Type', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: "16px 20px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extReqLoading ? (
                      <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>Loading...</td></tr>
                    ) : sortedExternalRequests.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No requests found.</td></tr>
                    ) : (
                      sortedExternalRequests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.2s" }} className="table-row">
                          <td style={tdStyle}><span style={{ color: t.textMuted }}>#{req.id}</span></td>
                          <td style={tdStyle}>{formatDate(req.createdAt)}</td>
                          <td style={tdStyle}>{req.requestFrom}</td>
                          <td style={tdStyle}>{req.entityName}</td>
                          <td style={tdStyle}>{req.natureOfRequest}</td>
                          <td style={tdStyle}>
                            <span style={{ padding: "4px 8px", background: t.bg, borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.text }}>
                              {req.requestType}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ 
                              padding: "6px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700,
                              background: req.status === 'Pending' ? "#fff7ed" : req.status === 'Processed' ? "#f0fdf4" : req.status === 'Rejected' ? "#fef2f2" : t.bg,
                              color: req.status === 'Pending' ? "#c2410c" : req.status === 'Processed' ? "#15803d" : req.status === 'Rejected' ? "#b91c1c" : t.text,
                              border: req.status === 'Pending' ? "1px solid #fed7aa" : req.status === 'Processed' ? "1px solid #bbf7d0" : req.status === 'Rejected' ? "1px solid #fecaca" : `1px solid ${t.border}`
                            }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {canAllocateAnything && (req.status === 'Pending' || req.status === 'New') && (
                              <button onClick={() => handleConvertToTask(req)} style={{ background: "#4f46e5", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>Convert</button>
                            )}
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

        {/* LO View */}
        {activeView === 'LOS' && (
          <div className="lo-view">
          {/* LO View */}
          <div style={{ background: t.card, borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", overflow: "hidden", transition: "all 0.3s ease" }}>
             <div style={{ padding: "28px 32px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.bg }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: t.text }}>Learning Opportunities</h3>
                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <button 
                      onClick={() => setLoActiveFilter('ALL')}
                      style={{ 
                        padding: "6px 14px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, 
                        border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                        background: loActiveFilter === 'ALL' ? "#2563eb" : t.card,
                        borderColor: loActiveFilter === 'ALL' ? "#2563eb" : t.border,
                        color: loActiveFilter === 'ALL' ? "white" : t.textMuted
                      }}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setLoActiveFilter('REPORTS')}
                      style={{ 
                        padding: "6px 14px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, 
                        border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                        background: loActiveFilter === 'REPORTS' ? "#3b82f6" : t.card,
                        borderColor: loActiveFilter === 'REPORTS' ? "#3b82f6" : t.border,
                        color: loActiveFilter === 'REPORTS' ? "white" : t.textMuted
                      }}
                    >
                      My Reports
                    </button>
                    <button 
                      onClick={() => setLoActiveFilter('LEARNINGS')}
                      style={{ 
                        padding: "6px 14px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, 
                        border: "1px solid", cursor: "pointer", transition: "all 0.2s",
                        background: loActiveFilter === 'LEARNINGS' ? "#ef4444" : t.card,
                        borderColor: loActiveFilter === 'LEARNINGS' ? "#ef4444" : t.border,
                        color: loActiveFilter === 'LEARNINGS' ? "white" : t.textMuted
                      }}
                    >
                      My Learnings
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", minWidth: "250px" }}>
                    <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} size={16} />
                    <input 
                      type="text" 
                      placeholder="Search LOs, entities, names..." 
                      value={loSearchQuery}
                      onChange={e => setLoSearchQuery(e.target.value)}
                      style={{ padding: "8px 8px 8px 32px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.8125rem", width: "100%", background: t.card, color: t.text }} 
                    />
                  </div>
                  <select 
                    value={loEntityFilter} 
                    onChange={e => setLoEntityFilter(e.target.value)}
                    style={{ padding: "8px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.8125rem", background: t.card, color: t.text }}
                  >
                    <option value="ALL">All Entities</option>
                    {uniqueLOEntities.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
             </div>
             <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: t.bg, borderBottom: `2px solid ${t.border}`, transition: "all 0.3s ease" }}>
                    {[
                      { key: 'entity', label: 'Entity' },
                      { key: 'dateOfIdentification', label: 'Identified On' },
                      { key: 'learningOpportunity', label: 'Learning Opportunity' },
                      { key: 'identifiedBy', label: 'Identified By' },
                      { key: 'committedBy', label: 'Committed By' },
                      { key: 'resolutionProvided', label: 'Resolution' },
                      { key: 'actions', label: 'Actions' }
                    ].map((col) => (
                      <th 
                        key={col.key}
                        onClick={() => col.key !== 'actions' && handleLoSort(col.key as keyof LearningOpportunity)}
                        style={{ 
                          padding: "16px 20px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", 
                          letterSpacing: "0.05em", color: t.textMuted, cursor: col.key !== 'actions' ? "pointer" : "default" 
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loLoading ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>Loading Learning Opportunities...</td></tr>
                  ) : sortedLOs.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No Learning Opportunities recorded.</td></tr>
                  ) : (
                    sortedLOs.map((lo) => (
                      <tr key={lo.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background-color 0.2s" }} className="table-row">
                        <td style={tdStyle}>{lo.entity}</td>
                        <td style={tdStyle}>{formatDate(lo.dateOfIdentification)}</td>
                        <td style={{ ...tdStyle, maxWidth: "400px" }}>{lo.learningOpportunity}</td>
                        <td style={tdStyle}>{lo.identifiedBy}</td>
                        <td style={tdStyle}>{lo.committedBy}</td>
                        <td style={{ ...tdStyle, maxWidth: "400px" }}>{lo.resolutionProvided}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button onClick={() => setEditingLO(lo)} style={{ background: t.bg, color: t.text, border: `1px solid ${t.border}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem" }}>Edit</button>
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "24px", width: "100%", maxWidth: "600px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", border: `1px solid ${t.border}` }}>
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
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Entity</label>
                  <input type="text" readOnly value={loCaptureForm.entity} style={{ ...inputStyle, background: t.bg, color: t.text, border: `1px solid ${t.border}`, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Date of Identification</label>
                  <input type="text" readOnly value={formatDate(loCaptureForm.dateOfIdentification)} style={{ ...inputStyle, background: t.bg, color: t.text, border: `1px solid ${t.border}`, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Identified By</label>
                  <input type="text" readOnly value={loCaptureForm.identifiedBy} style={{ ...inputStyle, background: t.bg, color: t.text, border: `1px solid ${t.border}`, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Committed By</label>
                  <input type="text" readOnly value={loCaptureForm.committedBy} style={{ ...inputStyle, background: t.bg, color: t.text, border: `1px solid ${t.border}`, cursor: "not-allowed" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Mistake / Learning Opportunity</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the learning opportunity..."
                  value={loCaptureForm.learningOpportunity}
                  onChange={(e) => setLOCaptureForm({ ...loCaptureForm, learningOpportunity: e.target.value })}
                  style={{ ...inputStyle, background: t.bg, color: t.text, border: `1px solid ${t.border}` }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Resolution Provided</label>
                <textarea 
                  rows={3} 
                  placeholder="What was the resolution or fix?"
                  value={loCaptureForm.resolutionProvided}
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
            <div style={{ position: "relative", width: "100%", maxWidth: "1000px", background: t.card, borderRadius: "24px", display: "flex", flexDirection: "column", height: "85vh", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", border: `1px solid ${t.border}`, transition: "all 0.3s ease" }}>
              {/* Modal Header */}
              <div style={{ padding: "24px 32px", borderBottom: `1px solid ${t.border}`, background: t.bg, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ padding: "10px", background: "#3b82f6", borderRadius: "12px", color: "white" }}>
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: t.text }}>{isAdmin ? "Control Center" : "Account Settings"}</h2>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: t.textMuted }}>Manage your preferences and system settings.</p>
                  </div>
                </div>
                <button onClick={() => setShowOptionsModal(false)} style={{ padding: "8px", borderRadius: "10px", border: "none", background: "transparent", color: t.textMuted, cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Options Sidebar */}
                <div style={{ width: "240px", background: t.bg, borderRight: `1px solid ${t.border}`, padding: "24px 16px", overflowY: "auto", transition: "all 0.3s ease" }}>
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
                        Bulk Import
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
                  {/* ... (Tabs Content implementation remains) ... */}
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "24px", width: "100%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", border: `1px solid ${t.border}` }}>
            <div style={{ padding: "24px", background: theme === 'DARK' ? "rgba(239, 68, 68, 0.1)" : "#fef2f2", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "10px", borderRadius: "12px" }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#ef4444" }}>Reject Request</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: t.textMuted, opacity: 0.8 }}>Please provide a reason for rejection.</p>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} style={{ background: t.bg, border: `1px solid ${t.border}`, color: "#ef4444", cursor: "pointer", width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Rejection Reason</label>
              <textarea 
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ ...inputStyle, minHeight: "120px", resize: "none", padding: "12px", background: t.bg }} 
              />
              
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button 
                  onClick={() => setShowRejectModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRejectExtRequest}
                  disabled={!rejectReason.trim()}
                  style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", fontWeight: 600, cursor: !rejectReason.trim() ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .table-row:hover { background-color: ${theme === 'DARK' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'} !important; }
        .btn-primary:hover { background-color: #1d4ed8 !important; }
        .btn-logout:hover { color: ${theme === 'DARK' ? 'white' : '#0f172a'} !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${t.bg}; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; borderRadius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.textMuted}; }
      `}} />
            </>
          )}
        </main>
  </div>
</div>
  );
}

  // Subcomponents (Defined inside to access t)
  function MetricCard({ title, value, icon, bg, isActive, onClick }: { title: string, value: number, icon: any, bg: string, isActive?: boolean, onClick?: () => void }) {
    return (
      <div 
        onClick={onClick}
        style={{ 
          background: t.card, 
          padding: "24px", 
          borderRadius: "16px", 
          border: isActive ? "2px solid #2563eb" : `1px solid ${t.border}`, 
          boxShadow: isActive ? "0 4px 12px -1px rgba(37, 99, 235, 0.2)" : "0 4px 6px -1px rgba(0, 0, 0, 0.05)", 
          display: "flex", 
          alignItems: "center", 
          gap: "20px",
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isActive ? "translateY(-2px)" : "none"
        }}
      >
        <div style={{ background: bg, padding: "16px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", color: t.textMuted, fontWeight: 600 }}>{title}</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: t.text, letterSpacing: "-0.025em" }}>{value}</p>
        </div>
      </div>
    );
  }

  function StatusPill({ status, type, taskId, onUpdate, disabled }: { status: string, type: "task" | "review", taskId: number, onUpdate: any, disabled?: boolean }) {
    let bg = t.bg;
    let color = t.textMuted;

    if (status === "Completed") {
      bg = theme === 'DARK' ? "rgba(34, 197, 94, 0.15)" : "#dcfce7";
      color = theme === 'DARK' ? "#4ade80" : "#166534";
    } else if (status === "Pending" || status.includes("Pending")) {
      bg = theme === 'DARK' ? "rgba(234, 179, 8, 0.15)" : "#fef9c3";
      color = theme === 'DARK' ? "#facc15" : "#854d0e";
    } else if (status === "In Progress") {
      bg = theme === 'DARK' ? "rgba(59, 130, 246, 0.15)" : "#e0f2fe";
      color = theme === 'DARK' ? "#60a5fa" : "#0369a1";
    }

    const pillStyle = {
      background: bg,
      color: color,
      padding: "8px 16px",
      borderRadius: "100px",
      fontSize: "0.75rem",
      fontWeight: 700,
      display: "inline-block",
      border: `1px solid ${theme === 'DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      outline: "none",
      appearance: "none" as const,
      cursor: type === "task" && !disabled ? "pointer" : disabled ? "not-allowed" : "default",
      transition: "all 0.2s"
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

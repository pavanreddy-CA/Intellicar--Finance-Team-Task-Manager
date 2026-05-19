"use client";
// Triggering build - 2026-05-07
// Deploy Trigger: LO UI Fix - 2026-04-28


import { useState, useEffect, useMemo, Fragment } from "react";
import TaskForm from "@/components/TaskForm";
import LOForm from "@/components/LOForm";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, AlertTriangle, LogOut, Plus, Trash2, Users, UserPlus, Send, Sliders, Mail, Download, FileText, ChevronLeft, ChevronRight, FileSpreadsheet, Lightbulb, Edit2, Quote, UserCheck, BookOpen, Search, ArrowUp, ArrowDown, Home, ChevronDown, Building2, Tag, ShieldCheck, ListFilter, Shield, X, Key, Repeat, Briefcase, RefreshCw, FileCode, Wallet, MessageSquare, Database, Activity, Sun, Moon, Share2, RotateCcw, Zap, Calendar, Rocket, Award, Compass, Trophy, Link, ExternalLink, Eye, Filter, User, CreditCard, Paperclip, ShieldAlert, Folder, LayoutGrid, List, History, Image as ImageIcon } from "lucide-react";
import RecurringActivities from "@/components/RecurringActivities";
import PaymentsCalendar from "@/components/PaymentsCalendar";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExternalRequestForm from "@/components/ExternalRequestForm";
import { getTrackingStatus, COMPLETION_STATUSES, getEmailFromName } from "@/lib/taskUtils";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import PaymentRequestPortal from "@/components/PaymentRequestPortal";
import { generateProfessionalExcelReport } from "@/lib/reporting/excelGenerator";
import { generateProfessionalPDFReport } from "@/lib/reporting/pdfGenerator";
import { generateProfessionalReportEmail } from "@/lib/reporting/emailGenerator";
import { generateProfessionalLOExcel, generateProfessionalLOPDF } from "@/lib/reporting/loGenerator";
import { BRAND_COLORS } from "@/lib/reporting/reportAssets";

const GlobalStyles = () => (
  <style jsx global>{`
    .hover-card {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    .hover-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12) !important;
    }
    .btn-polish {
      transition: all 0.2s ease;
    }
    .btn-polish:active {
      transform: scale(0.96);
    }
  `}</style>
);

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
  editApproved?: boolean;
  editRequestBy?: string | null;
  editRequestReason?: string | null;
  deleteRequested?: boolean;
  deleteRequestReason?: string | null;
  deleteRequestedBy?: string | null;
  linkedRequestId?: number | null;
  requestStatus?: string | null;
  transferStatus: string | null;
  originalRequestType: string | null;
  frequency: string | null;
  displayId: string | null;
  captureLO?: string;
  trackingStatus?: string;
  isApproved?: boolean;
  completedSubmissionAt?: string | null;
  reviewedSubmissionAt?: string | null;
  processedSubmissionAt?: string | null;
  completedBy?: string | null;
  reviewedBy?: string | null;
  processedBy?: string | null;
  createdByEmail?: string | null;
  processedMode?: string | null;
  processedMailLink?: string | null;
  processedAttachments?: any | null;
  transferredBy?: string | null;
  transferredAt?: string | null;
};

type ExternalRequest = {
  id: number;
  requestFrom: string;
  requesterEmail: string;
  requestDate: string;
  natureOfRequest: string;
  reasonForRequest: string | null;
  departmentName: string;
  requestType: string;
  status: string;
  assignedAllocatorEmail: string | null;
  convertedTaskId: number | null;
  originalRequestType: string | null;
  transferStatus: string | null;
  transferredBy: string | null;
  createdAt: string;
  entityName: string | null;
  frequency: string | null;
  remarks?: string;
  processedMode?: string | null;
  processedMailLink?: string | null;
  processedAttachments?: any | null;
  processedBy?: string | null;
  processedAt?: string | null;
  mailSubject?: string | null;
  transferredAt?: string | null;
  taskDisplayId?: string | null;
  taskDueDate?: string | null;
  taskOwnerName?: string | null;
  taskCreatedAt?: string | null;
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
  submittedBy?: string | null;
  createdAt: string;
  isAcknowledged?: boolean;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  learnerComments?: string | null;
  editRequested?: boolean;
  editApproved?: boolean;
  editRequestReason?: string | null;
  deleteRequested?: boolean;
  deleteRequestReason?: string | null;
  createdByEmail?: string | null;
  taskId?: number | null;
  taskName?: string | null;
  classification?: string | null;
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

// User name mapping handled dynamically

export default function DashboardClient({ user: initialUser }: { user: any }) {
  const [user, setUser] = useState(initialUser);
  const [theme, setTheme] = useState<'LIGHT' | 'DARK'>('LIGHT');
  const isAdmin = user?.role === 'ADMIN' || user?.email === 'pavanreddy@intellicar.in';
  const isViewer = user?.role === 'VIEWER';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [backups, setBackups] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchBackups();
    }
  }, [isAdmin]);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/admin/master-reset");
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (e) {
      console.error("Failed to fetch backups", e);
    }
  };
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: "", type: null });
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void; isOpen: boolean }>({ message: "", onConfirm: () => {}, isOpen: false });
  const [promptState, setPromptState] = useState<{ message: string; defaultValue: string; onConfirm: (val: string) => void; isOpen: boolean }>({ message: "", defaultValue: "", onConfirm: () => {}, isOpen: false });
  const [promptValue, setPromptValue] = useState("");

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: null }), 4000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({ message, onConfirm, isOpen: true });
  };

  const showPrompt = (message: string, onConfirm: (val: string) => void, defaultValue: string = "") => {
    setPromptValue(defaultValue);
    setPromptState({ message, defaultValue, onConfirm, isOpen: true });
  };

  const [showForm, setShowForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [activeValue, setActiveValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_ACTION' | 'PENDING_REVIEW' | 'PENDING_STATUS_UPDATE' | 'COMPLETED'>('ALL');
  const [activeView, setActiveView] = useState<'HOME' | 'TASKS' | 'RECURRING' | 'LOS' | 'PAYMENTS' | 'PAYMENT_REQUESTS'>('HOME');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const getUserDisplayName = (email: string | null | undefined) => {
    if (!email) return "N/A";
    if (email.toLowerCase() === "system") return "System";
    const user = usersList.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (user && user.name) return user.name;
    return email.split('@')[0];
  };
  const [showLOForm, setShowLOForm] = useState(false);
  const [los, setLos] = useState<LearningOpportunity[]>([]);
  const [loLoading, setLoLoading] = useState(false);
  const [activeOptionsTab, setActiveOptionsTab] = useState<'USERS' | 'MAILS' | 'SCHEDULE' | 'EDIT_REQUESTS' | 'LO_REPORT' | 'ACCOUNT' | 'DATA' | 'MASTER_DATA' | 'MATRICES' | 'HOME_HUB' | 'MASTER_RESET' | 'AUTOMATION' | 'TASK_APPROVALS'>('ACCOUNT');
  const [activeMatrixTab, setActiveMatrixTab] = useState<'ACCESS' | 'ALLOCATION' | 'ENTITY' | 'USER_CONTROLS' | 'BULK_IMPORT_MATRIX' | 'DEPT_HEADS' | ''>('');
  const [isTasksMenuOpen, setIsTasksMenuOpen] = useState(false);
  const [showWorkplaceFlyout, setShowWorkplaceFlyout] = useState(false);
  const [showLearningFlyout, setShowLearningFlyout] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'MAIN' | 'OTHER_DEPT' | 'ANALYTICS'>('MAIN');
  const [anaTaskEntityFilter, setAnaTaskEntityFilter] = useState('ALL');
  const [anaTaskDeptFilter, setAnaTaskDeptFilter] = useState('ALL');
  const [anaTaskUserFilter, setAnaTaskUserFilter] = useState('ALL');
  
  // Financial Year Helpers
  const getFYDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    const startYear = month >= 3 ? year : year - 1;
    return {
      start: `${startYear}-04-01`,
      end: `${startYear + 1}-03-31`
    };
  };
  const [anaStartDate, setAnaStartDate] = useState(getFYDates().start);
  const [anaEndDate, setAnaEndDate] = useState(getFYDates().end);
  const [anaDateFilterPreset, setAnaDateFilterPreset] = useState("CURRENT_FY");

  const handleAnaPresetChange = (preset: string) => {
    setAnaDateFilterPreset(preset);
    const today = new Date();
    
    if (preset === "ALL_TIME") {
      setAnaStartDate("");
      setAnaEndDate("");
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
      end = new Date(today.getFullYear(), today.getMonth(), 0); 
    } else if (preset === "LAST_3_MONTHS") {
      start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    } else if (preset === "LAST_6_MONTHS") {
      start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    } else if (preset === "LAST_FY" || preset === "CURRENT_FY") {
      const fy = getFYDates();
      setAnaStartDate(fy.start);
      setAnaEndDate(fy.end);
      return;
    }

    const toIsoDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    setAnaStartDate(toIsoDate(start));
    setAnaEndDate(toIsoDate(end));
  };

  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [showTaskAnaDownloadDropdown, setShowTaskAnaDownloadDropdown] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'DASHBOARD' | 'ADMIN_MATRIX'>('DASHBOARD');
  const [showPaymentsFlyout, setShowPaymentsFlyout] = useState(false);
  const [settings, setSettings] = useState({
    reminderFrequency: 'D',
    reminderTimes: '09:00,18:00',
    managerReportFrequency: 'D',
    managerReportTimes: '10:00',
    loReportFrequency: 'W',
    loReportTimes: '10:00',
    managerEmail: '',
    loReportEmail: '',
    dailyTaskGenerationTime: '06:00',
    holidayList: '[]',
    lastDailyGenerationAt: null as string | null,
    paymentReportFrequency: 'OFF',
    paymentReportTimes: '10:00',
    paymentReportEmail: '',
    paymentReportDay: 'Monday',
    paymentReportDate: 1,
    masterDepartments: 'SW - Engineering,Manufacturing and Supply Chain,Field Operations Technicians,HW - Engineering,Operations,CSM & Sales,Finance,HR and Admin,External People',
    masterEntities: 'Intellicar-BLR,Intellicar-MUM,Intellicar-DEL',
    masterTaskTypes: 'Accounts Receivable,Accounts Payable,MIS,Inventory,Banking & Treasury,Customer Reconciliations,Vendor Reconciliation,Reporting,Financial Audit,Tax Audit,Other Audits,Assements & Notices,Month Closure,Corporate Taxation,GST,Employee Laws,Due Diligence,Presentations & Trainings,Other Reconciallitions,MCA Filings,Miscellaneous Activities,Month End Billing,Credit Cards & Debt,Customizations / Automations',
    masterCommunicationModes: 'Email,Verbal Discussion,Hangouts,Whatsapp-IC Group',
    masterRequestTypes: 'Accounts Receivable,Accounts Payable,General & Administration,Payroll',
    masterRequestStatuses: 'Under Process,Pending for Review,Processed',
    masterWeekDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
    moduleAccessMatrix: '{}',
    allocationMatrix: '{}',
    entityMatrix: '{}',
    homeContent: '{}',
    masterFrequencies: 'Ad,M,Y,2Y,H,Q,W,BW,D',
    masterPaymentTypes: 'AMC,Rent,Electricity,Subscriptions,Salaries,Vendor Payment',
    masterResourceCategories: 'Goods & Service Tax,Income Tax,Audit,ROC,IND AS,Miscellaneous',
    userModuleExceptions: '{}',
    bulkImportMatrix: '{}',
    masterBankAccounts: '',
    departmentHeadMatrix: '{}',
    masterLOClassifications: 'Process Error,Calculation Error,Communication Gap,Documentation Miss,System Issue,Miscellaneous'
  });
  const [isAdminViewMode, setIsAdminViewMode] = useState(isAdmin);

  // Reset sub-views and filters when Admin View Mode is toggled
  useEffect(() => {
    if (isAdmin && !isAdminViewMode) {
      if (activeSubView === 'ANALYTICS') setActiveSubView('MAIN');
      if (loActiveFilter === 'ANALYTICS') setLoActiveFilter('ALL');
      try {
        const matrix = JSON.parse(settings.moduleAccessMatrix || '{}');
        let moduleName = '';
        if (activeView === 'HOME') moduleName = 'Home';
        else if (activeView === 'LOS') moduleName = 'Learning';
        else if (activeView === 'PAYMENTS' || activeView === 'PAYMENT_REQUESTS') moduleName = 'Payments';
        else if (activeView === 'RECURRING') moduleName = 'Recurring Activities';
        else if (activeView === 'TASKS') {
          moduleName = activeSubView === 'OTHER_DEPT' ? 'Requests' : 'Tasks';
        }

        const canSeeModule = moduleName ? matrix[moduleName]?.includes(user?.department) : true;
        if (!canSeeModule && activeView !== 'TASKS' && activeView !== 'HOME') {
          setActiveView('TASKS');
          setActiveSubView('MAIN');
        }
      } catch (e) {}
    }
  }, [isAdminViewMode, isAdmin]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState({
    recipientEmail: '',
    ccEmail: '',
    subject: '',
    type: 'task' as 'task' | 'lo' | 'request',
    format: 'excel' as 'excel' | 'pdf' | 'both'
  });
  const [recipientTags, setRecipientTags] = useState<string[]>([]);
  const [ccTags, setCcTags] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editingLO, setEditingLO] = useState<LearningOpportunity | null>(null);
  const [selectedTaskForView, setSelectedTaskForView] = useState<Task | null>(null);
  const [selectedExternalReqForView, setSelectedExternalReqForView] = useState<any | null>(null);
  const [selectedLOForView, setSelectedLOForView] = useState<any | null>(null);
  const [selectedPaymentForView, setSelectedPaymentForView] = useState<any | null>(null);

  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingTask, setProcessingTask] = useState<Task | null>(null);
  const [processingMode, setProcessingMode] = useState("");
  const [processingMailLink, setProcessingMailLink] = useState("");
  const [processingAttachments, setProcessingAttachments] = useState<Array<{ id?: string; name: string; type: string; data: string; progress?: number; isLoaded?: boolean }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const checkValueUsage = (type: 'Department' | 'Entity' | 'TaskType' | 'CommMode' | 'Frequency' | 'Category' | 'FinanceFunction', value: string) => {
    const v = value.trim().toLowerCase();
    let count = 0;
    let usedBy: string[] = [];

    if (type === 'Department') {
      const tCount = tasks.filter(t => t.departmentName?.trim().toLowerCase() === v).length;
      const rCount = externalRequests.filter(r => r.departmentName?.trim().toLowerCase() === v).length;
      count = tCount + rCount;
      if (tCount > 0) usedBy.push("Tasks");
      if (rCount > 0) usedBy.push("External Requests");
    } else if (type === 'Entity') {
      const tCount = tasks.filter(t => t.entityName?.trim().toLowerCase() === v).length;
      const rCount = externalRequests.filter(r => r.entityName?.trim().toLowerCase() === v).length;
      count = tCount + rCount;
      if (tCount > 0) usedBy.push("Tasks");
      if (rCount > 0) usedBy.push("External Requests");
    } else if (type === 'TaskType') {
      const tCount = tasks.filter(t => t.taskType?.trim().toLowerCase() === v).length;
      count = tCount;
      if (tCount > 0) usedBy.push("Tasks");
    } else if (type === 'CommMode') {
      const tCount = tasks.filter(t => t.processedMode?.trim().toLowerCase() === v).length;
      const rCount = externalRequests.filter(r => r.processedMode?.trim().toLowerCase() === v).length;
      count = tCount + rCount;
      if (tCount > 0) usedBy.push("Tasks");
      if (rCount > 0) usedBy.push("External Requests");
    } else if (type === 'Frequency') {
      const tCount = tasks.filter(t => t.frequency?.trim().toLowerCase() === v).length;
      const rCount = externalRequests.filter(r => r.frequency?.trim().toLowerCase() === v).length;
      count = tCount + rCount;
      if (tCount > 0) usedBy.push("Tasks");
      if (rCount > 0) usedBy.push("External Requests");
    } else if (type === 'FinanceFunction') {
      const tCount = tasks.filter(t => (t as any).financeFunction?.trim().toLowerCase() === v).length;
      const rCount = externalRequests.filter(r => r.requestType?.trim().toLowerCase() === v).length;
      count = tCount + rCount;
      if (tCount > 0) usedBy.push("Tasks");
      if (rCount > 0) usedBy.push("External Requests");
    } else if (type === 'Category') {
      // Resource categories are usually not in tasks, but could be in future.
      // For now, no specific transaction table for resources is fully tracked here.
    }

    return { count, usedBy: usedBy.join(", ") };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (processingAttachments.length + files.length > 5) {
      showNotification("Maximum 5 files allowed", "error");
      return;
    }

    // Use for...of to handle async uploads properly
    for (const file of files) {
      if (file.size > 3.5 * 1024 * 1024) {
        showNotification(`${file.name} exceeds 3.5MB limit`, "error");
        continue;
      }

      const tempId = Math.random().toString(36).substring(7);
      
      // Add placeholder with initial progress
      setProcessingAttachments(prev => [...prev, {
        id: tempId,
        name: file.name,
        type: file.type,
        data: "",
        progress: 10,
        isLoaded: false
      }]);

      try {
        const response = await fetch(
          `/api/upload?filename=${encodeURIComponent(file.name)}`,
          {
            method: 'POST',
            body: file,
          },
        );

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const blob = await response.json();
        
        setProcessingAttachments(prev => prev.map(att => 
          att.id === tempId ? { 
            ...att, 
            data: blob.url, 
            progress: 100, 
            isLoaded: true 
          } : att
        ));
      } catch (err) {
        showNotification(`Failed to upload ${file.name}`, "error");
        setProcessingAttachments(prev => prev.filter(att => att.id !== tempId));
      }
    }
  };

  const handleFinalizeProcessing = async () => {
    if (!processingTask) return;
    if (!processingMode) {
      showNotification("Please select a mode of communication", "error");
      return;
    }
    if (processingMode.toLowerCase() === 'email' && !processingMailLink.trim()) {
      showNotification("Mail Subject is mandatory when mode is Email", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/tasks/${processingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestStatus: "Processed",
          processedMode: processingMode,
          processedMailLink: processingMailLink,
          processedAttachments: processingAttachments
        })
      });
      if (res.ok) {
        showNotification("Task finalized and processed successfully.");
        setShowProcessingModal(false);
        setProcessingTask(null);
        setProcessingMode("");
        setProcessingMailLink("");
        setProcessingAttachments([]);
        fetchTasks(true);
        fetchExternalRequests(true);
      } else {
        const error = await res.json();
        showNotification(`Error: ${error.message}`, "error");
      }
    } catch (error) {
      showNotification("Failed to process task", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Universal Navigation Watcher: Persists view state and handles menu auto-collapse
  useEffect(() => {
    if (!isHydrated) return; // Prevent overwriting localStorage before hydration is complete
    
    // If we are not in the TASKS or RECURRING views, close the Tasks menu
    if (activeView !== 'TASKS' && activeView !== 'RECURRING') {
      setIsTasksMenuOpen(false);
    }

    // Reset flyouts on view change
    setShowWorkplaceFlyout(false);
    setShowLearningFlyout(false);
    setShowPaymentsFlyout(false);
    
    // Persist active view
    localStorage.setItem('finpulse_active_view', activeView);
    localStorage.setItem('finpulse_active_subview', activeSubView);
    localStorage.setItem('finpulse_active_mainview', activeMainView);
  }, [activeView, activeSubView, activeMainView, isHydrated]);

  // Load persisted view on mount
  useEffect(() => {
    // sessionStorage persists across refreshes but is cleared on new tab/login
    const isSessionActive = sessionStorage.getItem('finpulse_session_active');
    
    if (!isSessionActive) {
      // Fresh Login / New Session: Always start at Home
      setActiveView('HOME');
      setActiveSubView('MAIN');
      setActiveMainView('DASHBOARD');
      sessionStorage.setItem('finpulse_session_active', 'true');
    } else {
      // Browser Refresh: Restore previous state
      const savedView = localStorage.getItem('finpulse_active_view');
      const savedSubView = localStorage.getItem('finpulse_active_subview');
      const savedMainView = localStorage.getItem('finpulse_active_mainview');
      if (savedView) setActiveView(savedView as any);
      if (savedSubView) setActiveSubView(savedSubView as any);
      if (savedMainView) setActiveMainView(savedMainView as any);
    }
    
    setIsHydrated(true);
  }, []);

  // Advanced Controls State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [extReqCurrentPage, setExtReqCurrentPage] = useState(1);
  const [extReqItemsPerPage, setExtReqItemsPerPage] = useState(10);
  const [loCurrentPage, setLoCurrentPage] = useState(1);
  const [loItemsPerPage, setLoItemsPerPage] = useState(10);
  const [dateFilterPreset, setDateFilterPreset] = useState("ALL_TIME");
  const [loActiveFilter, setLoActiveFilter] = useState<'ALL' | 'REPORTS' | 'LEARNINGS' | 'RESOURCES' | 'ANALYTICS'>('ALL');
  const [loDateFrom, setLoDateFrom] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    // Ensure we start at the 1st of the current month in local time
    return `${year}-${month}-01`;
  });
  const [loDateTo, setLoDateTo] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  });
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  
  // Growth Hub Modals & State
  const [showAckModal, setShowAckModal] = useState(false);
  const [acknowledgingLO, setAcknowledgingLO] = useState<LearningOpportunity | null>(null);
  const [ackComments, setAckComments] = useState("");
  
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [resourceType, setResourceType] = useState<'LINK' | 'FILE'>('LINK');
  const [resourceLink, setResourceLink] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceCategory, setResourceCategory] = useState("Miscellaneous");
  const [resourceDepartment, setResourceDepartment] = useState("");
  const [libraryViewMode, setLibraryViewMode] = useState<'tiles' | 'list' | 'extra-large' | 'large' | 'details'>('tiles');
  const [showLibraryViewMenu, setShowLibraryViewMenu] = useState(false);
  const [currentLibraryPath, setCurrentLibraryPath] = useState<string | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [subfolders, setSubfolders] = useState<any[]>([]);
  const [resourceSubfolderId, setResourceSubfolderId] = useState<number | string>("");
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [showAddSubfolderModal, setShowAddSubfolderModal] = useState(false);
  const [currentSubfolderPath, setCurrentSubfolderPath] = useState<string | null>(null);
  const [currentSubfolderId, setCurrentSubfolderId] = useState<number | null>(null);
  const [isAddingSubfolder, setIsAddingSubfolder] = useState(false);
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [newManagerEmailInput, setNewManagerEmailInput] = useState("");
  const [newLOEmailInput, setNewLOEmailInput] = useState("");
  const [newPaymentEmailInput, setNewPaymentEmailInput] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [viewingProcessedTask, setViewingProcessedTask] = useState<any>(null);
  const [processedDetails, setProcessedDetails] = useState<{ task: any, auditLogs: any[] } | null>(null);
  const [isUpdatingProcessed, setIsUpdatingProcessed] = useState(false);

  // Sorting and Filtering State
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskEntityFilter, setTaskEntityFilter] = useState<string[]>([]);
  const [taskOwnerFilter, setTaskOwnerFilter] = useState<string[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string[]>([]);
  const [taskReviewerFilter, setTaskReviewerFilter] = useState<string[]>([]);
  const [taskSourceFilter, setTaskSourceFilter] = useState<string[]>([]);
  const [taskFrequencyFilter, setTaskFrequencyFilter] = useState<string[]>([]);
  const [taskSortConfig, setTaskSortConfig] = useState<{ key: keyof Task; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  const [loSearchQuery, setLoSearchQuery] = useState("");
  const [anaEntityFilter, setAnaEntityFilter] = useState("ALL");
  const [anaUserFilter, setAnaUserFilter] = useState("ALL");
  const [showAnaShareModal, setShowAnaShareModal] = useState(false);
  const [showAnaDownloadDropdown, setShowAnaDownloadDropdown] = useState(false);
  
  // Bulk Import Preview States
  const [importPreview, setImportPreview] = useState<{ type: string, rows: any[], errors: { row: number, msg: string }[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [anaShareConfig, setAnaShareConfig] = useState({
    recipients: [] as string[],
    ccEmails: [] as string[],
    recipientInput: "",
    ccInput: "",
    format: "excel" as "excel" | "pdf" | "both",
    subject: "LO Analytics Report - " + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase(),
    reportType: "lo" as "lo" | "task"
  });
  const [anaShareLoading, setAnaShareLoading] = useState(false);

  // External Requests State
  const [externalRequests, setExternalRequests] = useState<ExternalRequest[]>([]);
  const [extReqLoading, setExtReqLoading] = useState(false);
  const [showExtReqForm, setShowExtReqForm] = useState(false);
  const [extReqFilter, setExtReqFilter] = useState<'ALL' | 'ALLOCATION' | 'PROCESS' | 'PROCESSED' | 'REJECTED' | 'CONVERT_PENDING'>('ALL');
  const [extReqSearch, setExtReqSearch] = useState("");
  const [matrixDeptFilter, setMatrixDeptFilter] = useState<string[]>([]);
  const [extReqStatusFilter, setExtReqStatusFilter] = useState<string[]>([]);
  const [loEntityFilter, setLoEntityFilter] = useState<string[]>([]);
  const [loIdentifiedByFilter, setLoIdentifiedByFilter] = useState<string[]>([]);
  const [loCommittedByFilter, setLoCommittedByFilter] = useState<string[]>([]);
  const [loSortConfig, setLoSortConfig] = useState<{ key: keyof LearningOpportunity; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [editRequestSubTab, setEditRequestSubTab] = useState<'TASK_EDIT' | 'TASK_DELETE' | 'LO' | 'PAYMENT' | 'DELETE_PAYMENT'>('TASK_EDIT');
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showTaskDownloadDropdown, setShowTaskDownloadDropdown] = useState(false);
  const [showLODownloadDropdown, setShowLODownloadDropdown] = useState(false);
  const [showExtReqDownloadDropdown, setShowExtReqDownloadDropdown] = useState(false);
  const [extReqSortConfig, setExtReqSortConfig] = useState<{ key: keyof ExternalRequest; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [extReqDateFrom, setExtReqDateFrom] = useState("");
  const [extReqDateTo, setExtReqDateTo] = useState("");
  const [extReqFinanceFunctionFilter, setExtReqFinanceFunctionFilter] = useState<string[]>([]);
  const [userSortConfig, setUserSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
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
    comments: "",
    classification: ""
  });
  
  // Rejection Logic State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingReq, setRejectingReq] = useState<ExternalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [hoveredRejectId, setHoveredRejectId] = useState<number | null>(null);
  const [hoveredProcessedId, setHoveredProcessedId] = useState<number | null>(null);

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

  const isDarkMode = theme === 'DARK';
  const t = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
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



  // Smart Permission Helpers
  const matrixAllocators = JSON.parse(settings.allocationMatrix || '{}');
  const userAllocatedDepts = Object.entries(matrixAllocators)
    .filter(([_, allocators]: [string, any]) => {
      if (!allocators) return false;
      const userEmail = user?.email?.toLowerCase().trim();
      
      // Handle new structure: { primary: "email", secondary: ["email1", ...] }
      if (typeof allocators === 'object' && !Array.isArray(allocators)) {
        const isPrimary = allocators.primary?.toLowerCase().trim() === userEmail;
        const isSecondary = Array.isArray(allocators.secondary) && 
                           allocators.secondary.some((e: string) => e?.toLowerCase().trim() === userEmail);
        return isPrimary || isSecondary;
      }
      
      // Handle old structure (backward compatibility)
      const emailList = Array.isArray(allocators) ? allocators : [allocators];
      return emailList.some(email => typeof email === 'string' && email.toLowerCase().trim() === userEmail);
    })
    .map(([dept, _]) => dept.trim());
  
  const canAllocateAnything = (isAdmin || (user as any).isAllocator || userAllocatedDepts.length > 0) && !isViewer;
  
  const renderOriginBadge = (item: any) => {
    const isTransferred = item.transferStatus === 'T';
    const transferredAtStr = item.transferredAt ? formatDateTime(item.transferredAt) : 'N/A';
    const hoverText = isTransferred 
      ? `Transferred By: ${item.transferredBy || 'Unknown'}\nDate & Time: ${transferredAtStr}${item.originalRequestType ? `\nOriginal Finance Function: ${item.originalRequestType}` : ''}`
      : 'This is an original request.';
      
    return (
      <span 
        title={hoverText}
        style={{ 
          padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 800,
          background: isTransferred ? "#fff7ed" : "#f1f5f9",
          color: isTransferred ? "#ea580c" : "#64748b",
          border: `1px solid ${isTransferred ? "#ffedd5" : "#e2e8f0"}`,
          cursor: isTransferred ? "help" : "default",
          display: "inline-block"
        }}
      >
        {isTransferred ? 'Transferred' : 'Original'}
      </span>
    );
  };

  const renderResourceCard = (res: any, viewMode: string, themeColors: any, isAdmin: boolean, deleteFn: (id: number) => void) => {
    const isList = viewMode === 'list' || viewMode === 'details';
    const isCompact = viewMode === 'tiles' || viewMode === 'list';
    
    const getFileIcon = (res: any, size: number) => {
      if (res.type === 'LINK') return <Link size={size} color="#3b82f6" />;
      const ext = res.data?.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <ImageIcon size={size} color="#10b981" />;
      if (['pdf'].includes(ext)) return <FileText size={size} color="#ef4444" />;
      if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={size} color="#059669" />;
      if (['doc', 'docx'].includes(ext)) return <FileText size={size} color="#2563eb" />;
      if (['ppt', 'pptx'].includes(ext)) return <Zap size={size} color="#f59e0b" />;
      if (['zip', 'rar', '7z'].includes(ext)) return <Briefcase size={size} color="#6366f1" />;
      return <FileText size={size} color="#64748b" />;
    };

    const getIconBg = (res: any) => {
      if (res.type === 'LINK') return "#eff6ff";
      const ext = res.data?.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return "#ecfdf5";
      if (['pdf'].includes(ext)) return "#fef2f2";
      if (['xls', 'xlsx', 'csv'].includes(ext)) return "#f0fdf4";
      if (['doc', 'docx'].includes(ext)) return "#eff6ff";
      if (['ppt', 'pptx'].includes(ext)) return "#fffbeb";
      return "#f8fafc";
    };

    const iconSize = isList ? 18 : viewMode === 'extra-large' ? 40 : viewMode === 'large' ? 32 : 24;
    const boxSize = isList ? 32 : viewMode === 'extra-large' ? 80 : viewMode === 'large' ? 64 : 48;
    
    return (
      <div 
        key={res.id} 
        style={{ 
          background: "white", 
          border: `1px solid ${themeColors.border}`, 
          borderRadius: isList ? "8px" : "16px", 
          padding: isList ? "8px 16px" : viewMode === 'extra-large' ? "32px" : "20px", 
          display: "flex", 
          flexDirection: isList || viewMode === 'tiles' ? "row" : "column", 
          alignItems: "center", 
          gap: "16px", 
          transition: "all 0.2s",
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }} 
        onMouseOver={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#f8fafc"; }} 
        onMouseOut={e => { e.currentTarget.style.borderColor = themeColors.border; e.currentTarget.style.background = "white"; }}
        onClick={() => {
          if (res.type === 'LINK') window.open(res.url, '_blank');
          else {
            const win = window.open();
            if (win) win.document.write(`<iframe src="${res.data}" style="width:100%;height:100%;border:0;top:0;left:0;width:100%;height:100%;" allowfullscreen></iframe>`);
          }
        }}
      >
        <div style={{ width: `${boxSize}px`, height: `${boxSize}px`, minWidth: `${boxSize}px`, borderRadius: "10px", background: getIconBg(res), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {getFileIcon(res, iconSize)}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h5 style={{ 
            margin: 0, 
            fontSize: isList ? "0.875rem" : viewMode === 'extra-large' ? "1.125rem" : "1rem", 
            fontWeight: 700, 
            color: themeColors.text, 
            overflow: "hidden", 
            textOverflow: "ellipsis", 
            whiteSpace: "nowrap" 
          }}>
            {res.name}
          </h5>
          {!isList && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "0.7rem", color: themeColors.textMuted }}>{res.category}</span>
              <span style={{ color: themeColors.textMuted, fontSize: "0.7rem", opacity: 0.5 }}>•</span>
              <span style={{ color: themeColors.textMuted, fontSize: "0.7rem" }}>{formatDate(res.createdAt)}</span>
            </div>
          )}
        </div>

        {isList && (
           <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.75rem", color: themeColors.textMuted }}>
             <span style={{ whiteSpace: "nowrap" }}>{formatDate(res.createdAt)}</span>
             <Eye size={16} />
           </div>
        )}

        {isAdmin && !isList && (
           <button onClick={(e) => { e.stopPropagation(); deleteFn(res.id); }} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", opacity: 0.6, alignSelf: "flex-start" }}><Trash2 size={16} /></button>
        )}
      </div>
    );
  };

  const canImport = isAdmin || (() => {
    try {
      const matrix = JSON.parse(settings?.bulkImportMatrix || '{}');
      return matrix[user.id]?.length > 0 || matrix[user.email]?.length > 0;
    } catch (e) { return false; }
  })();

  const canShowControlCenter = isAdmin || canImport;

  const toIsoDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

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


    setStartDate(toIsoDate(start));
    setEndDate(toIsoDate(end));
  };


  const [pendingUserUpdates, setPendingUserUpdates] = useState<Record<string, { role?: string; department?: string; isSuspended?: boolean; employeeId?: string }>>({});
  const [isSavingUsers, setIsSavingUsers] = useState(false);
  
  // Add Employee States
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState({
    employeeId: '',
    name: '',
    email: '',
    department: '',
    role: 'USER'
  });

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userDeptFilter, setUserDeptFilter] = useState("ALL");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  // New Filters
  const [taskTypeFilter, setTaskTypeFilter] = useState<string[]>([]);
  const [taskDeptFilter, setTaskDeptFilter] = useState<string[]>([]);
  const [requestTypeFilter, setRequestTypeFilter] = useState<string[]>([]);

  const fetchTaskDetails = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setProcessedDetails(data);
      }
    } catch (err) {
      console.error("Failed to fetch task details:", err);
    }
  };

  const handleRevertProcessedStatus = async (task: any) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to revert the status of "${task.taskName}" to Pending? This will clear all processing data.`)) return;

    setIsUpdatingProcessed(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestStatus: "Pending" })
      });

      if (res.ok) {
        showNotification("Task status reverted successfully!", "success");
        setViewingProcessedTask(null);
        setProcessedDetails(null);
        // Refresh tasks
        fetchTasks(true);
      } else {
        const err = await res.json();
        showNotification(`Failed to revert status: ${err.message}`, "error");
      }
    } catch (err) {
      showNotification("Network error while reverting status", "error");
    } finally {
      setIsUpdatingProcessed(false);
    }
  };

  const handleDeleteProcessedAttachment = async (task: any, attachmentToDelete: any) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to remove this attachment?")) return;

    setIsUpdatingProcessed(true);
    try {
      const newAttachments = (task.processedAttachments || []).filter((a: any) => a.url !== attachmentToDelete.url);
      
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processedAttachments: newAttachments })
      });

      if (res.ok) {
        showNotification("Attachment removed successfully!", "success");
        // Update local state in the details modal
        if (processedDetails) {
          setProcessedDetails({
            ...processedDetails,
            task: { ...processedDetails.task, processedAttachments: newAttachments }
          });
        }
        // Refresh main task list
        fetchTasks(true);
      } else {
        const err = await res.json();
        showNotification(`Failed to remove attachment: ${err.message}`, "error");
      }
    } catch (err) {
      showNotification("Network error while removing attachment", "error");
    } finally {
      setIsUpdatingProcessed(false);
    }
  };

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentRequests = async (silent = false) => {
    if (!silent) setPaymentLoading(true);
    try {
      const trackerRes = await fetch("/api/payments/tracker");
      const masterRes = await fetch("/api/payments/master");
      
      let trackerRequests: any[] = [];
      let masterRequests: any[] = [];
      
      if (trackerRes.ok) {
        const allOccurrences = await trackerRes.json();
        trackerRequests = Array.isArray(allOccurrences) ? allOccurrences
          .filter((occ: any) => (occ.editRequested && !occ.editApproved) || occ.deleteRequested)
          .map((occ: any) => ({
            ...occ,
            type: 'TRACKER',
            templateVendor: occ.vendorName,
            templateDesc: occ.paymentDescription
          })) : [];
      }
      
      if (masterRes.ok) {
        const allTemplates = await masterRes.json();
        masterRequests = Array.isArray(allTemplates) ? allTemplates
          .filter((t: any) => t.deleteRequested || t.editRequested)
          .map((t: any) => ({
            ...t,
            type: 'MASTER',
            templateVendor: t.vendorName,
            templateDesc: t.paymentDescription,
            dueDate: t.nextDueDate || null
          })) : [];
      }
      
      setPaymentRequests([...trackerRequests, ...masterRequests]);
    } catch (error) {
      console.error("Failed to fetch payment requests", error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleApprovePaymentEdit = async (occId: number) => {
    try {
      const res = await fetch(`/api/payments/tracker/${occId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editApproved: true })
      });
      if (res.ok) {
        fetchPaymentRequests();
      }
    } catch (err) {
      console.error("Approve payment edit error:", err);
    }
  };

  const handleRejectPaymentEdit = async (occId: number) => {
    try {
      const res = await fetch(`/api/payments/tracker/${occId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editRequested: false, editRequestReason: "" })
      });
      if (res.ok) {
        fetchPaymentRequests();
      }
    } catch (err) {
      console.error("Reject payment edit error:", err);
    }
  };

  const handleApproveDeletePayment = async (req: any) => {
    try {
      const url = req.type === 'MASTER' 
        ? `/api/payments/master/${req.id}/approve-delete`
        : `/api/payments/tracker/${req.id}/approve-delete`;
        
      const res = await fetch(url, {
        method: "POST"
      });
      if (res.ok) {
        showNotification(req.type === 'MASTER' ? "Master record deleted." : "Payment record deleted.");
        fetchPaymentRequests();
      }
    } catch (err) {
      console.error("Approve delete error:", err);
    }
  };

  const handleRejectDeletePayment = async (req: any) => {
    try {
      const url = req.type === 'MASTER'
        ? `/api/payments/master/${req.id}/reject-delete`
        : `/api/payments/tracker/${req.id}/reject-delete`;
        
      const res = await fetch(url, {
        method: "POST"
      });
      if (res.ok) {
        showNotification("Deletion request rejected.");
        fetchPaymentRequests();
      }
    } catch (err) {
      console.error("Reject delete error:", err);
    }
  };

  const fetchLOs = async () => {
    setLoLoading(true);
    try {
      const res = await fetch("/api/lo");
      if (res.ok) {
        const data = await res.json();
        setLos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch LOs", error);
    } finally {
      setLoLoading(false);
    }
  };

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await fetch("/api/resources");
      if (res.ok) {
        const data = await res.json();
        setResources(Array.isArray(data) ? data : []);
      }
      // Also fetch subfolders whenever resources are fetched
      fetchSubfolders();
    } catch (error) {
      console.error("Failed to fetch resources", error);
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchSubfolders = async () => {
    try {
      const res = await fetch("/api/resources/subfolders");
      if (res.ok) {
        const data = await res.json();
        setSubfolders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch subfolders", error);
    }
  };

  const handleCreateSubfolder = async (name: string, category: string) => {
    if (!name.trim()) return null;
    setIsAddingSubfolder(true);
    try {
      const res = await fetch("/api/resources/subfolders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category })
      });
      if (res.ok) {
        const newFolder = await res.json();
        setSubfolders(prev => {
          // If already exists (returned from API check), don't duplicate
          if (prev.some(f => f.id === newFolder.id)) return prev;
          return [...prev, newFolder];
        });
        return newFolder;
      }
    } catch (error) {
      console.error("Failed to create subfolder", error);
    } finally {
      setIsAddingSubfolder(false);
    }
    return null;
  };

  const fetchExternalRequests = async (silent = false) => {
    if (!silent) setExtReqLoading(true);
    try {
      const params = new URLSearchParams({
        email: user?.email || '',
        department: user?.department || '',
        role: isAdmin ? 'ADMIN' : 'USER'
      });
      const res = await fetch(`/api/external-requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExternalRequests(Array.isArray(data) ? data : []);
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

  const fetchImportHistory = async () => {
    try {
      const res = await fetch("/api/tasks/bulk");
      if (res.ok) {
        const data = await res.json();
        setImportHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch import history", error);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
    fetchLOs();
    fetchExternalRequests();
    fetchPaymentRequests();
    fetchSettings();
    fetchUsersList(); 
    fetchResources();
    if (isAdmin) fetchImportHistory();
  }, [isAdmin]);

  // LIVE SYNC: 10-Second Auto-Refresh & Window Focus Revalidation
  useEffect(() => {
    const refreshAll = () => {
      fetchTasks(true);
      fetchExternalRequests(true);
      fetchPaymentRequests(true);
    };

    // 1. Smart Sync: Refresh every 60 seconds (increased from 10s), but ONLY if the user is looking at the tab
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAll();
      }
    }, 60000);

    // 2. Instant Sync: If user returns to the tab or focus, refresh immediately
    const handleActivity = () => {
      refreshAll();
    };

    window.addEventListener("focus", handleActivity);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === 'visible') handleActivity();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleActivity);
      document.removeEventListener("visibilitychange", handleActivity);
    };
  }, []);

  const isModuleAllowed = (moduleName: string) => {
    if (isAdmin && isAdminViewMode) return true;
    if (!user?.department || !user?.email) return false;
    try {
      const accessMatrix = JSON.parse(settings.moduleAccessMatrix || '{}');
      const deptAllowed = accessMatrix[moduleName] && accessMatrix[moduleName].includes(user.department);
      if (!deptAllowed) return false;
      const exceptions = JSON.parse(settings.userModuleExceptions || '{}');
      const userBlockedModules = exceptions[user.email] || [];
      if (userBlockedModules.includes(moduleName)) return false;
      return true;
    } catch (err) { return false; }
  };

  // SMART REDIRECTION LOGIC
  useEffect(() => {
    // Block redirection until settings are loaded and view is hydrated
    if (settingsLoading || !isHydrated) return;

    if (settings.moduleAccessMatrix && user?.department) {
      const canSeeTasks = isModuleAllowed('Tasks');
      if (!canSeeTasks && activeView === 'TASKS' && activeSubView === 'MAIN') {
        const canSeeRequests = isModuleAllowed('Requests');
        if (canSeeRequests) {
          setActiveView('TASKS');
          setActiveSubView('OTHER_DEPT');
          setIsTasksMenuOpen(false);
        } else {
          setActiveView('LOS');
        }
      }
    }
  }, [settingsLoading, isHydrated, settings.moduleAccessMatrix, settings.userModuleExceptions, user?.department, activeView, activeSubView]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSettings(data);
          setOriginalSettings(JSON.parse(JSON.stringify(data)));
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Automated Daily Task Generation Trigger
  useEffect(() => {
    if (!settingsLoading && isHydrated && settings && user) {
      const today = new Date();
      // Skip weekends automatically for the trigger
      const dayOfWeek = today.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return;
      
      const todayStr = today.toISOString().split('T')[0];
      const lastGenStr = settings.lastDailyGenerationAt ? new Date(settings.lastDailyGenerationAt).toISOString().split('T')[0] : null;
      
      // If today is different from last generation date, try triggering
      if (todayStr !== lastGenStr) {
        fetch("/api/cron/daily-tasks", { method: "POST" })
          .then(res => res.json())
          .then(data => {
             if (data.success && data.count > 0) {
               console.log(`Auto-generated ${data.count} daily tasks.`);
               fetchTasks(true); // Refresh dashboard
             }
          })
          .catch(err => console.error("Auto-generation trigger failed", err));
      }
    }
  }, [settingsLoading, isHydrated, settings, user]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showNotification("Matrix settings saved successfully!");
        setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      } else {
        const errData = await res.json();
        showNotification(`Failed to save matrix settings: ${errData.details || errData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCloseOptionsModal = (onConfirm?: () => void) => {
    const hasSettingsChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    const hasUserChanges = Object.keys(pendingUserUpdates).length > 0;

    if (hasSettingsChanges || hasUserChanges) {
      showConfirm("You have unsaved changes in the Control Center. Are you sure you want to close without saving?", () => {
        setSettings(JSON.parse(JSON.stringify(originalSettings)));
        setPendingUserUpdates({});
        setShowOptionsModal(false);
        if (onConfirm) onConfirm();
      });
    } else {
      setShowOptionsModal(false);
      if (onConfirm) onConfirm();
    }
  };

  const [preFilledTask, setPreFilledTask] = useState<any>(null);

  const handleConvertToTask = (req: ExternalRequest) => {
    setPreFilledTask({
      taskName: req.natureOfRequest,
      entityName: req.entityName,
      taskType: req.requestType,
      departmentName: req.departmentName,
      requestFrom: req.requestFrom,
      linkedRequestId: req.id,
      transferStatus: req.transferStatus,
      originalRequestType: req.originalRequestType,
      transferredBy: req.transferredBy,
      transferredAt: req.transferredAt
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
    showConfirm("Are you sure you want to permanently delete this request?", async () => {
      try {
        const res = await fetch(`/api/external-requests/${id}`, { method: "DELETE" });
        if (res.ok) {
          setExternalRequests(prev => prev.filter(r => r.id !== id));
          showNotification("Request deleted successfully.");
        }
      } catch (err) {
        console.error("Delete error:", err);
      }
    });
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

  const downloadBulkTemplate = async (type: 'tasks' | 'lo' | 'recurring' | 'payments' | 'employees') => {
    const workbook = new ExcelJS.Workbook();
    
    // 1. Filter Finance Users
    const sortedUsers = usersList
      .filter(u => u.department === 'Finance' && u.isApproved !== false)
      .map(u => u.name)
      .sort();

    const financeUsers = [...sortedUsers];
    const reviewerUsers = ["N/A", ...sortedUsers];

    // 2. Add Instructions Sheet (Simplified)
    const insSheet = workbook.addWorksheet('Instructions');
    insSheet.columns = [
      { header: 'Field Name', key: 'field', width: 25 },
      { header: 'Data Source / Validation', key: 'source', width: 35 },
      { header: 'Description & Guidance', key: 'desc', width: 60 },
    ];

    const insHeaderRow = insSheet.getRow(1);
    insHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    insHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    const addIns = (field: string, source: string, desc: string) => {
      const row = insSheet.addRow([field, source, desc]);
      if (source.includes('Dropdown') || source.includes('Master Data')) {
        row.getCell(2).font = { bold: true, color: { argb: 'FF2563EB' } };
      }
    };

    // 3. Add Master Data Reference Sheet (Dynamic)
    const masterSheet = workbook.addWorksheet('Master Data Reference');
    masterSheet.addRow(['MASTER DATA REFERENCE (SYSTEM SYNCED)']).font = { bold: true, size: 14 };
    masterSheet.addRow(['DO NOT MODIFY THIS SHEET. These values are synced from your Control Center.']);
    masterSheet.addRow([]);

    const ranges: Record<string, string> = {};
    let currentRefRow = 3; 

    const addMasterDataList = (title: string, values: string | string[]) => {
      currentRefRow++;
      masterSheet.addRow([title]).font = { bold: true, color: { argb: 'FF2563EB' } };
      
      const list = Array.isArray(values) ? values : values.split(',').map(v => v.trim()).filter(Boolean);
      const start = currentRefRow + 1;
      
      if (list.length === 0) {
        masterSheet.addRow(['(No values found)']);
        currentRefRow++;
      } else {
        list.forEach(v => {
          masterSheet.addRow([v]);
          currentRefRow++;
        });
      }
      
      const end = currentRefRow;
      ranges[title] = `'Master Data Reference'!$A$${start}:$A$${end}`;
      masterSheet.addRow([]);
      currentRefRow++;
    };

    addMasterDataList('Entities', settings.masterEntities);
    addMasterDataList('Departments', settings.masterDepartments);
    addMasterDataList('Task Types', settings.masterTaskTypes);
    addMasterDataList('Frequencies', settings.masterFrequencies);
    addMasterDataList('Finance Functions', settings.masterRequestTypes);
    addMasterDataList('Payment Types', settings.masterPaymentTypes);
    addMasterDataList('Finance Users', financeUsers);
    addMasterDataList('Reviewers', reviewerUsers);
    addMasterDataList('Roles', ['ADMIN', 'USER', 'VIEWER']);
    
    // Protect Reference Sheets
    insSheet.protect('Intellicar@123', { selectLockedCells: true, selectUnlockedCells: true });
    masterSheet.protect('Intellicar@123', { selectLockedCells: true, selectUnlockedCells: true });

    // 4. Add Main Data Sheet
    const sheetName = type === 'tasks' ? 'Tasks' : type === 'lo' ? 'LOs' : type === 'recurring' ? 'RecurringTemplates' : type === 'employees' ? 'Employees' : 'PaymentsMaster';
    const worksheet = workbook.addWorksheet(sheetName);
    
    if (type === 'tasks') {
      addIns('Task Name', 'User Input (Text)', 'The name or title of the task.');
      addIns('Entity', 'Dropdown (Master Data)', 'Pick from the available entities.');
      addIns('Type', 'Dropdown (Master Data)', 'Category of task (e.g. GST, TDS).');
      addIns('Dept', 'Dropdown (Master Data)', 'Department handling the task.');
      addIns('Frequency', 'Dropdown (Master Data)', 'Task recurrence frequency.');
      addIns('Requester', 'User Input (Name)', 'Person requesting the task.');
      addIns('Owner', 'Dropdown (Finance Users)', 'Assigned Finance team member.');
      addIns('Reviewer', 'Dropdown (Finance Users)', 'Assigned reviewer.');
      addIns('Due Date', 'User Input (Date)', 'Format: DD-MMM-YYYY (e.g. 25-DEC-2026)');

      worksheet.columns = [
        { header: 'Task Name', key: 'taskName', width: 25 },
        { header: 'Entity', key: 'entityName', width: 20 },
        { header: 'Type', key: 'taskType', width: 15 },
        { header: 'Dept', key: 'departmentName', width: 15 },
        { header: 'Frequency', key: 'frequency', width: 15 },
        { header: 'Requester', key: 'requestFrom', width: 20 },
        { header: 'Owner', key: 'ownerName', width: 20 },
        { header: 'Reviewer', key: 'reviewerName', width: 20 },
        { header: 'Due Date (DD-MMM-YYYY)', key: 'dueDate', width: 20 },
      ];

      // Apply Data Validation (Dropdowns)
      for (let i = 2; i <= 500; i++) {
        worksheet.getCell(`B${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Entities']] };
        worksheet.getCell(`C${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Task Types']] };
        worksheet.getCell(`D${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Departments']] };
        worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Frequencies']] };
        worksheet.getCell(`G${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Users']] };
        worksheet.getCell(`H${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Reviewers']] };
      }
    } else if (type === 'lo') {
      addIns('Entity', 'Dropdown (Master Data)', 'Pick from the available entities.');
      addIns('Date', 'User Input (Date)', 'Format: DD-MMM-YYYY (e.g. 21-APR-2026)');
      addIns('LO Description', 'User Input (Text)', 'Details of the finding or mistake.');
      addIns('Identified By', 'Dropdown (Finance Users)', 'Finance member who spotted the error.');
      addIns('Committed By', 'Dropdown (Finance Users)', 'Finance member who committed the error.');
      addIns('Resolution', 'User Input (Text)', 'Action taken to fix it.');

      worksheet.columns = [
        { header: 'Entity', key: 'entity', width: 20 },
        { header: 'Date (DD-MMM-YYYY)', key: 'dateOfIdentification', width: 25 },
        { header: 'LO Description', key: 'learningOpportunity', width: 40 },
        { header: 'Identified By', key: 'identifiedBy', width: 20 },
        { header: 'Committed By', key: 'committedBy', width: 20 },
        { header: 'Resolution', key: 'resolutionProvided', width: 40 },
      ];

      for (let i = 2; i <= 500; i++) {
        worksheet.getCell(`A${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Entities']] };
        worksheet.getCell(`D${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Users']] };
        worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Users']] };
      }
    } else if (type === 'recurring') {
      addIns('Task Name Pattern', 'User Input', 'Use {{MONTH}}, {{YEAR}} placeholders.');
      addIns('Entity Name', 'Dropdown (Master Data)', 'Target entity.');
      addIns('Task Type', 'Dropdown (Master Data)', 'Category of task.');
      addIns('Department', 'Dropdown (Master Data)', 'Target department.');
      addIns('Finance Function', 'Dropdown (Master Data)', 'Departmental sub-function.');
      addIns('Frequency', 'Dropdown (Master Data)', 'Pick from valid frequency codes.');
      addIns('Day Offset', 'User Input', 'Date (1-31) or Day Name.');
      addIns('Default Owner', 'Dropdown (Finance Users)', 'Assigned owner.');
      addIns('Default Reviewer', 'Dropdown (Finance Users)', 'Assigned reviewer.');

      worksheet.columns = [
        { header: 'Task Name Pattern', key: 'taskNamePattern', width: 30 },
        { header: 'Entity Name', key: 'entityName', width: 20 },
        { header: 'Task Type', key: 'taskType', width: 15 },
        { header: 'Department', key: 'departmentName', width: 15 },
        { header: 'Finance Function', key: 'financeFunction', width: 20 },
        { header: 'Frequency', key: 'frequency', width: 15 },
        { header: 'Day Offset', key: 'dayOffset', width: 15 },
        { header: 'Default Owner', key: 'defaultOwner', width: 20 },
        { header: 'Default Reviewer', key: 'defaultReviewer', width: 20 },
        { header: 'Start Date (DD-MMM-YYYY)', key: 'startDate', width: 20 },
        { header: 'Is Active (TRUE/FALSE)', key: 'isActive', width: 15 },
      ];

      for (let i = 2; i <= 500; i++) {
        worksheet.getCell(`B${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Entities']] };
        worksheet.getCell(`C${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Task Types']] };
        worksheet.getCell(`D${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Departments']] };
        worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Functions']] };
        worksheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Frequencies']] };
        worksheet.getCell(`H${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Users']] };
        worksheet.getCell(`I${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Reviewers']] };
      }
    } else if (type === 'payments') {
      addIns('Entity Name', 'Dropdown (Master Data)', 'Target entity.');
      addIns('Payment Type', 'Dropdown (Master Data)', 'Category of payment.');
      addIns('Department', 'Dropdown (Master Data)', 'Target department.');
      addIns('Finance Function', 'Dropdown (Master Data)', 'Sub-function.');
      addIns('Frequency', 'Dropdown (Master Data)', 'Payment cycle.');
      addIns('Owner', 'Dropdown (Finance Users)', 'Assigned Finance owner.');
      addIns('Reviewer', 'Dropdown (Finance Users)', 'Assigned reviewer.');

      worksheet.columns = [
        { header: 'Entity Name', key: 'entityName', width: 25 },
        { header: 'Description', key: 'paymentDescription', width: 30 },
        { header: 'Vendor Name', key: 'vendorName', width: 25 },
        { header: 'Payment Type', key: 'paymentType', width: 20 },
        { header: 'Department', key: 'departmentName', width: 20 },
        { header: 'Finance Function', key: 'financeFunction', width: 20 },
        { header: 'Frequency', key: 'frequency', width: 15 },
        { header: 'Due Day (1-31)', key: 'dueDay', width: 15 },
        { header: 'Vendor Email', key: 'vendorEmail', width: 25 },
        { header: 'Owner', key: 'defaultOwner', width: 20 },
        { header: 'Reviewer', key: 'defaultReviewer', width: 20 },
        { header: 'Start Date (DD-MMM-YYYY)', key: 'startDate', width: 20 },
      ];

      for (let i = 2; i <= 500; i++) {
        worksheet.getCell(`A${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Entities']] };
        worksheet.getCell(`D${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Payment Types']] };
        worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Departments']] };
        worksheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Functions']] };
        worksheet.getCell(`G${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Frequencies']] };
        worksheet.getCell(`J${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Finance Users']] };
        worksheet.getCell(`K${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Reviewers']] };
      }
    } else if (type === 'employees') {
      addIns('Department', 'Dropdown (Master Data)', 'Target department.');
      addIns('Role', 'Dropdown (Roles)', 'ADMIN, USER, or VIEWER.');

      worksheet.columns = [
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Role', key: 'role', width: 15 },
      ];

      for (let i = 2; i <= 500; i++) {
        worksheet.getCell(`D${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Departments']] };
        worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [ranges['Roles']] };
      }
    }

    // Styling Main Headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    // Set active sheet
    workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 2, visibility: 'visible' }];
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `ITPL_${type.toUpperCase()}_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  const handleExcelBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'tasks' | 'lo' | 'recurring' | 'payments' | 'employees') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    // Find the correct data sheet: 
    // 1. Try index 3 (new templates)
    // 2. If index 3 is missing or named 'Instructions', fallback to index 1 (old templates)
    let worksheet = workbook.getWorksheet(3);
    if (!worksheet || worksheet.name === 'Instructions' || worksheet.name === 'Master Data Reference') {
      worksheet = workbook.getWorksheet(1);
    }
    
    // Final check: if sheet 1 is still instructions, try sheet 2 or something, 
    // but the logic above should handle most cases.
    
    const rows: any[] = [];
    const errors: { row: number, msg: string }[] = [];

    worksheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip headers
      const values = row.values as any[];
      
      // Basic Validation helper
      const checkRequired = (idx: number, name: string) => {
        if (!values[idx] || String(values[idx]).trim() === "") {
          errors.push({ row: rowNumber, msg: `${name} is required` });
        }
      };

      if (type === 'tasks') {
        checkRequired(1, "Task Name");
        checkRequired(2, "Entity");
        rows.push({
          taskName: values[1],
          entityName: values[2],
          taskType: values[3] || "General",
          departmentName: values[4] || "Finance",
          frequency: values[5],
          requestFrom: values[6],
          ownerName: values[7],
          reviewerName: values[8],
          dueDate: parseExcelDate(values[9]),
          originalRowNumber: rowNumber,
        });
      } else if (type === 'lo') {
        checkRequired(1, "Entity");
        checkRequired(3, "Learning Opportunity");
        rows.push({
          entity: values[1],
          dateOfIdentification: parseExcelDate(values[2]),
          learningOpportunity: values[3],
          identifiedBy: values[4],
          committedBy: values[5],
          resolutionProvided: values[6],
          originalRowNumber: rowNumber,
        });
      } else if (type === 'recurring') {
        checkRequired(1, "Task Pattern");
        checkRequired(6, "Frequency");
        rows.push({
          taskNamePattern: values[1],
          entityName: values[2],
          taskType: values[3],
          departmentName: values[4],
          financeFunction: values[5],
          frequency: values[6],
          dayOffset: Number(values[7] || 0),
          monthOffset: Number(values[8] || 0),
          defaultOwner: values[9],
          defaultReviewer: values[10],
          startDate: parseExcelDate(values[11]),
          endDate: parseExcelDate(values[12]),
          isActive: String(values[13]).toUpperCase() === 'TRUE',
          freqLabel: values[14]
        });
      } else if (type === 'payments') {
        checkRequired(1, "Entity");
        checkRequired(2, "Description");
        rows.push({
          entityName: values[1],
          paymentDescription: values[2],
          vendorName: values[3],
          paymentType: values[4],
          departmentName: values[5],
          financeFunction: values[6],
          frequency: values[7],
          dueDay: values[8],
          weeklyDay: values[9],
          vendorEmail: values[10],
          prodEmail: values[11],
          defaultOwner: values[12],
          defaultReviewer: values[13],
          startDate: parseExcelDate(values[14]),
          endDate: parseExcelDate(values[15]),
        });
      } else if (type === 'employees') {
        checkRequired(1, "Employee ID");
        checkRequired(2, "Full Name");
        checkRequired(3, "Email Address");
        rows.push({
          employeeId: values[1],
          name: values[2],
          email: values[3],
          department: values[4] || "Finance",
          role: values[5] || "USER",
        });
      }
    });

    setImportPreview({ type, rows, errors });
    e.target.value = ""; // Clear input
  };

  const handleConfirmBulkImport = async () => {
    if (!importPreview) return;
    const { type, rows, errors } = importPreview;

    const errorRowIndices = new Set(errors.map(e => e.row));
    const validRows = rows.filter((_, idx) => !errorRowIndices.has(idx + 2));

    if (validRows.length === 0) {
      showNotification("No valid records to import. Please fix errors and re-upload.", "error");
      return;
    }

    if (errors.length > 0) {
      if (!confirm(`Only ${validRows.length} out of ${rows.length} records are valid. Skip ${errors.length} invalid rows and proceed with valid ones?`)) return;
    }

    setIsImporting(true);
    try {
      const endpoint = 
        type === 'tasks' ? '/api/tasks/bulk' : 
        type === 'lo' ? '/api/lo/bulk' : 
        type === 'payments' ? '/api/payments/bulk-import' :
        type === 'employees' ? '/api/users/bulk-import' :
        '/api/recurring-templates/bulk';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'payments' ? { items: validRows } : 
          type === 'employees' ? { employees: validRows } : 
          validRows
        )
      });

      if (res.ok) {
        const result = await res.json();
        if (type === 'tasks' && result.errorCount > 0) {
          showNotification(`${result.successCount} tasks imported. ${result.errorCount} failed name verification.`, "error");
          // Update preview with server-side errors so user can download the report
          setImportPreview(prev => prev ? {
            ...prev,
            errors: [...prev.errors, ...result.errors.map((e: any) => ({ row: e.row, msg: e.error }))]
          } : null);
          fetchTasks(true);
        } else {
          showNotification(`${type === 'payments' || type === 'employees' ? (result.count || validRows.length) : (result.successCount || validRows.length)} records imported successfully!`);
          setImportPreview(null);
          if (type === 'tasks') fetchTasks(true); 
          else if (type === 'lo') fetchLOs();
          else if (type === 'employees') fetchUsersList();
          else fetchTasks(true); 
        }
        // Always refresh history if admin
        if (isAdmin) fetchImportHistory();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showNotification(errorData.message || "Import failed. Please check data format.", "error");
        if (isAdmin) fetchImportHistory(); // History might still have logged the failure
      }
    } catch (err) {
      showNotification("An error occurred during import.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = async (providedErrors?: any[], providedType?: string) => {
    const previewData = importPreview || { type: '', rows: [], errors: [] };
    const type = providedType || previewData.type;
    const errors = providedErrors || previewData.errors;
    const rows = previewData.rows;
    
    if (!errors || errors.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Errors to Fix');
    
    let headerConfig: {header: string, key: string, width: number}[] = [];
    if (type === 'tasks') {
      headerConfig = [
        { header: 'Task Name', key: 'taskName', width: 25 },
        { header: 'Entity', key: 'entityName', width: 20 },
        { header: 'Type', key: 'taskType', width: 15 },
        { header: 'Dept', key: 'departmentName', width: 15 },
        { header: 'Requester', key: 'requestFrom', width: 20 },
        { header: 'Owner', key: 'ownerName', width: 20 },
        { header: 'Reviewer', key: 'reviewerName', width: 20 },
        { header: 'Due Date', key: 'dueDate', width: 20 },
      ];
    } else if (type === 'lo') {
      headerConfig = [
        { header: 'Entity', key: 'entity', width: 20 },
        { header: 'Date', key: 'dateOfIdentification', width: 20 },
        { header: 'LO Description', key: 'learningOpportunity', width: 40 },
        { header: 'Identified By', key: 'identifiedBy', width: 20 },
        { header: 'Committed By', key: 'committedBy', width: 20 },
        { header: 'Resolution', key: 'resolutionProvided', width: 40 },
      ];
    } else if (type === 'recurring') {
      headerConfig = [
        { header: 'Task Name Pattern', key: 'taskNamePattern', width: 30 },
        { header: 'Entity Name', key: 'entityName', width: 20 },
        { header: 'Task Type', key: 'taskType', width: 15 },
        { header: 'Department', key: 'departmentName', width: 15 },
        { header: 'Finance Function', key: 'financeFunction', width: 20 },
        { header: 'Frequency', key: 'frequency', width: 15 },
        { header: 'Day Offset', key: 'dayOffset', width: 15 },
        { header: 'Month Offset', key: 'monthOffset', width: 15 },
        { header: 'Default Owner', key: 'defaultOwner', width: 20 },
        { header: 'Default Reviewer', key: 'defaultReviewer', width: 20 },
        { header: 'Start Date', key: 'startDate', width: 20 },
        { header: 'End Date', key: 'endDate', width: 20 },
        { header: 'Is Active', key: 'isActive', width: 15 },
        { header: 'Freq Label', key: 'freqLabel', width: 20 },
      ];
    } else if (type === 'employees') {
      headerConfig = [
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Role', key: 'role', width: 15 },
      ];
    }

    worksheet.columns = [...headerConfig, { header: 'VALIDATION ERROR', key: 'error', width: 50 }];
    const headRow = worksheet.getRow(1);
    headRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    const errorRowMap = new Map();
    const rowDataMap = new Map();
    errors.forEach(e => {
        const rowNumber = e.row;
        const msg = e.msg || e.error || "Unknown Error";
        const existing = errorRowMap.get(rowNumber) || [];
        errorRowMap.set(rowNumber, [...existing, msg]);
        if (e.rowData) rowDataMap.set(rowNumber, e.rowData);
    });

    if (rows && rows.length > 0) {
        rows.forEach((row, idx) => {
            const rowNumber = idx + 2;
            if (errorRowMap.has(rowNumber)) {
                const errorMsg = errorRowMap.get(rowNumber).join('; ');
                worksheet.addRow({ ...row, error: errorMsg });
            }
        });
    } else {
        // Fallback for historical reports where live 'rows' array is gone
        errorRowMap.forEach((msgs, rowNum) => {
            const rowData = rowDataMap.get(rowNum) || {};
            worksheet.addRow({ ...rowData, error: msgs.join('; ') });
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Fix_Errors_${type}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showNotification("Error report downloaded. Fix and re-upload.");
  };

  const fetchUsersList = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(Array.isArray(data) ? data : []);
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
      showNotification("Passwords do not match!");
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
        showNotification("Password updated successfully!");
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

  const handleImportPredefined = async () => {
    showConfirm("Are you sure you want to import all predefined employees? This will create accounts with the default password 'Intellicar@123' for those who don't have one yet.", async () => {
      try {
        const res = await fetch("/api/admin/users/import-predefined", { method: "POST" });
        if (res.ok) {
          showNotification("Predefined employees imported successfully.");
          fetchUsersList();
        }
      } catch (err) {
        console.error("Import failed", err);
      }
    });
  };

  const handleDeleteHardcoded = async () => {
    showConfirm("DANGER: This will permanently delete the 9 old hardcoded user records (Venkat, Sharath, etc.) from the database. Are you sure?", async () => {
      try {
        const res = await fetch("/api/admin/users/delete-hardcoded", { method: "DELETE" });
        if (res.ok) {
          showNotification("Hardcoded users removed.");
          fetchUsersList();
        }
      } catch (err) {
        console.error("Delete failed", err);
      }
    });
  };

  const handleResetUserPassword = async (userId: string, userName: string) => {
    showConfirm(`Send a password reset link to ${userName}?`, async () => {
      try {
        const res = await fetch(`/api/users/${userId}/reset-password-email`, {
          method: "POST"
        });
        if (res.ok) {
          showNotification(`Password reset link sent to ${userName}'s email.`, "success");
        } else {
          showNotification("Failed to send reset link.", "error");
        }
      } catch (error) {
        console.error("Reset failed", error);
        showNotification("Failed to send reset link.", "error");
      }
    });
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeData.name || !newEmployeeData.email || !newEmployeeData.department) {
      showNotification("Please fill in all required fields.", "error");
      return;
    }

    setIsAddingEmployee(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployeeData)
      });

      if (res.ok) {
        showNotification("Employee added successfully! Default password is: Intellicar@123", "success");
        setShowAddEmployeeModal(false);
        setNewEmployeeData({ employeeId: '', name: '', email: '', department: '', role: 'USER' });
        fetchUsersList();
      } else {
        const data = await res.json();
        showNotification(`Error: ${data.message || "Failed to add employee"}`, "error");
      }
    } catch (error) {
      console.error("Add employee failed", error);
      showNotification("Network error. Failed to add employee.", "error");
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleExportBackup = async (backup: any) => {
    try {
      const snapshot = typeof backup.snapshot === 'string' ? JSON.parse(backup.snapshot) : backup.snapshot;
      const data = snapshot.data || {};
      
      const workbook = new ExcelJS.Workbook();
      
      for (const tableName in data) {
        const rows = data[tableName];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;
        
        const sheet = workbook.addWorksheet(tableName);
        
        // Add headers
        const headers = Object.keys(rows[0]);
        sheet.addRow(headers);
        
        // Add data
        rows.forEach(row => {
          const values = Object.values(row).map(v => 
            v !== null && typeof v === 'object' ? JSON.stringify(v) : v
          );
          sheet.addRow(values);
        });
        
        // Simple styling
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' }
        };
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `System_Backup_${new Date(backup.createdAt).toISOString().split('T')[0]}_${backup.id}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
      showNotification("Backup exported to Excel successfully!", "success");
    } catch (e) {
      console.error("Export failed", e);
      showNotification("Failed to export backup", "error");
    }
  };

  const handleApproveUser = async (id: string) => {
    showConfirm("Approve this user for access?", async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          showNotification("User approved successfully.");
          fetchUsersList();
        } else {
          showNotification("Failed to approve user.");
        }
      } catch (error) {
        console.error("Approval failed", error);
      }
    });
  };

  const handleRejectUser = async (id: string) => {
    showPrompt("Please provide a reason for rejecting this access request (this will be emailed to the user):", async (comment: string) => {
      try {
        const res = await fetch(`/api/admin/users/${id}/reject`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment })
        });
        if (res.ok) {
          showNotification("Request rejected.");
          fetchUsersList();
        } else {
          showNotification("Failed to reject request.", "error");
        }
      } catch (error) {
        console.error("Rejection failed", error);
        showNotification("An error occurred during rejection.", "error");
      }
    });
  };

  const handleRemoveUser = async (id: string) => {
    showConfirm("Are you sure you want to PERMANENTLY remove this employee? This action cannot be undone.", async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        if (res.ok) {
          showNotification("Employee removed successfully.");
          fetchUsersList();
        } else {
          const data = await res.json();
          showNotification(data.message || "Failed to remove employee.", 'error');
        }
      } catch (error) {
        console.error("Removal failed", error);
      }
    });
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
        showNotification("Failed to update user role.");
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
        // Since originalSettings primarily tracks 'settings' object, we don't strictly need to update it here 
        // unless user management is part of the 'settings' object. 
        // But for the 'dirty' check, clearing pendingUserUpdates is enough for the user section.
        fetchUsersList();
        showNotification("User updates saved successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to save user updates.");
      }
    } catch (error) {
      console.error("Save users error", error);
      showNotification("An error occurred while saving user updates.");
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

  const handleUpdateUserEmployeeId = (userId: string, employeeId: string) => {
    setPendingUserUpdates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], employeeId }
    }));
  };

  const handleUpdate = async (taskId: number, field: string, value: string) => {
    const currentTask = tasks.find(t => t.id === taskId);
    const isReviewNotReq = (t: any) => {
      if (!t) return false;
      const s = (t.reviewStatus || "").trim().toLowerCase();
      const r = (t.reviewerName || "").trim().toLowerCase();
      return s === 'review not required' || s === 'n/a' || s === 'not applicable' || r === 'not applicable' || r === 'n/a';
    };

    if (field === 'reviewCompletionDate' && isReviewNotReq(currentTask)) {
      showNotification("Cannot set review date for tasks where review is not required.", "error");
      setEditingCell(null);
      return;
    }
    try {
      const task = tasks.find(t => t.id === taskId);
      const updates: any = { [field]: value };
      
      // Intelligent Review & Request Lifecycle Logic
      if (field === 'reviewerName') {
        if (value === 'Not Applicable' || value === 'N/A') {
          updates.reviewStatus = 'Review Not Required';
          updates.reviewCompletionDate = null;
        } else if (value) {
          const isFinished = task && (task.taskStatus === 'Completed' || COMPLETION_STATUSES.includes(task.taskStatus) || !!task.completionDate);
          updates.reviewStatus = isFinished ? 'Pending' : 'Task Pending From Owner';
        }
      }
      
      const currentTask = tasks.find(t => t.id === taskId);
      const tStatus = field === 'taskStatus' ? value : (currentTask?.taskStatus || '');
      const tDate = field === 'completionDate' ? value : (currentTask?.completionDate || null);
      const rName = field === 'reviewerName' ? value : (currentTask?.reviewerName || '');
      const rDate = field === 'reviewCompletionDate' ? value : (currentTask?.reviewCompletionDate || null);

      const isTaskFinished = !!tDate || COMPLETION_STATUSES.includes(tStatus);
      const isReviewFinished = rName === 'Not Applicable' || rName === 'N/A' || !!rDate;

      if (currentTask && currentTask.linkedRequestId) {
        // Automatic Reversion to Pending if any condition for completion is lost
        if (!isTaskFinished || !isReviewFinished) {
          updates.requestStatus = 'Pending';
        }
      }

      // Validation: Completion date / Review date cannot be in the future
      if (field === 'completionDate' || field === 'reviewCompletionDate') {
        if (value) {
           const inputDate = new Date(value);
           const today = new Date();
           inputDate.setHours(0,0,0,0);
           today.setHours(0,0,0,0);
           if (inputDate > today) {
             showNotification(`Error: ${field === 'completionDate' ? 'Completion' : 'Review'} date cannot be a future date.`, "error");
             setEditingCell(null);
             return;
           }
        }
      }

      // Review Status Automation
      if (field === 'taskStatus' || field === 'completionDate') {
        if (isTaskFinished && currentTask && rName !== 'Not Applicable' && rName !== 'N/A' && currentTask.reviewStatus === 'Task Pending From Owner') {
          updates.reviewStatus = 'Pending';
        }
      }

      if (field === 'reviewCompletionDate') {
        if (value) {
          // Validation: Review date must be >= Task Completion Date
          if (task && task.completionDate) {
            const tDate = new Date(task.completionDate);
            const rDate = new Date(value);
            
            // Set both to midnight for pure date comparison
            tDate.setHours(0, 0, 0, 0);
            rDate.setHours(0, 0, 0, 0);

            if (rDate < tDate) {
              showNotification(`Error: Review completion date (${value}) cannot be before task completion date (${formatDate(task.completionDate)}).`, "error");
              setEditingCell(null);
              return;
            }
          }
          updates.reviewStatus = 'Completed';
        } else if (task && task.reviewerName !== 'Not Applicable' && task.reviewerName !== 'N/A') {
          updates.reviewStatus = 'Pending';
        }
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchTasks(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.message || "Failed to update. You may not have permission.", "error");
      }
    } catch (error: any) {
      showNotification("Network error or server unreachable", "error");
    }
    setEditingCell(null);
  };

  const handleDeleteTask = async (id: number) => {
    showConfirm("Are you sure you want to completely delete this task? This cannot be undone.", async () => {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        if (res.ok) {
          setTasks(tasks.filter(t => t.id !== id));
          showNotification("Task deleted successfully.");
        }
      } catch (err) {
        console.error("Delete error:", err);
      }
    });
  };

  const handleRequestDelete = async (taskId: number) => {
    showPrompt("Please provide a reason for deleting this task:", async (comment: string) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/request-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: comment })
        });
        if (res.ok) {
          showNotification("Deletion request sent successfully.");
          fetchTasks(true);
        } else {
          showNotification("Failed to send deletion request.");
        }
      } catch (error) {
        console.error("Failed to request delete", error);
      }
    });
  };

  const handleRequestEdit = async (taskId: number, roleType: 'OWNER' | 'REVIEWER') => {
    showPrompt("Please provide a reason for editing this completed task:", async (reason: string) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/request-edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, requestedBy: roleType })
        });
        if (res.ok) {
          showNotification("Edit request sent to Admin successfully.");
          fetchTasks(true);
        } else {
          showNotification("Failed to send edit request.");
        }
      } catch (error) {
        console.error("Failed to request edit", error);
      }
    });
  };

  const handleApproveEdit = async (taskId: number, action: 'APPROVE' | 'REJECT') => {
    showConfirm(`Are you sure you want to ${action.toLowerCase()} this edit request?`, async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/approve-edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        });
        if (res.ok) {
          showNotification(`Edit request ${action.toLowerCase()}d successfully.`);
          fetchTasks(true);
        } else {
          showNotification("Failed to process edit request.", 'error');
        }
      } catch (error) {
        console.error("Failed to process edit", error);
      }
    });
  };

  const handleApproveDelete = async (taskId: number, action: 'APPROVE' | 'REJECT') => {
    showConfirm(`Are you sure you want to ${action.toLowerCase()} this deletion request?`, async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/${action === 'APPROVE' ? 'approve-delete' : 'reject-delete'}`, {
          method: "POST"
        });
        if (res.ok) {
          showNotification(`Deletion request ${action.toLowerCase()}d successfully.`);
          fetchTasks(true);
        } else {
          showNotification("Failed to process deletion request.", 'error');
        }
      } catch (error) {
        console.error("Failed to process deletion", error);
      }
    });
  };

  const handleRequestEditLO = async (loId: number) => {
    showPrompt("Please provide a reason for editing this LO submission:", async (reason: string) => {
      try {
        const res = await fetch(`/api/lo/${loId}/request-edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason })
        });
        if (res.ok) {
          showNotification("Edit request sent to Admin successfully.");
          fetchLOs();
        }
      } catch (error) {
        console.error("Failed to request edit for LO", error);
      }
    });
  };

  const handleRequestDeleteLO = async (loId: number) => {
    showPrompt("Please provide a reason for deleting this LO entry:", async (comment: string) => {
      try {
        const res = await fetch(`/api/lo/${loId}/request-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment })
        });
        if (res.ok) {
          showNotification("Deletion request sent to Admin successfully.");
          fetchLOs();
        }
      } catch (error) {
        console.error("Failed to request delete for LO", error);
      }
    });
  };

  const handleApproveEditLO = async (loId: number, action: 'APPROVE' | 'REJECT') => {
    showConfirm(`Are you sure you want to ${action.toLowerCase()} this edit request?`, async () => {
      try {
        const res = await fetch(`/api/lo/${loId}/approve-edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        });
        if (res.ok) {
          showNotification(`Edit request ${action.toLowerCase()}d successfully.`);
          fetchLOs();
        }
      } catch (error) {
        console.error("Failed to process edit for LO", error);
      }
    });
  };

  const handleApproveDeleteLO = async (loId: number, action: 'APPROVE' | 'REJECT') => {
    showConfirm(`Are you sure you want to ${action.toLowerCase()} this deletion request?`, async () => {
      try {
        const res = await fetch(`/api/lo/${loId}/approve-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        });
        if (res.ok) {
          showNotification(`Deletion request ${action.toLowerCase()}d successfully.`);
          fetchLOs();
        }
      } catch (error) {
        console.error("Failed to process deletion for LO", error);
      }
    });
  };

  const handleDeleteLO = async (loId: number) => {
    showConfirm(`Are you sure you want to permanently delete this Learning Opportunity?`, async () => {
      try {
        const res = await fetch(`/api/lo/${loId}/approve-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: 'APPROVE' })
        });
        if (res.ok) {
          showNotification(`Learning Opportunity deleted successfully.`);
          fetchLOs();
        }
      } catch (error) {
        console.error("Failed to delete LO", error);
      }
    });
  };

  const handleSubmitLOCapture = async () => {
    if (!loCaptureForm.learningOpportunity || !loCaptureForm.resolutionProvided) {
      showNotification("Please fill in the Learning Opportunity and Resolution fields.");
      return;
    }

    try {
      const res = await fetch("/api/lo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loCaptureForm),
      });

      if (res.ok) {
        showNotification("Learning Opportunity captured successfully!");
        setShowLOCaptureModal(false);
        fetchLOs(); // Refresh LO list
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(`Failed to capture: ${errData.error || errData.message || res.statusText}`, "error");
      }
    } catch (error: any) {
      console.error("Failed to submit LO capture", error);
      showNotification(`Error: ${error.message || "Unknown error occurred"}`, "error");
    }
  };

  const handleTriggerEmail = async (type: "users" | "manager" | "lo" | "payments") => {
    const label = type === 'users' ? 'Employee Reminders' : type === 'manager' ? 'Manager Report' : type === 'lo' ? 'LO Report' : 'Payment Report';
    showConfirm(`Are you sure you want to send the ${label} now?`, async () => {
      try {
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60 * 1000;
        const localIso = new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
        
        const res = await fetch(`/api/cron/daily-summary?type=${type}&clientDate=${localIso}`, {
          headers: { "Authorization": "Bearer intellicar-cron-123" }
        });
        if (res.ok) {
          showNotification("Emails sent successfully!");
        } else {
          const data = await res.json();
          showNotification(`Failed to send emails: ${data.error || data.message || "Unknown error"}`, 'error');
        }
      } catch (error) {
        console.error("Failed to trigger emails", error);
      }
    });
  };

  const isFinished = (t: any) => 
    t.taskStatus === "Completed" || 
    COMPLETION_STATUSES.includes(t.taskStatus) || 
    !!t.completionDate;

  // New Base Filtered Tasks for Metrics (ignores activeFilter only)
  const baseFilteredTasks = tasks.filter(t => {
    // 0. Admin View Mode Filter
    if (isAdmin && !isAdminViewMode) {
      const ownerEmail = getEmailFromName(t.ownerName);
      const reviewerEmail = getEmailFromName(t.reviewerName);
      const isOwner = ownerEmail?.toLowerCase() === user?.email?.toLowerCase();
      const isReviewer = (reviewerEmail || "").toLowerCase() === user?.email?.toLowerCase();
      if (!isOwner && !isReviewer) return false;
    }


    if (t.isApproved === false) return false;

    // Date Match
    if (startDate || endDate) {
      const taskDate = new Date(t.createdAt);
      taskDate.setHours(0, 0, 0, 0);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (taskDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (taskDate > end) return false;
      }
    }

    // Search Match
    if (taskSearchQuery) {
      const q = taskSearchQuery.toLowerCase();
      if (!(t.taskName.toLowerCase().includes(q) || 
          t.taskType.toLowerCase().includes(q) || 
          t.entityName.toLowerCase().includes(q) || 
          t.ownerName.toLowerCase().includes(q) ||
          String(t.id).toLowerCase().includes(q) ||
          (t.displayId || "").toLowerCase().includes(q) ||
          (t.reviewerName || "").toLowerCase().includes(q))) return false;
    }

    // Dropdown Match
    if (taskEntityFilter.length > 0 && !taskEntityFilter.includes(t.entityName)) return false;
    if (taskDeptFilter.length > 0 && !taskDeptFilter.includes(t.departmentName)) return false;
    if (taskOwnerFilter.length > 0 && !taskOwnerFilter.includes(t.ownerName)) return false;
    if (taskStatusFilter.length > 0) {
      const currentTracking = t.trackingStatus || getTrackingStatus({ taskStatus: t.taskStatus, dueDate: t.dueDate, completionDate: t.completionDate });
      if (!taskStatusFilter.includes(currentTracking) && !taskStatusFilter.includes(t.taskStatus)) return false;
    }
    if (taskReviewerFilter.length > 0 && !taskReviewerFilter.includes(t.reviewerName || "")) return false;
    if (taskSourceFilter.length > 0 && !taskSourceFilter.includes((t as any).source || 'TDB')) return false;
    if (taskFrequencyFilter.length > 0 && !taskFrequencyFilter.includes(t.frequency || 'Ad')) return false;
    
    // Task Type Match
    const isActuallyExternal = !!t.linkedRequestId && t.departmentName !== "Finance";
    if (taskTypeFilter.length > 0) {
      if (taskTypeFilter.includes("INTERNAL") && taskTypeFilter.includes("EXTERNAL")) { /* Show all */ }
      else if (taskTypeFilter.includes("INTERNAL") && isActuallyExternal) return false;
      else if (taskTypeFilter.includes("EXTERNAL") && !isActuallyExternal) return false;
    }

    return true;
  });

  const pendingActionCount = baseFilteredTasks.filter(t => !isFinished(t)).length;
  
  const pendingReviewCount = baseFilteredTasks.filter(t => 
    isFinished(t) && 
    (t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner") && 
    t.reviewerName !== "Not Applicable"
  ).length;

  const pendingStatusUpdateCount = baseFilteredTasks.filter(t => 
    isFinished(t) && 
    (t.reviewStatus === "Completed" || t.reviewerName === "Not Applicable" || t.reviewStatus === "Review Not Required") && 
    t.requestStatus !== "Processed"
  ).length;

  const completedCount = baseFilteredTasks.filter(t => 
    isFinished(t) && 
    (t.reviewStatus === "Completed" || t.reviewStatus === "Review Not Required" || t.reviewerName === "Not Applicable") && 
    t.requestStatus === "Processed"
  ).length;

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  // Format date as DD-MMM-YYYY
  const formatDate = (date: string | Date | null) => {
    if (!date) return "Not Set";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const taskAnalyticsData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    const todayNum = new Date(currentYear, currentMonth, currentDate).getTime();

    const isDateBeforeToday = (dateStr: string | Date) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const taskYear = d.getFullYear();
      const taskMonth = d.getMonth();
      const taskDate = d.getDate();

      // EXPLICIT BYPASS: If it's exactly today (Local Time), it is NOT overdue
      if (taskYear === currentYear && taskMonth === currentMonth && taskDate === currentDate) {
        return false;
      }

      const taskDateNum = new Date(taskYear, taskMonth, taskDate).getTime();
      return taskDateNum < todayNum;
    };

    const isDateSameOrBefore = (dateStr1: string | Date, dateStr2: string | Date) => {
      if (!dateStr1 || !dateStr2) return false;
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      const n1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
      const n2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
      return n1 <= n2;
    };

    const filteredTasks = tasks.filter(t => {
      const matchesEntity = anaTaskEntityFilter === 'ALL' || t.entityName === anaTaskEntityFilter;
      const matchesDept = anaTaskDeptFilter === 'ALL' || t.departmentName === anaTaskDeptFilter;
      const matchesUser = anaTaskUserFilter === 'ALL' || t.ownerName === anaTaskUserFilter || (t.reviewerName || "") === anaTaskUserFilter;
      
      const tDate = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
      const start = new Date(anaStartDate);
      const end = new Date(anaEndDate);
      // Normalize to midnight for comparison
      const tn = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime();
      const sn = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const en = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      
      const matchesDate = tn >= sn && tn <= en;
      
      return matchesEntity && matchesDept && matchesUser && matchesDate;
    });

    const filteredIDR = externalRequests.filter(r => {
      const matchesDept = anaTaskDeptFilter === 'ALL' || r.departmentName === anaTaskDeptFilter;
      const matchesUser = anaTaskUserFilter === 'ALL' || r.requesterEmail.toLowerCase().includes(anaTaskUserFilter.toLowerCase());
      
      const rDate = new Date(r.createdAt);
      const start = new Date(anaStartDate);
      const end = new Date(anaEndDate);
      const rn = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()).getTime();
      const sn = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const en = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      
      const matchesDate = rn >= sn && rn <= en;

      return matchesDept && matchesUser && matchesDate;
    });

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => isFinished(t)).length;
    
    const onTimeTasks = filteredTasks.filter(t => {
      if (!isFinished(t) || !t.dueDate || !t.completionDate) return false;
      return isDateSameOrBefore(t.completionDate, t.dueDate);
    }).length;

    const overdueTasks = filteredTasks.filter(t => {
      if (isFinished(t) || !t.dueDate) return false;
      return isDateBeforeToday(t.dueDate);
    }).length;

    const lateTasks = filteredTasks.filter(t => {
      if (!isFinished(t) || !t.dueDate || !t.completionDate) return false;
      return !isDateSameOrBefore(t.completionDate, t.dueDate);
    }).length;

    const totalIDR = filteredIDR.length;
    const convertedIDR = filteredIDR.filter(r => !!r.convertedTaskId).length;
    const completedIDR = filteredIDR.filter(r => r.status === 'Processed').length;

    const users = Array.from(new Set(filteredTasks.map(t => t.ownerName)));
    const userPerformance = users.map(user => {
      const uTasks = filteredTasks.filter(t => t.ownerName === user);
      const uCompleted = uTasks.filter(t => isFinished(t)).length;
      
      const uOnTime = uTasks.filter(t => {
        if (!isFinished(t) || !t.dueDate || !t.completionDate) return false;
        return isDateSameOrBefore(t.completionDate, t.dueDate);
      }).length;

      const uLate = uTasks.filter(t => {
        if (!isFinished(t) || !t.dueDate || !t.completionDate) return false;
        return !isDateSameOrBefore(t.completionDate, t.dueDate);
      }).length;

      const uOverdue = uTasks.filter(t => {
        if (isFinished(t) || !t.dueDate) return false;
        return isDateBeforeToday(t.dueDate);
      }).length;
      
      return {
        name: user,
        total: uTasks.length,
        completed: uCompleted,
        onTime: uOnTime,
        late: uLate,
        overdue: uOverdue,
        rate: uTasks.length > 0 ? Math.round((uOnTime / uTasks.length) * 100) : 0
      };
    }).sort((a, b) => b.total - a.total);


    const depts = Array.from(new Set(filteredTasks.map(t => t.departmentName)));
    const deptWorkload = depts.map(dept => {
        const dTasks = filteredTasks.filter(t => t.departmentName === dept);
        return {
            name: dept,
            count: dTasks.length,
            completed: dTasks.filter(t => isFinished(t)).length
        }
    }).sort((a, b) => b.count - a.count);

    // Trend Analysis (Last 6 Months)
    const last6Months: { month: string; year: number; created: number; completed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.push({
            month: MONTHS[d.getMonth()],
            year: d.getFullYear(),
            created: 0,
            completed: 0
        });
    }

    filteredTasks.forEach(t => {
        const cDate = new Date(t.createdAt);
        const compDate = t.completionDate ? new Date(t.completionDate) : null;
        
        last6Months.forEach(m => {
            if (m.month === MONTHS[cDate.getMonth()] && m.year === cDate.getFullYear()) {
                m.created++;
            }
            if (compDate && m.month === MONTHS[compDate.getMonth()] && m.year === compDate.getFullYear()) {
                m.completed++;
            }
        });
    });

    // Source Distribution
    const sources = {
        'IDR': filteredTasks.filter(t => (t as any).source === 'IDR' || !!t.linkedRequestId).length,
        'TDB': filteredTasks.filter(t => (t as any).source === 'TDB' || (!t.linkedRequestId && !(t as any).isRecurring)).length,
        'Recurring': filteredTasks.filter(t => (t as any).isRecurring || (t as any).source === 'RECURRING').length
    };

    return {
      totalTasks,
      completedTasks,
      onTimeTasks,
      overdueTasks,
      lateTasks,
      totalIDR,
      convertedIDR,
      completedIDR,
      userPerformance,
      deptWorkload,
      trends: last6Months,
      sources,
      filteredTasks,
      filteredIDR
    };
  }, [tasks, externalRequests, anaTaskEntityFilter, anaTaskDeptFilter, anaTaskUserFilter]);

  // Format date and time as DD-MMM-YYYY HH:mm
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  };

  const parseExcelDate = (val: any) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    const s = String(val).trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts[0].length === 4) return s; // YYYY-MM-DD
      if (parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MMM-YYYY (e.g. 21-04-2026)
    }
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MMM-YYYY (e.g. 21/04/2026)
    }
    try { return new Date(val).toISOString().split('T')[0]; } catch { return s; }
  };

  const filteredTasksToDisplay = tasks.filter(t => {
    // 0. Admin View Mode Filter
    if (isAdmin && !isAdminViewMode) {
      const ownerEmail = getEmailFromName(t.ownerName)?.toLowerCase();
      const reviewerEmail = getEmailFromName(t.reviewerName)?.toLowerCase();
      const creatorEmail = (t as any).createdByEmail?.toLowerCase();
      const currentUserEmail = user?.email?.toLowerCase();

      const isOwner = ownerEmail === currentUserEmail;
      const isReviewer = (reviewerEmail || "") === currentUserEmail;
      const isCreator = creatorEmail === currentUserEmail;

      if (!isOwner && !isReviewer && !isCreator) return false;
    }

    // Basic Approval Filter
    if (t.isApproved === false) return false;

    // 1. Status Filter (Metric Cards)
    let statusMatch = true;
    if (activeFilter === 'PENDING_ACTION') {
      statusMatch = !isFinished(t);
    }
    if (activeFilter === 'PENDING_REVIEW') {
      statusMatch = isFinished(t) && (t.reviewStatus === "Pending" || t.reviewStatus === "Task Pending From Owner") && t.reviewerName !== "Not Applicable";
    }
    if (activeFilter === 'PENDING_STATUS_UPDATE') {
      statusMatch = isFinished(t) && (t.reviewStatus === "Completed" || t.reviewerName === "Not Applicable" || t.reviewStatus === "Review Not Required") && t.requestStatus !== "Processed";
    }
    if (activeFilter === 'COMPLETED') {
      statusMatch = isFinished(t) && (t.reviewStatus === "Completed" || t.reviewStatus === "Review Not Required" || t.reviewerName === "Not Applicable") && t.requestStatus === 'Processed';
    }
    
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
        String(t.id).toLowerCase().includes(q) ||
        (t.displayId || "").toLowerCase().includes(q) ||
        (t.reviewerName || "").toLowerCase().includes(q);
    }

    // 4. Dropdown Filters
    let dropdownMatch = true;
    if (taskEntityFilter.length > 0 && !taskEntityFilter.includes(t.entityName)) dropdownMatch = false;
    if (taskDeptFilter.length > 0 && !taskDeptFilter.includes(t.departmentName)) dropdownMatch = false;
    if (taskOwnerFilter.length > 0 && !taskOwnerFilter.includes(t.ownerName)) dropdownMatch = false;
    if (taskStatusFilter.length > 0) {
      const currentTracking = t.trackingStatus || getTrackingStatus({ taskStatus: t.taskStatus, dueDate: t.dueDate, completionDate: t.completionDate });
      if (!taskStatusFilter.includes(currentTracking) && !taskStatusFilter.includes(t.taskStatus)) {
        dropdownMatch = false;
      }
    }
    if (taskReviewerFilter.length > 0 && !taskReviewerFilter.includes(t.reviewerName || "")) dropdownMatch = false;
    if (taskSourceFilter.length > 0 && !taskSourceFilter.includes((t as any).source || 'TDB')) dropdownMatch = false;
    if (taskFrequencyFilter.length > 0 && !taskFrequencyFilter.includes(t.frequency || 'Ad')) dropdownMatch = false;
    
    // 5. Task Type Filter
    const isActuallyExternal = !!t.linkedRequestId && t.departmentName !== "Finance";
    
    if (taskTypeFilter.length > 0) {
      if (taskTypeFilter.includes("INTERNAL") && taskTypeFilter.includes("EXTERNAL")) {
        // Both selected = Show All (dropdownMatch remains true)
      } else if (taskTypeFilter.includes("INTERNAL") && isActuallyExternal) {
        dropdownMatch = false;
      } else if (taskTypeFilter.includes("EXTERNAL") && !isActuallyExternal) {
        dropdownMatch = false;
      }
    }

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
  const uniqueTaskDepts = Array.from(new Set(tasks.map(t => t.departmentName))).sort();
  const uniqueTaskOwners = Array.from(new Set(tasks.map(t => t.ownerName))).sort();
  const uniqueTaskStatuses = Array.from(new Set(tasks.map(t => t.taskStatus))).sort();
  const uniqueTaskReviewers = Array.from(new Set(tasks.map(t => t.reviewerName).filter((r): r is string => !!r && r !== "Not Applicable"))).sort();
  const uniqueTaskSources = ['TDB', 'IDR', 'RA', 'BULK'];
  const uniqueTaskFrequencies = Array.from(new Set(tasks.map(t => t.frequency || 'Ad'))).sort();

  // Unique values for LO filters and analytics
  const uniqueLOEntities = Array.from(new Set(los.map(l => l.entity))).sort();
  const uniqueLOIdentifiedBy = Array.from(new Set(los.map(l => l.identifiedBy))).sort();

  // Learning Opportunity Filtering and Sorting
  const filteredLOsToDisplay = los.filter(lo => {
    // 0. Admin View Mode Filter
    if (isAdmin && !isAdminViewMode) {
      const identifiedByEmail = getEmailFromName(lo.identifiedBy);
      const committedByEmail = getEmailFromName(lo.committedBy);
      const isIdentifiedByMe = identifiedByEmail?.toLowerCase() === user?.email?.toLowerCase();
      const isCommittedByMe = committedByEmail?.toLowerCase() === user?.email?.toLowerCase();
      if (!isIdentifiedByMe && !isCommittedByMe) return false;
    }

    // 1. Metric Filter (My Reports / My Learnings)
    let typeMatch = true;
    if (loActiveFilter === 'REPORTS') {
      const myName = user?.name || user?.email;
      typeMatch = lo.identifiedBy === myName;
    } else if (loActiveFilter === 'LEARNINGS') {
      const myName = user?.name || user?.email;
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
    if (loEntityFilter.length > 0 && !loEntityFilter.includes(lo.entity)) entityMatch = false;

    // 4. Date Filter (Universal & Timezone-Safe)
    let dateMatch = true;
    if (loDateFrom || loDateTo) {
      // Convert UTC timestamp to Local YYYY-MM-DD for accurate comparison
      const d = new Date(lo.dateOfIdentification);
      const loDateLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (loDateFrom && loDateLocal < loDateFrom) dateMatch = false;
      if (loDateTo && loDateLocal > loDateTo) dateMatch = false;
    }

    // 5. Identified By Filter
    let identifiedByMatch = true;
    if (loIdentifiedByFilter.length > 0 && !loIdentifiedByFilter.includes(lo.identifiedBy)) identifiedByMatch = false;

    // 6. Committed By Filter
    let committedByMatch = true;
    if (loCommittedByFilter.length > 0 && !loCommittedByFilter.includes(lo.committedBy)) committedByMatch = false;

    return typeMatch && searchMatch && entityMatch && dateMatch && identifiedByMatch && committedByMatch;
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

  const totalLOPages = Math.ceil(sortedLOs.length / loItemsPerPage);
  const paginatedLOs = sortedLOs.slice((loCurrentPage - 1) * loItemsPerPage, loCurrentPage * loItemsPerPage);



  useEffect(() => {
    if (activeView === 'LOS') {
      fetchResources();
    }
  }, [activeView]);

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

  const handleDeleteResource = async (id: number) => {
    showConfirm("Are you sure you want to delete this resource?", async () => {
      try {
        const res = await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
        if (res.ok) {
          showNotification("Resource deleted successfully");
          fetchResources();
        }
      } catch (error) {
        console.error("Failed to delete resource", error);
      }
    });
  };

  const handleAcknowledgeLO = async () => {
    if (!acknowledgingLO) return;
    try {
      const res = await fetch("/api/lo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: acknowledgingLO.id,
          isAcknowledged: true,
          learnerComments: ackComments
        })
      });

      if (res.ok) {
        showNotification("Learning Opportunity acknowledged successfully!");
        setAcknowledgingLO(null);
        fetchLOs();
      } else {
        const data = await res.json();
        showNotification(data.message || "Acknowledgement failed", "error");
      }
    } catch (err) {
      console.error("Bulk upload error", err);
    }
  };
  
  const generateLOReportData = () => {
    const filtered = los.filter(lo => {
      const matchesEntity = anaEntityFilter === 'ALL' || lo.entity === anaEntityFilter;
      const matchesUser = anaUserFilter === 'ALL' || lo.identifiedBy === anaUserFilter || lo.committedBy === anaUserFilter;
      return matchesEntity && matchesUser;
    });
    
    const stats = {
      total: filtered.length,
      ack: filtered.filter(l => l.isAcknowledged).length,
      pending: filtered.length - filtered.filter(l => l.isAcknowledged).length,
      resources: resources.length
    };

    const userSummary = Array.from(new Set(filtered.map(l => l.identifiedBy))).map(user => ({
      name: user,
      reported: filtered.filter(l => l.identifiedBy === user).length,
      resolved: filtered.filter(l => l.identifiedBy === user && l.isAcknowledged).length
    }));

    const entitySummary = Array.from(new Set(filtered.map(l => l.entity))).map(ent => ({
      name: ent,
      total: filtered.filter(l => l.entity === ent).length,
      resolved: filtered.filter(l => l.entity === ent && l.isAcknowledged).length
    }));

    return { filtered, stats, userSummary, entitySummary };
  };

  const handleAnaExportExcel = async () => {
    const { filtered, stats, userSummary, entitySummary } = generateLOReportData();
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Executive Summary
    const summarySheet = workbook.addWorksheet('Executive Summary');
    summarySheet.columns = [{ header: 'Category', key: 'cat', width: 30 }, { header: 'Value', key: 'val', width: 20 }];
    summarySheet.addRow({ cat: 'TOTAL FINDINGS', val: stats.total });
    summarySheet.addRow({ cat: 'ACKNOWLEDGED', val: stats.ack });
    summarySheet.addRow({ cat: 'PENDING REVIEW', val: stats.pending });
    summarySheet.addRow({});
    
    summarySheet.addRow({ cat: 'USER PERFORMANCE' });
    userSummary.forEach(u => summarySheet.addRow({ cat: u.name, val: `${u.resolved}/${u.reported} Resolved` }));
    summarySheet.addRow({});

    summarySheet.addRow({ cat: 'ENTITY SUMMARY' });
    entitySummary.forEach(e => summarySheet.addRow({ cat: e.name, val: `${e.total} Total` }));

    // Sheet 2: Detailed Log
    const logSheet = workbook.addWorksheet('Detailed LO Log');
    logSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Entity', key: 'entity', width: 20 },
      { header: 'Finding', key: 'finding', width: 50 },
      { header: 'Identified By', key: 'by', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    filtered.forEach(lo => logSheet.addRow({
      date: formatDate(lo.dateOfIdentification),
      entity: lo.entity,
      finding: lo.learningOpportunity,
      by: lo.identifiedBy,
      status: lo.isAcknowledged ? 'Acknowledged' : 'Pending'
    }));

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `LO_Report_${formatDate(new Date())}.xlsx`);
  };

  const handleAnaExportPDF = async () => {
    const { filtered, stats, userSummary, entitySummary } = generateLOReportData();
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('LO Analytics & Reporting', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, 14, 30);
    doc.text(`Filters: Entity: ${anaEntityFilter} | User: ${anaUserFilter}`, 14, 35);

    // KPI Cards
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Count']],
      body: [
        ['Total Findings', stats.total],
        ['Acknowledged', stats.ack],
        ['Pending Review', stats.pending]
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // User Table
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('User Performance', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['User', 'Found', 'Resolved']],
      body: userSummary.map(u => [u.name, u.reported, u.resolved]),
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`LO_Report_${formatDate(new Date())}.pdf`);
    return doc.output('blob');
  };

  const handleAnaShareEmail = async () => {
    if (anaShareConfig.recipients.length === 0) return;
    setAnaShareLoading(true);
    try {
      const { filtered, stats, userSummary, entitySummary } = generateLOReportData();
      const attachments: any[] = [];

      if (anaShareConfig.format === 'excel' || anaShareConfig.format === 'both') {
        const buffer = await generateProfessionalLOExcel({
          los: filtered,
          stats,
          userSummary,
          entitySummary,
          filters: { entity: anaEntityFilter, user: anaUserFilter },
          generatedBy: user?.name || user?.email || 'Admin'
        }, 'buffer');
        attachments.push({ filename: 'LO_Analytics_Report.xlsx', content: Buffer.from(buffer as any).toString('base64'), encoding: 'base64' });
      }

      if (anaShareConfig.format === 'pdf' || anaShareConfig.format === 'both') {
        const buffer = await generateProfessionalLOPDF({
          stats,
          userSummary,
          entitySummary,
          filters: { entity: anaEntityFilter, user: anaUserFilter },
          generatedBy: user?.name || user?.email || 'Admin'
        }, 'buffer');
        attachments.push({ filename: 'LO_Analytics_Report.pdf', content: Buffer.from(buffer as any).toString('base64'), encoding: 'base64' });
      }

      const emailHtml = generateProfessionalReportEmail({
        title: 'LO Analytics & Reporting',
        subtitle: `Report generated for Entity: ${anaEntityFilter} | Scope: ${anaUserFilter}`,
        metrics: [
          { label: 'Total Findings', value: stats.total },
          { label: 'Acknowledged', value: stats.ack, color: BRAND_COLORS.SUCCESS },
          { label: 'Pending Review', value: stats.pending, color: BRAND_COLORS.WARNING }
        ],
        summaryText: `The current LO pipeline shows ${stats.total} total findings, with ${Math.round((stats.ack/stats.total)*100)}% acknowledged. Please review the attached detailed logs for user-specific performance.`,
        ctaLink: 'https://v0-finpulse.vercel.app'
      });

      const res = await fetch('/api/lo-analytics/share-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: anaShareConfig.recipients.join(','),
          cc: anaShareConfig.ccEmails.join(',') || undefined,
          subject: anaShareConfig.subject,
          html: emailHtml,
          attachments
        })
      });

      if (!res.ok) throw new Error('Failed to send mail');
      showNotification('LO Analytics report shared successfully!');
      setShowAnaShareModal(false);
      setAnaShareConfig({ recipients: [], ccEmails: [], recipientInput: '', ccInput: '', format: 'excel', subject: `LO Analytics Report - ${formatDate(new Date())}`, reportType: 'lo' });
    } catch (err: any) {
      showNotification('Error sharing report: ' + err.message);
    } finally {
      setAnaShareLoading(false);
    }
  };

  const handleTaskAnaExportExcel = async () => {
    const { filteredTasks, filteredIDR } = taskAnalyticsData;
    await generateProfessionalExcelReport({
      tasks: filteredTasks,
      idrs: filteredIDR,
      los: los,
      analytics: taskAnalyticsData,
      filters: { 
        entity: anaTaskEntityFilter, 
        dept: anaTaskDeptFilter, 
        user: anaTaskUserFilter 
      },
      generatedBy: user?.name || user?.email || 'Admin'
    });
  };

  const handleTaskAnaExportPDF = async () => {
    const { filteredTasks } = taskAnalyticsData;
    await generateProfessionalPDFReport({
      tasks: filteredTasks,
      analytics: taskAnalyticsData,
      filters: { 
        entity: anaTaskEntityFilter, 
        dept: anaTaskDeptFilter, 
        user: anaTaskUserFilter 
      },
      generatedBy: user?.name || user?.email || 'Admin'
    });
  };

  const handleTaskAnaShareEmail = async () => {
    if (anaShareConfig.recipients.length === 0) return;
    setAnaShareLoading(true);
    try {
      const { filteredTasks, filteredIDR } = taskAnalyticsData;
      const attachments: any[] = [];

      if (anaShareConfig.format === 'excel' || anaShareConfig.format === 'both') {
        const buffer = await generateProfessionalExcelReport({
          tasks: filteredTasks,
          idrs: filteredIDR,
          los: los,
          analytics: taskAnalyticsData,
          filters: { 
            entity: anaTaskEntityFilter, 
            dept: anaTaskDeptFilter, 
            user: anaTaskUserFilter 
          },
          generatedBy: user?.name || user?.email || 'Admin'
        }, 'buffer');
        attachments.push({ filename: 'Task_Analytics_Report.xlsx', content: Buffer.from(buffer as any).toString('base64'), encoding: 'base64' });
      }

      if (anaShareConfig.format === 'pdf' || anaShareConfig.format === 'both') {
        const buffer = await generateProfessionalPDFReport({
          tasks: filteredTasks,
          analytics: taskAnalyticsData,
          filters: { 
            entity: anaTaskEntityFilter, 
            dept: anaTaskDeptFilter, 
            user: anaTaskUserFilter 
          },
          generatedBy: user?.name || user?.email || 'Admin'
        }, 'buffer');
        attachments.push({ filename: 'Task_Analytics_Report.pdf', content: Buffer.from(buffer as any).toString('base64'), encoding: 'base64' });
      }

      const emailHtml = generateProfessionalReportEmail({
        title: 'Task Analytics & Performance',
        subtitle: `Performance Report | Entity: ${anaTaskEntityFilter} | Dept: ${anaTaskDeptFilter}`,
        metrics: [
          { label: 'Total Tasks', value: taskAnalyticsData.totalTasks },
          { label: 'On-Time %', value: `${taskAnalyticsData.totalTasks > 0 ? Math.round((taskAnalyticsData.onTimeTasks / taskAnalyticsData.totalTasks) * 100) : 0}%`, color: BRAND_COLORS.SUCCESS },
          { label: 'Overdue', value: taskAnalyticsData.overdueTasks, color: BRAND_COLORS.DANGER }
        ],
        summaryText: `Summary of task distribution and performance across selected filters. On-time completion is currently at ${taskAnalyticsData.totalTasks > 0 ? Math.round((taskAnalyticsData.onTimeTasks / taskAnalyticsData.totalTasks) * 100) : 0}%.`,
        ctaLink: 'https://v0-finpulse.vercel.app'
      });

      const res = await fetch('/api/lo-analytics/share-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: anaShareConfig.recipients.join(','),
          cc: anaShareConfig.ccEmails.join(',') || undefined,
          subject: anaShareConfig.subject,
          html: emailHtml,
          attachments
        })
      });

      if (!res.ok) throw new Error('Failed to send mail');
      showNotification('Task Analytics report shared successfully!');
      setShowAnaShareModal(false);
      setAnaShareConfig({ recipients: [], ccEmails: [], recipientInput: '', ccInput: '', format: 'excel', subject: `Task Analytics Report - ${formatDate(new Date())}`, reportType: 'task' });
    } catch (err: any) {
      showNotification('Error sharing report: ' + err.message);
    } finally {
      setAnaShareLoading(false);
    }
  };


const handleResourceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName.trim()) {
      showNotification("Please enter a resource name.", "error");
      return;
    }
    if (resourceType === 'LINK' && !resourceLink.trim()) {
      showNotification("Please enter a valid link.", "error");
      return;
    }
    if (resourceType === 'FILE' && !resourceFile) {
      showNotification("Please select a file to upload.", "error");
      return;
    }

    setResourcesLoading(true);
    try {
      let finalData = "";
      let finalUrl = resourceLink;
      let finalSubfolderId = resourceSubfolderId;

      // Handle on-the-fly subfolder creation
      if (resourceSubfolderId === "NEW" && newSubfolderName.trim()) {
        try {
          const res = await fetch("/api/resources/subfolders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newSubfolderName, category: resourceCategory })
          });
          
          if (res.ok) {
            const newFolder = await res.json();
            finalSubfolderId = newFolder.id;
            // Update subfolders list locally so it shows up in future selects
            setSubfolders(prev => [...prev, newFolder]);
          } else {
            const errorData = await res.json();
            showNotification(`Failed to create subfolder: ${errorData.message}${errorData.error ? ` (${errorData.error})` : ""}`, "error");
            setResourcesLoading(false);
            return;
          }
        } catch (err) {
          showNotification("Connection error while creating subfolder", "error");
          setResourcesLoading(false);
          return;
        }
      }

      if (resourceType === 'FILE' && resourceFile) {
        // Upload to Vercel Blob
        const response = await fetch(
          `/api/upload?filename=${encodeURIComponent(resourceFile.name)}`,
          {
            method: 'POST',
            body: resourceFile,
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to upload file to storage");
        }

        const blob = await response.json();
        finalData = blob.url; // Use blob URL as data
        finalUrl = blob.url;
      }

      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resourceName,
          type: resourceType,
          url: finalUrl,
          data: finalData,
          category: resourceCategory,
          department: resourceCategory,
          subfolderId: finalSubfolderId || null
        })
      });

      if (res.ok) {
        const newResource = await res.json();
        setResources(prev => [newResource, ...prev]);
        showNotification("Resource added successfully!", "success");
        setShowResourceModal(false);
        setResourceName("");
        setResourceLink("");
        setResourceFile(null);
        setResourceSubfolderId("");
        setNewSubfolderName("");
      } else {
        const errorData = await res.json();
        showNotification(`Failed to save resource: ${errorData.message || "Unknown error"}`, "error");
      }
    } catch (error: any) {
      console.error("Failed to upload resource", error);
      showNotification(`Upload error: ${error.message}`, "error");
    } finally {
      setResourcesLoading(false);
    }
  };


  const handleUserSort = (key: string) => {
    setUserSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedUsers = useMemo(() => {
    let items = usersList.filter(u => {
      const matchesSearch = !userSearchQuery || 
        (u.name?.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        (u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        ((u as any).employeeId?.toLowerCase().includes(userSearchQuery.toLowerCase()));
      
      const matchesDept = userDeptFilter === "ALL" || u.department === userDeptFilter;
      const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      
      return matchesSearch && matchesDept && matchesRole;
    });

    if (userSortConfig) {
      items.sort((a: any, b: any) => {
        let valA = a[userSortConfig.key] || "";
        let valB = b[userSortConfig.key] || "";
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return userSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return userSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [usersList, userSortConfig, userSearchQuery, userDeptFilter, userRoleFilter]);

  // Base visibility filter for External Requests
  const visibleExternalRequests = externalRequests.filter(r => {
    // Admins and Super Admins see everything
    if ((isAdmin && isAdminViewMode) || user?.role === 'SUPER_ADMIN') return true;
    
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
      const matches = 
        r.natureOfRequest.toLowerCase().includes(q) || 
        r.requestFrom.toLowerCase().includes(q) ||
        (r.convertedTaskId?.toString().toLowerCase().includes(q)) ||
        ((r as any).taskDisplayId?.toLowerCase().includes(q));
        
      if (!matches) return false;
    }
    
    if (extReqStatusFilter.length > 0 && !extReqStatusFilter.includes(r.status || "")) return false;

    // New Request Source Filter (Original vs Transferred)
    if (requestTypeFilter.length > 0) {
      if (requestTypeFilter.includes('ORIGINAL') && !requestTypeFilter.includes('TRANSFERRED') && r.transferStatus === 'T') return false;
      if (requestTypeFilter.includes('TRANSFERRED') && !requestTypeFilter.includes('ORIGINAL') && r.transferStatus !== 'T') return false;
    }

    if (extReqFinanceFunctionFilter.length > 0 && !extReqFinanceFunctionFilter.includes(r.requestType)) return false;

    if (extReqDateFrom && new Date(r.createdAt) < new Date(extReqDateFrom)) return false;
    if (extReqDateTo) {
      const toDate = new Date(extReqDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(r.createdAt) > toDate) return false;
    }

    return true;
  });

  // Base filtered requests for Inter-Dept Metrics (ignores extReqFilter only)
  const baseFilteredExternalRequests = filteredExternalRequests;

  // Apply metric tab selection filter
  const finalFilteredExternalRequests = baseFilteredExternalRequests.filter(r => {
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
    return true;
  });

  const sortedExternalRequests = [...finalFilteredExternalRequests].sort((a, b) => {
    if (!extReqSortConfig) return 0;
    const { key, direction } = extReqSortConfig;
    let valA = (key === 'remarks' ? (a as any).rejectReason : a[key]);
    let valB = (key === 'remarks' ? (b as any).rejectReason : b[key]);

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

  const totalExtReqPages = Math.ceil(sortedExternalRequests.length / extReqItemsPerPage);
  const paginatedExternalRequests = sortedExternalRequests.slice(
    (extReqCurrentPage - 1) * extReqItemsPerPage,
    extReqCurrentPage * extReqItemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, startDate, endDate, itemsPerPage, taskSearchQuery, taskEntityFilter, taskOwnerFilter, taskStatusFilter]);

  useEffect(() => {
    setExtReqCurrentPage(1);
  }, [extReqItemsPerPage, extReqFilter, extReqSearch, extReqStatusFilter, requestTypeFilter, extReqFinanceFunctionFilter, extReqDateFrom, extReqDateTo]);

  // Export Handlers
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks");

    // Row 1: Main Title (Dark Blue background, White text)
    worksheet.mergeCells('A1:AC1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ITPL - Finance Task Management';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const dateStr = `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
    
    // Row 2: Subtitle (Light Blue background, Italicized Blue text)
    worksheet.mergeCells('A2:AC2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Task Report - As of ${dateStr}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; 
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Define Columns and Widths
    worksheet.columns = [
      { width: 8 },  // SI No
      { width: 15 }, // Task ID
      { width: 20 }, // Timestamp
      { width: 25 }, // Created By
      { width: 45 }, // Task Name
      { width: 25 }, // Entity
      { width: 20 }, // Type
      { width: 20 }, // Department
      { width: 20 }, // Requested By
      { width: 25 }, // Owner
      { width: 18 }, // Due Date
      { width: 18 }, // Completion Date
      { width: 25 }, // Completed By
      { width: 18 }, // Status
      { width: 25 }, // Reviewer
      { width: 25 }, // Review Status
      { width: 18 }, // Review Date
      { width: 25 }, // Reviewed By
      { width: 40 }, // Owner Comments
      { width: 40 }, // Reviewer Comments
      { width: 30 }, // Mail Link
      { width: 20 }, // Origin
      { width: 25 }, // Original Category
      { width: 25 }, // Transferred By
      { width: 25 }, // Transferred At
      { width: 25 }, // Processed By
      { width: 20 }, // Processed At
      { width: 20 }, // Comm. Mode
      { width: 30 }  // Processed Mail Link
    ];

    // Row 3: Column Headers (Dark Blue background, White text)
    const headerRow = worksheet.getRow(3);
    const headers = [
      'SI No', 'Task ID', 'Timestamp', 'Created By', 'Task Name', 'Entity', 'Type', 
      'Department', 'Requested By', 'Owner', 'Due Date', 
      'Completion Date', 'Completed By', 'Status', 'Reviewer', 'Review Status', 
      'Review Date', 'Reviewed By', 'Owner Comments', 'Reviewer Comments', 'Mail Sub',
      'Origin', 'Original Category', 'Transferred By', 'Transferred At', 'Processed By', 'Processed At', 'Comm. Mode', 'Processed Mail Link'
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
      const rowData = [
        index + 1,
        t.displayId || `#${t.id}`,
        formatDateTime(t.createdAt),
        getUserDisplayName(t.createdByEmail),
        t.taskName,
        t.entityName,
        t.taskType,
        t.departmentName,
        t.requestFrom,
        t.ownerName,
        formatDate(t.dueDate),
        formatDate(t.completionDate),
        t.completedBy || "N/A",
        t.trackingStatus || getTrackingStatus({ taskStatus: t.taskStatus, dueDate: t.dueDate, completionDate: t.completionDate }),
        t.reviewerName,
        t.reviewStatus,
        formatDate(t.reviewCompletionDate),
        t.reviewedBy || "N/A",
        t.ownerComments || "",
        t.reviewerComments || "",
        t.mailLink || "",
        t.transferStatus === 'T' ? 'Transferred' : 'Original',
        t.originalRequestType || "N/A",
        t.transferredBy || "N/A",
        t.transferredAt ? formatDateTime(t.transferredAt) : "N/A",
        t.processedBy || "N/A",
        t.processedSubmissionAt ? formatDateTime(t.processedSubmissionAt) : "N/A",
        t.processedMode || "N/A",
        t.processedMailLink || "N/A"
      ];
      
      // Security: If not admin/allocator, redact sensitive transfer info
      if (!canAllocateAnything) {
        rowData[23] = "REDACTED"; // Transferred By
        rowData[24] = "REDACTED"; // Transferred At
      }

      const row = worksheet.addRow(rowData);
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
    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ITPL - Finance Learning Opportunity Report';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const dateStr = `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
    
    // Row 2: Subtitle (Light Blue background, Italicized Blue text)
    worksheet.mergeCells('A2:M2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Consolidated Report (All Entries) - As of ${dateStr}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Define column widths
    worksheet.columns = [
      { width: 8 },  // SI No
      { width: 20 }, // Timestamp
      { width: 25 }, // Submitted By
      { width: 20 }, // Identified By
      { width: 20 }, // Committed By
      { width: 20 }, // Date of Identification
      { width: 20 }, // Entity
      { width: 20 }, // Classification
      { width: 45 }, // Learning Opportunity
      { width: 45 }, // Resolution Provided
      { width: 20 }, // Status
      { width: 30 }, // Ack Remarks
      { width: 20 }, // Mode Of Communication
      { width: 30 }, // Email Sub
      { width: 40 }  // Comments
    ];

    // Row 3: Column Headers (Dark Blue background, White text)
    const headerRow = worksheet.getRow(3);
    const headers = [
      'SI No', 'Timestamp', 'Submitted By', 'Identified by', 'Commited By', 'Date of Identification', 'Entity', 'Classification', 'Learning Opportunity', 
      'Resolution Provided', 'Status', 'Ack Remarks', 'Mode Of Communication', 
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
        lo.submittedBy || "Auto",
        lo.identifiedBy,
        lo.committedBy,
        formatDate(lo.dateOfIdentification),
        lo.entity,
        lo.classification || "N/A",
        lo.learningOpportunity,
        lo.resolutionProvided,
        lo.isAcknowledged ? "Acknowledged" : "Pending",
        lo.learnerComments || "--",
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
    doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, 14, 22);

    const tableColumn = ["ID", "Created At", "Created By", "Task Name", "Entity", "Owner", "Due Date", "Comp. Date", "Comp. By", "Status", "Reviewer", "Rev. Status", "Rev. Date", "Rev. By", "Processed By", "Comm. Mode"];
    const tableRows = sortedTasks.map(t => [
      t.displayId || t.id,
      formatDateTime(t.createdAt),
      getUserDisplayName(t.createdByEmail),
      t.taskName,
      t.entityName,
      t.ownerName,
      formatDate(t.dueDate),
      formatDate(t.completionDate),
      t.completedBy || "N/A",
      t.taskStatus,
      t.reviewerName || "N/A",
      t.reviewStatus,
      formatDate(t.reviewCompletionDate),
      t.reviewedBy || "N/A",
      t.processedBy || "N/A",
      t.processedMode || "N/A"
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
    
    const lastCol = canAllocateAnything ? 'Q' : 'M';

    // Row 1: Main Title
    worksheet.mergeCells(`A1:${lastCol}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ITPL - Finance Inter-Departmental Request Report';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const dateStr = `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
    
    // Row 2: Subtitle
    worksheet.mergeCells(`A2:${lastCol}2`);
    const subCell = worksheet.getCell('A2');
    subCell.value = `IDR Report - As of ${dateStr}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Header Row styling will be handled by worksheet.columns automatically for Row 3
    // but we need to account for the 2 title rows before adding data
    const columns = [
      { header: 'Sl No.', key: 'sl', width: 10 },
      { header: 'Task ID', key: 'taskId', width: 15 },
      { header: 'Request From', key: 'requestFrom', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Finance Function', key: 'type', width: 20 },
      { header: 'What is Needed', key: 'nature', width: 40 },
      { header: 'Reason for Request', key: 'reason', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Comm. Mode', key: 'processedMode', width: 20 },
      { header: 'Mail Link', key: 'processedMailLink', width: 30 },
      { header: 'Processed By', key: 'processedBy', width: 25 },
      { header: 'Processed At', key: 'processedAt', width: 25 }
    ];

    if (canAllocateAnything) {
      columns.push(
        { header: 'Request Origin', key: 'origin', width: 20 },
        { header: 'Original Category', key: 'originalType', width: 20 },
        { header: 'Transferred By', key: 'transferredBy', width: 25 },
        { header: 'Transferred At', key: 'transferredAt', width: 25 }
      );
    }

    worksheet.columns = columns;

    // Style the header row (Row 3)
    const headerRow = worksheet.getRow(3);
    headerRow.height = 25;
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
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

    const filteredReqs = sortedExternalRequests;

    sortedExternalRequests.forEach((r, idx) => {
      worksheet.addRow({
        sl: idx + 1,
        taskId: r.taskDisplayId || (r.convertedTaskId ? `#${r.convertedTaskId}` : "N/A"),
        requestFrom: r.requestFrom,
        email: r.requesterEmail,
        date: formatDate(r.createdAt),
        type: r.requestType,
        nature: r.natureOfRequest,
        reason: r.reasonForRequest || "N/A",
        status: r.status || "New",
        processedMode: r.processedMode || "N/A",
        processedMailLink: r.processedMailLink || "N/A",
        processedBy: r.processedBy || "N/A",
        processedAt: r.processedAt ? formatDate(r.processedAt) : "N/A",
        ...(canAllocateAnything ? {
          origin: r.transferStatus === 'T' ? 'Transferred' : 'Original',
          originalType: r.originalRequestType || 'N/A',
          transferredBy: r.transferredBy || 'N/A',
          transferredAt: r.transferredAt ? formatDateTime(r.transferredAt) : 'N/A'
        } : {})
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
    doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, 14, 22);

    const filteredReqs = sortedExternalRequests;

    const tableColumn = ["Sl No.", "Task ID", "From", "Date", "Type", "What is Needed", "Reason", "Status"];
    if (canAllocateAnything) tableColumn.push("Origin", "Original Function", "Transferred By", "Transferred At");

    const tableRows = sortedExternalRequests.map((r, idx) => {
      const row = [
        idx + 1,
        r.taskDisplayId || (r.convertedTaskId ? `#${r.convertedTaskId}` : "N/A"),
        r.requestFrom,
        formatDate(r.createdAt),
        r.requestType,
        r.natureOfRequest,
        r.reasonForRequest || "N/A",
        r.status || "New"
      ];
      if (canAllocateAnything) {
        row.push(
          r.transferStatus === 'T' ? 'Transferred' : 'Original',
          r.originalRequestType || 'N/A',
          r.transferredBy || 'N/A',
          r.transferredAt ? formatDateTime(r.transferredAt) : 'N/A'
        );
      }
      return row;
    });

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
    doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, 14, 22);

    const tableColumn = ["ID", "Submitted At", "Submitted By", "Identified By", "Committed By", "Date", "Entity", "Classification", "Opportunity", "Resolution", "Mode"];
    const tableRows = sortedLOs.map(l => [
      l.id,
      formatDateTime(l.createdAt),
      l.submittedBy || "Auto",
      l.identifiedBy,
      l.committedBy,
      formatDate(l.dateOfIdentification),
      l.entity,
      l.classification || "N/A",
      l.learningOpportunity,
      l.resolutionProvided || "--",
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
    if (recipientTags.length === 0) {
      showNotification("Please add at least one recipient email.");
      return;
    }
    setShareLoading(true);
    try {
      const attachments: any[] = [];
      const now = new Date();
      const dateSuffix = now.toISOString().split('T')[0];
      const subject = shareData.subject || `Shared ${shareData.type === 'task' ? 'Task' : shareData.type === 'lo' ? 'LO' : 'Inter-Dept'} Report`;

      // 1. Generate Excel Attachment if needed
      if (shareData.format === 'excel' || shareData.format === 'both') {
        let buffer;
        let filename;
        const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (shareData.type === 'task') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("Tasks");
          worksheet.addRow(['Shared Tasks Report']);
          worksheet.addRow(['ID', 'Created At', 'Created By', 'Task Name', 'Entity', 'Target Date', 'Status', 'Owner', 'Reviewer']);
          sortedTasks.forEach(t => {
            worksheet.addRow([t.id, formatDateTime(t.createdAt), getUserDisplayName(t.createdByEmail), t.taskName, t.entityName, formatDate(t.dueDate), t.taskStatus, t.ownerName, t.reviewerName]);
          });
          buffer = await workbook.xlsx.writeBuffer();
          filename = `Tasks_Report_${dateSuffix}.xlsx`;
        } else if (shareData.type === 'lo') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("LO Report");
          worksheet.addRow(['Shared LO Report']);
          worksheet.addRow(['ID', 'Entity', 'Date', 'Learning Opportunity', 'Identified By', 'Committed By']);
          sortedLOs.forEach(lo => {
            worksheet.addRow([lo.id, lo.entity, formatDate(lo.dateOfIdentification), lo.learningOpportunity, lo.identifiedBy, lo.committedBy]);
          });
          buffer = await workbook.xlsx.writeBuffer();
          filename = `LO_Report_${dateSuffix}.xlsx`;
        } else if (shareData.type === 'request') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("Requests");
          worksheet.addRow(['Shared Inter-Dept Requests Report']);
          const headers = ['Sl No.', 'Request From', 'Finance Function', 'Nature', 'Status'];
          if (isAdmin) headers.push('Origin', 'Original Function', 'Transferred By');
          worksheet.addRow(headers);
          externalRequests.forEach((r, i) => {
            const row = [i+1, r.requestFrom, r.requestType, r.natureOfRequest, r.status];
            if (isAdmin) row.push(r.transferStatus === 'T' ? 'Transferred' : 'Original', r.originalRequestType || 'N/A', r.transferredBy || 'N/A');
            worksheet.addRow(row);
          });
          buffer = await workbook.xlsx.writeBuffer();
          filename = `Requests_Report_${dateSuffix}.xlsx`;
        }

        if (buffer) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(new Blob([buffer as any]));
          });
          attachments.push({ filename, content: base64, contentType });
        }
      }

      // 2. Generate PDF Attachment if needed
      if (shareData.format === 'pdf' || shareData.format === 'both') {
        let pdfData;
        let filename;
        const contentType = 'application/pdf';

        if (shareData.type === 'task') {
          const doc = new jsPDF('landscape');
          doc.text("Shared Tasks Report", 14, 15);
          autoTable(doc, {
            head: [["ID", "Created At", "Created By", "Task Name", "Entity", "Target Date", "Status", "Owner"]],
            body: sortedTasks.map(t => [t.id, formatDateTime(t.createdAt), getUserDisplayName(t.createdByEmail), t.taskName, t.entityName, formatDate(t.dueDate), t.taskStatus, t.ownerName]),
            startY: 20
          });
          pdfData = doc.output('arraybuffer');
          filename = `Tasks_Report_${dateSuffix}.pdf`;
        } else if (shareData.type === 'lo') {
          const doc = new jsPDF('landscape');
          doc.text("Intellicar Learning Opportunities Report", 14, 15);
          autoTable(doc, {
            head: [["ID", "Entity", "Date", "Mistake / LO", "Identified By", "Committed By"]],
            body: sortedLOs.map(l => [l.id, l.entity, formatDate(l.dateOfIdentification), l.learningOpportunity, l.identifiedBy, l.committedBy]),
            startY: 20
          });
          pdfData = doc.output('arraybuffer');
          filename = `LO_Report_${dateSuffix}.pdf`;
        } else if (shareData.type === 'request') {
          const doc = new jsPDF('landscape');
          doc.text("Shared Inter-Dept Requests Report", 14, 15);
          const headers = [["ID", "From", "Type", "Nature", "Status"]];
          if (isAdmin) headers[0].push("Origin", "Original Function", "Transferred By");
          autoTable(doc, {
            head: headers,
            body: externalRequests.map(r => {
              const row = [r.id, r.requestFrom, r.requestType, r.natureOfRequest, r.status];
              if (isAdmin) row.push(r.transferStatus === 'T' ? 'Transferred' : 'Original', r.originalRequestType || 'N/A', r.transferredBy || 'N/A');
              return row;
            }),
            startY: 20
          });
          pdfData = doc.output('arraybuffer');
          filename = `Requests_Report_${dateSuffix}.pdf`;
        }

        if (pdfData) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(new Blob([pdfData as any]));
          });
          attachments.push({ filename, content: base64, contentType });
        }
      }

      const stats = {
        total: visibleExternalRequests.length,
        pending: visibleExternalRequests.filter(r => (r.status === 'Pending' || r.status === 'Under Process' || !r.status || r.status === 'New') && !r.convertedTaskId).length,
        processed: visibleExternalRequests.filter(r => r.status === 'Processed').length,
        rejected: visibleExternalRequests.filter(r => r.status === 'Rejected').length
      };

      let emailHtml = "";
      if (shareData.type === 'task') {
        emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 32px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Task Management Report</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Operational Insight & Status Overview</p>
              </div>
              <div style="padding: 32px;">
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Please find the consolidated Task report as of <strong>${formatDate(new Date())}</strong>.</p>
                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://v0-finpulse.vercel.app" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">View Dashboard</a>
                </div>
              </div>
              <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">Automated Report from FinPulse</p>
              </div>
            </div>
          </div>
        `;
      } else if (shareData.type === 'lo') {
        emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f2; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Learning Opportunities Report</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Quality Assurance & Compliance Insights</p>
              </div>
              <div style="padding: 32px;">
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Please find the Learning Opportunities tracker report as of <strong>${formatDate(new Date())}</strong>.</p>
                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://v0-finpulse.vercel.app" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">View Dashboard</a>
                </div>
              </div>
              <div style="background-color: #fef2f2; padding: 20px; text-align: center; border-top: 1px solid #fee2e2;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">Automated Report from FinPulse</p>
              </div>
            </div>
          </div>
        `;
      } else if (shareData.type === 'request') {
        emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Inter-Dept Request Report</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Operational Insight & Task Status Overview</p>
              </div>
              <div style="padding: 32px;">
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hello Team,</p>
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Please find the consolidated report of Inter-Departmental requests as of <strong>${formatDate(new Date())}</strong>.</p>
                
                <table style="width: 100%; border-spacing: 12px; margin-bottom: 32px; border-collapse: separate;">
                  <tr>
                    <td style="width: 33%; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                      <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Total</div>
                      <div style="font-size: 24px; font-weight: 800; color: #1e293b;">${stats.total}</div>
                    </td>
                    <td style="width: 33%; background-color: #fffbeb; padding: 20px; border-radius: 12px; border: 1px solid #fef3c7; text-align: center;">
                      <div style="font-size: 11px; color: #b45309; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Pending</div>
                      <div style="font-size: 24px; font-weight: 800; color: #d97706;">${stats.pending}</div>
                    </td>
                    <td style="width: 33%; background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7; text-align: center;">
                      <div style="font-size: 11px; color: #15803d; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Processed</div>
                      <div style="font-size: 24px; font-weight: 800; color: #16a34a;">${stats.processed}</div>
                    </td>
                  </tr>
                </table>

                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://v0-finpulse.vercel.app" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Access Dashboard</a>
                </div>
              </div>
              <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">Automated Report from FinPulse</p>
              </div>
            </div>
          </div>
        `;
      }

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientTags.join(','),
          ccEmail: ccTags.join(','),
          subject,
          body: emailHtml,
          attachments
        })
      });

      if (res.ok) {
        showNotification("Report shared successfully via email!");
        setShowShareModal(false);
        setRecipientTags([]);
        setCcTags([]);
      } else {
        showNotification("Failed to share report.");
      }
    } catch (error) {
      console.error("Share error", error);
      showNotification("An error occurred while sharing the report.");
    } finally {
      setShareLoading(false);
    }
  };

  if (!isHydrated || settingsLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, flexDirection: "column", gap: "20px" }}>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }` }} />
        <Activity size={48} color="#2563eb" style={{ animation: "pulse 2s infinite" }} />
        <p style={{ color: t.textMuted, fontWeight: 500, fontSize: "0.9rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>Initializing Workspace...</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: t.bg, color: t.text, overflow: "hidden", transition: "all 0.3s ease" }}>
      <GlobalStyles />
      {/* Top Navigation Bar (Full Width - Clean White Theme) */}
      <header style={{ 
        height: "80px", width: "100%", 
        background: t.card, 
        display: "flex", 
        alignItems: "center", justifyContent: "space-between", padding: "0 32px", 
        borderBottom: `1px solid ${t.border}`, zIndex: 100, flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.3s ease"
      }}>
        {/* Brand Area with Dynamic Greeting */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", cursor: "pointer" }} 
             onClick={() => { setActiveView('HOME'); setActiveMainView('DASHBOARD'); }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ height: "42px", width: "auto", objectFit: "contain", transition: "transform 0.3s ease" }} 
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.05) rotate(-2deg)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1) rotate(0)"}
            onClick={(e) => {
              e.stopPropagation();
              window.open('https://www.intellicar.in/', '_blank');
            }}
          />
          <div style={{ height: "28px", width: "1px", background: t.border, opacity: 0.6 }}></div>
          <div style={{ animation: "fade-in 0.5s ease-out" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#3b82f6", margin: 0, letterSpacing: "-0.01em" }}>
              {(() => {
                const hour = new Date().getHours();
                let g = "Good Evening";
                if (hour < 12) g = "Good Morning";
                else if (hour < 17) g = "Good Afternoon";
                return `${g}, ${user?.name || "User"}`;
              })()}
            </h3>
            <p style={{ margin: "2px 0 0 0", color: t.textMuted, fontSize: "0.75rem", fontWeight: 500, display: "flex", alignItems: "center" }}>
              FinPulse • Welcome back!
              {isAdmin && isAdminViewMode && (
                <span style={{ 
                  marginLeft: "12px", background: "#f5f3ff", color: "#4f46e5", 
                  padding: "2px 8px", borderRadius: "6px", fontSize: "0.6rem", 
                  fontWeight: 800, textTransform: "uppercase", border: "1px solid #ddd6fe",
                  animation: "fade-in 0.3s ease-out"
                }}>
                  Admin Console
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Global Actions Area */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {/* Live Sync Status */}
          <div 
            title="Real-time data synchronization is active (10s cycle)"
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", 
              background: isDarkMode ? "rgba(16, 185, 129, 0.1)" : "#f0fdf4", 
              padding: "6px 14px", borderRadius: "20px", 
              border: `1px solid ${isDarkMode ? "rgba(16, 185, 129, 0.2)" : "#dcfce7"}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ 
              width: "8px", height: "8px", borderRadius: "50%", background: "#10b981",
              boxShadow: "0 0 10px #10b981",
              animation: "sync-pulse 2s infinite"
            }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#10b981", letterSpacing: "0.05em", textTransform: "uppercase" }}>Live Sync</span>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes sync-pulse {
              0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
              70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
              100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
          `}} />

          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === 'DARK' ? 'LIGHT' : 'DARK')}
            style={{ 
              background: t.bg, border: `1px solid ${t.border}`, color: t.text, 
              width: "40px", height: "40px", borderRadius: "12px", cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "rotate(15deg)"; e.currentTarget.style.borderColor = "#3b82f6"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "rotate(0)"; e.currentTarget.style.borderColor = t.border; }}
            title={`Switch to ${theme === 'DARK' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'DARK' ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#64748b" />}
          </button>

          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: t.text, letterSpacing: "-0.01em" }}>{user.name || "Master Admin"}</div>
            <div style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 500 }}>{user.email}</div>
          </div>
          
          <div style={{ height: "30px", width: "1px", background: t.border, opacity: 0.5 }}></div>

           {isAdmin && (
             <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "4px", borderRadius: "14px", border: "1px solid #e2e8f0", marginRight: "8px" }}>
               <span style={{ 
                 fontSize: "0.75rem", fontWeight: 700, 
                 color: isAdminViewMode ? "#64748b" : "#ffffff", 
                 background: isAdminViewMode ? "transparent" : "#07285c",
                 padding: "6px 12px",
                 borderRadius: "10px",
                 transition: "all 0.3s",
                 cursor: "pointer"
               }}
               onClick={() => setIsAdminViewMode(false)}
               >User View</span>
               <button 
                 onClick={() => setIsAdminViewMode(!isAdminViewMode)}
                 style={{ 
                   width: "44px", height: "24px", background: isAdminViewMode ? "#07285c" : "#e2e8f0", 
                   borderRadius: "20px", border: "none", cursor: "pointer", position: "relative",
                   transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                   boxShadow: isAdminViewMode ? "0 4px 12px rgba(7,40,92,0.2)" : "inset 0 2px 4px rgba(0,0,0,0.05)"
                 }}
               >
                 <div style={{ 
                   position: "absolute", top: "3px", left: isAdminViewMode ? "23px" : "3px",
                   width: "18px", height: "18px", background: "white", borderRadius: "50%",
                   transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                   boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                   display: "flex", alignItems: "center", justifyContent: "center"
                 }}>
                   {isAdminViewMode ? <ShieldCheck size={10} color="#07285c" /> : <User size={10} color="#94a3b8" />}
                 </div>
               </button>
               <span style={{ 
                 fontSize: "0.75rem", fontWeight: 700, 
                 color: isAdminViewMode ? "#ffffff" : "#64748b", 
                 background: isAdminViewMode ? "#07285c" : "transparent",
                 padding: "6px 12px",
                 borderRadius: "10px",
                 transition: "all 0.3s",
                 cursor: "pointer"
               }}
               onClick={() => setIsAdminViewMode(true)}
               >Admin View</span>
             </div>
            )}

           <button 
             onClick={() => { 
               setOriginalSettings(JSON.parse(JSON.stringify(settings)));
               if (isAdmin) {
                 fetchUsersList(); 
                 fetchSettings(); 
                 setActiveOptionsTab('ACCOUNT');
               } else if (canImport) {
                 setActiveOptionsTab('DATA');
               } else {
                 setActiveOptionsTab('ACCOUNT');
               }
               setShowOptionsModal(true); 
             }} 
            className="btn-polish"
            style={{ 
              padding: "10px 18px", background: "#f8fafc", color: "#475569", 
              border: `1px solid #e2e8f0`, borderRadius: "12px", fontWeight: 700, 
              display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", 
              fontSize: "0.8125rem", transition: "all 0.2s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#1e293b"; }}
            onMouseOut={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
          >
            {isAdmin ? <ShieldCheck size={16} /> : canImport ? <Sliders size={16} /> : <Sliders size={16} />}
            {isAdmin ? "Control Center" : canImport ? "Control Center" : "Account Settings"}
          </button>
          
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            style={{ 
              color: "#94a3b8", background: "none", border: "none", cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center", 
              width: "36px", height: "36px", borderRadius: "10px", transition: "all 0.2s" 
            }}
            onMouseOver={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fef2f2"; }}
            onMouseOut={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}
            title="Sign Out"
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
               return (
                <>
                  {/* Home Module */}
                  {(() => {
                    const canSeeHome = isModuleAllowed('Home');
                    if (!canSeeHome) return null;
                    return (
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
                    );
                  })()}
                  {(() => {
                    const canSeeTasks = isModuleAllowed('Tasks');
                    const canSeeRequests = isModuleAllowed('Requests');
                    const canSeeLearning = isModuleAllowed('Learning');
                    const canSeePayments = isModuleAllowed('Payments');
                    
                    if (!canSeeTasks && !canSeeRequests && !canSeeLearning && !canSeePayments) return null;

                    return (
                      <>
                        {canSeeTasks && (
                          <div 
                            style={{ width: "100%", position: "relative" }}
                            onMouseEnter={() => setShowWorkplaceFlyout(true)}
                            onMouseLeave={() => setShowWorkplaceFlyout(false)}
                          >
                            <button 
                              onClick={() => {
                                if (activeView !== 'TASKS') {
                                  setActiveView('TASKS');
                                  setActiveSubView('MAIN');
                                }
                                setActiveMainView('DASHBOARD');
                              }}
                              style={{ 
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                                background: (activeView === 'TASKS' || activeView === 'RECURRING') && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                                border: "none", color: (activeView === 'TASKS' || activeView === 'RECURRING') && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8", 
                                cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                                width: "100%", borderRadius: "16px",
                                boxShadow: (activeView === 'TASKS' || activeView === 'RECURRING') && activeMainView === 'DASHBOARD' ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
                                position: "relative"
                              }}
                            >
                              <Briefcase size={24} color={(activeView === 'TASKS' || activeView === 'RECURRING') && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8"} />
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Task Mgt</span>
                            </button>

                            {/* Premium Hover Flyout */}
                            {showWorkplaceFlyout && (
                              <div style={{
                                position: "absolute",
                                left: "100%", 
                                top: "-10px",
                                width: "240px",
                                paddingLeft: "20px", 
                                zIndex: 1000,
                                animation: "fadeInSlideRight 0.2s ease-out",
                              }}>
                                <div style={{
                                  background: "rgba(15, 23, 42, 0.95)",
                                  backdropFilter: "blur(16px)",
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  boxShadow: "20px 0 50px rgba(0, 0, 0, 0.4)",
                                  padding: "12px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}>
                                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 12px 8px" }}>
                                    Task Mgt Summary
                                  </div>
                                  <button 
                                    onClick={() => { setActiveView('TASKS'); setActiveSubView('MAIN'); setActiveMainView('DASHBOARD'); setShowWorkplaceFlyout(false); }}
                                    style={{ 
                                      padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                      background: activeView === 'TASKS' && activeSubView === 'MAIN' ? "rgba(59, 130, 246, 0.15)" : "transparent",
                                      color: activeView === 'TASKS' && activeSubView === 'MAIN' ? "#60a5fa" : "#e2e8f0",
                                      cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#60a5fa"; }}
                                    onMouseOut={e => { e.currentTarget.style.background = activeView === 'TASKS' && activeSubView === 'MAIN' ? "rgba(59, 130, 246, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'TASKS' && activeSubView === 'MAIN' ? "#60a5fa" : "#e2e8f0"; }}
                                  >
                                    <LayoutDashboard size={16} /> Task Dash Board
                                  </button>
                                  {isModuleAllowed('Recurring Activities') && (
                                    <button 
                                      onClick={() => { setActiveView('RECURRING'); setActiveMainView('DASHBOARD'); setShowWorkplaceFlyout(false); }}
                                      style={{ 
                                        padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                        background: activeView === 'RECURRING' ? "rgba(59, 130, 246, 0.15)" : "transparent",
                                        color: activeView === 'RECURRING' ? "#60a5fa" : "#e2e8f0",
                                        cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                      }}
                                      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#60a5fa"; }}
                                      onMouseOut={e => { e.currentTarget.style.background = activeView === 'RECURRING' ? "rgba(59, 130, 246, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'RECURRING' ? "#60a5fa" : "#e2e8f0"; }}
                                    >
                                      <Repeat size={16} /> Recurring Activities
                                    </button>
                                  )}
                                  {canSeeRequests && (
                                    <button 
                                      onClick={() => { setActiveView('TASKS'); setActiveSubView('OTHER_DEPT'); setActiveMainView('DASHBOARD'); setShowWorkplaceFlyout(false); }}
                                      style={{ 
                                        padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                        background: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "rgba(59, 130, 246, 0.15)" : "transparent",
                                        color: activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "#60a5fa" : "#e2e8f0",
                                        cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                      }}
                                      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#60a5fa"; }}
                                      onMouseOut={e => { e.currentTarget.style.background = activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "rgba(59, 130, 246, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? "#60a5fa" : "#e2e8f0"; }}
                                    >
                                      <Users size={16} /> Inter Dept Request
                                    </button>
                                  )}
                                </div>
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
                          <div 
                            style={{ width: "100%", position: "relative" }}
                            onMouseEnter={() => setShowLearningFlyout(true)}
                            onMouseLeave={() => setShowLearningFlyout(false)}
                          >
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

                            {/* Learning Flyout */}
                            {showLearningFlyout && (
                              <div style={{
                                position: "absolute",
                                left: "100%", 
                                top: "-10px",
                                width: "240px",
                                paddingLeft: "20px", 
                                zIndex: 1000,
                                animation: "fadeInSlideRight 0.2s ease-out",
                              }}>
                                <div style={{
                                  background: "rgba(15, 23, 42, 0.95)",
                                  backdropFilter: "blur(16px)",
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  boxShadow: "20px 0 50px rgba(0, 0, 0, 0.4)",
                                  padding: "12px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}>
                                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 12px 8px" }}>
                                    Learning Modules
                                  </div>
                                  <button 
                                    onClick={() => { setActiveView('LOS'); setLoActiveFilter('ALL'); setActiveMainView('DASHBOARD'); setShowLearningFlyout(false); }}
                                    style={{ 
                                      padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                      background: activeView === 'LOS' && loActiveFilter !== 'RESOURCES' ? "rgba(59, 130, 246, 0.15)" : "transparent",
                                      color: activeView === 'LOS' && loActiveFilter !== 'RESOURCES' ? "#60a5fa" : "#e2e8f0",
                                      cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#60a5fa"; }}
                                    onMouseOut={e => { e.currentTarget.style.background = activeView === 'LOS' && loActiveFilter !== 'RESOURCES' ? "rgba(59, 130, 246, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'LOS' && loActiveFilter !== 'RESOURCES' ? "#60a5fa" : "#e2e8f0"; }}
                                  >
                                    <Lightbulb size={16} /> Learning Opportunities
                                  </button>
                                  <button 
                                    onClick={() => { setActiveView('LOS'); setLoActiveFilter('RESOURCES'); setActiveMainView('DASHBOARD'); setShowLearningFlyout(false); }}
                                    style={{ 
                                      padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                      background: activeView === 'LOS' && loActiveFilter === 'RESOURCES' ? "rgba(16, 185, 129, 0.15)" : "transparent",
                                      color: activeView === 'LOS' && loActiveFilter === 'RESOURCES' ? "#10b981" : "#e2e8f0",
                                      cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#10b981"; }}
                                    onMouseOut={e => { e.currentTarget.style.background = activeView === 'LOS' && loActiveFilter === 'RESOURCES' ? "rgba(16, 185, 129, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'LOS' && loActiveFilter === 'RESOURCES' ? "#10b981" : "#e2e8f0"; }}
                                  >
                                    <BookOpen size={16} /> Library
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {canSeePayments && (
                          <div 
                            style={{ width: "100%", position: "relative" }}
                            onMouseEnter={() => setShowPaymentsFlyout(true)}
                            onMouseLeave={() => setShowPaymentsFlyout(false)}
                          >
                            <button 
                              onClick={() => { setActiveView('PAYMENTS'); setActiveMainView('DASHBOARD'); }}
                              style={{ 
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", 
                                background: (activeView === 'PAYMENTS' || activeView === 'PAYMENT_REQUESTS') && activeMainView === 'DASHBOARD' ? "rgba(59, 130, 246, 0.15)" : "transparent", 
                                border: "none", color: (activeView === 'PAYMENTS' || activeView === 'PAYMENT_REQUESTS') && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8", 
                                cursor: "pointer", padding: "16px 0", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                                width: "100%", borderRadius: "16px",
                                boxShadow: (activeView === 'PAYMENTS' || activeView === 'PAYMENT_REQUESTS') && activeMainView === 'DASHBOARD' ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none"
                              }}
                            >
                              <Wallet size={24} color={(activeView === 'PAYMENTS' || activeView === 'PAYMENT_REQUESTS') && activeMainView === 'DASHBOARD' ? "#60a5fa" : "#94a3b8"} />
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em" }}>Payments</span>
                            </button>

                            {/* Payments Flyout */}
                            {showPaymentsFlyout && (
                              <div style={{
                                position: "absolute",
                                left: "100%", 
                                top: "-10px",
                                width: "240px",
                                paddingLeft: "20px", 
                                zIndex: 1000,
                                animation: "fadeInSlideRight 0.2s ease-out",
                              }}>
                                <div style={{
                                  background: "rgba(15, 23, 42, 0.95)",
                                  backdropFilter: "blur(16px)",
                                  borderRadius: "16px",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  boxShadow: "20px 0 50px rgba(0, 0, 0, 0.4)",
                                  padding: "12px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}>
                                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 12px 8px" }}>
                                    Treasury Management
                                  </div>
                                  <button 
                                    onClick={() => { setActiveView('PAYMENTS'); setActiveMainView('DASHBOARD'); setShowPaymentsFlyout(false); }}
                                    style={{ 
                                      padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                      background: activeView === 'PAYMENTS' ? "rgba(59, 130, 246, 0.15)" : "transparent",
                                      color: activeView === 'PAYMENTS' ? "#60a5fa" : "#e2e8f0",
                                      cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#60a5fa"; }}
                                    onMouseOut={e => { e.currentTarget.style.background = activeView === 'PAYMENTS' ? "rgba(59, 130, 246, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'PAYMENTS' ? "#60a5fa" : "#e2e8f0"; }}
                                  >
                                    <Calendar size={16} /> Payments Calendar
                                  </button>
                                  <button 
                                    onClick={() => { setActiveView('PAYMENT_REQUESTS'); setActiveMainView('DASHBOARD'); setShowPaymentsFlyout(false); }}
                                    style={{ 
                                      padding: "12px", borderRadius: "10px", border: "none", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600,
                                      background: activeView === 'PAYMENT_REQUESTS' ? "rgba(16, 185, 129, 0.15)" : "transparent",
                                      color: activeView === 'PAYMENT_REQUESTS' ? "#10b981" : "#e2e8f0",
                                      cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "10px"
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#10b981"; }}
                                    onMouseOut={e => { e.currentTarget.style.background = activeView === 'PAYMENT_REQUESTS' ? "rgba(16, 185, 129, 0.15)" : "transparent"; e.currentTarget.style.color = activeView === 'PAYMENT_REQUESTS' ? "#10b981" : "#e2e8f0"; }}
                                  >
                                    <CreditCard size={16} /> Payment Portal
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}


                </>
              );
            })()}
          </div>
        </nav>

        {/* Content Area */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: (activeView === 'RECURRING') ? "0" : ((activeView as any) === 'HOME' ? "20px 32px 32px 32px" : "32px"), background: t.bg, transition: "all 0.3s ease" }}>
          {activeView === 'RECURRING' && (
            <RecurringActivities settings={settings} usersList={usersList} showNotification={showNotification} showConfirm={showConfirm} showPrompt={showPrompt} />
          )}

          {activeView === 'PAYMENT_REQUESTS' && (
            <PaymentRequestPortal 
              user={user} 
              settings={settings} 
              showNotification={showNotification} 
              showConfirm={showConfirm} 
              theme={theme}
              t={t}
            />
          )}

          {activeView !== 'RECURRING' && activeView !== 'PAYMENT_REQUESTS' && (
            <>
          {/* Active View Title/Context Area */}
          {(activeView as any) !== 'HOME' && (
          <div style={{ 
            padding: (activeView === 'LOS' && loActiveFilter === 'RESOURCES') ? "0" : "16px 32px 16px 32px",
            marginBottom: ((activeView as any) === 'HOME' || (activeView === 'LOS' && loActiveFilter === 'RESOURCES')) ? "0" : "16px", 
            borderBottom: ((activeView as any) === 'HOME' || (activeView === 'LOS' && loActiveFilter === 'RESOURCES')) ? "none" : `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            transition: "all 0.3s ease"
          }}>
            {(activeView === 'HOME' || (activeView === 'LOS' && loActiveFilter === 'RESOURCES')) ? null : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    {isAdmin && isAdminViewMode && (
                      <>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em" }}>ADMIN</span>
                        <span style={{ color: "#cbd5e1" }}>/</span>
                      </>
                    )}
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>FinPulse</span>
                    <span style={{ color: "#cbd5e1" }}>/</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: t.textMuted }}>
                      {activeView === 'TASKS' ? (activeSubView === 'MAIN' || activeSubView === 'ANALYTICS' ? "FinPulse" : "Collaboration") : 
                       activeView === 'PAYMENTS' ? "Treasury" : "Development"}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: t.text, letterSpacing: "-0.03em", transition: "all 0.3s ease" }}>
                    {activeView === 'TASKS' ? (activeSubView === 'MAIN' || activeSubView === 'ANALYTICS' ? "Task Dashboard" : "Inter Department Request") : 
                     activeView === 'PAYMENTS' ? "Payments Calendar" : "Learning Opportunities"}
                  </h2>
                  {activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' ? null : (
                    <p style={{ margin: "4px 0 0 0", color: activeView === 'LOS' ? "#3b82f6" : t.textMuted, fontSize: "0.95rem", fontWeight: 600 }}>
                      {activeView === 'TASKS' ? 
                        (activeSubView === 'MAIN' ? "" : "") :
                       activeView === 'PAYMENTS' ? "Manage and track recurring vendor payments and Treasury obligations." :
                       "We don't track mistakes, we track learning and improvement"}
                    </p>
                  )}
                  {activeView === 'LOS' && loActiveFilter !== 'RESOURCES' && (isAdmin && isAdminViewMode) && (
                    <div style={{ display: "flex", background: theme === 'DARK' ? "rgba(255,255,255,0.05)" : "rgba(15, 23, 42, 0.05)", padding: "4px", borderRadius: "12px", border: `1px solid ${t.border}`, width: "fit-content", marginTop: "16px" }}>
                      <button 
                        onClick={() => setLoActiveFilter('ALL')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: loActiveFilter !== 'ANALYTICS' ? "#4f46e5" : "transparent", 
                          color: loActiveFilter !== 'ANALYTICS' ? "white" : t.textMuted,
                          fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" 
                        }}
                      >Learning Opportunities</button>
                      <button 
                        onClick={() => setLoActiveFilter('ANALYTICS')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: loActiveFilter === 'ANALYTICS' ? "#4f46e5" : "transparent", 
                          color: loActiveFilter === 'ANALYTICS' ? "white" : t.textMuted,
                          fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" 
                        }}
                      >LO Analytics</button>
                    </div>
                  )}
                  {activeView === 'TASKS' && activeSubView !== 'OTHER_DEPT' && (isAdmin && isAdminViewMode) && (
                    <div style={{ display: "flex", background: theme === 'DARK' ? "rgba(255,255,255,0.05)" : "rgba(15, 23, 42, 0.05)", padding: "4px", borderRadius: "12px", border: `1px solid ${t.border}`, width: "fit-content", marginTop: "16px" }}>
                      <button 
                        onClick={() => setActiveSubView('MAIN')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: activeSubView === 'MAIN' ? "#4f46e5" : "transparent", 
                          color: activeSubView === 'MAIN' ? "white" : t.textMuted,
                          fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" 
                        }}
                      >Task Dashboard</button>
                      <button 
                        onClick={() => setActiveSubView('ANALYTICS')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: activeSubView === 'ANALYTICS' ? "#4f46e5" : "transparent", 
                          color: activeSubView === 'ANALYTICS' ? "white" : t.textMuted,
                          fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" 
                        }}
                      >Task Analytics</button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(activeView === 'TASKS' && activeSubView === 'MAIN') ? (
                    !isViewer && (
                      <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: "14px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 10px -2px rgba(37, 99, 235, 0.3)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                        <Plus size={18} /> New Task
                      </button>
                    )
                  ) : (activeView === 'TASKS' && activeSubView === 'ANALYTICS') ? (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowTaskAnaDownloadDropdown(!showTaskAnaDownloadDropdown)}
                        style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", border: "none", color: "white", cursor: "pointer", padding: "0 18px", height: "44px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
                      >
                        <Download size={16} /> Download Analytics <ChevronDown size={14} style={{ transform: showTaskAnaDownloadDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                      </button>

                      {showTaskAnaDownloadDropdown && (
                        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: t.card, border: `1px solid ${t.border}`, borderRadius: "14px", overflow: "hidden", minWidth: "210px", boxShadow: isDarkMode ? "0 16px 40px rgba(0,0,0,0.4)" : "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100 }}>
                          <button
                            onClick={() => { handleTaskAnaExportExcel(); setShowTaskAnaDownloadDropdown(false); }}
                            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", color: "#10b981", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", textAlign: "left", borderBottom: `1px solid ${t.border}` }}
                          >
                            <FileSpreadsheet size={18} /> Export as Excel
                          </button>
                          <button
                            onClick={() => { handleTaskAnaExportPDF(); setShowTaskAnaDownloadDropdown(false); }}
                            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", textAlign: "left", borderBottom: `1px solid ${t.border}` }}
                          >
                            <FileText size={18} /> Export as PDF
                          </button>
                          <button
                            onClick={() => { 
                              setAnaShareConfig({
                                ...anaShareConfig, 
                                reportType: 'task', 
                                subject: `Task Analytics Report - ${new Date().toLocaleDateString('en-IN')}`
                              });
                              setShowAnaShareModal(true); 
                              setShowTaskAnaDownloadDropdown(false); 
                            }}
                            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}
                          >
                            <Mail size={18} /> Share via Email
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (activeView === 'TASKS' && activeSubView === 'OTHER_DEPT') ? (
                    <Fragment>
                      <div style={{ position: "relative" }}>
                        <button 
                          onClick={() => setShowExtReqDownloadDropdown(!showExtReqDownloadDropdown)}
                          style={{ display: "flex", alignItems: "center", gap: "8px", background: t.card, color: "#2563eb", border: `1px solid #2563eb`, padding: "10px 16px", borderRadius: "14px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                        >
                          <Download size={18} /> Report <ChevronDown size={16} />
                        </button>
                        {showExtReqDownloadDropdown && (
                          <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: t.card, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", border: `1px solid ${t.border}`, zIndex: 100, minWidth: "200px", overflow: "hidden" }}>
                            <button 
                              onClick={() => { exportExtRequestsToExcel(); setShowExtReqDownloadDropdown(false); }}
                              style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: t.card, color: "#166534", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500 }}
                            >
                              <FileSpreadsheet size={16} /> Excel Format
                            </button>
                            <button 
                              onClick={() => { exportExtRequestsToPDF(); setShowExtReqDownloadDropdown(false); }}
                              style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: t.card, color: "#991b1b", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500 }}
                            >
                              <FileText size={16} /> PDF Document
                            </button>
                            <div style={{ borderTop: `1px solid ${t.border}` }}></div>
                            <button 
                              onClick={() => {
                                setShareData({
                                  ...shareData,
                                  type: 'request',
                                  subject: `Inter-Departmental Requests Report - ${formatDate(new Date())}`
                                });
                                setShowShareModal(true);
                                setShowExtReqDownloadDropdown(false);
                              }}
                              style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: t.card, color: "#1e40af", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 500 }}
                            >
                              <Mail size={16} /> Share via Email
                            </button>
                          </div>
                        )}
                      </div>
                      {!isViewer && (
                        <button 
                          onClick={() => setShowExtReqForm(true)} 
                          style={{ display: "flex", alignItems: "center", gap: "8px", background: "#4f46e5", color: "white", padding: "10px 20px", borderRadius: "14px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 10px -2px rgba(79, 70, 229, 0.3)", transition: "all 0.2s" }} 
                          onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"} 
                          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                        >
                          <Plus size={18} /> Submit New Request
                        </button>
                      )}
                    </Fragment>
                    ) : (activeView as string) === 'LOS' ? (
                      !isViewer && loActiveFilter !== 'ANALYTICS' && (
                        <button 
                          onClick={() => setShowLOForm(true)} 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px", 
                            background: "#2563eb", 
                            color: "white", 
                            padding: "10px 24px", 
                            borderRadius: "14px", 
                            border: "none", 
                            cursor: "pointer", 
                            fontWeight: 700, 
                            fontSize: "0.875rem", 
                            boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)", 
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" 
                          }} 
                          onMouseOver={e => {
                            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                            e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(37, 99, 235, 0.4)";
                            e.currentTarget.style.background = "#1d4ed8";
                          }} 
                          onMouseOut={e => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(37, 99, 235, 0.3)";
                            e.currentTarget.style.background = "#2563eb";
                          }}
                        >
                          <Plus size={18} /> Update LO
                        </button>
                      )
                    ) : null}
                </div>
              </div>
            )}
          </div>
          )}

        {/* Metric Cards / Motivational Quote / Home Content */}
        {(activeView as any) === 'HOME' ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginBottom: "40px" }}>
            {/* --- NEW INSPIRATION WALL --- */}
            {(() => {
              const content = JSON.parse(settings.homeContent || '{}');
              const mission = content.mission || "To empower the organization through financial precision, seamless compliance, and data-driven MIS, transforming complex challenges into structured growth opportunities.";
              const vision = content.vision || "To be the ultimate strategic backbone of the company, recognized for global-standard financial integrity and innovative operational agility.";
              const quote = content.quote || { 
                text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
                author: "Steve Jobs"
              };
              
              return (
                <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "32px", padding: "10px" }}>
                  
                  {/* Background Mesh Gradient Blobs (Subtle) */}
                  <div style={{ position: "absolute", top: "-5%", left: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(59, 130, 246, 0.07) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0, filter: "blur(80px)" }}></div>
                  <div style={{ position: "absolute", bottom: "-5%", right: "-5%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0, filter: "blur(90px)" }}></div>

                  {/* 1. Mission & Vision Pillars */}
                  <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                    {/* Mission Card */}
                    <div style={{ 
                      padding: "28px", 
                      borderRadius: "28px", 
                      background: "rgba(255, 255, 255, 0.72)", 
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
                      transition: "transform 0.3s ease"
                    }} className="hover-card">
                      <div style={{ position: "absolute", right: "-20px", top: "-20px", color: "rgba(59, 130, 246, 0.05)", zIndex: 0 }}>
                        <Compass size={120} />
                      </div>
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", padding: "10px", borderRadius: "14px", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}>
                            <Building2 size={22} color="white" />
                          </div>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2563eb" }}>Our Mission</span>
                        </div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: "0 0 12px 0", lineHeight: 1.25, letterSpacing: "-0.03em", fontFamily: "'Outfit', sans-serif" }}>{mission}</h2>
                        <div style={{ height: "4px", width: "50px", background: "linear-gradient(to right, #3b82f6, #60a5fa)", borderRadius: "2px", marginBottom: "20px" }}></div>
                        <p style={{ margin: 0, fontSize: "1rem", color: "#475569", lineHeight: 1.6, fontWeight: 500 }}>{content.missionCaption || "Driving daily excellence through disciplined execution and data-driven insights."}</p>
                      </div>
                    </div>

                    {/* Vision Card */}
                    <div style={{ 
                      padding: "28px", 
                      borderRadius: "28px", 
                      background: "rgba(255, 255, 255, 0.72)", 
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
                      transition: "transform 0.3s ease"
                    }} className="hover-card">
                      <div style={{ position: "absolute", right: "-20px", top: "-20px", color: "rgba(16, 185, 129, 0.05)", zIndex: 0 }}>
                        <Rocket size={120} />
                      </div>
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                          <div style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", padding: "10px", borderRadius: "14px", boxShadow: "0 4px 6px -1px rgba(5, 150, 105, 0.2)" }}>
                            <Compass size={22} color="white" />
                          </div>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#059669" }}>Our Vision</span>
                        </div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: "0 0 12px 0", lineHeight: 1.25, letterSpacing: "-0.03em", fontFamily: "'Outfit', sans-serif" }}>{vision}</h2>
                        <div style={{ height: "4px", width: "50px", background: "linear-gradient(to right, #10b981, #34d399)", borderRadius: "2px", marginBottom: "20px" }}></div>
                        <p style={{ margin: 0, fontSize: "1rem", color: "#475569", lineHeight: 1.6, fontWeight: 500 }}>{content.visionCaption || "Building a future where finance is the engine of innovation and sustainable growth."}</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Motivation Section - Enhanced Contrast */}
                  <div style={{ 
                    position: "relative",
                    zIndex: 1,
                    padding: "48px 32px", 
                    textAlign: "center", 
                    background: "rgba(255, 255, 255, 0.72)", 
                    backdropFilter: "blur(18px)",
                    borderRadius: "28px",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
                    overflow: "hidden"
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(16, 185, 129, 0.02)", pointerEvents: "none" }}></div>
                    <Quote size={40} color="#059669" style={{ marginBottom: "20px", opacity: 0.2 }} />
                    <h3 style={{ 
                      fontSize: "1.75rem", 
                      fontFamily: "var(--font-libre-baskerville), serif", 
                      fontStyle: "italic", 
                      maxWidth: "900px", 
                      margin: "0 auto 24px auto", 
                      lineHeight: 1.4,
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      color: "#2563eb"
                    }}>
                      "{quote.text}"
                    </h3>
                    <div style={{ 
                      display: "inline-block",
                      padding: "8px 24px",
                      background: "rgba(16, 185, 129, 0.08)",
                      borderRadius: "20px",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      fontWeight: 800, 
                      color: "#000000", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.2em",
                      fontSize: "0.875rem"
                    }}>
                      — {quote.author}
                    </div>
                  </div>

                  {/* 3. Wall of Fame - Premium Floating Cards */}
                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "32px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", padding: "6px 16px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", marginBottom: "12px" }}>RECOGNITION</div>
                      <h3 style={{ margin: 0, fontSize: "2.25rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em" }}>Wall of Fame</h3>
                      <p style={{ margin: "8px 0 0 0", color: "#64748b", fontWeight: 600, fontSize: "1rem" }}>CELEBRATING TEAM SUCCESS STORIES</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "32px" }}>
                      {(() => {
                        const stories = content.stories || [
                          { id: 1, title: "Efficiency Boost", text: "The new matrix system has cut down our task allocation time by 40%!", author: "Finance Admin" },
                          { id: 2, title: "Better Collaboration", text: "Sharing requests between departments is now seamless and tracked.", author: "Operations Lead" }
                        ];
                        return stories.map((s: any) => (
                          <div key={s.id} style={{ 
                            padding: "28px", 
                            borderRadius: "24px", 
                            background: "white", 
                            border: "1px solid #f1f5f9",
                            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "default",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
                            position: "relative"
                          }} className="hover-card-premium">
                            <div style={{ position: "relative", zIndex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
                                <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.1)" }}>
                                  <Trophy size={28} color="#10b981" />
                                </div>
                                <div style={{ fontSize: "0.6875rem", fontWeight: 800, background: "#f8fafc", padding: "6px 14px", borderRadius: "20px", color: "#64748b", textTransform: "uppercase", border: "1px solid #e2e8f0" }}>Success Story</div>
                              </div>
                              
                              {s.image && (
                                <div style={{ width: "calc(100% + 80px)", margin: "-40px -40px 24px -40px", height: "200px", overflow: "hidden", borderRadius: "32px 32px 0 0" }}>
                                  <img src={s.image} alt="Success Story" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              )}

                              <h4 style={{ margin: "0 0 16px 0", fontSize: "1.375rem", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.02em" }}>{s.title}</h4>
                              <p style={{ margin: "0 0 32px 0", fontSize: "1rem", color: "#475569", lineHeight: 1.7, fontStyle: "italic", fontWeight: 500 }}>"{s.text}"</p>
                              
                              <div style={{ display: "flex", alignItems: "center", gap: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "24px" }}>
                                <div style={{ 
                                  width: "44px", height: "44px", borderRadius: "14px", 
                                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
                                  color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                                  fontSize: "1.125rem", fontWeight: 900, boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)" 
                                }}>
                                  {s.author[0]}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#1e293b" }}>{s.author}</span>
                                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Team Contributor</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>


                </div>
              );
            })()}

          </div>
        ) : activeView === 'TASKS' ? (
          activeSubView === 'MAIN' ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
              <MetricCard t={t} title="Total Tasks" value={baseFilteredTasks.length} icon={<LayoutDashboard size={20} color="#ffffff" />} bg="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" isActive={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
              <MetricCard t={t} title="Pending Owner Tasks" value={pendingActionCount} icon={<Clock size={20} color="#ffffff" />} bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" isActive={activeFilter === 'PENDING_ACTION'} onClick={() => setActiveFilter('PENDING_ACTION')} />
              <MetricCard t={t} title="Pending Review" value={pendingReviewCount} icon={<AlertCircle size={20} color="#ffffff" />} bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" isActive={activeFilter === 'PENDING_REVIEW'} onClick={() => setActiveFilter('PENDING_REVIEW')} />
              <MetricCard t={t} title="Pending Status Update" value={pendingStatusUpdateCount} icon={<Share2 size={20} color="#ffffff" />} bg="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" isActive={activeFilter === 'PENDING_STATUS_UPDATE'} onClick={() => setActiveFilter('PENDING_STATUS_UPDATE')} />
              <MetricCard t={t} title="Fully Completed" value={completedCount} icon={<CheckCircle2 size={20} color="#ffffff" />} bg="linear-gradient(135deg, #10b981 0%, #059669 100%)" isActive={activeFilter === 'COMPLETED'} onClick={() => setActiveFilter('COMPLETED')} />
            </div>
          ) : null
        ) : activeView === 'LOS' && loActiveFilter === 'ANALYTICS' ? (
          <div style={{ background: t.card, borderRadius: "24px", border: `1px solid ${t.border}`, minHeight: "calc(100vh - 200px)", padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.4s ease-out", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
            {/* Command Bar (Filters Only) */}
            <div style={{ background: t.bg, borderBottom: `1px solid ${t.border}`, padding: "16px 24px" }}>
              <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                
                {/* Filters Area */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", padding: "8px 16px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
                    <Filter size={16} color={t.textMuted} />
                    <select 
                      value={anaEntityFilter}
                      onChange={(e) => setAnaEntityFilter(e.target.value)}
                      style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.875rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                    >
                      <option value="ALL" style={{ background: t.card, color: t.text }}>All Entities</option>
                      {uniqueLOEntities.map(ent => <option key={ent} value={ent} style={{ background: t.card, color: t.text }}>{ent}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", padding: "8px 16px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
                    <User size={16} color={t.textMuted} />
                    <select 
                      value={anaUserFilter}
                      onChange={(e) => setAnaUserFilter(e.target.value)}
                      style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.875rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                    >
                      <option value="ALL" style={{ background: t.card, color: t.text }}>All Users</option>
                      {Array.from(new Set(los.map(l => l.identifiedBy))).map(user => <option key={user} value={user} style={{ background: t.card, color: t.text }}>{user}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", position: "relative" }}>
                    
                    {/* Download Dropdown Button */}
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowAnaDownloadDropdown(!showAnaDownloadDropdown)}
                        style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", border: "none", color: "white", cursor: "pointer", padding: "0 18px", height: "40px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
                      >
                        <Download size={16} /> Download <ChevronDown size={14} style={{ transform: showAnaDownloadDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                      </button>

                      {showAnaDownloadDropdown && (
                        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: t.card, border: `1px solid ${t.border}`, borderRadius: "14px", overflow: "hidden", minWidth: "210px", boxShadow: isDarkMode ? "0 16px 40px rgba(0,0,0,0.4)" : "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100 }}>
                          <button
                            onClick={() => { handleAnaExportExcel(); setShowAnaDownloadDropdown(false); }}
                            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", color: "#10b981", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", textAlign: "left", borderBottom: `1px solid ${t.border}` }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <FileSpreadsheet size={18} /> Download Excel (.xlsx)
                          </button>
                          <button
                            onClick={() => { handleAnaExportPDF(); setShowAnaDownloadDropdown(false); }}
                            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", textAlign: "left", borderBottom: `1px solid ${t.border}` }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <FileText size={18} /> Download PDF (.pdf)
                          </button>
                          <button
                            onClick={() => { 
                              setAnaShareConfig({
                                ...anaShareConfig, 
                                reportType: 'lo', 
                                subject: `LO Analytics Report - ${formatDate(new Date())}`
                              });
                              setShowAnaShareModal(true); 
                              setShowAnaDownloadDropdown(false); 
                            }}
                            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <Mail size={18} /> Share via Email
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "32px" }}>
                
                {/* Analytics Data Calculation */}
                {(() => {
                  const filteredData = los.filter(lo => {
                    const matchesEntity = anaEntityFilter === 'ALL' || lo.entity === anaEntityFilter;
                    const matchesUser = anaUserFilter === 'ALL' || lo.identifiedBy === anaUserFilter || lo.committedBy === anaUserFilter;
                    return matchesEntity && matchesUser;
                  });

                  const total = filteredData.length;
                  const ack = filteredData.filter(l => l.isAcknowledged).length;
                  const pending = total - ack;
                  const resourcesCount = resources.length;

                  return (
                    <>
                      {/* Scorecards */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
                        {[
                          { label: "Total Findings", value: total, icon: <AlertCircle />, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
                          { label: "Acknowledged", value: ack, icon: <CheckCircle2 />, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
                          { label: "Pending Review", value: pending, icon: <Clock />, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
                          { label: "Knowledge Assets", value: resourcesCount, icon: <BookOpen />, color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" }
                        ].map((m, i) => (
                          <div key={i} style={{ padding: "24px", borderRadius: "24px", background: t.card, border: `1px solid ${t.border}`, position: "relative", overflow: "hidden", boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                            <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: `radial-gradient(circle at center, ${m.color}20 0%, transparent 70%)`, pointerEvents: "none" }} />
                            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: m.bg, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>{m.icon}</div>
                            <div style={{ fontSize: "2rem", fontWeight: 800, color: t.text, marginBottom: "4px" }}>{m.value}</div>
                            <div style={{ fontSize: "0.8125rem", color: t.textMuted, fontWeight: 600 }}>{m.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Main Charts Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                        {/* Entity Trends */}
                        <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                            <h3 style={{ margin: 0, color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Findings by Entity</h3>
                            <div style={{ fontSize: "0.8125rem", color: t.textMuted, background: t.bg, padding: "4px 12px", borderRadius: "20px" }}>Distribution Analysis</div>
                          </div>
                          <div style={{ height: "300px", display: "flex", alignItems: "flex-end", gap: "16px", paddingBottom: "20px" }}>
                            {(() => {
                              const entities = Array.from(new Set(filteredData.map(l => l.entity)));
                              const max = Math.max(...entities.map(e => filteredData.filter(l => l.entity === e).length), 1);
                              return entities.slice(0, 10).map(ent => {
                                const count = filteredData.filter(l => l.entity === ent).length;
                                const height = (count / max) * 100;
                                return (
                                  <div key={ent} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: "100%", height: `${height}%`, background: "linear-gradient(to top, #6366f1, #8b5cf6)", borderRadius: "8px", minHeight: "4px", position: "relative", transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                                      <div style={{ position: "absolute", top: "-28px", width: "100%", textAlign: "center", color: t.text, fontSize: "0.875rem", fontWeight: 700 }}>{count}</div>
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 500 }}>{ent.split('-')[1] || ent}</div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Status Distribution */}
                        <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                          <h3 style={{ margin: "0 0 32px 0", alignSelf: "flex-start", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Resolution Status</h3>
                          <div style={{ position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="160" height="160" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="12" />
                              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" 
                                      strokeDasharray={`${(ack/total)*251.2} 251.2`} strokeDashoffset="0" strokeLinecap="round" 
                                      style={{ transition: "stroke-dasharray 1s ease-out" }} />
                            </svg>
                            <div style={{ position: "absolute", textAlign: "center" }}>
                              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: t.text }}>{total > 0 ? Math.round((ack/total)*100) : 0}%</div>
                              <div style={{ fontSize: "0.65rem", color: t.textMuted, fontWeight: 600 }}>RESOLVED</div>
                            </div>
                          </div>
                          <div style={{ marginTop: "32px", width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                 <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#10b981" }} />
                                 <span style={{ fontSize: "0.8125rem", color: t.textMuted }}>Acknowledged</span>
                               </div>
                               <span style={{ color: t.text, fontWeight: 600 }}>{ack}</span>
                             </div>
                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                 <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0" }} />
                                 <span style={{ fontSize: "0.8125rem", color: t.textMuted }}>Pending Review</span>
                               </div>
                               <span style={{ color: t.text, fontWeight: 600 }}>{pending}</span>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Reporting Tables */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        {/* User-wise Report */}
                        <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                          <h3 style={{ margin: "0 0 24px 0", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Performance by User</h3>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "12px 16px", background: t.bg, borderRadius: "12px", fontSize: "0.75rem", fontWeight: 800, color: t.textMuted, textTransform: "uppercase" }}>
                              <div>User Name</div>
                              <div style={{ textAlign: "center" }}>Found</div>
                              <div style={{ textAlign: "center" }}>Resolved</div>
                            </div>
                            {(() => {
                              const users = Array.from(new Set(filteredData.map(l => l.identifiedBy)));
                              return users.slice(0, 10).map(user => {
                                const reported = filteredData.filter(l => l.identifiedBy === user).length;
                                const resolved = filteredData.filter(l => l.identifiedBy === user && l.isAcknowledged).length;
                                return (
                                  <div key={user} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "16px", borderRadius: "12px", borderBottom: `1px solid ${t.border}`, alignItems: "center" }}>
                                    <div style={{ color: t.text, fontWeight: 600, fontSize: "0.875rem" }}>{user}</div>
                                    <div style={{ textAlign: "center", color: "#6366f1", fontWeight: 700 }}>{reported}</div>
                                    <div style={{ textAlign: "center", color: "#10b981", fontWeight: 700 }}>{resolved}</div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Entity-wise Report */}
                        <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                          <h3 style={{ margin: "0 0 24px 0", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Entity Tracker Summary</h3>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "12px 16px", background: t.bg, borderRadius: "12px", fontSize: "0.75rem", fontWeight: 800, color: t.textMuted, textTransform: "uppercase" }}>
                              <div>Entity</div>
                              <div style={{ textAlign: "center" }}>Total LOs</div>
                              <div style={{ textAlign: "center" }}>% Resolved</div>
                            </div>
                            {(() => {
                              const entities = Array.from(new Set(filteredData.map(l => l.entity)));
                              return entities.slice(0, 10).map(ent => {
                                const totalEnt = filteredData.filter(l => l.entity === ent).length;
                                const resolvedEnt = filteredData.filter(l => l.entity === ent && l.isAcknowledged).length;
                                const perc = totalEnt > 0 ? Math.round((resolvedEnt / totalEnt) * 100) : 0;
                                return (
                                  <div key={ent} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "16px", borderRadius: "12px", borderBottom: `1px solid ${t.border}`, alignItems: "center" }}>
                                    <div style={{ color: t.text, fontWeight: 600, fontSize: "0.8125rem" }}>{ent}</div>
                                    <div style={{ textAlign: "center", color: t.text, fontWeight: 700 }}>{totalEnt}</div>
                                    <div style={{ textAlign: "center" }}>
                                      <span style={{ padding: "4px 8px", borderRadius: "6px", background: perc === 100 ? "rgba(16, 185, 129, 0.1)" : t.bg, color: perc === 100 ? "#10b981" : t.textMuted, fontSize: "0.75rem", fontWeight: 700 }}>{perc}%</span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {activeView === 'TASKS' && activeSubView === 'MAIN' && (
          <div className="main-tasks-view">
            {/* Action Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              {/* Search Bar - Left Side */}
              <div style={{ position: "relative", flex: 1, minWidth: "300px" }}>
                <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} size={18} />
                <input 
                  type="text" 
                  placeholder="Search tasks, types, entities, owners..." 
                  value={taskSearchQuery}
                  onChange={e => setTaskSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "10px 10px 10px 40px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg }} 
                />
              </div>

              {/* Date Filter & Download Container - Right Side */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
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
                        style={{ border: `1px solid ${t.border}`, borderRadius: "6px", padding: "4px 8px", fontSize: "0.875rem", outline: "none", color: t.text }}
                      />
                      <span style={{ color: t.textMuted }}>to</span>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        style={{ border: `1px solid ${t.border}`, borderRadius: "6px", padding: "4px 8px", fontSize: "0.875rem", outline: "none", color: t.text }}
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
                
                {true && (
                  <div className="download-container" style={{ position: "relative" }}>
                    <button 
                      onClick={() => setShowTaskDownloadDropdown(!showTaskDownloadDropdown)}
                      style={{ 
                        display: "flex", alignItems: "center", gap: "8px", background: t.card, color: t.textMuted, 
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
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 1000, 
                        minWidth: "160px", overflow: "hidden" 
                      }}>
                        <button 
                          onClick={() => { exportToExcel(); setShowTaskDownloadDropdown(false); }}
                          style={{ 
                            width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                            padding: "12px 16px", border: "none", background: t.card, 
                            color: t.textMuted, cursor: "pointer", fontSize: "0.875rem", 
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
                            padding: "12px 16px", border: "none", background: t.card, 
                            color: t.textMuted, cursor: "pointer", fontSize: "0.875rem", 
                            textAlign: "left", transition: "background 0.2s" 
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseOut={e => e.currentTarget.style.background = "white"}
                        >
                          <FileText size={16} color="#991b1b" /> PDF Document
                        </button>
                        <div style={{ height: "1px", background: t.bg, margin: "4px 0" }}></div>
                        <button 
                          onClick={() => { 
                            setShareData({...shareData, type: 'task', format: 'excel', subject: `Task Report - ${new Date().toISOString().split('T')[0]}`});
                            setShowShareModal(true); 
                            setShowTaskDownloadDropdown(false); 
                          }}
                          style={{ 
                            width: "100%", display: "flex", alignItems: "center", gap: "10px", 
                            padding: "12px 16px", border: "none", background: t.card, 
                            color: "#2563eb", cursor: "pointer", fontSize: "0.875rem", 
                            textAlign: "left", transition: "background 0.2s", fontWeight: 600
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "#eff6ff"}
                          onMouseOut={e => e.currentTarget.style.background = "white"}
                        >
                          <Share2 size={16} color="#2563eb" /> Share via Email
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
              
            {/* Filter Bar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: t.card, padding: "12px", borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", marginBottom: "12px", alignItems: "center" }}>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <MultiSelectFilter
                  options={uniqueTaskEntities}
                  selected={taskEntityFilter}
                  onChange={setTaskEntityFilter}
                  placeholder="All Entities"
                  theme={theme}
                  t={t}
                />

                <MultiSelectFilter
                  options={uniqueTaskDepts}
                  selected={taskDeptFilter}
                  onChange={setTaskDeptFilter}
                  placeholder="All Departments"
                  theme={theme}
                  t={t}
                />

                <MultiSelectFilter
                  options={uniqueTaskOwners}
                  selected={taskOwnerFilter}
                  onChange={setTaskOwnerFilter}
                  placeholder="All Owners"
                  theme={theme}
                  t={t}
                />

                <MultiSelectFilter
                  options={["Not Yet Due", "Due on Today", "Over Due", "On-Time", "Early Closure", "Delay in Closure"]}
                  selected={taskStatusFilter}
                  onChange={setTaskStatusFilter}
                  placeholder="All Statuses"
                  theme={theme}
                  t={t}
                />

                <MultiSelectFilter
                  options={uniqueTaskReviewers}
                  selected={taskReviewerFilter}
                  onChange={setTaskReviewerFilter}
                  placeholder="All Reviewers"
                  theme={theme}
                  t={t}
                />

                <MultiSelectFilter
                  options={["INTERNAL", "EXTERNAL"]}
                  selected={taskTypeFilter}
                  onChange={setTaskTypeFilter}
                  placeholder="All Task Types"
                  theme={theme}
                  t={t}
                  labelMapping={{
                    'INTERNAL': 'Internal Only',
                    'EXTERNAL': 'External Only'
                  }}
                />

                <MultiSelectFilter
                  options={uniqueTaskSources}
                  selected={taskSourceFilter}
                  onChange={setTaskSourceFilter}
                  placeholder="All Sources"
                  theme={theme}
                  t={t}
                  labelMapping={{
                    'TDB': 'TDB – Dashboard',
                    'IDR': 'IDR – Inter-Dept',
                    'RA': 'RA – Recurring',
                    'BULK': 'BULK – Import'
                  }}
                />

                <MultiSelectFilter
                  options={uniqueTaskFrequencies}
                  selected={taskFrequencyFilter}
                  onChange={setTaskFrequencyFilter}
                  placeholder="All Frequencies"
                  theme={theme}
                  t={t}
                />

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
            </div>

            {/* Data Table */}
            <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)", overflowX: "auto", overflowY: "hidden" }} className="custom-scrollbar">
              <div style={{ minWidth: "1600px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('displayId')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Task ID {taskSortConfig?.key === 'displayId' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => handleTaskSort('source' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Source {taskSortConfig?.key === ('source' as any) && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('createdAt')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Created At {taskSortConfig?.key === 'createdAt' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('ownerName')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Owner {taskSortConfig?.key === 'ownerName' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('reviewerName')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Reviewer {taskSortConfig?.key === 'reviewerName' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('entityName')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Entity {taskSortConfig?.key === 'entityName' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer", minWidth: "10cm", maxWidth: "10cm" }} onClick={() => handleTaskSort('taskName')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Task Name {taskSortConfig?.key === 'taskName' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer", minWidth: "7.7cm", maxWidth: "7.7cm" }} onClick={() => handleTaskSort('departmentName')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Dept {taskSortConfig?.key === 'departmentName' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('taskType')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Task Type {taskSortConfig?.key === 'taskType' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('frequency')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Frequency {taskSortConfig?.key === 'frequency' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('requestFrom')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Request From {taskSortConfig?.key === 'requestFrom' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('transferStatus')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Origin {taskSortConfig?.key === 'transferStatus' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('dueDate')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Due Date {taskSortConfig?.key === 'dueDate' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('completionDate')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Completion Date {taskSortConfig?.key === 'completionDate' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('taskStatus')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Task Status {taskSortConfig?.key === 'taskStatus' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('reviewCompletionDate')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Review Date {taskSortConfig?.key === 'reviewCompletionDate' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('reviewStatus')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Review Status {taskSortConfig?.key === 'reviewStatus' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), textAlign: "center" }}>
                        CAPTURE LO?
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('ownerComments')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Owner Comments {taskSortConfig?.key === 'ownerComments' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('reviewerComments')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Reviewer Comments {taskSortConfig?.key === 'reviewerComments' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('requestStatus')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Request Status {taskSortConfig?.key === 'requestStatus' && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleTaskSort('processedMode' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Comm. Mode {taskSortConfig?.key === ('processedMode' as any) && (taskSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), textAlign: "center" }}>Reports/Docs</th>
                      {!isViewer && (
                        <th style={{ ...getThStyle(t), textAlign: "center" }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td colSpan={24} style={{ padding: "16px" }}>
                            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                              <div style={{ width: "40px", height: "12px", background: "#f1f5f9", borderRadius: "4px", animation: "pulse 1.5s infinite" }}></div>
                              <div style={{ width: "100px", height: "12px", background: "#f1f5f9", borderRadius: "4px", animation: "pulse 1.5s infinite" }}></div>
                              <div style={{ flex: 1, height: "12px", background: "#f1f5f9", borderRadius: "4px", animation: "pulse 1.5s infinite" }}></div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : paginatedTasks.length === 0 ? (
                      <tr><td colSpan={24} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No tasks found for the current filters.</td></tr>
                    ) : (
                      paginatedTasks.map((task) => {
                        const currentUserName = user?.name || user?.email;
                        const isCurrentUserOwner = task.ownerName === currentUserName;
                        const isCurrentUserReviewer = task.reviewerName === currentUserName;

                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        const isOverdue = task.taskStatus !== "Completed" && task.dueDate && new Date(task.dueDate) < todayDate;

                        const isReviewNotReq = (t: any) => {
                          if (!t) return false;
                          const s = (t.reviewStatus || "").trim().toLowerCase();
                          const r = (t.reviewerName || "").trim().toLowerCase();
                          return s === 'review not required' || s === 'n/a' || s === 'not applicable' || r === 'not applicable' || r === 'n/a';
                        };
                        const isOwnerRestricted = (COMPLETION_STATUSES.includes(task.taskStatus) && !isAdmin) || (!isCurrentUserOwner && !isAdmin) || (!!task.reviewCompletionDate && !isAdmin);
                        const isReviewerRestricted = isReviewNotReq(task) || (task.reviewStatus === "Completed" && !isAdmin) || (!isCurrentUserReviewer && !isAdmin);
                        
                        return (
                          <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "all 0.2s", color: isOverdue ? "#ef4444" : "#334155", fontWeight: isOverdue ? 700 : 400 }} className="table-row">
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button 
                                  onClick={() => setSelectedTaskForView(task)}
                                  style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  title="View Task Details"
                                  className="hover-bg-indigo-50"
                                >
                                  <Eye size={16} />
                                </button>
                                <span style={{ color: isOverdue ? "inherit" : "#94a3b8", fontWeight: isOverdue ? "inherit" : 500, whiteSpace: "nowrap" }}>
                                  {task.displayId ? (task.displayId.startsWith('T-') ? task.displayId : `T-${task.displayId}`) : `T-${task.id}`}
                                </span>
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              {(() => {
                                const src = (task as any).source || 'TDB';
                                const cfg: Record<string, { bg: string; color: string; label: string }> = {
                                  'TDB':  { bg: '#eff6ff', color: '#2563eb', label: 'TDB' },
                                  'IDR':  { bg: '#f0fdf4', color: '#16a34a', label: 'IDR' },
                                  'RA':   { bg: '#fdf4ff', color: '#9333ea', label: 'RA'  },
                                  'BULK': { bg: '#fff7ed', color: '#ea580c', label: 'BULK' },
                                };
                                const { bg, color, label } = cfg[src] || cfg['TDB'];
                                return (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    background: bg,
                                    color,
                                    border: `1px solid ${color}30`,
                                    whiteSpace: 'nowrap'
                                  }}>{label}</span>
                                );
                              })()}
                            </td>
                            <td style={{ ...getTdStyle(t), whiteSpace: "nowrap" }}>
                              <span style={{ color: isOverdue ? "inherit" : "#64748b", fontWeight: isOverdue ? "inherit" : "normal" }}>{formatDateTime(task.createdAt)}</span>
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px", fontWeight: 500 }}>
                                {getUserDisplayName(task.createdByEmail)}
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem" }}>
                                <User size={12} color="#6366f1" />
                                <span>{task.ownerName}</span>
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem" }}>
                                <ShieldCheck size={12} color="#10b981" />
                                <span>{(task.reviewerName === "Not Applicable" || !task.reviewerName) ? "N/A" : task.reviewerName}</span>
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>{task.entityName}</td>
                            <td style={{ ...getTdStyle(t), fontWeight: isOverdue ? 700 : 500, color: isOverdue ? "inherit" : "#0f172a", minWidth: "10cm", maxWidth: "10cm", whiteSpace: "normal", wordWrap: "break-word" }}>{task.taskName}</td>
                            <td style={{ ...getTdStyle(t), minWidth: "7.7cm", maxWidth: "7.7cm" }}>
                              <span style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", border: "1px solid #e2e8f0" }}>
                                {task.departmentName}
                              </span>
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ padding: "4px 8px", background: t.bg, borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted }}>
                                  {task.taskType}
                                </span>
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              <span style={{ 
                                padding: "2px 6px", background: t.bg, color: t.textMuted, 
                                borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, border: `1px solid ${t.border}` 
                              }}>
                                {task.frequency || "--"}
                              </span>
                            </td>
                            <td style={getTdStyle(t)}>{task.requestFrom}</td>
                            <td style={getTdStyle(t)}>
                              {renderOriginBadge(task)}
                            </td>
                            <td style={{ ...getTdStyle(t), whiteSpace: "nowrap", fontSize: "0.75rem" }}>{task.dueDate ? formatDate(task.dueDate) : <span style={{ color: "#cbd5e1" }}>--</span>}</td>
                             <td 
                               style={{ ...getTdStyle(t), whiteSpace: "nowrap", fontSize: "0.75rem", cursor: (isAdmin || (isCurrentUserOwner && task.requestStatus !== "Processed" && !task.reviewCompletionDate)) ? "pointer" : "default", fontWeight: 600, color: isOverdue ? "inherit" : "#475569" }} 
                              title={task.completedSubmissionAt ? `[Audit Log]\nUpdated: ${formatDateTime(task.completedSubmissionAt)}\nBy: ${task.completedBy || "Unknown"}` : ""}
                              onClick={() => {
                                if (task.requestStatus === "Processed" && !isAdmin) return;
                                if (!isAdmin && !isCurrentUserOwner) return;
                                if (task.reviewCompletionDate && !isAdmin) {
                                  showNotification("Editing locked: Task has already been reviewed.", "error");
                                  return;
                                }
                                setEditingCell({ id: task.id, field: 'completionDate' });
                                setEditValue(task.completionDate ? task.completionDate.split('T')[0] : '');
                              }}
                            >
                              {editingCell?.id === task.id && editingCell.field === 'completionDate' ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="date"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleUpdate(task.id, 'completionDate', editValue);
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    style={{ ...getInputStyle(t), padding: "4px 8px", fontSize: "0.8125rem", minWidth: "120px" }}
                                  />
                                  <button 
                                    onClick={() => handleUpdate(task.id, 'completionDate', editValue)}
                                    style={{ padding: "4px 10px", background: "#22c55e", color: "white", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setEditingCell(null)}
                                    style={{ padding: "4px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                formatDate(task.completionDate)
                              )}
                            </td>
                            <td style={getTdStyle(t)}>
                              <StatusPill 
                                status={task.taskStatus} 
                                type="task" 
                                taskId={task.id} 
                                onUpdate={handleUpdate} 
                                disabled={isOwnerRestricted}
                                t={t}
                                trackingStatus={task.trackingStatus}
                                dueDate={task.dueDate}
                                completionDate={task.completionDate}
                              />
                            </td>
                             <td 
                               style={{ ...getTdStyle(t), whiteSpace: "nowrap", fontSize: "0.75rem", cursor: (!isReviewNotReq(task) && (isAdmin || (isCurrentUserReviewer && task.requestStatus !== "Processed"))) ? "pointer" : "default", fontWeight: 600, color: "#64748b" }} 
                              title={task.reviewedSubmissionAt ? `[Audit Log]\nReviewed: ${formatDateTime(task.reviewedSubmissionAt)}\nBy: ${task.reviewedBy || "Unknown"}` : ""}
                              onClick={() => {
                                if (isReviewNotReq(task)) return;
                                if (task.requestStatus === "Processed" && !isAdmin) return;
                                if (!isAdmin && !isCurrentUserReviewer) return;
                                setEditingCell({ id: task.id, field: 'reviewCompletionDate' });
                                setEditValue(task.reviewCompletionDate ? task.reviewCompletionDate.split('T')[0] : '');
                              }}
                            >
                              {editingCell?.id === task.id && editingCell.field === 'reviewCompletionDate' && !isReviewNotReq(task) ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="date"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleUpdate(task.id, 'reviewCompletionDate', editValue);
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    style={{ ...getInputStyle(t), padding: "4px 8px", fontSize: "0.8125rem", minWidth: "120px" }}
                                  />
                                  <button 
                                    onClick={() => handleUpdate(task.id, 'reviewCompletionDate', editValue)}
                                    style={{ padding: "4px 10px", background: "#22c55e", color: "white", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setEditingCell(null)}
                                    style={{ padding: "4px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                formatDate(task.reviewCompletionDate)
                              )}
                            </td>
                            <td style={getTdStyle(t)}>
                              <StatusPill 
                                status={task.reviewStatus} 
                                type="review" 
                                taskId={task.id} 
                                onUpdate={handleUpdate} 
                                disabled={isReviewerRestricted}
                                t={t}
                              />
                            </td>
                            <td style={{ ...getTdStyle(t), textAlign: "center" }}>
                              {task.reviewStatus === "Review Not Required" ? (
                                <span style={{ color: t.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>N/A</span>
                              ) : task.reviewStatus === "Completed" ? (
                                (() => {
                                  const linkedLO = los.find(lo => lo.taskId === task.id);
                                  return linkedLO ? (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                      <span style={{ 
                                        padding: "4px 8px", 
                                        borderRadius: "6px", 
                                        fontSize: "0.75rem", 
                                        fontWeight: 700, 
                                        background: "rgba(16,185,129,0.1)", 
                                        color: "#10b981",
                                        display: "inline-block",
                                        cursor: "help"
                                      }}
                                      title={`Submitted by ${getUserDisplayName(linkedLO.createdByEmail || linkedLO.submittedBy)} on ${formatDateTime(linkedLO.createdAt)}`}
                                      >
                                        Captured
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLOForView({
                                            id: linkedLO.id,
                                            learningOpportunity: linkedLO.learningOpportunity,
                                            resolutionPlan: linkedLO.resolutionProvided,
                                            sourceTaskName: task.taskName,
                                            ownerName: linkedLO.committedBy,
                                            status: linkedLO.isAcknowledged ? "Acknowledged" : "Pending",
                                            createdAt: linkedLO.createdAt || linkedLO.dateOfIdentification,
                                            ackBy: linkedLO.acknowledgedBy,
                                            ackAt: linkedLO.acknowledgedAt,
                                            ackComments: linkedLO.learnerComments
                                          } as any);
                                        }}
                                        style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        title="View LO Details"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </div>
                                  ) : task.requestStatus === "Processed" ? (
                                    <span style={{ color: t.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>N/A</span>
                                  ) : (
                                    <select
                                      value={task.captureLO || "No"}
                                      disabled={!isAdmin && !isCurrentUserReviewer}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const val = e.target.value;
                                        if (val === "Yes") {
                                          setLOCaptureForm({
                                            ...loCaptureForm,
                                            entity: task.entityName,
                                            identifiedBy: task.reviewerName && task.reviewerName !== "Not Applicable" ? task.reviewerName : currentUserName || '',
                                            committedBy: task.ownerName || '',
                                            taskId: task.id,
                                            dateOfIdentification: new Date().toISOString().split('T')[0]
                                          });
                                          setShowLOCaptureModal(true);
                                        } else if (val === "No") {
                                          handleUpdate(task.id, 'captureLO', 'No');
                                        }
                                      }}
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        border: `1px solid ${t.border}`,
                                        background: t.bg,
                                        color: t.text,
                                        cursor: (!isAdmin && !isCurrentUserReviewer) ? "not-allowed" : "pointer",
                                        outline: "none"
                                      }}
                                    >
                                      <option value="No">No</option>
                                      <option value="Yes">Yes</option>
                                    </select>
                                  );
                                })()
                              ) : (
                                <span style={{ color: t.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>N/A</span>
                              )}
                            </td>
                            {/* Editable Owner Comments */}
                            <td 
                              style={{ ...getTdStyle(t), cursor: (isAdmin || (isCurrentUserOwner && task.requestStatus !== "Processed")) ? "text" : "not-allowed", minWidth: "200px", maxWidth: "380px", whiteSpace: "normal" }}
                              onClick={() => { 
                                if (task.requestStatus === "Processed" && !isAdmin) return;
                                if (!isAdmin && !isCurrentUserOwner) return;
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
                                  style={getInputStyle(t)}
                                />
                              ) : (
                                <span 
                                  style={{ 
                                    color: task.ownerComments ? "#475569" : "#cbd5e1",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}
                                  title={task.ownerComments || "Click to add..."}
                                >
                                  {task.ownerComments || "Click to add..."}
                                </span>
                              )}
                            </td>

                            <td 
                              style={{ ...getTdStyle(t), cursor: (isAdmin || (isCurrentUserReviewer && task.requestStatus !== "Processed")) ? "text" : "not-allowed", minWidth: "200px", maxWidth: "380px", whiteSpace: "normal" }}
                              onClick={() => { 
                                if (task.requestStatus === "Processed" && !isAdmin) return;
                                if (!isAdmin && !isCurrentUserReviewer) return;
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
                                  style={getInputStyle(t)}
                                />
                              ) : (
                                <span 
                                  style={{ 
                                    color: task.reviewerComments ? "#475569" : "#cbd5e1",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                  }}
                                  title={task.reviewerComments || "Click to add..."}
                                >
                                  {task.reviewerComments || "Click to add..."}
                                </span>
                              )}
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                 <span 
                                   style={{ 
                                     padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700,
                                     background: task.requestStatus === 'Processed' ? "#dcfce7" : "#fef3c7",
                                     color: task.requestStatus === 'Processed' ? "#15803d" : "#b45309",
                                     textAlign: "center", whiteSpace: "nowrap"
                                   }}
                                   title={task.processedSubmissionAt ? `[Audit Log]\nProcessed: ${formatDateTime(task.processedSubmissionAt)}\nBy: ${task.processedBy || "Unknown"}` : ""}
                                 >
                                   {task.requestStatus || "Pending"}
                                 </span>
                                 {task.requestStatus === 'Processed' && (
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setViewingProcessedTask(task);
                                       fetchTaskDetails(task.id);
                                     }}
                                     title="View Processing Details"
                                     style={{ 
                                       padding: "4px", borderRadius: "6px", border: "1px solid #e2e8f0", 
                                       background: "white", color: "#64748b", 
                                       cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                                     }}
                                   >
                                     <Eye size={14} />
                                   </button>
                                 )}
                               </div>
                                {isFinished(task) && task.requestStatus !== 'Processed' && 
                                 (task.reviewStatus === 'Completed' || task.reviewStatus === 'Review Not Required' || task.reviewerName === 'Not Applicable') && 
                                 (isCurrentUserOwner || isAdmin) && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProcessingTask(task);
                                      setProcessingMode("");
                                      setProcessingMailLink("");
                                      setProcessingAttachments([]);
                                      setShowProcessingModal(true);
                                    }}
                                    style={{ 
                                      padding: "2px 6px", fontSize: "0.65rem", background: "#4f46e5", 
                                      color: "white", border: "none", borderRadius: "4px", cursor: "pointer" 
                                    }}
                                  >
                                    Mark as Processed
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span 
                                  title={task.processedMode?.toLowerCase() === 'email' ? `Subject: ${task.processedMailLink || 'N/A'} (Click to copy)` : undefined}
                                  onClick={() => {
                                    if (task.processedMode?.toLowerCase() === 'email' && task.processedMailLink) {
                                      navigator.clipboard.writeText(task.processedMailLink);
                                      showNotification("Subject copied to clipboard!");
                                    }
                                  }}
                                  style={{ 
                                    fontSize: "0.75rem", 
                                    color: task.processedMode ? "#0f172a" : "#94a3b8",
                                    cursor: task.processedMode?.toLowerCase() === 'email' ? 'pointer' : 'default',
                                    textDecoration: task.processedMode?.toLowerCase() === 'email' ? 'underline dotted' : 'none',
                                    fontWeight: task.processedMode?.toLowerCase() === 'email' ? 600 : 400
                                  }}
                                >
                                  {task.processedMode || "N/A"}
                                </span>
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                {(() => {
                                  let attachments = [];
                                  try {
                                    attachments = typeof task.processedAttachments === 'string' 
                                      ? JSON.parse(task.processedAttachments) 
                                      : (task.processedAttachments || []);
                                  } catch (e) {
                                    attachments = [];
                                  }
                                  if (!Array.isArray(attachments)) attachments = [];
                                  return attachments.length > 0 ? (
                                    attachments.map((file: any, idx: number) => (
                                      <a 
                                        key={idx}
                                        href={file.data}
                                        download={file.name}
                                        title={`Download ${file.name}`}
                                        style={{ color: "#4f46e5", background: "#f5f3ff", padding: "4px", borderRadius: "4px" }}
                                      >
                                        <Download size={14} />
                                      </a>
                                    ))
                                  ) : (
                                    <span style={{ color: "#cbd5e1" }}>N/A</span>
                                  );
                                })()}
                              </div>
                            </td>
                            {!isViewer && (
                              <td style={{ ...getTdStyle(t), textAlign: "center" }}>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                                  {(isAdmin || task.editApproved) && (
                                    <button 
                                      onClick={() => { setPreFilledTask(task); setShowForm(true); }}
                                      style={{ 
                                        background: t.bg, color: t.textMuted, border: `1px solid ${t.border}`, 
                                        cursor: "pointer", padding: "6px", borderRadius: "8px", 
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "all 0.2s"
                                      }}
                                      title="Edit Task"
                                      onMouseOver={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#bfdbfe"; e.currentTarget.style.background = "#eff6ff"; }}
                                      onMouseOut={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}

                                  {isAdmin ? (
                                    <button 
                                      onClick={() => {
                                        showConfirm(`Are you sure you want to delete "${task.taskName}"?`, async () => {
                                          const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
                                          if (res.ok) {
                                            setTasks(tasks.filter(t => t.id !== task.id));
                                            showNotification("Task deleted successfully.");
                                          } else {
                                            showNotification("Failed to delete task.", "error");
                                          }
                                        });
                                      }}
                                      style={{ 
                                        background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", 
                                        cursor: "pointer", padding: "4px 8px", borderRadius: "6px", 
                                        fontSize: "0.75rem", fontWeight: 500 
                                      }}
                                      title="Delete Task Directly"
                                    >
                                      Delete
                                    </button>
                                  ) : (isCurrentUserOwner || isCurrentUserReviewer) ? (
                                    <button 
                                      onClick={() => handleRequestDelete(task.id)}
                                      disabled={task.deleteRequested}
                                      style={{ 
                                        background: task.deleteRequested ? "#e2e8f0" : "#fef2f2", 
                                        color: task.deleteRequested ? "#94a3b8" : "#ef4444", 
                                        border: task.deleteRequested ? "1px solid #cbd5e1" : "1px solid #fca5a5", 
                                        cursor: task.deleteRequested ? "not-allowed" : "pointer", 
                                        padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 
                                      }}
                                      title={task.deleteRequested ? "Delete Pending" : "Request Delete"}
                                    >
                                      {task.deleteRequested ? "Requested" : "Del Req"}
                                    </button>
                                  ) : null}

                                  {(!isAdmin && !task.editApproved && (isCurrentUserOwner || isCurrentUserReviewer)) && (
                                    <button 
                                      onClick={() => handleRequestEdit(task.id, isCurrentUserReviewer ? "REVIEWER" : "OWNER")}
                                      disabled={task.editRequested}
                                      style={{ 
                                        background: task.editRequested ? "#e2e8f0" : (isCurrentUserReviewer ? "#fdf4ff" : "#eff6ff"), 
                                        color: task.editRequested ? "#94a3b8" : (isCurrentUserReviewer ? "#d946ef" : "#3b82f6"), 
                                        border: task.editRequested ? "1px solid #cbd5e1" : (isCurrentUserReviewer ? "1px solid #f5d0fe" : "1px solid #bfdbfe"), 
                                        cursor: task.editRequested ? "not-allowed" : "pointer", 
                                        padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500 
                                      }}
                                      title={task.editRequested ? "Edit Pending" : "Request Edit"}
                                    >
                                      {task.editRequested ? "Requested" : "Edit Req"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              
            {/* Pagination Controls */}
            {filteredTasksToDisplay.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: `1px solid ${t.border}`, background: t.bg }}>
                <div style={{ fontSize: "0.875rem", color: t.textMuted }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTasksToDisplay.length)} of {filteredTasksToDisplay.length} tasks
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: currentPage === 1 ? "#94a3b8" : "#0f172a", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, padding: "0 12px" }}>
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === (totalPages || 1)}
                    style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: currentPage === (totalPages || 1) ? "#94a3b8" : "#0f172a", cursor: currentPage === (totalPages || 1) ? "not-allowed" : "pointer" }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}



        {activeMainView === 'DASHBOARD' && activeView === 'TASKS' && activeSubView === 'ANALYTICS' && (
          <div style={{ background: t.card, borderRadius: "24px", border: `1px solid ${t.border}`, minHeight: "calc(100vh - 200px)", padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.4s ease-out", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
            {/* Analytics Header / Filters */}
            <div style={{ background: t.bg, borderBottom: `1px solid ${t.border}`, padding: "12px 20px" }}>
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap", overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", padding: "6px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <Building2 size={14} color={t.textMuted} />
                  <select 
                    value={anaTaskEntityFilter}
                    onChange={(e) => setAnaTaskEntityFilter(e.target.value)}
                    style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.8125rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                  >
                    <option value="ALL" style={{ background: t.card, color: t.text }}>All Entities</option>
                    {uniqueTaskEntities.map(ent => <option key={ent} value={ent} style={{ background: t.card, color: t.text }}>{ent}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", padding: "6px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <Tag size={14} color={t.textMuted} />
                  <select 
                    value={anaTaskDeptFilter}
                    onChange={(e) => setAnaTaskDeptFilter(e.target.value)}
                    style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.8125rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                  >
                    <option value="ALL" style={{ background: t.card, color: t.text }}>All Departments</option>
                    {uniqueTaskDepts.map(dept => <option key={dept} value={dept} style={{ background: t.card, color: t.text }}>{dept}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", padding: "6px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <User size={14} color={t.textMuted} />
                  <select 
                    value={anaTaskUserFilter}
                    onChange={(e) => setAnaTaskUserFilter(e.target.value)}
                    style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.8125rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                  >
                    <option value="ALL" style={{ background: t.card, color: t.text }}>All Users</option>
                    {uniqueTaskOwners.map(user => <option key={user} value={user} style={{ background: t.card, color: t.text }}>{user}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", padding: "4px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: t.textMuted }}>Filter by Date:</span>
                  <select
                    value={anaDateFilterPreset}
                    onChange={(e) => handleAnaPresetChange(e.target.value)}
                    style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.8125rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                  >
                    <option value="ALL_TIME" style={{ background: t.card, color: t.text }}>All Time</option>
                    <option value="CURRENT_MONTH" style={{ background: t.card, color: t.text }}>Current Month</option>
                    <option value="LAST_MONTH" style={{ background: t.card, color: t.text }}>Last Month</option>
                    <option value="LAST_3_MONTHS" style={{ background: t.card, color: t.text }}>Last 3 Months</option>
                    <option value="LAST_6_MONTHS" style={{ background: t.card, color: t.text }}>Last 6 Months</option>
                    <option value="CURRENT_FY" style={{ background: t.card, color: t.text }}>Current Financial Year</option>
                    <option value="CUSTOM" style={{ background: t.card, color: t.text }}>Custom Range</option>
                  </select>

                  {anaDateFilterPreset === "CUSTOM" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={14} color={t.textMuted} />
                      <input 
                        type="date"
                        value={anaStartDate}
                        onChange={(e) => setAnaStartDate(e.target.value)}
                        style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.8125rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b" }}>TO</span>
                      <input 
                        type="date"
                        value={anaEndDate}
                        onChange={(e) => setAnaEndDate(e.target.value)}
                        style={{ background: "transparent", border: "none", color: t.text, fontSize: "0.8125rem", fontWeight: 600, outline: "none", cursor: "pointer" }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setAnaTaskEntityFilter('ALL');
                    setAnaTaskDeptFilter('ALL');
                    setAnaTaskUserFilter('ALL');
                    handleAnaPresetChange('CURRENT_FY');
                  }}
                  title="Reset all filters"
                  style={{ background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9", border: `1px solid ${t.border}`, color: t.text, cursor: "pointer", padding: "6px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                  className="hover-card"
                >
                  <RotateCcw size={12} /> RESET
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* Scorecards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
                  {[
                    { label: "Total Tasks", value: taskAnalyticsData.totalTasks, icon: <LayoutDashboard />, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
                    { label: "On-Time Completion", value: `${taskAnalyticsData.totalTasks > 0 ? Math.round((taskAnalyticsData.onTimeTasks / taskAnalyticsData.totalTasks) * 100) : 0}%`, icon: <CheckCircle2 />, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
                    { label: "Overdue Tasks", value: taskAnalyticsData.overdueTasks, icon: <AlertTriangle />, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
                    { label: "IDR Conversion", value: `${taskAnalyticsData.totalIDR > 0 ? Math.round((taskAnalyticsData.convertedIDR / taskAnalyticsData.totalIDR) * 100) : 0}%`, icon: <RefreshCw />, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" }
                  ].map((m, i) => (
                    <div key={i} style={{ padding: "24px", borderRadius: "24px", background: t.card, border: `1px solid ${t.border}`, position: "relative", overflow: "hidden", boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: `radial-gradient(circle at center, ${m.color}20 0%, transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: m.bg, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>{m.icon}</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, color: t.text, marginBottom: "4px" }}>{m.value}</div>
                      <div style={{ fontSize: "0.8125rem", color: t.textMuted, fontWeight: 600 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Second Row: IDR Stats & Performance Donut */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {/* IDR Funnel */}
                  <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: "0 0 24px 0", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>IDR Pipeline Analysis</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {[
                        { label: "Requests Received", value: taskAnalyticsData.totalIDR, color: "#94a3b8" },
                        { label: "Converted to Tasks", value: taskAnalyticsData.convertedIDR, color: "#6366f1" },
                        { label: "Successfully Completed", value: taskAnalyticsData.completedIDR, color: "#10b981" }
                      ].map((item, idx) => {
                        const maxVal = Math.max(taskAnalyticsData.totalIDR, 1);
                        const width = (item.value / maxVal) * 100;
                        return (
                          <div key={idx} style={{ width: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>
                              <span style={{ color: t.textMuted }}>{item.label}</span>
                              <span style={{ color: t.text }}>{item.value}</span>
                            </div>
                            <div style={{ height: "12px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                              <div style={{ width: `${width}%`, height: "100%", background: item.color, borderRadius: "6px", transition: "width 1s ease-out" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Task Completion Status Donut */}
                  <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: "0 0 32px 0", alignSelf: "flex-start", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Completion Health</h3>
                    <div style={{ position: "relative", width: "180px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="180" height="180" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="10" />
                        {/* On-Time Circle */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="10" 
                                strokeDasharray={`${(taskAnalyticsData.onTimeTasks / Math.max(taskAnalyticsData.totalTasks, 1)) * 251.2} 251.2`} 
                                strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 50 50)"
                                style={{ transition: "stroke-dasharray 1s ease-out" }}>
                          <title>On-Time: {taskAnalyticsData.onTimeTasks}</title>
                        </circle>
                        {/* Late Circle */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="10" 
                                strokeDasharray={`${(taskAnalyticsData.lateTasks / Math.max(taskAnalyticsData.totalTasks, 1)) * 251.2} 251.2`} 
                                strokeDashoffset={`-${(taskAnalyticsData.onTimeTasks / Math.max(taskAnalyticsData.totalTasks, 1)) * 251.2}`} 
                                strokeLinecap="round" transform="rotate(-90 50 50)"
                                style={{ transition: "stroke-dasharray 1s ease-out" }}>
                          <title>Late: {taskAnalyticsData.lateTasks}</title>
                        </circle>
                        {/* Overdue Circle */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="10" 
                                strokeDasharray={`${(taskAnalyticsData.overdueTasks / Math.max(taskAnalyticsData.totalTasks, 1)) * 251.2} 251.2`} 
                                strokeDashoffset={`-${((taskAnalyticsData.onTimeTasks + taskAnalyticsData.lateTasks) / Math.max(taskAnalyticsData.totalTasks, 1)) * 251.2}`} 
                                strokeLinecap="round" transform="rotate(-90 50 50)"
                                style={{ transition: "stroke-dasharray 1s ease-out" }}>
                          <title>Overdue: {taskAnalyticsData.overdueTasks}</title>
                        </circle>
                      </svg>
                      <div style={{ position: "absolute", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: t.text }}>{taskAnalyticsData.totalTasks > 0 ? Math.round(((taskAnalyticsData.onTimeTasks + taskAnalyticsData.lateTasks) / taskAnalyticsData.totalTasks) * 100) : 0}%</div>
                        <div style={{ fontSize: "0.65rem", color: t.textMuted, fontWeight: 600 }}>COMPLETED</div>
                      </div>
                    </div>
                    <div style={{ marginTop: "24px", width: "100%", display: "flex", justifyContent: "center", gap: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#10b981" }} />
                        <span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 600 }}>On-Time</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#f59e0b" }} />
                        <span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 600 }}>Late</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#ef4444" }} />
                        <span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 600 }}>Overdue</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Third Row: User Performance Table */}
                <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h3 style={{ margin: 0, color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Team Efficiency Leaderboard</h3>
                    <div style={{ fontSize: "0.8125rem", color: "#6366f1", background: "rgba(99, 102, 241, 0.1)", padding: "4px 12px", borderRadius: "20px", fontWeight: 700 }}>Top Performers</div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: "left" }}>
                          <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 800, textTransform: "uppercase" }}>Owner / User</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>Tasks</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>On-Time</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>Late</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>Overdue</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 800, textTransform: "uppercase", textAlign: "right" }}>Efficiency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskAnalyticsData.userPerformance.slice(0, 10).map((u, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(15, 23, 42, 0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>{u.name[0]}</div>
                              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: t.text }}>{u.name}</span>
                            </td>
                            <td style={{ padding: "16px", textAlign: "center", fontSize: "0.875rem", color: t.text, fontWeight: 600 }}>{u.total}</td>
                            <td style={{ padding: "16px", textAlign: "center", fontSize: "0.875rem", color: "#10b981", fontWeight: 700 }}>{u.onTime}</td>
                            <td style={{ padding: "16px", textAlign: "center", fontSize: "0.875rem", color: "#f59e0b", fontWeight: 700 }}>{u.late}</td>
                            <td style={{ padding: "16px", textAlign: "center", fontSize: "0.875rem", color: "#ef4444", fontWeight: 700 }}>{u.overdue}</td>
                            <td style={{ padding: "16px", textAlign: "right" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                                <div style={{ width: "60px", height: "6px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                  <div style={{ width: `${u.rate}%`, height: "100%", background: u.rate > 80 ? "#10b981" : u.rate > 50 ? "#6366f1" : "#f59e0b" }} />
                                </div>
                                <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: t.text }}>{u.rate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fourth Row: Departmental Workload */}
                <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 32px 0", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Departmental Workload Distribution</h3>
                  <div style={{ height: "300px", display: "flex", alignItems: "flex-end", gap: "20px", paddingBottom: "40px" }}>
                    {taskAnalyticsData.deptWorkload.slice(0, 10).map((d, i) => {
                      const maxTasks = Math.max(...taskAnalyticsData.deptWorkload.map(x => x.count), 1);
                      const height = (d.count / maxTasks) * 100;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", position: "relative" }}>
                          <div style={{ width: "100%", height: `${height}%`, background: "linear-gradient(to top, #6366f1, #a855f7)", borderRadius: "10px", minHeight: "4px", transition: "height 1s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative" }}>
                             <div style={{ position: "absolute", top: "-28px", width: "100%", textAlign: "center", color: t.text, fontSize: "0.875rem", fontWeight: 800 }}>{d.count}</div>
                          </div>
                          <div style={{ position: "absolute", bottom: "-30px", fontSize: "0.75rem", color: t.textMuted, fontWeight: 700, whiteSpace: "nowrap", transform: "rotate(-15deg)" }}>{d.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Fifth Row: Trends and Sources */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                  {/* Monthly Trend */}
                  <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: "0 0 32px 0", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Monthly Activity Trend</h3>
                    <div style={{ height: "250px", width: "100%", display: "flex", alignItems: "flex-end", gap: "30px", position: "relative" }}>
                      {/* Grid Lines */}
                      {[0, 25, 50, 75, 100].map(p => (
                        <div key={p} style={{ position: "absolute", bottom: `${p}%`, left: 0, right: 0, height: "1px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9" }} />
                      ))}
                      
                      {taskAnalyticsData.trends.map((m, i) => {
                        const maxVal = Math.max(...taskAnalyticsData.trends.map(x => Math.max(x.created, x.completed)), 1);
                        const hCreated = (m.created / maxVal) * 100;
                        const hCompleted = (m.completed / maxVal) * 100;
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "8px", height: "100%" }}>
                            <div style={{ width: "12px", height: `${hCreated}%`, background: "#6366f1", borderRadius: "4px 4px 0 0", transition: "height 1s ease-out" }} title={`Created: ${m.created}`} />
                            <div style={{ width: "12px", height: `${hCompleted}%`, background: "#10b981", borderRadius: "4px 4px 0 0", transition: "height 1s ease-out" }} title={`Completed: ${m.completed}`} />
                            <div style={{ position: "absolute", bottom: "-30px", width: "32px", textAlign: "center", fontSize: "0.75rem", color: t.textMuted, fontWeight: 700 }}>{m.month}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: "40px", display: "flex", gap: "24px", justifyContent: "center" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#6366f1" }} /><span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 700 }}>Tasks Created</span></div>
                       <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981" }} /><span style={{ fontSize: "0.75rem", color: t.textMuted, fontWeight: 700 }}>Tasks Completed</span></div>
                    </div>
                  </div>

                  {/* Task Source Breakdown */}
                  <div style={{ padding: "32px", borderRadius: "32px", background: t.card, border: `1px solid ${t.border}`, boxShadow: isDarkMode ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: "0 0 32px 0", color: t.text, fontSize: "1.25rem", fontWeight: 700 }}>Source Analysis</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      {[
                        { label: "Inter-Dept (IDR)", value: taskAnalyticsData.sources['IDR'], color: "#8b5cf6" },
                        { label: "Dashboard (TDB)", value: taskAnalyticsData.sources['TDB'], color: "#3b82f6" },
                        { label: "Recurring", value: taskAnalyticsData.sources['Recurring'], color: "#f59e0b" }
                      ].map((s, i) => {
                        const total = Math.max(taskAnalyticsData.totalTasks, 1);
                        const pct = Math.round((s.value / total) * 100);
                        return (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: t.text }}>{s.label}</span>
                              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: s.color }}>{pct}%</span>
                            </div>
                            <div style={{ height: "8px", background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: "4px" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: "4px" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {activeMainView === 'DASHBOARD' && activeView === 'TASKS' && activeSubView === 'OTHER_DEPT' && (
          <div className="other-dept-view">
            <div style={{ background: t.card, borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", overflow: "hidden" }}>

              
              {/* Metric Cards for Inter-Dept */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", padding: "16px 24px", background: t.card }}>
                <MetricCard t={t} 
                  title="All Requests" 
                  value={baseFilteredExternalRequests.length} 
                  icon={<FileText size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #475569 0%, #1e293b 100%)" 
                  isActive={extReqFilter === 'ALL'} 
                  onClick={() => setExtReqFilter('ALL')} 
                />
                <MetricCard t={t} 
                  title="Pending for Acceptance" 
                  value={baseFilteredExternalRequests.filter(r => r.status === 'Pending' || !r.status || r.status === 'New' || r.status === '').length} 
                  icon={<Clock size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" 
                  isActive={extReqFilter === 'ALLOCATION'} 
                  onClick={() => setExtReqFilter('ALLOCATION')} 
                />
                <MetricCard t={t} 
                  title="Request Accepted" 
                  value={baseFilteredExternalRequests.filter(r => r.status === 'Under Process').length} 
                  icon={<AlertCircle size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" 
                  isActive={extReqFilter === 'PROCESS'} 
                  onClick={() => setExtReqFilter('PROCESS')} 
                />
                <MetricCard t={t} 
                  title="Processed" 
                  value={baseFilteredExternalRequests.filter(r => r.status === 'Processed').length} 
                  icon={<CheckCircle2 size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                  isActive={extReqFilter === 'PROCESSED'} 
                  onClick={() => setExtReqFilter('PROCESSED')} 
                />
                <MetricCard t={t} 
                  title="Rejected" 
                  value={baseFilteredExternalRequests.filter(r => r.status === 'Rejected').length} 
                  icon={<Trash2 size={20} color="#ffffff" />} 
                  bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" 
                  isActive={extReqFilter === 'REJECTED'} 
                  onClick={() => setExtReqFilter('REJECTED')} 
                />
              </div>

              {/* Enhanced Filter Bar */}
              <div style={{ padding: "8px 16px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: "280px" }}>
                  <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} size={16} />
                  <input 
                    type="text" 
                    placeholder="Search requests..." 
                    value={extReqSearch}
                    onChange={e => setExtReqSearch(e.target.value)}
                    style={{ padding: "8px 8px 8px 32px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.8125rem", width: "100%", background: t.card }} 
                  />
                </div>

                {/* Date Filters */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: t.card, padding: "6px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={14} color={t.textMuted} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: t.textMuted }}>FROM:</span>
                    <input 
                      type="date" 
                      value={extReqDateFrom} 
                      onChange={e => setExtReqDateFrom(e.target.value)} 
                      style={{ border: "none", background: "transparent", fontSize: "0.75rem", color: t.text, outline: "none", width: "110px", fontWeight: 500 }} 
                    />
                  </div>
                  <div style={{ width: "1px", height: "14px", background: t.border, margin: "0 2px" }}></div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: t.textMuted }}>TO:</span>
                    <input 
                      type="date" 
                      value={extReqDateTo} 
                      onChange={e => setExtReqDateTo(e.target.value)} 
                      style={{ border: "none", background: "transparent", fontSize: "0.75rem", color: t.text, outline: "none", width: "110px", fontWeight: 500 }} 
                    />
                    {(extReqDateFrom || extReqDateTo) && (
                      <X 
                        size={14} 
                        style={{ cursor: "pointer", color: "#ef4444", marginLeft: "2px" }} 
                        onClick={() => { setExtReqDateFrom(""); setExtReqDateTo(""); }} 
                      />
                    )}
                  </div>
                </div>
                
                <MultiSelectFilter
                  options={settings.masterRequestTypes.split(',').map(type => type.trim()).filter(Boolean)}
                  selected={extReqFinanceFunctionFilter}
                  onChange={setExtReqFinanceFunctionFilter}
                  placeholder="All Functions"
                  theme={theme}
                  t={t}
                />

                <MultiSelectFilter
                  options={["Pending for Acceptance", "Request Accepted", "Processed", "Rejected"]}
                  selected={extReqStatusFilter}
                  onChange={setExtReqStatusFilter}
                  placeholder="All Status"
                  theme={theme}
                  t={t}
                />
                
                {/* Pending Conversion Button (Renamed) */}
                <button 
                  onClick={() => setExtReqFilter(extReqFilter === 'CONVERT_PENDING' ? 'ALL' : 'CONVERT_PENDING')}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    background: extReqFilter === 'CONVERT_PENDING' ? "rgba(79, 70, 229, 0.1)" : "white", 
                    color: extReqFilter === 'CONVERT_PENDING' ? "#4f46e5" : "#64748b", 
                    border: extReqFilter === 'CONVERT_PENDING' ? "2px solid #4f46e5" : "1px solid #e2e8f0", 
                    padding: "6px 12px", 
                    borderRadius: "10px", 
                    fontSize: "0.8125rem", 
                    fontWeight: 600, 
                    cursor: "pointer", 
                    transition: "all 0.2s" 
                  }}
                >
                  <ListFilter size={16} />
                  Pending
                  <span style={{ 
                    background: extReqFilter === 'CONVERT_PENDING' ? "#4f46e5" : "#f1f5f9", 
                    color: extReqFilter === 'CONVERT_PENDING' ? "white" : "#64748b", 
                    padding: "1px 6px", 
                    borderRadius: "999px", 
                    fontSize: "0.7rem" 
                  }}>
                    {visibleExternalRequests.filter(r => (r.status === 'Pending' || r.status === 'Under Process' || !r.status || r.status === 'New') && !r.convertedTaskId).length}
                  </span>
                </button>

                {(isAdmin || (user as any).isAllocator || userAllocatedDepts.length > 0) && (
                  <MultiSelectFilter
                    options={["ORIGINAL", "TRANSFERRED"]}
                    selected={requestTypeFilter}
                    onChange={setRequestTypeFilter}
                    placeholder="All Origins"
                    theme={theme}
                    t={t}
                  />
                )}
                
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", paddingLeft: "8px", borderLeft: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Rows:</span>
                  <select 
                    value={extReqItemsPerPage} 
                    onChange={e => setExtReqItemsPerPage(Number(e.target.value))}
                    style={{ border: "none", background: "transparent", fontWeight: 700, color: "#2563eb", outline: "none", cursor: "pointer", fontSize: "0.8125rem" }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: "32px", overflowX: "auto", overflowY: "hidden" }} className="custom-scrollbar">
                <table style={{ width: "100%", minWidth: "1600px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: t.bg }}>
                      <th style={{ ...getThStyle(t), width: "50px" }}>Sl No.</th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('requestFrom')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Request From {extReqSortConfig?.key === 'requestFrom' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('convertedTaskId' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Task ID {extReqSortConfig?.key === ('convertedTaskId' as any) && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('assignedAllocatorEmail' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Allocator {extReqSortConfig?.key === ('assignedAllocatorEmail' as any) && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('taskOwnerName' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Task Owner {extReqSortConfig?.key === ('taskOwnerName' as any) && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      {canAllocateAnything && (
                        <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('transferStatus')}>
                           <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                             Origin {extReqSortConfig?.key === 'transferStatus' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                           </div>
                        </th>
                      )}
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('createdAt')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Date {extReqSortConfig?.key === 'createdAt' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('requestType')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Finance Function {extReqSortConfig?.key === 'requestType' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer", minWidth: "10cm", maxWidth: "10cm" }} onClick={() => handleExtReqSort('natureOfRequest')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          What is Needed {extReqSortConfig?.key === 'natureOfRequest' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer", minWidth: "10cm", maxWidth: "10cm" }} onClick={() => handleExtReqSort('reasonForRequest' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Reason for Request {extReqSortConfig?.key === 'reasonForRequest' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer", minWidth: "7.5cm", maxWidth: "7.5cm" }} onClick={() => handleExtReqSort('mailSubject' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Mail Subject {extReqSortConfig?.key === 'mailSubject' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('status')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Request Status {extReqSortConfig?.key === 'status' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('taskDueDate' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Due Date {extReqSortConfig?.key === ('taskDueDate' as any) && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('processedMode' as any)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Comm. Mode {extReqSortConfig?.key === ('processedMode' as any) && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                      <th style={getThStyle(t)}>Reports/Docs</th>
                      {canAllocateAnything && <th style={getThStyle(t)}>Action</th>}
                      <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleExtReqSort('remarks')}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          Remarks {extReqSortConfig?.key === 'remarks' && (extReqSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {extReqLoading ? (
                      <tr><td colSpan={canAllocateAnything ? 16 : 14} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>Loading requests...</td></tr>
                    ) : paginatedExternalRequests.length === 0 ? (
                      <tr><td colSpan={canAllocateAnything ? 16 : 14} style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>No requests found.</td></tr>
                    ) : (
                      paginatedExternalRequests.map((req, idx) => {
                        const isAuthorizedAllocator = isAdmin || (user as any).isAllocator || userAllocatedDepts.some(d => d.toLowerCase().trim() === req.requestType?.toLowerCase().trim());
                        
                        return (
                          <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button 
                                  onClick={() => setSelectedExternalReqForView({
                                      id: req.id,
                                      requirement: req.natureOfRequest,
                                      reason: req.reasonForRequest || "N/A",
                                      fromDepartment: req.departmentName,
                                      toDepartment: req.requestType,
                                      raisedBy: req.requestFrom,
                                      currentOwner: req.assignedAllocatorEmail,
                                      timeline: formatDate(req.requestDate),
                                      status: req.status
                                   })}
                                  style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  title="Quick View"
                                >
                                  <Eye size={14} />
                                </button>
                                {idx + 1}
                              </div>
                            </td>
                            <td style={{ ...getTdStyle(t), whiteSpace: "nowrap" }}>
                               <div style={{ fontWeight: 600, color: t.text }}>{req.requestFrom}</div>
                               <div style={{ fontSize: "0.75rem", color: t.textMuted }}>{req.departmentName}</div>
                             </td>
                             <td style={{ ...getTdStyle(t), whiteSpace: "nowrap" }}>
                                {(() => {
                                  const dispId = (req as any).taskDisplayId || req.convertedTaskId?.toString();
                                  if (!dispId) return <span style={{ color: "#cbd5e1" }}>--</span>;
                                  return (
                                    <span style={{ 
                                      padding: "4px 8px", 
                                      background: "#f0f9ff", 
                                      borderRadius: "6px", 
                                      fontSize: "0.75rem", 
                                      fontWeight: 700, 
                                      color: "#0369a1", 
                                      border: "1px solid #bae6fd" 
                                    }}>
                                      {dispId.startsWith('T-') ? dispId : `T-${dispId}`}
                                    </span>
                                  );
                                })()}
                              </td>
                             <td style={{ ...getTdStyle(t), minWidth: "180px" }}>
                                {(() => {
                                  const allocatorEmail = req.assignedAllocatorEmail;
                                  let pName = "Unassigned";
                                  
                                  if (allocatorEmail) {
                                    const allocator = usersList.find(u => u.email === allocatorEmail);
                                    pName = allocator ? allocator.name : allocatorEmail;
                                  } else {
                                    const rawMatrix = JSON.parse(settings.allocationMatrix || '{}');
                                    const allocData = rawMatrix[req.requestType];
                                    let primaryEmail = "";
                                    if (allocData && typeof allocData === 'object' && !Array.isArray(allocData)) {
                                      primaryEmail = allocData.primary || "";
                                    } else if (Array.isArray(allocData)) {
                                      primaryEmail = allocData[0] || "";
                                    } else if (typeof allocData === 'string') {
                                      primaryEmail = allocData;
                                    }
                                    const pAllocator = usersList.find(u => u.email === primaryEmail);
                                    pName = pAllocator ? pAllocator.name : (primaryEmail || "Unassigned");
                                  }
                                  
                                  return (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem" }}>
                                      <User size={12} color="#6366f1" />
                                      <span>{pName}</span>
                                    </div>
                                  );
                                })()}
                             </td>
                             <td style={{ ...getTdStyle(t), minWidth: "220px" }}>
                                {req.taskOwnerName ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.8125rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <ShieldCheck size={12} color="#10b981" />
                                      <span style={{ fontWeight: 600, color: t.text }}>{req.taskOwnerName}</span>
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: t.textMuted, marginLeft: "18px" }}>
                                      {req.taskCreatedAt ? `(${formatDateTime(req.taskCreatedAt)})` : ""}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>-</span>
                                )}
                             </td>
                             {canAllocateAnything && (
                               <td style={getTdStyle(t)}>
                                 {renderOriginBadge(req)}
                               </td>
                             )}
                            <td style={{ ...getTdStyle(t), whiteSpace: "nowrap", fontSize: "0.75rem" }}>{formatDate(req.createdAt)}</td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ padding: "4px 10px", borderRadius: "6px", background: t.bg, fontSize: "0.75rem", fontWeight: 600, color: t.textMuted }}>
                                  {req.requestType}
                                </span>
                              </div>
                            </td>
                            <td 
                              style={{ 
                                ...getTdStyle(t), 
                                minWidth: "10cm", 
                                maxWidth: "10cm",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={req.natureOfRequest}
                            >
                              {req.natureOfRequest}
                            </td>
                            <td 
                              style={{ 
                                ...getTdStyle(t), 
                                minWidth: "10cm", 
                                maxWidth: "10cm",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={req.reasonForRequest || "N/A"}
                            >
                              {req.reasonForRequest || <span style={{color: t.textMuted, fontStyle: 'italic'}}>N/A</span>}
                            </td>
                            <td 
                              style={{ 
                                ...getTdStyle(t), 
                                minWidth: "7.5cm", 
                                maxWidth: "7.5cm",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={(req as any).mailSubject || "N/A"}
                            >
                              {(req as any).mailSubject || <span style={{color: t.textMuted, fontStyle: 'italic'}}>N/A</span>}
                            </td>
                            <td style={{ ...getTdStyle(t), minWidth: "160px" }}>
                                {(!req.status || req.status === 'Pending') && (
                                  <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#fff7ed", fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", border: "1px solid #ffedd5", whiteSpace: "nowrap" }}>
                                    Pending for Acceptance
                                  </span>
                                )}
                                {req.status === 'Under Process' && (
                                  <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#eff6ff", fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", border: "1px solid #dbeafe", whiteSpace: "nowrap" }}>
                                    Request Accepted
                                  </span>
                                )}
                                {req.status === 'Processed' && (
                                  <div 
                                    style={{ position: "relative" }}
                                    onMouseEnter={() => setHoveredProcessedId(req.id)}
                                    onMouseLeave={() => setHoveredProcessedId(null)}
                                  >
                                    <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#f0fdf4", fontSize: "0.75rem", fontWeight: 700, color: "#166534", border: "1px solid #dcfce7", cursor: "help", whiteSpace: "nowrap" }}>
                                      Processed
                                    </span>
                                    {hoveredProcessedId === req.id && (
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
                                        <div style={{ fontWeight: 700, marginBottom: "4px", color: "#4ade80", fontSize: "0.65rem", textTransform: "uppercase" }}>Completion Details</div>
                                        Processed by: {req.processedBy || "System"} <br/>
                                        Date: {req.processedAt ? formatDateTime(req.processedAt) : "N/A"}
                                        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTopColor: "#1e293b" }}></div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {req.status === 'Rejected' && (
                                  <div 
                                    style={{ position: "relative" }}
                                    onMouseEnter={() => setHoveredRejectId(req.id)}
                                    onMouseLeave={() => setHoveredRejectId(null)}
                                  >
                                    <span style={{ padding: "4px 10px", borderRadius: "100px", background: "#fef2f2", fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", border: "1px solid #fee2e2", cursor: "help", whiteSpace: "nowrap" }}>
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
                                        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTopColor: t.text }}></div>
                                      </div>
                                    )}
                                  </div>
                                )}
                            </td>
                            <td style={{ ...getTdStyle(t), whiteSpace: "nowrap", fontWeight: 600 }}>
                              {req.taskDueDate ? formatDate(req.taskDueDate) : <span style={{ color: "#cbd5e1" }}>--</span>}
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.75rem", color: req.processedMode ? "#0f172a" : "#94a3b8" }}>
                                  {req.processedMode || "N/A"}
                                </span>
                                {req.processedMailLink && (
                                  <a 
                                    href={req.processedMailLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    title="View Mail Sub"
                                    style={{ color: "#4f46e5", display: "flex", alignItems: "center" }}
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td style={getTdStyle(t)}>
                              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                {(() => {
                                  let attachments = [];
                                  try {
                                    attachments = typeof req.processedAttachments === 'string' 
                                      ? JSON.parse(req.processedAttachments) 
                                      : (req.processedAttachments || []);
                                  } catch (e) {
                                    attachments = [];
                                  }
                                  if (!Array.isArray(attachments)) attachments = [];
                                  return attachments.length > 0 ? (
                                    attachments.map((file: any, idx: number) => (
                                      <a 
                                        key={idx}
                                        href={file.data}
                                        download={file.name}
                                        title={`Download ${file.name}`}
                                        style={{ color: "#4f46e5", background: "#f5f3ff", padding: "4px", borderRadius: "4px" }}
                                      >
                                        <Download size={14} />
                                      </a>
                                    ))
                                  ) : (
                                    <span style={{ color: "#cbd5e1" }}>N/A</span>
                                  );
                                })()}
                              </div>
                            </td>
                            {canAllocateAnything && (
                              <td style={getTdStyle(t)}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {((!req.status || req.status === 'Pending' || req.status === 'Under Process' || req.status === 'New') && !req.convertedTaskId && isAuthorizedAllocator) && (
                                      <>
                                        <button 
                                          onClick={() => handleConvertToTask(req)}
                                          style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}
                                          title="Convert to Task"
                                        >
                                          <Plus size={16} />
                                        </button>
                                        <button 
                                          onClick={() => { setRejectingReq(req); setShowRejectModal(true); }}
                                          style={{ background: t.card, color: "#ef4444", border: "1px solid #fee2e2", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}
                                          title="Reject"
                                        >
                                          <X size={16} />
                                        </button>
                                      </>
                                    )}
                                    {!req.convertedTaskId && isAdmin && (
                                      <button 
                                        onClick={() => handleDeleteExtRequest(req.id)}
                                        style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                                        onMouseOver={(e) => e.currentTarget.style.color = "#ef4444"}
                                        onMouseOut={(e) => e.currentTarget.style.color = "#94a3b8"}
                                        title="Delete Request"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                  {req.convertedTaskId && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#f0f9ff", fontSize: "0.7rem", fontWeight: 700, color: "#0369a1", border: "1px solid #bae6fd", whiteSpace: "nowrap" }}>
                                          TASK CREATED
                                        </span>
                                      </div>
                                      {isAdmin && (
                                        <button 
                                          onClick={() => handleDeleteExtRequest(req.id)}
                                          style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: "2px", borderRadius: "4px" }}
                                          onMouseOver={(e) => e.currentTarget.style.color = "#ef4444"}
                                          onMouseOut={(e) => e.currentTarget.style.color = "#94a3b8"}
                                          title="Delete Request"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {req.status === 'Rejected' && (
                                    <div style={{ fontSize: "0.7rem", color: "#ef4444", maxWidth: "200px", padding: "8px", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fee2e2" }}>
                                      <strong>Rejected:</strong> { (req as any).rejectReason || "No reason provided" }
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            <td style={{ ...getTdStyle(t), maxWidth: "280px", whiteSpace: "normal", color: t.textMuted, fontSize: "0.8rem" }}>
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
              
            {/* Pagination Controls */}
            {sortedExternalRequests.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: `1px solid ${t.border}`, background: t.bg, borderBottomLeftRadius: "24px", borderBottomRightRadius: "24px" }}>
                <div style={{ fontSize: "0.875rem", color: t.textMuted }}>
                  Showing {(extReqCurrentPage - 1) * extReqItemsPerPage + 1} to {Math.min(extReqCurrentPage * extReqItemsPerPage, sortedExternalRequests.length)} of {sortedExternalRequests.length} requests
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button 
                    onClick={() => setExtReqCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={extReqCurrentPage === 1}
                    style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: extReqCurrentPage === 1 ? "#94a3b8" : "#0f172a", cursor: extReqCurrentPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, padding: "0 12px" }}>
                    Page {extReqCurrentPage} of {totalExtReqPages || 1}
                  </div>
                  <button 
                    onClick={() => setExtReqCurrentPage(prev => Math.min(prev + 1, totalExtReqPages))}
                    disabled={extReqCurrentPage === (totalExtReqPages || 1)}
                    style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: extReqCurrentPage === (totalExtReqPages || 1) ? "#94a3b8" : "#0f172a", cursor: extReqCurrentPage === (totalExtReqPages || 1) ? "not-allowed" : "pointer" }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LO View */}
        {activeView === 'LOS' && loActiveFilter !== 'ANALYTICS' && (
          <div className="lo-view" style={{ background: t.card, borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", overflow: "hidden", animation: "fadeIn 0.5s ease-out" }}>
            {loActiveFilter === 'RESOURCES' ? (
                <div style={{ minHeight: "600px", display: "flex", flexDirection: "column" }}>
                   <div style={{ 
                      height: "120px", 
                      background: isDarkMode ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
                      padding: "0 40px", 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      {/* Decorative Background Elements (NDL Inspiration) */}
                      <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
                      <div style={{ position: "absolute", bottom: "-50px", left: "20%", width: "150px", height: "150px", background: "radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
                      
                      <div style={{ zIndex: 1 }}>
                         <h2 style={{ color: "white", margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "12px" }}>
                           <div style={{ background: "rgba(255,255,255,0.1)", padding: "8px", borderRadius: "10px" }}><BookOpen size={24} color="#10b981" /></div>
                           Knowledge Library
                         </h2>
                         <p style={{ color: "rgba(255,255,255,0.5)", margin: "4px 0 0 0", fontSize: "0.875rem", fontWeight: 500 }}>Centralized reference & professional publications</p>
                      </div>

                      <div style={{ display: "flex", gap: "16px", alignItems: "center", zIndex: 1 }}>
                        <div style={{ position: "relative" }}>
                          <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.6)", transition: "color 0.2s" }} size={16} />
                          <input 
                            type="text" 
                            placeholder="Search library..." 
                            value={librarySearchQuery} 
                            onChange={e => setLibrarySearchQuery(e.target.value)} 
                            style={{ 
                              background: "rgba(255,255,255,0.15)", 
                              border: "1px solid rgba(255,255,255,0.25)", 
                              borderRadius: "14px", 
                              padding: "10px 14px 10px 40px", 
                              color: "white", 
                              width: "260px", 
                              outline: "none", 
                              backdropFilter: "blur(12px)",
                              fontSize: "0.875rem",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.2)"
                            }}
                            onFocus={e => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                              e.currentTarget.style.borderColor = "#10b981";
                              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.15), 0 8px 16px rgba(0,0,0,0.15)";
                              e.currentTarget.style.width = "320px";
                            }}
                            onBlur={e => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.2)";
                              e.currentTarget.style.width = "260px";
                            }}
                          />
                        </div>
                        {!isViewer && (
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div style={{ position: "relative", overflow: "hidden", borderRadius: "14px" }}>
                              <style dangerouslySetInnerHTML={{ __html: `
                                @keyframes shimmer-btn {
                                  0% { transform: translateX(-100%) skewX(-20deg); }
                                  100% { transform: translateX(250%) skewX(-20deg); }
                                }
                                .btn-add-resource:hover .btn-shimmer {
                                  animation: shimmer-btn 1.5s infinite;
                                }
                                .btn-add-resource:hover .plus-icon {
                                  transform: rotate(90deg);
                                }
                                .btn-add-resource:active {
                                  transform: scale(0.95);
                                }
                              `}} />
                              <button 
                                onClick={() => {
                                  const cats = settings.masterResourceCategories?.split(',').map(c => c.trim()).filter(Boolean) || [];
                                  if (cats.length > 0) setResourceCategory(cats[0]);
                                  setShowResourceModal(true);
                                }} 
                                className="btn-add-resource"
                                style={{ 
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                                  color: "white", 
                                  padding: "10px 22px", 
                                  borderRadius: "14px", 
                                  border: "1px solid rgba(255,255,255,0.1)", 
                                  cursor: "pointer", 
                                  fontWeight: 700, 
                                  fontSize: "0.8125rem", 
                                  boxShadow: "0 8px 20px -6px rgba(16, 185, 129, 0.4)", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  gap: "8px",
                                  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                  position: "relative",
                                  overflow: "hidden"
                                }}
                              >
                                <div className="btn-shimmer" style={{ 
                                  position: "absolute", 
                                  top: 0, 
                                  left: 0, 
                                  width: "40px", 
                                  height: "100%", 
                                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)", 
                                  pointerEvents: "none" 
                                }} />
                                <Plus className="plus-icon" size={18} /> 
                                <span>Add Resource</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>

                   <div style={{ background: "#f8fafc", padding: "16px 40px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem" }}>
                       <button onClick={() => { setCurrentLibraryPath(null); setCurrentSubfolderId(null); setCurrentSubfolderPath(null); setLibrarySearchQuery(""); }} style={{ color: "#4f46e5", background: "none", border: "none", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                         <Home size={16} /> Library
                       </button>
                       {currentLibraryPath && (
                         <>
                           <ChevronRight size={14} color="#94a3b8" />
                           <button onClick={() => { setCurrentSubfolderId(null); setCurrentSubfolderPath(null); }} style={{ color: currentSubfolderId ? "#4f46e5" : t.text, background: "none", border: "none", fontWeight: 600, cursor: currentSubfolderId ? "pointer" : "default" }}>
                             {currentLibraryPath}
                           </button>
                         </>
                       )}
                       {currentSubfolderPath && (
                         <>
                           <ChevronRight size={14} color="#94a3b8" />
                           <span style={{ fontWeight: 600, color: t.text }}>{currentSubfolderPath}</span>
                         </>
                       )}
                       {librarySearchQuery && (
                          <>
                            <ChevronRight size={14} color="#94a3b8" />
                            <span style={{ fontWeight: 600, color: t.text }}>Search: "{librarySearchQuery}"</span>
                          </>
                       )}
                     </div>

                     <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                       {currentLibraryPath && !currentSubfolderId && !librarySearchQuery && !isViewer && (
                         <button 
                           onClick={() => setShowAddSubfolderModal(true)}
                           style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe", padding: "6px 14px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                         >
                           <Plus size={14} /> Add Folder
                         </button>
                       )}
                     <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", background: "white", padding: "4px", borderRadius: "8px", border: `1px solid ${t.border}`, gap: "4px" }}>
                          <button onClick={() => setLibraryViewMode('tiles')} style={{ padding: "6px", borderRadius: "6px", border: "none", background: libraryViewMode === 'tiles' ? "#f1f5f9" : "transparent", color: libraryViewMode === 'tiles' ? "#4f46e5" : "#64748b", cursor: "pointer" }} title="Tiles View"><LayoutGrid size={18} /></button>
                          <button onClick={() => setLibraryViewMode('list')} style={{ padding: "6px", borderRadius: "6px", border: "none", background: libraryViewMode === 'list' ? "#f1f5f9" : "transparent", color: libraryViewMode === 'list' ? "#4f46e5" : "#64748b", cursor: "pointer" }} title="List View"><List size={18} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setShowLibraryViewMenu(!showLibraryViewMenu); }} style={{ padding: "6px", borderRadius: "6px", border: "none", background: showLibraryViewMenu ? "#f1f5f9" : "transparent", color: showLibraryViewMenu ? "#4f46e5" : "#64748b", cursor: "pointer" }} title="More Options"><ChevronDown size={18} /></button>
                        </div>
                        {showLibraryViewMenu && (
                          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "white", borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, width: "180px", padding: "8px", overflow: "hidden" }}>
                            {[
                              { id: 'extra-large', label: 'Extra large icons', icon: <LayoutGrid size={16} /> },
                              { id: 'large', label: 'Large icons', icon: <LayoutGrid size={16} /> },
                              { id: 'tiles', label: 'Medium icons (Tiles)', icon: <LayoutGrid size={16} /> },
                              { id: 'list', label: 'List', icon: <List size={16} /> },
                              { id: 'details', label: 'Details', icon: <ListFilter size={16} /> }
                            ].map(opt => (
                              <button 
                                key={opt.id}
                                onClick={() => { setLibraryViewMode(opt.id as any); setShowLibraryViewMenu(false); }}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px", border: "none", background: libraryViewMode === opt.id ? "#f1f5f9" : "transparent", color: libraryViewMode === opt.id ? "#4f46e5" : t.text, borderRadius: "8px", cursor: "pointer", fontSize: "0.8125rem", textAlign: "left" }}
                              >
                                {opt.icon} {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "40px", flex: 1 }}>
                    {resourcesLoading ? (
                      <div style={{ textAlign: "center", padding: "60px", color: t.textMuted }}>
                        <RefreshCw size={40} className="animate-spin" style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                        <p>Fetching your library resources...</p>
                      </div>
                    ) : (
                      <>
                        {/* Search Results View */}
                          {librarySearchQuery ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px" }}>
                               {resources.filter(r => 
                                 r.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) || 
                                 (r.category || "").toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
                                 subfolders.find(sf => sf.id === r.subfolderId)?.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
                               ).map(res => renderResourceCard(res, libraryViewMode, t, isAdmin, handleDeleteResource))}
                            </div>
                          ) : (
                            <>
                              {/* Level 1: Categories */}
                              {!currentLibraryPath && (
                                <div style={{ 
                                  display: libraryViewMode === 'list' || libraryViewMode === 'details' ? "flex" : "grid", 
                                  flexDirection: "column",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", 
                                  gap: libraryViewMode === 'list' || libraryViewMode === 'details' ? "8px" : "20px" 
                                }}>
                                  {Array.from(new Set(resources.map(r => r.category || "General"))).concat(subfolders.map(sf => sf.category)).filter((v, i, a) => a.indexOf(v) === i).sort().map(cat => {
                                    const resCount = resources.filter(r => (r.category || "General") === cat).length;
                                    const sfCount = subfolders.filter(sf => sf.category === cat).length;
                                    const isList = libraryViewMode === 'list' || libraryViewMode === 'details';
                                    
                                    return (
                                      <div 
                                        key={cat}
                                        onClick={() => setCurrentLibraryPath(cat)}
                                        style={{ 
                                          background: "white", 
                                          padding: isList ? "10px 16px" : "20px", 
                                          borderRadius: isList ? "8px" : "16px", 
                                          border: `1px solid ${t.border}`, 
                                          cursor: "pointer", 
                                          transition: "all 0.2s", 
                                          display: "flex", 
                                          alignItems: "center", 
                                          gap: "14px", 
                                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#f5f3ff"; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = "white"; }}
                                      >
                                        <div style={{ width: isList ? "32px" : "44px", height: isList ? "32px" : "44px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                                          <Folder size={isList ? 18 : 24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <h4 style={{ margin: 0, fontWeight: 700, color: t.text, fontSize: isList ? "0.875rem" : "1rem" }}>{cat}</h4>
                                          {!isList && <p style={{ margin: "2px 0 0 0", color: t.textMuted, fontSize: "0.7rem", fontWeight: 600 }}>{resCount + sfCount} items</p>}
                                        </div>
                                        {isList && <ChevronRight size={16} color="#94a3b8" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Level 2: Subfolders & Root Resources */}
                              {currentLibraryPath && !currentSubfolderId && (
                                <>
                                  <div style={{ 
                                    display: libraryViewMode === 'list' || libraryViewMode === 'details' ? "flex" : "grid", 
                                    flexDirection: "column",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", 
                                    gap: libraryViewMode === 'list' || libraryViewMode === 'details' ? "8px" : "20px",
                                    marginBottom: "32px"
                                  }}>
                                    {subfolders.filter(sf => sf.category === currentLibraryPath).sort((a,b) => a.name.localeCompare(b.name)).map(sf => {
                                      const resCount = resources.filter(r => r.subfolderId === sf.id).length;
                                      const isList = libraryViewMode === 'list' || libraryViewMode === 'details';
                                      
                                      return (
                                        <div 
                                          key={sf.id}
                                          onClick={() => { setCurrentSubfolderId(sf.id); setCurrentSubfolderPath(sf.name); }}
                                          style={{ 
                                            background: "white", 
                                            padding: isList ? "10px 16px" : "16px 20px", 
                                            borderRadius: isList ? "8px" : "16px", 
                                            border: `1px solid ${t.border}`, 
                                            cursor: "pointer", 
                                            transition: "all 0.2s", 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: "14px", 
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                                          }}
                                          onMouseOver={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#4f46e5"; }}
                                          onMouseOut={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = t.border; }}
                                        >
                                          <div style={{ width: isList ? "32px" : "40px", height: isList ? "32px" : "40px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                                            <Folder size={isList ? 16 : 20} />
                                          </div>
                                          <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontWeight: 700, color: t.text, fontSize: isList ? "0.8125rem" : "0.875rem" }}>{sf.name}</h4>
                                            {!isList && <p style={{ margin: 0, color: t.textMuted, fontSize: "0.7rem", fontWeight: 600 }}>{resCount} items</p>}
                                          </div>
                                          {isList && <ChevronRight size={14} color="#94a3b8" />}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Resources not in any subfolder (Root of Category) */}
                                  <div style={{ marginTop: "24px" }}>
                                    <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                      <div style={{ width: "4px", height: "16px", background: "#4f46e5", borderRadius: "2px" }} />
                                      Resources in {currentLibraryPath}
                                    </h4>
                                    <div style={{ 
                                      display: libraryViewMode === 'list' || libraryViewMode === 'details' ? "flex" : "grid", 
                                      flexDirection: "column",
                                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                                      gap: libraryViewMode === 'list' || libraryViewMode === 'details' ? "8px" : "20px" 
                                    }}>
                                      {resources.filter(r => (r.category || "General") === currentLibraryPath && !r.subfolderId).map(res => renderResourceCard(res, libraryViewMode, t, isAdmin, handleDeleteResource))}
                                      {resources.filter(r => (r.category || "General") === currentLibraryPath && !r.subfolderId).length === 0 && (
                                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "16px", border: `1px dashed ${t.border}` }}>
                                          <p style={{ color: t.textMuted, margin: 0, fontSize: "0.875rem" }}>No direct resources in this category.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Level 3: Resources in Subfolder */}
                              {currentSubfolderId && (
                                <div style={{ 
                                  display: libraryViewMode === 'list' || libraryViewMode === 'details' ? "flex" : "grid", 
                                  flexDirection: "column",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                                  gap: libraryViewMode === 'list' || libraryViewMode === 'details' ? "8px" : "20px" 
                                }}>
                                  {resources.filter(r => r.subfolderId === currentSubfolderId).map(res => renderResourceCard(res, libraryViewMode, t, isAdmin, handleDeleteResource))}
                                  {resources.filter(r => r.subfolderId === currentSubfolderId).length === 0 && (
                                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px", background: "#f8fafc", borderRadius: "20px", border: `1px dashed ${t.border}` }}>
                                       <FileText size={40} style={{ color: "#94a3b8", opacity: 0.3, marginBottom: "16px" }} />
                                       <p style={{ color: t.textMuted, fontWeight: 500 }}>This folder is currently empty.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                </div>
              ) : (
                <div style={{ minHeight: "600px" }}>
                  <div style={{ padding: "32px 32px 0 32px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <button 
                          onClick={() => { setLoActiveFilter('ALL'); setLoCurrentPage(1); }}
                          style={{ padding: "8px 20px", borderRadius: "100px", border: `1px solid ${loActiveFilter === 'ALL' ? "#4f46e5" : t.border}`, background: loActiveFilter === 'ALL' ? "#4f46e5" : "transparent", color: loActiveFilter === 'ALL' ? "white" : t.textMuted, fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" }}
                        >All Findings</button>
                        <button 
                          onClick={() => { setLoActiveFilter('REPORTS'); setLoCurrentPage(1); }}
                          style={{ padding: "8px 20px", borderRadius: "100px", border: `1px solid ${loActiveFilter === 'REPORTS' ? "#4f46e5" : t.border}`, background: loActiveFilter === 'REPORTS' ? "#4f46e5" : "transparent", color: loActiveFilter === 'REPORTS' ? "white" : t.textMuted, fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" }}
                        >My Findings</button>
                        <button 
                          onClick={() => { setLoActiveFilter('LEARNINGS'); setLoCurrentPage(1); }}
                          style={{ padding: "8px 20px", borderRadius: "100px", border: `1px solid ${loActiveFilter === 'LEARNINGS' ? "#4f46e5" : t.border}`, background: loActiveFilter === 'LEARNINGS' ? "#4f46e5" : "transparent", color: loActiveFilter === 'LEARNINGS' ? "white" : t.textMuted, fontWeight: 700, cursor: "pointer", fontSize: "0.8125rem", transition: "all 0.2s" }}
                        >My Learnings</button>
                      </div>
                      
                      <div style={{ position: "relative" }}>
                        <button 
                          onClick={() => setShowLODownloadDropdown(!showLODownloadDropdown)}
                          style={{ background: "#f0fdf4", color: "#166534", padding: "10px", borderRadius: "12px", border: "1px solid #dcfce7", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
                          onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
                          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                        >
                          <Download size={20} />
                        </button>
                        {showLODownloadDropdown && (
                          <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "white", borderRadius: "14px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9", zIndex: 100, minWidth: "220px", overflow: "hidden", animation: "slideDown 0.2s ease-out" }}>
                            <button 
                              onClick={() => { exportLOsToExcel(); setShowLODownloadDropdown(false); }}
                              style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "white", color: "#166534", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, transition: "background 0.2s" }}
                              onMouseOver={e => e.currentTarget.style.background = "#f0fdf4"}
                              onMouseOut={e => e.currentTarget.style.background = "white"}
                            >
                              <FileSpreadsheet size={16} /> Download Excel
                            </button>
                            <button 
                              onClick={() => { exportLOsToPDF(); setShowLODownloadDropdown(false); }}
                              style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "white", color: "#991b1b", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, transition: "background 0.2s" }}
                              onMouseOver={e => e.currentTarget.style.background = "#fef2f2"}
                              onMouseOut={e => e.currentTarget.style.background = "white"}
                            >
                              <FileText size={16} /> Download PDF
                            </button>
                            <div style={{ borderTop: "1px solid #f1f5f9" }}></div>
                            <button 
                              onClick={() => {
                                setShareData({ ...shareData, type: 'lo', subject: `Learning Opportunities Report - ${formatDate(new Date())}` });
                                setShowShareModal(true);
                                setShowLODownloadDropdown(false);
                              }}
                              style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "none", background: "white", color: "#2563eb", cursor: "pointer", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, transition: "background 0.2s" }}
                              onMouseOver={e => e.currentTarget.style.background = "#eff6ff"}
                              onMouseOut={e => e.currentTarget.style.background = "white"}
                            >
                              <Mail size={16} /> Share via Email
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", marginBottom: "16px", background: t.card, padding: "14px 20px", borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
                      <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
                        <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} size={18} />
                        <input 
                          type="text" 
                          placeholder="Search opportunities..." 
                          value={loSearchQuery} 
                          onChange={e => { setLoSearchQuery(e.target.value); setLoCurrentPage(1); }} 
                          style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.bg, outline: "none", fontSize: "0.875rem" }} 
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>From:</span>
                        <input 
                          type="date" 
                          value={loDateFrom} 
                          onChange={e => { setLoDateFrom(e.target.value); setLoCurrentPage(1); }}
                          style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>To:</span>
                        <input 
                          type="date" 
                          value={loDateTo} 
                          onChange={e => { setLoDateTo(e.target.value); setLoCurrentPage(1); }}
                          style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, outline: "none", fontSize: "0.875rem", background: t.bg, color: t.text }}
                        />
                      </div>

                       <MultiSelectFilter
                        options={Array.from(new Set(los.map(l => l.entity))).sort()}
                        selected={loEntityFilter}
                        onChange={(v) => { setLoEntityFilter(v); setLoCurrentPage(1); }}
                        placeholder="All Entities"
                        theme={theme}
                        t={t}
                      />

                      <MultiSelectFilter
                        options={uniqueLOIdentifiedBy}
                        selected={loIdentifiedByFilter}
                        onChange={(v) => { setLoIdentifiedByFilter(v); setLoCurrentPage(1); }}
                        placeholder="All Identified By"
                        theme={theme}
                        t={t}
                      />

                      <MultiSelectFilter
                        options={Array.from(new Set(los.map(l => l.committedBy))).sort()}
                        selected={loCommittedByFilter}
                        onChange={(v) => { setLoCommittedByFilter(v); setLoCurrentPage(1); }}
                        placeholder="All Committed By"
                        theme={theme}
                        t={t}
                      />

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", paddingLeft: "8px", borderLeft: `1px solid ${t.border}` }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Rows:</span>
                        <select 
                          value={loItemsPerPage} 
                          onChange={e => {
                            setLoItemsPerPage(Number(e.target.value));
                            setLoCurrentPage(1);
                          }}
                          style={{ border: "none", background: "transparent", fontWeight: 700, color: "#2563eb", outline: "none", cursor: "pointer", fontSize: "0.8125rem" }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={30}>30</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto", overflowY: "hidden", background: t.card, borderRadius: "16px", border: `1px solid ${t.border}` }} className="custom-scrollbar">
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1500px" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${t.border}`, background: theme === 'DARK' ? "#1e293b" : "#f8fafc" }}>
                            <th style={{ ...getThStyle(t), padding: "20px", cursor: "pointer" }} onClick={() => handleLOSort('id')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                SI No {loSortConfig?.key === 'id' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('createdAt')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Submitted At {loSortConfig?.key === 'createdAt' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('submittedBy' as any)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Submitted By {loSortConfig?.key === 'submittedBy' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('identifiedBy')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Identified By {loSortConfig?.key === 'identifiedBy' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('committedBy')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Committed By {loSortConfig?.key === 'committedBy' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('dateOfIdentification')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Date {loSortConfig?.key === 'dateOfIdentification' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('entity')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Entity {loSortConfig?.key === 'entity' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('classification' as any)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Classification {loSortConfig?.key === 'classification' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('learningOpportunity')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Opportunity {loSortConfig?.key === 'learningOpportunity' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('resolutionProvided')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Resolution {loSortConfig?.key === 'resolutionProvided' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('isAcknowledged' as any)}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Status {loSortConfig?.key === 'isAcknowledged' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={{ ...getThStyle(t), cursor: "pointer" }} onClick={() => handleLOSort('acknowledgedAt')}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                Ack At {loSortConfig?.key === 'acknowledgedAt' && (loSortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                              </div>
                            </th>
                            <th style={getThStyle(t)}>Ack Remarks</th>
                            {!isViewer && <th style={getThStyle(t)}>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {loLoading ? (
                            <tr><td colSpan={10} style={{ textAlign: "center", padding: "60px", color: t.textMuted }}>Loading opportunities...</td></tr>
                          ) : paginatedLOs.length === 0 ? (
                            <tr><td colSpan={10} style={{ textAlign: "center", padding: "80px", color: t.textMuted }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                <AlertCircle size={40} style={{ opacity: 0.3 }} />
                                <span style={{ fontSize: "1rem", fontWeight: 500 }}>No learning opportunities recorded.</span>
                              </div>
                            </td></tr>
                          ) : paginatedLOs.map((lo: any, idx) => (
                            <tr key={lo.id} style={{ borderBottom: `1px solid ${t.border}`, transition: "background 0.2s" }} className="table-row">
                              <td style={{ ...getTdStyle(t), padding: "16px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <button 
                                      onClick={() => setSelectedLOForView({
                                          id: lo.id,
                                          learningOpportunity: lo.learningOpportunity,
                                          resolutionPlan: lo.resolutionProvided,
                                          sourceTaskName: lo.taskName || "Direct Entry",
                                          ownerName: lo.committedBy,
                                          status: lo.isAcknowledged ? "Acknowledged" : "Pending",
                                          createdAt: lo.createdAt || lo.dateOfIdentification,
                                          ackBy: lo.acknowledgedBy,
                                          ackAt: lo.acknowledgedAt,
                                          ackComments: lo.learnerComments
                                      })}
                                      style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                      title="Quick View"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {(loCurrentPage - 1) * loItemsPerPage + idx + 1}
                                </div>
                              </td>
                              <td style={{ ...getTdStyle(t), fontSize: "0.8125rem", whiteSpace: "nowrap" }}>{lo.createdAt ? formatDateTime(lo.createdAt) : "--"}</td>
                              <td style={getTdStyle(t)}>{lo.submittedBy || <span style={{color: t.textMuted, fontStyle: 'italic'}}>Auto</span>}</td>
                              <td style={getTdStyle(t)}>{lo.identifiedBy}</td>
                              <td style={getTdStyle(t)}>{lo.committedBy}</td>
                              <td style={{ ...getTdStyle(t), whiteSpace: "nowrap", fontSize: "0.75rem" }}>{formatDate(lo.dateOfIdentification)}</td>
                              <td style={getTdStyle(t)}>{lo.entity}</td>
                              <td style={getTdStyle(t)}>{lo.classification || <span style={{color: t.textMuted, fontStyle: 'italic'}}>N/A</span>}</td>
                              <td style={{ ...getTdStyle(t), maxWidth: "300px", whiteSpace: "normal" }}>{lo.learningOpportunity}</td>
                              <td 
                                 title={lo.resolutionProvided || ""}
                                 style={{ 
                                   ...getTdStyle(t), 
                                   maxWidth: "265px", 
                                   whiteSpace: "nowrap", 
                                   overflow: "hidden", 
                                   textOverflow: "ellipsis" 
                                 }}
                               >
                                 {lo.resolutionProvided || "--"}
                               </td>
                              <td style={getTdStyle(t)}>
                                <span 
                                  title={lo.isAcknowledged ? `Acknowledged by ${lo.acknowledgedBy || lo.committedBy || 'Owner'} on ${formatDateTime(lo.acknowledgedAt!)}` : 'Pending acknowledgment'}
                                  style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700, background: lo.isAcknowledged ? "#dcfce7" : "#fef3c7", color: lo.isAcknowledged ? "#15803d" : "#b45309", cursor: lo.isAcknowledged ? "help" : "default" }}>
                                  {lo.isAcknowledged ? "Acknowledged" : "Pending"}
                                </span>
                              </td>
                              <td style={{ ...getTdStyle(t), fontSize: "0.8125rem", whiteSpace: "nowrap" }}>{lo.acknowledgedAt ? formatDateTime(lo.acknowledgedAt) : "--"}</td>
                              <td style={{ ...getTdStyle(t), maxWidth: "250px", whiteSpace: "normal", fontSize: "0.8125rem", color: t.text }}>{lo.learnerComments || "--"}</td>
                              {!isViewer && (
                                <td style={getTdStyle(t)}>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    {!lo.isAcknowledged && (lo.committedBy === user.name || isAdmin) && (
                                      <button 
                                        onClick={() => { setAcknowledgingLO(lo); setShowAckModal(true); }}
                                        style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#4f46e5", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.75rem" }}
                                      >Acknowledge</button>
                                    )}
                                    
                                    {isAdmin ? (
                                      <>
                                        <button onClick={() => handleCloseOptionsModal(() => setEditingLO(lo))} style={{ padding: "4px", color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteLO(lo.id)} style={{ padding: "4px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={16} /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          disabled={lo.editRequested}
                                          onClick={() => handleRequestEditLO(lo.id)} 
                                          style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${t.border}`, background: "white", color: lo.editRequested ? t.textMuted : "#3b82f6", fontSize: "0.7rem", fontWeight: 600, cursor: lo.editRequested ? "not-allowed" : "pointer" }}
                                        >
                                          {lo.editRequested ? "Edit Requested" : "Req Edit"}
                                        </button>
                                        <button 
                                          disabled={lo.deleteRequested}
                                          onClick={() => handleRequestDeleteLO(lo.id)} 
                                          style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${t.border}`, background: "white", color: lo.deleteRequested ? t.textMuted : "#ef4444", fontSize: "0.7rem", fontWeight: 600, cursor: lo.deleteRequested ? "not-allowed" : "pointer" }}
                                        >
                                          {lo.deleteRequested ? "Delete Requested" : "Req Delete"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* LO Pagination Controls */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: `1px solid ${t.border}`, background: t.bg, borderBottomLeftRadius: "24px", borderBottomRightRadius: "24px" }}>
                    <div style={{ fontSize: "0.875rem", color: t.textMuted }}>
                      Showing {(loCurrentPage - 1) * loItemsPerPage + 1} to {Math.min(loCurrentPage * loItemsPerPage, sortedLOs.length)} of {sortedLOs.length} opportunities
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button 
                        onClick={() => setLoCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={loCurrentPage === 1}
                        style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: loCurrentPage === 1 ? "#94a3b8" : t.text, cursor: loCurrentPage === 1 ? "not-allowed" : "pointer" }}
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <div style={{ fontSize: "0.875rem", fontWeight: 500, padding: "0 12px", color: t.text }}>
                        Page {loCurrentPage} of {totalLOPages || 1}
                      </div>
                      <button 
                        onClick={() => setLoCurrentPage(prev => Math.min(prev + 1, totalLOPages))}
                        disabled={loCurrentPage === (totalLOPages || 1)}
                        style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "6px", color: loCurrentPage === (totalLOPages || 1) ? "#94a3b8" : t.text, cursor: loCurrentPage === (totalLOPages || 1) ? "not-allowed" : "pointer" }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

      {activeView === 'PAYMENTS' && (
        <PaymentsCalendar user={user} isAdmin={isAdmin} t={t} theme={theme} settings={settings} showNotification={showNotification} showConfirm={showConfirm} />
      )}

      {showForm && (
        <TaskForm 
          settings={settings}
          usersList={usersList}
          initialData={preFilledTask}
          user={user}
          isDarkMode={isDarkMode}
          showNotification={showNotification}
          showConfirm={showConfirm}
          onClose={() => {
            setShowForm(false);
            setPreFilledTask(null);
          }} 
          onSuccess={() => {
            setShowForm(false);
            setPreFilledTask(null);
            fetchTasks(true);
            fetchExternalRequests(true);
          }} 
        />
      )}
      {showLOForm && (
        <LOForm 
          settings={settings}
          usersList={usersList}
          user={user}
          isDarkMode={isDarkMode}
          onClose={() => setShowLOForm(false)} 
          onSuccess={() => {
            setShowLOForm(false);
            fetchLOs();
            showNotification("LO Update submitted successfully!");
          }} 
        />
      )}
      {editingLO && (
        <LOForm 
          settings={settings}
          usersList={usersList}
          user={user}
          isDarkMode={isDarkMode}
          initialData={editingLO}
          onClose={() => setEditingLO(null)} 
          onSuccess={() => {
            setEditingLO(null);
            fetchLOs();
            showNotification("LO entry updated successfully!");
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
            showNotification("Your request has been submitted.");
          }}
        />
      )}
      {showLOCaptureModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "20px", width: "100%", maxWidth: "600px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
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
                  <input type="text" readOnly value={loCaptureForm.entity} style={{ ...getInputStyle(t), background: t.bg, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Date of Identification</label>
                  <input type="text" readOnly value={formatDate(loCaptureForm.dateOfIdentification)} style={{ ...getInputStyle(t), background: t.bg, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Identified By</label>
                  <input type="text" readOnly value={loCaptureForm.identifiedBy} style={{ ...getInputStyle(t), background: t.bg, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Committed By</label>
                  <input type="text" readOnly value={loCaptureForm.committedBy} style={{ ...getInputStyle(t), background: t.bg, cursor: "not-allowed" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Mistake / Learning Opportunity</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the learning opportunity..."
                  value={loCaptureForm.learningOpportunity}
                  onChange={e => setLOCaptureForm({...loCaptureForm, learningOpportunity: e.target.value})}
                  style={{ ...getInputStyle(t), resize: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Resolution Provided</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the resolution/correction..."
                  value={loCaptureForm.resolutionProvided}
                  onChange={e => setLOCaptureForm({...loCaptureForm, resolutionProvided: e.target.value})}
                  style={{ ...getInputStyle(t), resize: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>LO Classification *</label>
                <select 
                  value={loCaptureForm.classification}
                  onChange={e => setLOCaptureForm({...loCaptureForm, classification: e.target.value})}
                  style={getInputStyle(t)}
                  required
                >
                  <option value="">Choose Classification</option>
                  {settings?.masterLOClassifications?.split(',').filter((c: string) => c.trim()).map((cls: string) => (
                    <option key={cls.trim()} value={cls.trim()}>{cls.trim()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Mode of Communication</label>
                <select 
                  value={loCaptureForm.modeOfCommunication}
                  onChange={e => setLOCaptureForm({...loCaptureForm, modeOfCommunication: e.target.value})}
                  style={getInputStyle(t)}
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
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.card, color: t.textMuted, fontWeight: 600, cursor: "pointer" }}
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
          <div style={{ background: t.card, borderRadius: "20px", width: "100%", maxWidth: "1300px", height: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", animation: "modal-in 0.3s ease-out" }}>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes modal-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }` }} />
            <div style={{ padding: "24px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.bg }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {isAdmin ? <ShieldCheck size={24} color="#4f46e5" /> : <Sliders size={24} color="#4f46e5" />}
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: t.text }}>{isAdmin ? "Control Center" : "Account Settings"}</h2>
              </div>
              <button 
                onClick={() => handleCloseOptionsModal()} 
                style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "1.5rem", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>
            
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Sidebar Tabs */}
              <div style={{ width: "200px", background: t.bg, borderRight: `1px solid ${t.border}`, padding: "16px", overflowY: "auto", maxHeight: "100%" }}>
                <button 
                  onClick={() => setActiveOptionsTab('ACCOUNT')} 
                  style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'ACCOUNT' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'ACCOUNT' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginBottom: "8px" }}
                >
                  Account
                </button>

                {canImport && (
                  <button 
                    onClick={() => setActiveOptionsTab('DATA')} 
                    style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'DATA' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'DATA' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                  >
                    <Download size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} /> Bulk Import
                  </button>
                )}

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
                      style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'EDIT_REQUESTS' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'EDIT_REQUESTS' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginBottom: "8px" }}
                    >
                      Edit Request
                      {(tasks.filter(t => t.editRequested).length + tasks.filter(t => t.deleteRequested).length + los.filter(l => l.editRequested).length + los.filter(l => l.deleteRequested).length) > 0 && (
                        <span style={{ marginLeft: "8px", background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "bold" }}>
                          {tasks.filter(t => t.editRequested).length + tasks.filter(t => t.deleteRequested).length + los.filter(l => l.editRequested).length + los.filter(l => l.deleteRequested).length}
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
                      onClick={() => setActiveOptionsTab('AUTOMATION')} 
                      style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'AUTOMATION' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'AUTOMATION' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                    >
                      <Zap size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} /> Task Automation
                    </button>
                        <button 
                          onClick={() => setActiveOptionsTab('MATRICES')} 
                          style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'MATRICES' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'MATRICES' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                        >
                          <Shield size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} /> Matrix Module
                        </button>
                        <button 
                          onClick={() => setActiveOptionsTab('HOME_HUB')} 
                          style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'HOME_HUB' ? "#e0f2fe" : "transparent", color: activeOptionsTab === 'HOME_HUB' ? "#0369a1" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                        >
                          Home Hub
                        </button>
                        <button 
                          onClick={() => setActiveOptionsTab('MASTER_RESET')} 
                          style={{ width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", background: activeOptionsTab === 'MASTER_RESET' ? "#fee2e2" : "transparent", color: activeOptionsTab === 'MASTER_RESET' ? "#b91c1c" : "#64748b", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
                        >
                          <Database size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} /> Database Management
                        </button>
                      </>
                    )}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, padding: "32px", overflow: "auto" }}>
                {activeOptionsTab === 'ACCOUNT' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Account Settings</h3>
                    <p style={{ color: t.textMuted, marginBottom: "24px" }}>Update your password to keep your account secure.</p>
                    
                    <form onSubmit={handlePasswordChange} style={{ maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Current Password</label>
                        <input 
                          type="password" 
                          required
                          value={passwordData.current}
                          onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${t.border}`, outline: "none" }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>New Password</label>
                        <input 
                          type="password" 
                          required
                          value={passwordData.new}
                          onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${t.border}`, outline: "none" }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Confirm New Password</label>
                        <input 
                          type="password" 
                          required
                          value={passwordData.confirm}
                          onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${t.border}`, outline: "none" }} 
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

                    <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: `1px solid ${t.border}` }}>
                      <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: t.text, fontWeight: 700 }}>Profile Information</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "600px" }}>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Full Name</p>
                          <p style={{ margin: 0, fontSize: "1rem", color: t.text, fontWeight: 500 }}>{user?.name || "Not Set"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Email Address</p>
                          <p style={{ margin: 0, fontSize: "1rem", color: t.text, fontWeight: 500 }}>{user?.email}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Role</p>
                          <p style={{ margin: 0, fontSize: "0.875rem", display: "inline-block", padding: "4px 12px", background: t.bg, borderRadius: "9999px", color: t.textMuted, fontWeight: 600 }}>{user?.role || "USER"}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Assigned Department</p>
                          <p style={{ margin: 0, fontSize: "1rem", color: t.text, fontWeight: 500 }}>{user?.department || "Finance (Default)"}</p>
                        </div>
                      </div>
                      <p style={{ marginTop: "24px", fontSize: "0.8125rem", color: t.textMuted, fontStyle: "italic" }}>
                        Note: If your department is incorrect, please contact an Administrator to update it in User Management.
                      </p>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'MASTER_RESET' && (
                  <div style={{ maxWidth: "600px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                      <div style={{ background: "#fee2e2", padding: "10px", borderRadius: "10px" }}>
                        <Database size={24} color="#ef4444" />
                      </div>
                      <h3 style={{ margin: 0 }}>Database Management Hub</h3>
                    </div>

                    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
                      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <AlertTriangle color="#f97316" size={20} />
                        <h4 style={{ margin: 0, color: "#c2410c", fontWeight: 700 }}>Critical Action Required</h4>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.875rem", color: "#9a3412", lineHeight: 1.6 }}>
                        Performing a Master Reset will **permanently delete** all operational data across all modules, including Tasks, Learning Opportunities, Inter-departmental Requests, and Recurring Activities.
                      </p>
                      <ul style={{ marginTop: "12px", fontSize: "0.8125rem", color: "#9a3412", paddingLeft: "20px" }}>
                        <li>All Task transactions will be wiped.</li>
                        <li>All Recurring Task templates will be cleared.</li>
                        <li>All ID sequences will be reset to 01.</li>
                        <li style={{ fontWeight: 700 }}>Master Data (Entities, Depts) and Users will NOT be deleted.</li>
                        <li style={{ fontWeight: 700, color: "#166534" }}>Matrix Module and User-wise Controls will NOT be impacted.</li>
                      </ul>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      <div style={{ border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
                        <h5 style={{ margin: "0 0 12px 0", fontWeight: 700 }}>1. Purge Master Data (Reset IDs)</h5>
                        <p style={{ fontSize: "0.8125rem", color: t.textMuted, marginBottom: "20px" }}>
                          Use this to clear the database for a fresh start. A snapshot is automatically saved.
                        </p>
                        <button 
                          onClick={() => {
                            showConfirm("CRITICAL: Are you absolutely sure? This will delete all transactions and reset task IDs. A snapshot will be saved for safety.", async () => {
                              try {
                                const res = await fetch("/api/admin/master-reset", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "RESET" })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  showNotification(data.message);
                                  // Refresh everything
                                  window.location.reload();
                                } else {
                                  showNotification(data.message, "error");
                                }
                              } catch (e) {
                                showNotification("Reset failed", "error");
                              }
                            });
                          }}
                          style={{ background: "#ef4444", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer" }}
                        >
                          Execute Purge Protocol
                        </button>
                      </div>

                      <div style={{ border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", background: "#f8fafc" }}>
                        <h5 style={{ margin: "0 0 12px 0", fontWeight: 700 }}>2. Reverse Back (Restore State)</h5>
                        <p style={{ fontSize: "0.8125rem", color: t.textMuted, marginBottom: "20px" }}>
                          Accidentally reset? This will restore all data from the most recent snapshot.
                        </p>
                        <button 
                          onClick={() => {
                            showConfirm("Restore data from the latest snapshot? Current data will be replaced.", async () => {
                              try {
                                const res = await fetch("/api/admin/master-reset", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "REVERSE" })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  showNotification(data.message);
                                  // Refresh everything
                                  window.location.reload();
                                } else {
                                  showNotification(data.message, "error");
                                }
                              } catch (e) {
                                showNotification("Restore failed", "error");
                              }
                            });
                          }}
                          style={{ background: "#0f172a", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer" }}
                        >
                          Reverse Back to Stable State
                        </button>
                      </div>

                      <div style={{ border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", background: "#f0fdf4", borderStyle: "dashed" }}>
                        <h5 style={{ margin: "0 0 12px 0", fontWeight: 700, color: "#166534" }}>3. Sync Database Schema</h5>
                        <p style={{ fontSize: "0.8125rem", color: t.textMuted, marginBottom: "20px" }}>
                          Need to apply latest database changes or fix missing tables? Use this to sync the schema.
                        </p>
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/users/sync-schema", { method: "POST" });
                              if (res.ok) showNotification("Database schema synced successfully!", "success");
                              else showNotification("Schema sync failed", "error");
                            } catch (err) {
                              showNotification("Network error during sync", "error");
                            }
                          }}
                          style={{ background: "#22c55e", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                        >
                          <RefreshCw size={16} /> Sync Database Schema
                        </button>
                      </div>

                      <div style={{ border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", background: "#fdf2f8" }}>
                        <h5 style={{ margin: "0 0 12px 0", fontWeight: 700, color: "#9d174d", display: "flex", alignItems: "center", gap: "8px" }}>
                          <History size={18} /> 4. Purge & Reset Audit Trail
                        </h5>
                        <p style={{ fontSize: "0.8125rem", color: t.textMuted, marginBottom: "20px" }}>
                          Historical record of all system resets and data purges.
                        </p>
                        
                        {backups.length === 0 ? (
                          <div style={{ padding: "20px", textAlign: "center", background: "white", borderRadius: "8px", border: `1px dashed ${t.border}` }}>
                            <span style={{ fontSize: "0.75rem", color: t.textMuted }}>No audit records found.</span>
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto", background: "white", borderRadius: "8px", border: `1px solid ${t.border}` }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                              <thead style={{ background: "#f8fafc", borderBottom: `1px solid ${t.border}` }}>
                                <tr>
                                  <th style={{ padding: "12px", textAlign: "left" }}>Timestamp</th>
                                  <th style={{ padding: "12px", textAlign: "left" }}>Performed By</th>
                                  <th style={{ padding: "12px", textAlign: "left" }}>Snapshot ID</th>
                                  <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {backups.map((b) => {
                                  const snapshot = typeof b.snapshot === 'string' ? JSON.parse(b.snapshot) : b.snapshot;
                                  return (
                                    <tr key={b.id} style={{ borderBottom: `1px solid #f1f5f9` }}>
                                      <td style={{ padding: "12px", fontWeight: 600 }}>{new Date(b.createdAt).toLocaleString()}</td>
                                      <td style={{ padding: "12px" }}>{snapshot?.resetBy || "System Admin"}</td>
                                      <td style={{ padding: "12px", color: t.textMuted }}>{b.id}</td>
                                      <td style={{ padding: "12px", textAlign: "center" }}>
                                        <button 
                                          onClick={() => handleExportBackup(b)}
                                          style={{ 
                                            padding: "6px 12px", borderRadius: "6px", background: "#fdf2f8", color: "#9d174d", 
                                            border: "1px solid #fbcfe8", fontWeight: 700, cursor: "pointer",
                                            display: "flex", alignItems: "center", gap: "6px", margin: "0 auto"
                                          }}
                                        >
                                          <FileSpreadsheet size={14} /> Export to Excel
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
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
                          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600, color: t.textMuted }}>Primary Emails</label>
                          <div style={{ background: t.card, padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                              {(settings.managerEmail || "").split(',').filter(e => e.trim()).map((email, idx) => (
                                <div key={`m-${idx}`} style={{ background: t.bg, color: t.text, padding: "8px 12px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${t.border}` }}>
                                  <span style={{ fontFamily: "monospace" }}>{email.trim()}</span>
                                  <button 
                                    onClick={() => {
                                      const emails = (settings.managerEmail || "").split(',').filter((_, i) => i !== idx);
                                      setSettings({...settings, managerEmail: emails.join(',')});
                                    }}
                                    style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", padding: "4px" }}
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
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: `1px solid ${t.border}`, fontSize: "0.875rem", outline: "none" }}
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
                          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600, color: t.textMuted }}>Primary LO Mails</label>
                          <div style={{ background: t.card, padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
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
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: `1px solid ${t.border}`, fontSize: "0.875rem", outline: "none" }}
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

                        {/* Payment Report Recipients */}
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600, color: t.textMuted }}>Primary Payments Mails</label>
                          <div style={{ background: t.card, padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                              {(settings.paymentReportEmail || "").split(',').filter(e => e.trim()).map((email, idx) => (
                                <div key={`p-${idx}`} style={{ background: t.bg, color: t.text, padding: "8px 12px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${t.border}` }}>
                                  <span style={{ fontFamily: "monospace" }}>{email.trim()}</span>
                                  <button 
                                    onClick={() => {
                                      const emails = (settings.paymentReportEmail || "").split(',').filter((_, i) => i !== idx);
                                      setSettings({...settings, paymentReportEmail: emails.join(',')});
                                    }}
                                    style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", padding: "4px" }}
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
                                placeholder="Add payment report email..."
                                value={newPaymentEmailInput}
                                onChange={(e) => setNewPaymentEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newPaymentEmailInput && newPaymentEmailInput.includes('@')) {
                                      setSettings({...settings, paymentReportEmail: (settings.paymentReportEmail || "") + (settings.paymentReportEmail?.trim() ? "," : "") + newPaymentEmailInput.trim()});
                                      setNewPaymentEmailInput("");
                                    }
                                  }
                                }}
                                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: `1px solid ${t.border}`, fontSize: "0.875rem", outline: "none" }} 
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const val = newPaymentEmailInput.trim();
                                  if (val && val.includes('@')) {
                                    setSettings(prev => {
                                      const current = prev.paymentReportEmail || "";
                                      return {...prev, paymentReportEmail: current.trim() ? `${current},${val}` : val};
                                    });
                                    setNewPaymentEmailInput("");
                                  }
                                }}
                                style={{ background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Advanced Schedule Helper */}
                    {(()=>{
                      const renderAdvancedScheduleBlock = (title: string, freqKey: string, timesKey: string, dayKey: string, dateKey: string, bgColor: string = t.bg, borderColor: string = t.border, titleColor: string = t.text) => {
                        return (
                          <div style={{ marginBottom: "32px", padding: "20px", background: bgColor, borderRadius: "12px", border: `1px solid ${borderColor}` }}>
                            <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: titleColor, fontWeight: 700 }}>{title}</h4>
                            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                              {(['OFF', 'D', 'W', 'M'] as const).map((freq) => {
                                const currentVal = (settings as any)[freqKey] || 'OFF';
                                // handle legacy "DAILY" etc
                                const normalizedVal = currentVal === 'DAILY' ? 'D' : currentVal === 'WEEKLY' ? 'W' : currentVal === 'MONTHLY' ? 'M' : currentVal;
                                const currentFreqs = normalizedVal.split(',').filter((f: string) => f.trim());
                                const isSelected = currentFreqs.includes(freq);
                                
                                return (
                                  <label key={freq} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "10px", border: "1px solid", borderColor: isSelected ? titleColor : t.border, background: isSelected ? (bgColor === t.bg ? t.card : bgColor) : t.card, cursor: "pointer", transition: "all 0.2s" }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected} 
                                      onChange={() => {
                                        let newFreqs: string[];
                                        if (freq === 'OFF') {
                                          newFreqs = ['OFF'];
                                        } else {
                                          if (isSelected) {
                                            newFreqs = currentFreqs.filter((f: string) => f !== freq);
                                            if (newFreqs.length === 0) newFreqs = ['OFF'];
                                          } else {
                                            newFreqs = [...currentFreqs.filter((f: string) => f !== 'OFF'), freq];
                                          }
                                        }
                                        setSettings({...settings, [freqKey]: newFreqs.join(',')});
                                      }}
                                      style={{ accentColor: titleColor }}
                                    />
                                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: isSelected ? titleColor : t.textMuted }}>
                                      {freq === 'OFF' ? 'Off' : freq === 'D' ? 'Daily' : freq === 'W' ? 'Weekly' : 'Monthly'}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>

                            {((settings as any)[freqKey] || '').includes('W') && (
                              <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 700, color: titleColor }}>SELECT DAY (WEEKLY)</label>
                                <select 
                                  value={(settings as any)[dayKey] || 'Monday'}
                                  onChange={(e) => setSettings({...settings, [dayKey]: e.target.value})}
                                  style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${borderColor}`, width: "100%", background: t.card, fontSize: "0.875rem", fontWeight: 600, color: titleColor }}
                                >
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <option key={day} value={day}>{day}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {((settings as any)[freqKey] || '').includes('M') && (
                              <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 700, color: titleColor }}>SELECT DATE (MONTHLY)</label>
                                <select 
                                  value={(settings as any)[dateKey] || 1}
                                  onChange={(e) => setSettings({...settings, [dateKey]: parseInt(e.target.value)})}
                                  style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${borderColor}`, width: "100%", background: t.card, fontSize: "0.875rem", fontWeight: 600, color: titleColor }}
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                                    <option key={date} value={date}>{date}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {!(settings as any)[freqKey]?.includes('OFF') && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {((settings as any)[timesKey] || "").split(',').filter((t: string) => t.trim()).map((time: string, idx: number) => {
                                  const [h, m] = time.split(':');
                                  const h12 = parseInt(h) % 12 || 12;
                                  const suffix = parseInt(h) >= 12 ? 'PM' : 'AM';
                                  return (
                                    <div key={idx} style={{ background: t.card, padding: "6px 10px", borderRadius: "8px", border: `1px solid ${borderColor}`, display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: titleColor }}>{h12}:{m} {suffix}</span>
                                      <input 
                                        type="time" 
                                        value={time}
                                        onChange={(e) => {
                                          const times = ((settings as any)[timesKey] || "").split(',').filter((t: string) => t.trim());
                                          times[idx] = e.target.value;
                                          setSettings({...settings, [timesKey]: times.join(',')});
                                        }}
                                        style={{ border: "none", width: "20px", padding: 0, background: "transparent", cursor: "pointer", color: "transparent" }}
                                      />
                                      <button 
                                        onClick={() => {
                                          const times = ((settings as any)[timesKey] || "").split(',').filter((_: any, i: number) => i !== idx);
                                          setSettings({...settings, [timesKey]: times.join(',')});
                                        }}
                                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "4px", fontSize: "1.25rem", padding: "0 4px" }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                                <button 
                                  onClick={() => setSettings({...settings, [timesKey]: ((settings as any)[timesKey] || "") + (((settings as any)[timesKey]?.trim() ? "," : "") + "10:00")})}
                                  style={{ padding: "8px 16px", borderRadius: "8px", border: `1px dashed ${borderColor}`, background: "transparent", color: titleColor, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
                                >
                                  + Add Time
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderAdvancedScheduleBlock("Pending Reminders (Owners)", "reminderFrequency", "reminderTimes", "reminderDay", "reminderDate")}
                          {renderAdvancedScheduleBlock("Manager Report Summary", "managerReportFrequency", "managerReportTimes", "managerReportDay", "managerReportDate")}
                          {renderAdvancedScheduleBlock("LO Report (Learning Opportunities)", "loReportFrequency", "loReportTimes", "loReportDay", "loReportDate")}
                          {renderAdvancedScheduleBlock("Payment Report Schedule", "paymentReportFrequency", "paymentReportTimes", "paymentReportDay", "paymentReportDate", "#fdf4ff", "#f5d0fe", "#a21caf")}
                        </>
                      );
                    })()}

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
                      <button onClick={() => handleTriggerEmail("users")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}`, background: t.card, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send Pending Reminders</div>
                          <div style={{ fontSize: "0.75rem", color: t.textMuted }}>Instantly mail all owners about their pending tasks.</div>
                        </div>
                      </button>
                      <button onClick={() => handleTriggerEmail("manager")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}`, background: t.card, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send Manager Report</div>
                          <div style={{ fontSize: "0.75rem", color: t.textMuted }}>Instantly mail the consolidated summary to Admin.</div>
                        </div>
                      </button>
                      <button onClick={() => handleTriggerEmail("lo")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}`, background: t.card, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send LO Report</div>
                          <div style={{ fontSize: "0.75rem", color: t.textMuted }}>Instantly mail the Learning Opportunity summary to Admin.</div>
                        </div>
                      </button>
                      <button onClick={() => handleTriggerEmail("payments")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: `1px solid ${t.border}`, background: t.card, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#2563eb"}>
                        <Mail size={24} color="#2563eb" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>Send Payment Report</div>
                          <div style={{ fontSize: "0.75rem", color: t.textMuted }}>Instantly mail the Payments summary report.</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'USERS' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>User Management</h3>
                    
                    {/* Pending Access Requests Section */}
                    <div style={{ marginBottom: "40px", padding: "24px", background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ padding: "8px", background: "#fef3c7", borderRadius: "10px" }}>
                            <UserCheck size={20} color="#d97706" />
                          </div>
                          <h4 style={{ margin: 0, fontSize: "1.125rem", color: t.text }}>Pending Access Requests</h4>
                        </div>
                        <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700 }}>
                          {usersList.filter(u => (u as any).isApproved === false).length} WAITING
                        </span>
                      </div>

                      {usersLoading ? (
                        <p style={{ color: t.textMuted, fontSize: "0.875rem" }}>Loading requests...</p>
                      ) : usersList.filter(u => (u as any).isApproved === false).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", border: "1px dashed #e2e8f0", borderRadius: "12px", color: t.textMuted }}>
                           No pending access requests at the moment.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                            <thead>
                              <tr style={{ background: "#1e293b" }}>
                                <th style={{ padding: "12px 16px", color: "white", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>Name</th>
                                <th style={{ padding: "12px 16px", color: "white", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>Email</th>
                                <th style={{ padding: "12px 16px", color: "white", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>Requested Dept</th>
                                <th style={{ padding: "12px 16px", color: "white", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6", textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usersList.filter(u => (u as any).isApproved === false).map(u => (
                                <tr key={u.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                                  <td style={{ padding: "16px", fontWeight: 500 }}>{u.name}</td>
                                  <td style={{ padding: "16px", color: t.textMuted }}>{u.email}</td>
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
                                        style={{ padding: "6px 12px", background: t.card, color: "#ef4444", borderRadius: "8px", border: "1px solid #fee2e2", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
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

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ padding: "8px", background: "#dcfce7", borderRadius: "10px" }}>
                            <Users size={20} color="#166534" />
                          </div>
                          <h4 style={{ margin: 0, fontSize: "1.125rem", color: t.text }}>Active Employees</h4>
                        </div>
                        
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
                            <input 
                              type="text" 
                              placeholder="Search employees..." 
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              style={{ padding: "8px 12px 8px 36px", borderRadius: "10px", border: `1px solid ${t.border}`, fontSize: "0.8125rem", width: "200px", outline: "none" }}
                            />
                          </div>
                          <select 
                            value={userDeptFilter}
                            onChange={(e) => setUserDeptFilter(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, fontSize: "0.8125rem", outline: "none" }}
                          >
                            <option value="ALL">All Departments</option>
                            {settings.masterDepartments.split(',').map(d => <option key={d.trim()} value={d.trim()}>{d.trim()}</option>)}
                          </select>
                          <select 
                            value={userRoleFilter}
                            onChange={(e) => setUserRoleFilter(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, fontSize: "0.8125rem", outline: "none" }}
                          >
                            <option value="ALL">All Roles</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="USER">USER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                          <button 
                            onClick={() => setShowAddEmployeeModal(true)}
                            style={{ 
                              padding: "8px 16px", background: "#f0fdf4", color: "#166534", 
                              borderRadius: "10px", border: "1px solid #bbf7d0", fontWeight: 600, 
                              cursor: "pointer", fontSize: "0.8125rem", display: "flex", 
                              alignItems: "center", gap: "6px", transition: "all 0.2s" 
                            }}
                          >
                            <UserPlus size={16} /> Add Employee
                          </button>
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
                            onClick={() => downloadBulkTemplate('employees')}
                            style={{ background: t.bg, color: "#2563eb", padding: "8px 16px", borderRadius: "10px", border: "1px solid #bfdbfe", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <Download size={16} /> Template
                          </button>
                          <button 
                            onClick={() => document.getElementById('employee-bulk-upload')?.click()}
                            style={{ background: t.bg, color: t.textMuted, padding: "8px 16px", borderRadius: "8px", border: `1px solid ${t.border}`, cursor: "pointer", fontWeight: 500, fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <Users size={14} /> Import All Employees
                          </button>
                          <input 
                            id="employee-bulk-upload"
                            type="file" 
                            accept=".xlsx, .xls"
                            style={{ display: "none" }}
                            onChange={(e) => handleExcelBulkUpload(e, 'employees')}
                          />
                        </div>
                    </div>

                    {usersLoading ? (
                      <p>Loading users...</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: "left" }}>
                                <th style={{ padding: "12px 8px" }}>Emp ID</th>
                                <th style={{ padding: "12px 8px", cursor: "pointer" }} onClick={() => handleUserSort('name')}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    Name {userSortConfig?.key === 'name' && (userSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                  </div>
                                </th>
                                <th style={{ padding: "12px 8px", cursor: "pointer" }} onClick={() => handleUserSort('email')}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    Email {userSortConfig?.key === 'email' && (userSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                  </div>
                                </th>
                                <th style={{ padding: "12px 8px", cursor: "pointer" }} onClick={() => handleUserSort('department')}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    Department {userSortConfig?.key === 'department' && (userSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                  </div>
                                </th>
                                <th style={{ padding: "12px 8px", cursor: "pointer" }} onClick={() => handleUserSort('role')}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    Role {userSortConfig?.key === 'role' && (userSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                  </div>
                                </th>
                                <th style={{ padding: "12px 8px", cursor: "pointer" }} onClick={() => handleUserSort('isSuspended')}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    Account Status {userSortConfig?.key === 'isSuspended' && (userSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                  </div>
                                </th>
                                <th style={{ padding: "12px 8px", textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                                                         {filteredAndSortedUsers.filter(u => (u as any).isApproved !== false).map(u => (
                               <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px 8px" }}>
                                  <span style={{ 
                                    padding: "6px 12px", 
                                    background: "#f8fafc",
                                    borderRadius: "6px", 
                                    border: "1px solid #e2e8f0",
                                    display: "inline-block",
                                    minWidth: "60px",
                                    fontWeight: 700,
                                    color: "#1e40af",
                                    fontSize: "0.8125rem"
                                  }}>
                                    {(u as any).employeeId || "--"}
                                  </span>
                                </td>
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
                                    <option value="VIEWER">VIEWER</option>
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
                                    <div style={{ width: "18px", height: "18px", background: t.card, borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}></div>
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
                                      style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: "4px", borderRadius: "6px" }}
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

                    {/* Database Sync Section */}
                    <div style={{ marginTop: "40px", padding: "24px", background: "#f0f9ff", borderRadius: "16px", border: "1px solid #bae6fd" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ padding: "12px", background: "#e0f2fe", borderRadius: "12px" }}>
                            <RefreshCw size={24} color="#0284c7" />
                          </div>
                          <div>
                            <h4 style={{ margin: "0 0 4px 0", color: "#0c4a6e", fontSize: "1rem", fontWeight: 700 }}>Database Sync</h4>
                            <p style={{ color: "#075985", margin: 0, fontSize: "0.8125rem", maxWidth: "400px", lineHeight: 1.5 }}>
                              Sync the database schema to ensure all newly added fields and tables are correctly initialized. This will not affect existing data.
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            showConfirm("Are you sure you want to sync database schema?", async () => {
                              try {
                                const res = await fetch("/api/users/sync-schema", { method: "POST" });
                                const data = await res.json();
                                showNotification(data.message || "Sync completed successfully!");
                              } catch (err) {
                                showNotification("Sync failed. Please check the logs.", 'error');
                              }
                            });
                          }}
                          style={{ 
                            background: "#0284c7", 
                            color: "white", 
                            padding: "12px 24px", 
                            borderRadius: "10px", 
                            border: "none", 
                            cursor: "pointer", 
                            fontWeight: 700, 
                            fontSize: "0.875rem",
                            boxShadow: "0 4px 6px -1px rgba(2, 132, 199, 0.3)",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <RefreshCw size={18} /> Sync Database
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'EDIT_REQUESTS' && (
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px", borderBottom: `1px solid ${t.border}`, paddingBottom: "16px" }}>
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
                      <button 
                        onClick={() => setEditRequestSubTab('PAYMENT')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: editRequestSubTab === 'PAYMENT' ? "#2563eb" : "#f1f5f9",
                          color: editRequestSubTab === 'PAYMENT' ? "white" : "#64748b",
                          fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <Wallet size={16} /> Edit Payment
                        {paymentRequests.filter(r => r.editRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'PAYMENT' ? "white" : "#ef4444", color: editRequestSubTab === 'PAYMENT' ? "#2563eb" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {paymentRequests.filter(r => r.editRequested).length}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => setEditRequestSubTab('DELETE_PAYMENT')}
                        style={{ 
                          padding: "8px 16px", borderRadius: "8px", border: "none", 
                          background: editRequestSubTab === 'DELETE_PAYMENT' ? "#ef4444" : "#f1f5f9",
                          color: editRequestSubTab === 'DELETE_PAYMENT' ? "white" : "#64748b",
                          fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <Trash2 size={16} /> Delete Payment
                        {paymentRequests.filter(r => r.deleteRequested).length > 0 && (
                          <span style={{ background: editRequestSubTab === 'DELETE_PAYMENT' ? "white" : "#ef4444", color: editRequestSubTab === 'DELETE_PAYMENT' ? "#ef4444" : "white", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem" }}>
                            {paymentRequests.filter(r => r.deleteRequested).length}
                          </span>
                        )}
                      </button>
                    </div>

                    {editRequestSubTab === 'TASK_EDIT' ? (
                      <div>
                        <h3 style={{ margin: "0 0 16px 0", color: t.text }}>Pending Task Edit Requests</h3>
                        <p style={{ color: t.textMuted, marginBottom: "24px", fontSize: "0.875rem" }}>Review and manage requests from users to unlock and edit completed tasks.</p>
                        
                        {tasks.filter(t => t.editRequested).length === 0 ? (
                          <div style={{ padding: "40px", textAlign: "center", background: t.bg, borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                            <p style={{ color: t.textMuted, margin: 0 }}>No pending task edit requests.</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {tasks.filter(t => t.editRequested).map(task => (
                              <div key={`task-edit-${task.id}`} style={{ padding: "20px", background: t.card, borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                  <div>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: t.text }}>Task #{task.id}: {task.taskName}</h4>
                                    <p style={{ margin: 0, fontSize: "0.875rem", color: t.textMuted }}>
                                      Requested by: <strong style={{ color: t.text }}>{task.editRequestBy === "OWNER" ? task.ownerName : task.reviewerName}</strong> ({task.editRequestBy})
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
                                <div style={{ padding: "12px", background: t.bg, borderRadius: "8px", fontSize: "0.875rem", borderLeft: "4px solid #cbd5e1" }}>
                                  <strong>Reason:</strong> {task.editRequestReason}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : editRequestSubTab === 'TASK_DELETE' ? (
                      <div>
                        <h3 style={{ margin: "0 0 16px 0", color: t.text }}>Pending Task Deletion Requests</h3>
                        <p style={{ color: t.textMuted, marginBottom: "24px", fontSize: "0.875rem" }}>Review and manage requests from users to permanently delete tasks.</p>
                        
                        {tasks.filter(t => t.deleteRequested).length === 0 ? (
                          <div style={{ padding: "40px", textAlign: "center", background: t.bg, borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                            <p style={{ color: t.textMuted, margin: 0 }}>No pending task deletion requests.</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {tasks.filter(t => t.deleteRequested).map(task => (
                              <div key={`task-del-${task.id}`} style={{ padding: "20px", background: t.card, borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                  <div>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: t.text }}>Task #{task.id}: {task.taskName}</h4>
                                    <p style={{ margin: 0, fontSize: "0.875rem", color: t.textMuted }}>
                                      Requested by: <strong style={{ color: t.text }}>{task.ownerName}</strong>
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
                    ) : editRequestSubTab === 'LO' ? (
                      <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                              <div>
                                <h3 style={{ margin: "0 0 8px 0", color: t.text }}>Learning Opportunity (LO) Admin</h3>
                                <p style={{ color: t.textMuted, margin: 0, fontSize: "0.875rem" }}>Manage LO edit requests and view/export all records.</p>
                              </div>
                              <button onClick={exportLOsToExcel} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                <FileSpreadsheet size={18} /> Export All
                              </button>
                            </div>
    
                            {/* LO Edit Requests Section */}
                            <div style={{ marginBottom: "32px" }}>
                              <h4 style={{ fontSize: "0.9375rem", color: t.textMuted, marginBottom: "12px", fontWeight: 600 }}>Pending LO Edit Requests</h4>
                              {los.filter(l => l.editRequested).length === 0 ? (
                                <div style={{ padding: "24px", textAlign: "center", background: t.bg, borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                                  <p style={{ color: t.textMuted, margin: 0, fontSize: "0.875rem" }}>No pending LO edit requests.</p>
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                  {los.filter(l => l.editRequested).map(lo => (
                                    <div key={`lo-edit-${lo.id}`} style={{ padding: "16px", background: t.card, borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                        <div>
                                          <h5 style={{ margin: "0 0 4px 0", fontSize: "0.9375rem", color: t.text }}>LO #{lo.id}: {lo.entity}</h5>
                                          <p style={{ margin: 0, fontSize: "0.8125rem", color: t.textMuted }}>Edit requested by: <strong>{lo.identifiedBy}</strong></p>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button onClick={() => handleApproveEditLO(lo.id, 'APPROVE')} style={{ background: "#22c55e", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}>Approve</button>
                                          <button onClick={() => handleApproveEditLO(lo.id, 'REJECT')} style={{ background: "#ef4444", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}>Reject</button>
                                        </div>
                                      </div>
                                      <div style={{ padding: "10px", background: t.bg, borderRadius: "6px", fontSize: "0.8125rem", borderLeft: "3px solid #cbd5e1" }}>
                                        <strong>Reason:</strong> {lo.editRequestReason}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* LO Deletion Requests Section */}
                            <div>
                              <h4 style={{ fontSize: "0.9375rem", color: t.textMuted, marginBottom: "12px", fontWeight: 600 }}>Pending LO Deletion Requests</h4>
                              {los.filter(l => l.deleteRequested).length === 0 ? (
                                <div style={{ padding: "24px", textAlign: "center", background: t.bg, borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                                  <p style={{ color: t.textMuted, margin: 0, fontSize: "0.875rem" }}>No pending LO deletion requests.</p>
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                  {los.filter(l => l.deleteRequested).map(lo => (
                                    <div key={`lo-del-${lo.id}`} style={{ padding: "16px", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fee2e2", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                        <div>
                                          <h5 style={{ margin: "0 0 4px 0", fontSize: "0.9375rem", color: "#991b1b" }}>LO #{lo.id}: {lo.entity}</h5>
                                          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#b91c1c" }}>Deletion requested by: <strong>{lo.committedBy}</strong></p>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button onClick={() => handleApproveDeleteLO(lo.id, 'APPROVE')} style={{ background: "#ef4444", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}>Approve Delete</button>
                                          <button onClick={() => handleApproveDeleteLO(lo.id, 'REJECT')} style={{ background: "#64748b", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}>Reject</button>
                                        </div>
                                      </div>
                                      <div style={{ padding: "10px", background: "white", borderRadius: "6px", fontSize: "0.8125rem", borderLeft: "3px solid #ef4444" }}>
                                        <strong>Reason:</strong> {lo.deleteRequestReason}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : editRequestSubTab === 'PAYMENT' ? (
                          <div>
                            <h3 style={{ margin: "0 0 16px 0", color: t.text }}>Pending Payment Edit Requests</h3>
                            <p style={{ color: t.textMuted, marginBottom: "24px", fontSize: "0.875rem" }}>Review requests to update payment dates or amounts for processed payments.</p>
                            
                            {paymentRequests.filter(r => r.editRequested).length === 0 ? (
                              <div style={{ padding: "40px", textAlign: "center", background: t.bg, borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                                <p style={{ color: t.textMuted, margin: 0 }}>No pending payment edit requests.</p>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {paymentRequests.filter(r => r.editRequested).map(req => (
                                  <div key={`pay-edit-${req.id}`} style={{ padding: "20px", background: t.card, borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                      <div>
                                        <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: t.text }}>{req.templateVendor}</h4>
                                        <p style={{ margin: 0, fontSize: "0.875rem", color: t.textMuted }}>{req.templateDesc}</p>
                                        <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#3b82f6", fontWeight: 600 }}>
                                          {req.type === 'MASTER' ? "MASTER TEMPLATE" : `Due Date: ${formatDate(req.dueDate)}`}
                                        </p>
                                      </div>
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        <button 
                                          onClick={() => handleApprovePaymentEdit(req)}
                                          style={{ background: "#22c55e", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem" }}
                                        >
                                          {req.type === 'MASTER' ? "Approve Master Edit" : "Approve"}
                                        </button>
                                        <button 
                                          onClick={() => handleRejectPaymentEdit(req)}
                                          style={{ background: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem" }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                    <div style={{ padding: "12px", background: t.bg, borderRadius: "8px", fontSize: "0.875rem", borderLeft: "4px solid #f59e0b" }}>
                                      <strong>Request Reason:</strong> {req.editRequestReason}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h3 style={{ margin: "0 0 16px 0", color: t.text }}>Pending Payment Deletion Requests</h3>
                            <p style={{ color: t.textMuted, marginBottom: "24px", fontSize: "0.875rem" }}>Review requests to permanently remove specific payment records created by mistake.</p>
                            
                            {paymentRequests.filter(r => r.deleteRequested).length === 0 ? (
                              <div style={{ padding: "40px", textAlign: "center", background: t.bg, borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                                <p style={{ color: t.textMuted, margin: 0 }}>No pending payment deletion requests.</p>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {paymentRequests.filter(r => r.deleteRequested).map(req => (
                                  <div key={`pay-del-${req.id}`} style={{ padding: "20px", background: t.card, borderRadius: "12px", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                      <div>
                                        <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: t.text }}>{req.templateVendor}</h4>
                                        <p style={{ margin: 0, fontSize: "0.875rem", color: t.textMuted }}>{req.templateDesc}</p>
                                        <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>
                                          {req.type === 'MASTER' ? "MASTER TEMPLATE" : `Due Date: ${formatDate(req.dueDate)}`}
                                        </p>
                                      </div>
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        <button 
                                          onClick={() => handleApproveDeletePayment(req)}
                                          style={{ background: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem" }}
                                        >
                                          {req.type === 'MASTER' ? "Approve Master Delete" : "Approve Delete"}
                                        </button>
                                        <button 
                                          onClick={() => handleRejectDeletePayment(req)}
                                          style={{ background: "#64748b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem" }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                    <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "8px", fontSize: "0.875rem", borderLeft: "4px solid #ef4444" }}>
                                      <div><strong>Requested By:</strong> {req.deleteRequestedBy || "User"}</div>
                                      <div style={{ marginTop: "4px" }}><strong>Reason:</strong> {req.deleteRequestReason}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                {activeOptionsTab === 'MASTER_DATA' && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                      <h3 style={{ margin: 0, color: t.text }}>Master Data Hub</h3>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ padding: "8px 24px", background: "#2563eb", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, cursor: isSavingSettings ? "not-allowed" : "pointer" }}
                      >
                        {isSavingSettings ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                    <p style={{ color: t.textMuted, marginBottom: "32px", fontSize: "0.875rem" }}>
                      Manage the global dropdown lists used across all forms (Task Submission, LO Identification, etc.). 
                      Changes here will reflect instantly across the entire platform.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                      {/* Departments */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Users size={18} color="#3b82f6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Departments</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {settings.masterDepartments.split(',').filter(d => d.trim()).map((dept, idx) => (
                              <div key={idx} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {dept.trim()}
                                <button 
                                  onClick={() => {
                                    const usage = checkValueUsage('Department', dept);
                                    if (usage.count > 0) {
                                      showNotification(`Cannot delete "${dept.trim()}". It is currently used in ${usage.count} ${usage.usedBy} and is therefore non-deletable.`, "error");
                                    } else {
                                      showConfirm(`Are you sure you want to remove "${dept.trim()}"?`, () => {
                                        const items = settings.masterDepartments.split(',').filter((_, i) => i !== idx);
                                        setSettings({...settings, masterDepartments: items.join(',')});
                                      });
                                    }
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "bold", fontSize: "14px", opacity: 0.7 }}
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
                                    const currentItems = (settings.masterDepartments || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Departments.`);
                                      return;
                                    }
                                    setSettings({...settings, masterDepartments: (settings.masterDepartments || "") + (settings.masterDepartments?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Entities */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Building2 size={18} color="#f59e0b" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Entities</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {settings.masterEntities.split(',').filter(e => e.trim()).map((ent, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {ent.trim()}
                                <button 
                                  onClick={() => {
                                    const usage = checkValueUsage('Entity', ent);
                                    if (usage.count > 0) {
                                      showNotification(`Cannot delete "${ent.trim()}". It is currently used in ${usage.count} ${usage.usedBy} and is therefore non-deletable.`, "error");
                                    } else {
                                      showConfirm(`Are you sure you want to remove "${ent.trim()}"?`, () => {
                                        const items = settings.masterEntities.split(',').filter((_, i) => i !== idx);
                                        setSettings({...settings, masterEntities: items.join(',')});
                                      });
                                    }
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
                                    const currentItems = (settings.masterEntities || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Entities.`);
                                      return;
                                    }
                                    setSettings({...settings, masterEntities: (settings.masterEntities || "") + (settings.masterEntities?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Task Types */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Tag size={18} color="#10b981" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Task Type</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {settings.masterTaskTypes.split(',').filter(t => t.trim()).map((type, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {type.trim()}
                                <button 
                                  onClick={() => {
                                    const usage = checkValueUsage('TaskType', type);
                                    if (usage.count > 0) {
                                      showNotification(`Cannot delete "${type.trim()}". It is currently used in ${usage.count} ${usage.usedBy} and is therefore non-deletable.`, "error");
                                    } else {
                                      showConfirm(`Are you sure you want to remove "${type.trim()}"?`, () => {
                                        const items = settings.masterTaskTypes.split(',').filter((_, i) => i !== idx);
                                        setSettings({...settings, masterTaskTypes: items.join(',')});
                                      });
                                    }
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
                                    const currentItems = (settings.masterTaskTypes || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Task Types.`);
                                      return;
                                    }
                                    setSettings({...settings, masterTaskTypes: (settings.masterTaskTypes || "") + (settings.masterTaskTypes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>
                      {/* Communication Modes */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Send size={18} color="#8b5cf6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Communication Modes</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterCommunicationModes || "").split(',').filter(t => t.trim()).map((mode, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {mode.trim()}
                                <button 
                                  onClick={() => {
                                    const usage = checkValueUsage('CommMode', mode);
                                    if (usage.count > 0) {
                                      showNotification(`Cannot delete "${mode.trim()}". It is currently used in ${usage.count} ${usage.usedBy} and is therefore non-deletable.`, "error");
                                    } else {
                                      showConfirm(`Are you sure you want to remove "${mode.trim()}"?`, () => {
                                        const items = settings.masterCommunicationModes.split(',').filter((_, i) => i !== idx);
                                        setSettings({...settings, masterCommunicationModes: items.join(',')});
                                      });
                                    }
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
                                    const currentItems = (settings.masterCommunicationModes || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Communication Modes.`);
                                      return;
                                    }
                                    setSettings({...settings, masterCommunicationModes: (settings.masterCommunicationModes || "") + (settings.masterCommunicationModes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Master Frequencies */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <RefreshCw size={18} color="#ec4899" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Master Frequencies</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterFrequencies || "").split(',').filter(t => t.trim()).map((freq, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {freq.trim()}
                                <button 
                                  onClick={() => {
                                    const usage = checkValueUsage('Frequency', freq);
                                    if (usage.count > 0) {
                                      showNotification(`Cannot delete "${freq.trim()}". It is currently used in ${usage.count} ${usage.usedBy} and is therefore non-deletable.`, "error");
                                    } else {
                                      showConfirm(`Are you sure you want to remove "${freq.trim()}"?`, () => {
                                        const items = settings.masterFrequencies.split(',').filter((_, i) => i !== idx);
                                        setSettings({...settings, masterFrequencies: items.join(',')});
                                      });
                                    }
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
                              placeholder="Add frequency..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterFrequencies || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Frequencies.`);
                                      return;
                                    }
                                    setSettings({...settings, masterFrequencies: (settings.masterFrequencies || "") + (settings.masterFrequencies?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resource Categories */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <BookOpen size={18} color="#10b981" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Library Categories</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterResourceCategories || "").split(',').filter(t => t.trim()).map((cat, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {cat.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterResourceCategories.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterResourceCategories: items.join(',')});
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
                              placeholder="Add category (e.g. GST)..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterResourceCategories || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Categories.`);
                                      return;
                                    }
                                    setSettings({...settings, masterResourceCategories: (settings.masterResourceCategories || "") + (settings.masterResourceCategories?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Finance Function Settings */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <FileText size={18} color="#8b5cf6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Finance Function</h4>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: t.textMuted, margin: "0 0 12px 0" }}>Used in Inter Department Request form.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterRequestTypes || "").split(',').filter(t => t.trim()).map((type, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {type.trim()}
                                <button 
                                  onClick={() => {
                                    const usage = checkValueUsage('FinanceFunction', type);
                                    if (usage.count > 0) {
                                      showNotification(`Cannot delete "${type.trim()}". It is currently used in ${usage.count} ${usage.usedBy} and is therefore non-deletable.`, "error");
                                    } else {
                                      showConfirm(`Are you sure you want to remove "${type.trim()}"?`, () => {
                                        const items = settings.masterRequestTypes.split(',').filter((_, i) => i !== idx);
                                        setSettings({...settings, masterRequestTypes: items.join(',')});
                                      });
                                    }
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
                              placeholder="Add origin..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterRequestTypes || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Origins.`);
                                      return;
                                    }
                                    setSettings({...settings, masterRequestTypes: (settings.masterRequestTypes || "") + (settings.masterRequestTypes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Week Days */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Lightbulb size={18} color="#f59e0b" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>LO Classifications</h4>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: t.textMuted, margin: "0 0 12px 0" }}>Used for classifying Learning Opportunities.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterLOClassifications || "").split(',').filter(t => t.trim()).map((cls, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {cls.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterLOClassifications.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterLOClassifications: items.join(',')});
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
                              placeholder="Add classification..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterLOClassifications || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Classifications.`);
                                      return;
                                    }
                                    setSettings({...settings, masterLOClassifications: (settings.masterLOClassifications || "") + (settings.masterLOClassifications?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Week Days */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Clock size={18} color="#0ea5e9" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Week Days</h4>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: t.textMuted, margin: "0 0 12px 0" }}>Used for Weekly recurring task day selection.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterWeekDays || "").split(',').filter((t: string) => t.trim()).map((day: string, idx: number) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {day.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterWeekDays.split(',').filter((_: any, i: number) => i !== idx);
                                    setSettings({...settings, masterWeekDays: items.join(',')});
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
                              placeholder="Add day..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterWeekDays || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Week Days.`);
                                      return;
                                    }
                                    setSettings({...settings, masterWeekDays: (settings.masterWeekDays || "") + (settings.masterWeekDays?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>                      {/* Payment Types */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <Wallet size={18} color="#3b82f6" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Payment Types</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterPaymentTypes || "").split(',').filter(t => t.trim()).map((type, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {type.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterPaymentTypes.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterPaymentTypes: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px", opacity: 0.7 }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add payment type..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterPaymentTypes || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Payment Types.`);
                                      return;
                                    }
                                    setSettings({...settings, masterPaymentTypes: (settings.masterPaymentTypes || "") + (settings.masterPaymentTypes?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bank Accounts */}
                      <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: t.text }}>
                          <CreditCard size={18} color="#ef4444" />
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Bank Accounts</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {(settings.masterBankAccounts || "").split(',').filter(t => t.trim()).map((bank, idx) => (
                              <div key={idx} style={{ background: t.card, border: `1px solid ${t.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                {bank.trim()}
                                <button 
                                  onClick={() => {
                                    const items = settings.masterBankAccounts.split(',').filter((_, i) => i !== idx);
                                    setSettings({...settings, masterBankAccounts: items.join(',')});
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "14px", opacity: 0.7 }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input 
                              type="text" 
                              placeholder="Add bank account..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim();
                                  if (val) {
                                    const currentItems = (settings.masterBankAccounts || "").split(',').map(i => i.trim().toLowerCase());
                                    if (currentItems.includes(val.toLowerCase())) {
                                      showNotification(`"${val}" already exists in Bank Accounts.`);
                                      return;
                                    }
                                    setSettings({...settings, masterBankAccounts: (settings.masterBankAccounts || "") + (settings.masterBankAccounts?.trim() ? "," : "") + val});
                                    e.currentTarget.value = "";
                                  }
                                }
                              }}
                              style={{ ...getInputStyle(t), padding: "8px 12px", fontSize: "0.8125rem" }} 
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {activeOptionsTab === 'AUTOMATION' && (
                  <div className="animate-in fade-in duration-500">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                      <div>
                        <h3 style={{ margin: 0, color: t.text, fontSize: "1.5rem", fontWeight: 700 }}>Task Automation</h3>
                        <p style={{ color: t.textMuted, marginTop: "4px", fontSize: "0.875rem" }}>Configure rules for automatic recurring task generation.</p>
                      </div>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ 
                          padding: "10px 24px", 
                          background: "#2563eb", 
                          color: "white", 
                          borderRadius: "10px", 
                          border: "none", 
                          fontWeight: 600, 
                          cursor: isSavingSettings ? "not-allowed" : "pointer",
                          boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={e => !isSavingSettings && (e.currentTarget.style.background = "#1d4ed8")}
                        onMouseOut={e => !isSavingSettings && (e.currentTarget.style.background = "#2563eb")}
                      >
                        {isSavingSettings ? "Saving..." : "Save Configuration"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      {/* Generation Settings */}
                      <div style={{ padding: "28px", background: "white", borderRadius: "20px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                          <div style={{ padding: "10px", background: "#eff6ff", borderRadius: "12px" }}>
                            <Clock size={20} color="#2563eb" />
                          </div>
                          <h4 style={{ margin: 0, color: t.text, fontSize: "1.125rem", fontWeight: 600 }}>Generation Settings</h4>
                        </div>
                        
                        <div style={{ marginBottom: "24px" }}>
                          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Preferred Daily Generation Time</label>
                          <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "12px" }}>The system will automatically generate tasks for the day once this time is reached (Monday to Friday).</p>
                          <input 
                            type="time"
                            value={settings.dailyTaskGenerationTime}
                            onChange={(e) => setSettings({...settings, dailyTaskGenerationTime: e.target.value})}
                            style={{ 
                              width: "100%", 
                              padding: "12px", 
                              borderRadius: "10px", 
                              border: `1px solid ${t.border}`, 
                              outline: "none",
                              fontSize: "1rem",
                              color: "#0f172a",
                              fontWeight: 500
                            }}
                          />
                        </div>

                        <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "28px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.025em" }}>System Status</div>
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9375rem", marginTop: "4px" }}>
                                {settings.lastDailyGenerationAt ? `Last Ran: ${formatDateTime(settings.lastDailyGenerationAt)}` : "Not yet run today"}
                              </div>
                            </div>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.1)" }}></div>
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            if (isSavingSettings) return;
                            setIsSavingSettings(true);
                            try {
                              const res = await fetch("/api/cron/daily-tasks", { 
                                method: "POST",
                                headers: { "x-manual-trigger": "true" }
                              });
                              const data = await res.json();
                              if (data.success) {
                                showNotification(`Success! Automated engine generated ${data.count} tasks.`);
                                fetchSettings();
                                fetchTasks(true);
                                setLoading(false);
                              } else {
                                showNotification(`Error: ${data.message || data.error || "Unknown error"}`);
                              }
                            } catch (e) { 
                              showNotification("Trigger failed."); 
                            } finally { 
                              setIsSavingSettings(false); 
                            }
                          }}
                          disabled={isSavingSettings}
                          style={{ 
                            width: "100%", 
                            padding: "14px", 
                            background: "#f1f5f9", 
                            color: "#475569", 
                            border: "1px solid #e2e8f0", 
                            borderRadius: "12px", 
                            fontWeight: 600, 
                            cursor: isSavingSettings ? "not-allowed" : "pointer", 
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                          }}
                          onMouseOver={e => !isSavingSettings && (e.currentTarget.style.background = "#e2e8f0")}
                          onMouseOut={e => !isSavingSettings && (e.currentTarget.style.background = "#f1f5f9")}
                        >
                          <Zap size={16} /> Generate Today's Tasks Now
                        </button>
                      </div>

                      {/* Holiday Manager */}
                      <div style={{ padding: "28px", background: "white", borderRadius: "20px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                          <div style={{ padding: "10px", background: "#fef2f2", borderRadius: "12px" }}>
                            <Calendar size={20} color="#ef4444" />
                          </div>
                          <h4 style={{ margin: 0, color: t.text, fontSize: "1.125rem", fontWeight: 600 }}>Holiday Manager</h4>
                        </div>
                        
                        <p style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "20px", lineHeight: "1.5" }}>
                          The system skips weekends (Sat/Sun) automatically. Add any public holidays, festivals, or office closures here to prevent task generation on those dates.
                        </p>
                        
                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                          <input 
                            type="date"
                            id="new-holiday-date"
                            style={{ 
                              flex: 1, 
                              padding: "10px 14px", 
                              borderRadius: "10px", 
                              border: `1px solid ${t.border}`,
                              fontSize: "0.875rem",
                              outline: "none"
                            }}
                          />
                          <button 
                            onClick={() => {
                              const el = document.getElementById('new-holiday-date') as HTMLInputElement;
                              if (!el.value) return;
                              const current = JSON.parse(settings.holidayList || "[]");
                              if (!current.includes(el.value)) {
                                const updated = [...current, el.value].sort();
                                setSettings({...settings, holidayList: JSON.stringify(updated)});
                              }
                              el.value = "";
                            }}
                            style={{ 
                              padding: "10px 20px", 
                              background: "#ef4444", 
                              color: "white", 
                              border: "none", 
                              borderRadius: "10px", 
                              fontWeight: 600, 
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.background = "#dc2626"}
                            onMouseOut={e => e.currentTarget.style.background = "#ef4444"}
                          >
                            Add
                          </button>
                        </div>

                        <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", padding: "2px" }} className="custom-scrollbar">
                          {JSON.parse(settings.holidayList || "[]").map((date: string) => (
                            <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fff5f5", borderRadius: "10px", border: "1px solid #fee2e2", transition: "transform 0.1s" }}>
                              <span style={{ fontSize: "0.875rem", color: "#b91c1c", fontWeight: 600 }}>{new Date(date).toDateString()}</span>
                              <button 
                                onClick={() => {
                                  const current = JSON.parse(settings.holidayList || "[]");
                                  const updated = current.filter((d: string) => d !== date);
                                  setSettings({...settings, holidayList: JSON.stringify(updated)});
                                }}
                                style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: "6px" }}
                                onMouseOver={e => e.currentTarget.style.background = "#fee2e2"}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          {JSON.parse(settings.holidayList || "[]").length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: "0.8125rem" }}>
                              No holidays scheduled yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'TASK_APPROVALS' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Pending Task Approvals</h3>
                    {tasks.filter(t => t.isApproved === false).length === 0 ? (
                      <p>No pending approvals.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {tasks.filter(t => t.isApproved === false).map(task => (
                          <div key={task.id} style={{ padding: "15px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <strong>{task.taskName}</strong> - {task.entityName}
                                <div style={{ fontSize: "0.8rem", color: t.textMuted }}>Owner: {task.ownerName}</div>
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button 
                                  onClick={async () => {
                                    const res = await fetch(`/api/tasks/${task.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isApproved: true }) });
                                    if (res.ok) fetchTasks(true);
                                  }}
                                  style={{ background: "#22c55e", color: "white", padding: "5px 10px", borderRadius: "5px", border: "none", cursor: "pointer" }}
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={async () => {
                                    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
                                    if (res.ok) fetchTasks(true);
                                  }}
                                  style={{ background: "#ef4444", color: "white", padding: "5px 10px", borderRadius: "5px", border: "none", cursor: "pointer" }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeOptionsTab === 'DATA' && (
                  <div>
                    <h3 style={{ margin: "0 0 24px 0" }}>Data Management</h3>
                    
                    {isAdmin && (
                      <div style={{ 
                        background: "rgba(79, 70, 229, 0.05)", 
                        border: "1px solid rgba(79, 70, 229, 0.2)", 
                        padding: "16px 20px", 
                        borderRadius: "14px", 
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px"
                      }}>
                        <ShieldAlert size={20} color="#4f46e5" />
                        <div>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#4f46e5", display: "block", marginBottom: "2px" }}>Admin Security Note</span>
                          <span style={{ fontSize: "0.875rem", color: t.text }}>
                            Excel Reference Sheets are locked with password: <strong style={{ fontFamily: "monospace", background: "#ffffff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>Intellicar@123</strong>
                          </span>
                        </div>
                      </div>
                    )}

                    <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: t.text }}>Bulk Data Import</h4>
                    <p style={{ color: t.textMuted, marginBottom: "32px" }}>Download the template, fill it with your data, and upload it back. All imports follow a strictly defined schema.</p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                      
                      {/* Task Import Section */}
                      <div style={{ padding: "24px", border: `1px solid ${t.border}`, borderRadius: "16px", background: t.card, display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                        <div style={{ background: "#eff6ff", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <FileSpreadsheet size={24} color="#3b82f6" />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>Task Bulk Import</h4>
                          <p style={{ margin: 0, fontSize: "0.8125rem", color: t.textMuted }}>Standard one-time task uploads.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                          <button 
                            onClick={() => downloadBulkTemplate('tasks')}
                            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #3b82f6", background: t.card, color: "#3b82f6", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                          >
                            <Download size={14} /> Template
                          </button>
                          <label style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#3b82f6", color: "white", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textAlign: "center" }}>
                            <Plus size={14} /> Upload Excel
                            <input type="file" accept=".xlsx" hidden onChange={(e) => handleExcelBulkUpload(e, 'tasks')} />
                          </label>
                        </div>
                      </div>

                      {/* Recurring Import Section */}
                      <div style={{ padding: "24px", border: `1px solid ${t.border}`, borderRadius: "16px", background: t.card, display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                        <div style={{ background: "#f5f3ff", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Repeat size={24} color="#8b5cf6" />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>Recurring Task Import</h4>
                          <p style={{ margin: 0, fontSize: "0.8125rem", color: t.textMuted }}>Master Recurring Template data.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                          <button 
                            onClick={() => downloadBulkTemplate('recurring')}
                            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #8b5cf6", background: t.card, color: "#8b5cf6", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                          >
                            <Download size={14} /> Template
                          </button>
                          <label style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#8b5cf6", color: "white", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textAlign: "center" }}>
                            <Plus size={14} /> Upload Excel
                            <input type="file" accept=".xlsx" hidden onChange={(e) => handleExcelBulkUpload(e, 'recurring')} />
                          </label>
                        </div>
                      </div>

                      {/* LO Import Section */}
                      <div style={{ padding: "24px", border: `1px solid ${t.border}`, borderRadius: "16px", background: t.card, display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                        <div style={{ background: "#fef2f2", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Lightbulb size={24} color="#ef4444" />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>LO Bulk Import</h4>
                          <p style={{ margin: 0, fontSize: "0.8125rem", color: t.textMuted }}>Learning Opportunities tracker.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                          <button 
                            onClick={() => downloadBulkTemplate('lo')}
                            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #ef4444", background: t.card, color: "#ef4444", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                          >
                            <Download size={14} /> Template
                          </button>
                          <label style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#ef4444", color: "white", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textAlign: "center" }}>
                            <Plus size={14} /> Upload Excel
                            <input type="file" accept=".xlsx" hidden onChange={(e) => handleExcelBulkUpload(e, 'lo')} />
                          </label>
                        </div>
                      </div>

                      {/* Payments Import Section */}
                      <div style={{ padding: "24px", border: `1px solid ${t.border}`, borderRadius: "16px", background: t.card, display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                        <div style={{ background: "#ecfdf5", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Wallet size={24} color="#10b981" />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>Payments Bulk Import</h4>
                          <p style={{ margin: 0, fontSize: "0.8125rem", color: t.textMuted }}>Master Payments Sheet data.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                          <button 
                            onClick={() => downloadBulkTemplate('payments')}
                            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #10b981", background: t.card, color: "#10b981", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                          >
                            <Download size={14} /> Template
                          </button>
                          <label style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#10b981", color: "white", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textAlign: "center" }}>
                            <Plus size={14} /> Upload Excel
                            <input type="file" accept=".xlsx" hidden onChange={(e) => handleExcelBulkUpload(e, 'payments')} />
                          </label>
                        </div>
                      </div>

                    </div>

                    {/* Recent Import History Section - MOVED TO BOTTOM */}
                    <div style={{ marginTop: "40px", padding: "24px", background: isDarkMode ? "rgba(255,255,255,0.02)" : "#f8fafc", borderRadius: "20px", border: `1px solid ${t.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                        <History size={20} color="#6366f1" />
                        <h4 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Recent Import History (Last 10)</h4>
                      </div>
                      
                      {importHistory.length > 0 ? (
                        <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                            <thead>
                              <tr style={{ background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9", textAlign: "left" }}>
                                <th style={{ padding: "14px 20px", fontWeight: 700, color: t.textMuted }}>Date & Time</th>
                                <th style={{ padding: "14px 20px", fontWeight: 700, color: t.textMuted }}>Type</th>
                                <th style={{ padding: "14px 20px", fontWeight: 700, color: t.textMuted }}>Status</th>
                                <th style={{ padding: "14px 20px", fontWeight: 700, color: t.textMuted }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importHistory.map((h: any) => (
                                <tr key={h.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                                  <td style={{ padding: "14px 20px", color: t.text }}>{new Date(h.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                  <td style={{ padding: "14px 20px", color: t.text, textTransform: 'capitalize' }}>{h.type}</td>
                                  <td style={{ padding: "14px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                      <span style={{ color: "#10b981", fontWeight: 700 }}>{h.successCount} Success</span>
                                      {h.errorCount > 0 && (
                                        <span style={{ color: "#ef4444", fontWeight: 700 }}>{h.errorCount} Failed</span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: "14px 20px" }}>
                                    {h.errorCount > 0 ? (
                                      <button 
                                        onClick={() => {
                                          const errors = typeof h.errors === 'string' ? JSON.parse(h.errors) : h.errors;
                                          downloadErrorReport(errors, h.type);
                                        }}
                                        style={{ background: "none", border: "none", color: "#4f46e5", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
                                      >
                                        <Download size={14} /> Download Error Report
                                      </button>
                                    ) : (
                                      <span style={{ color: t.textMuted, fontSize: "0.8125rem" }}>No Errors</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: "40px", textAlign: "center", background: t.card, borderRadius: "16px", border: `1px dashed ${t.border}` }}>
                          <History size={32} color={t.textMuted} style={{ opacity: 0.3, marginBottom: "12px" }} />
                          <p style={{ margin: 0, color: t.textMuted, fontSize: "0.9rem" }}>No recent imports found. Start by uploading a file below.</p>
                        </div>
                      )}
                    </div>

                  </div>
                )}


                {activeOptionsTab === 'HOME_HUB' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 style={{ margin: 0, color: t.text, fontSize: "1.5rem", fontWeight: 700 }}>Home Hub Management</h3>
                        <p style={{ color: t.textMuted, marginTop: "4px", fontSize: "0.875rem" }}>Customize your team's inspiration wall, mission, and vision.</p>
                      </div>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "#10b981", color: "white", padding: "12px 24px", borderRadius: "12px", border: "none", cursor: isSavingSettings ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)" }}
                      >
                        <ShieldCheck size={18} /> {isSavingSettings ? "Saving..." : "Save All Changes"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      {/* 1. Mission & Vision Editor */}
                      <div style={{ background: t.card, padding: "28px", borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)" }}>
                        <h4 style={{ margin: "0 0 24px 0", fontSize: "1.125rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                          <Building2 size={20} color="#2563eb" /> Mission & Vision Statement
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.025em" }}>Our Mission</label>
                            <textarea 
                              value={(() => {
                                try {
                                  const content = JSON.parse(settings.homeContent || '{}');
                                  return content.mission || "";
                                } catch { return ""; }
                              })()}
                              onChange={(e) => {
                                const content = JSON.parse(settings.homeContent || '{}');
                                content.mission = e.target.value;
                                setSettings({ ...settings, homeContent: JSON.stringify(content) });
                              }}
                              placeholder="Describe your daily mission..."
                              style={{ ...getInputStyle(t), minHeight: "80px", resize: "vertical", fontSize: "0.9375rem", marginBottom: "12px" }}
                            />
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.025em" }}>Mission Caption</label>
                            <input 
                              type="text"
                              value={(() => {
                                try {
                                  const content = JSON.parse(settings.homeContent || '{}');
                                  return content.missionCaption || "";
                                } catch { return ""; }
                              })()}
                              onChange={(e) => {
                                const content = JSON.parse(settings.homeContent || '{}');
                                content.missionCaption = e.target.value;
                                setSettings({ ...settings, homeContent: JSON.stringify(content) });
                              }}
                              placeholder="Driving daily excellence..."
                              style={{ ...getInputStyle(t), fontSize: "0.9375rem" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.025em" }}>Our Vision</label>
                            <textarea 
                              value={(() => {
                                try {
                                  const content = JSON.parse(settings.homeContent || '{}');
                                  return content.vision || "";
                                } catch { return ""; }
                              })()}
                              onChange={(e) => {
                                const content = JSON.parse(settings.homeContent || '{}');
                                content.vision = e.target.value;
                                setSettings({ ...settings, homeContent: JSON.stringify(content) });
                              }}
                              placeholder="Where is the team headed?"
                              style={{ ...getInputStyle(t), minHeight: "80px", resize: "vertical", fontSize: "0.9375rem", marginBottom: "12px" }}
                            />
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.025em" }}>Vision Caption</label>
                            <input 
                              type="text"
                              value={(() => {
                                try {
                                  const content = JSON.parse(settings.homeContent || '{}');
                                  return content.visionCaption || "";
                                } catch { return ""; }
                              })()}
                              onChange={(e) => {
                                const content = JSON.parse(settings.homeContent || '{}');
                                content.visionCaption = e.target.value;
                                setSettings({ ...settings, homeContent: JSON.stringify(content) });
                              }}
                              placeholder="Building a future..."
                              style={{ ...getInputStyle(t), fontSize: "0.9375rem" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Motivational Quote */}
                      <div style={{ background: t.card, padding: "28px", borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)" }}>
                        <h4 style={{ margin: "0 0 24px 0", fontSize: "1.125rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                          <Quote size={20} color="#3b82f6" /> Spotlight Quote
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Quote Text</label>
                            <textarea 
                              value={(() => {
                                try {
                                  const content = JSON.parse(settings.homeContent || '{}');
                                  return content.quote?.text || "";
                                } catch { return ""; }
                              })()}
                              onChange={(e) => {
                                const content = JSON.parse(settings.homeContent || '{}');
                                content.quote = { ...(content.quote || {}), text: e.target.value };
                                setSettings({ ...settings, homeContent: JSON.stringify(content) });
                              }}
                              placeholder="Enter an inspiring quote..."
                              style={{ ...getInputStyle(t), minHeight: "100px", resize: "vertical", fontSize: "0.9375rem" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Author</label>
                            <input 
                              type="text"
                              value={(() => {
                                try {
                                  const content = JSON.parse(settings.homeContent || '{}');
                                  return content.quote?.author || "";
                                } catch { return ""; }
                              })()}
                              onChange={(e) => {
                                const content = JSON.parse(settings.homeContent || '{}');
                                content.quote = { ...(content.quote || {}), author: e.target.value };
                                setSettings({ ...settings, homeContent: JSON.stringify(content) });
                              }}
                              placeholder="e.g. Steve Jobs"
                              style={{ ...getInputStyle(t), fontSize: "0.9375rem" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Wall of Fame / Success Stories Editor */}
                    <div style={{ background: t.card, padding: "32px", borderRadius: "24px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                        <h4 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                          <Trophy size={20} color="#10b981" /> Wall of Fame: Success Stories
                        </h4>
                        <button 
                          onClick={() => {
                            const content = JSON.parse(settings.homeContent || '{}');
                            const stories = content.stories || [];
                            const updated = [...stories, { id: Date.now(), title: "New Success!", text: "Describe what happened...", author: "Team Member", image: null }];
                            setSettings({ ...settings, homeContent: JSON.stringify({ ...content, stories: updated }) });
                          }}
                          style={{ background: "#f0fdf4", border: "1px solid #10b981", color: "#10b981", padding: "8px 16px", borderRadius: "10px", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
                        >
                          + Add New Story
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                        {(() => {
                          try {
                            const content = JSON.parse(settings.homeContent || '{}');
                            return (content.stories || []).map((s: any, idx: number) => (
                              <div key={idx} style={{ padding: "20px", background: "#f8fafc", borderRadius: "20px", border: "1px solid #e2e8f0", position: "relative" }}>
                                <button 
                                  onClick={() => {
                                    const updated = content.stories.filter((_: any, i: number) => i !== idx);
                                    setSettings({ ...settings, homeContent: JSON.stringify({ ...content, stories: updated }) });
                                  }}
                                  style={{ position: "absolute", top: "12px", right: "12px", background: "white", border: "1px solid #fee2e2", color: "#ef4444", borderRadius: "8px", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <Trash2 size={14} />
                                </button>

                                <div style={{ marginBottom: "16px" }}>
                                  <label style={{ fontSize: "0.625rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Story Photo</label>
                                  <label style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px", borderRadius: "12px", border: "1px solid #cbd5e1", cursor: "pointer", transition: "all 0.2s" }}>
                                    <div style={{ background: "#f1f5f9", width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                      {s.image ? <img src={s.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Share2 size={16} color="#64748b" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>{s.image ? "Change Photo" : "Upload Photo"}</div>
                                      <div style={{ fontSize: "0.625rem", color: "#94a3b8" }}>Max 1MB, optimized</div>
                                    </div>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      hidden 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 1024 * 1024) {
                                            showNotification("Image too large. Please use under 1MB.", "error");
                                            return;
                                          }
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            const newStories = [...content.stories];
                                            newStories[idx].image = reader.result;
                                            setSettings({...settings, homeContent: JSON.stringify({...content, stories: newStories})});
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                  <input 
                                    value={s.title} 
                                    onChange={(e) => {
                                      const newStories = [...content.stories];
                                      newStories[idx].title = e.target.value;
                                      setSettings({...settings, homeContent: JSON.stringify({...content, stories: newStories})});
                                    }}
                                    placeholder="Story Title"
                                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700 }}
                                  />
                                  <textarea 
                                    value={s.text} 
                                    onChange={(e) => {
                                      const newStories = [...content.stories];
                                      newStories[idx].text = e.target.value;
                                      setSettings({...settings, homeContent: JSON.stringify({...content, stories: newStories})});
                                    }}
                                    placeholder="What happened?"
                                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8125rem", minHeight: "60px" }}
                                  />
                                  <input 
                                    value={s.author} 
                                    onChange={(e) => {
                                      const newStories = [...content.stories];
                                      newStories[idx].author = e.target.value;
                                      setSettings({...settings, homeContent: JSON.stringify({...content, stories: newStories})});
                                    }}
                                    placeholder="Author / Team"
                                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8125rem", fontWeight: 600 }}
                                  />
                                </div>
                              </div>
                            ));
                          } catch { return <p>Error loading stories.</p>; }
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {activeOptionsTab === 'MATRICES' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ margin: 0 }}>Matrix Control Module</h3>
                      <button 
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "#10b981", color: "white", padding: "10px 20px", borderRadius: "10px", border: "none", cursor: isSavingSettings ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)" }}
                      >
                        <ShieldCheck size={18} /> {isSavingSettings ? "Saving..." : "Save Matrix Changes"}
                      </button>
                    </div>

                    {/* Finance Team Overview */}
                    <div style={{ background: t.card, padding: "24px", borderRadius: "16px", border: `1px solid ${t.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ padding: "8px", background: "#eff6ff", borderRadius: "10px" }}>
                          <Users size={20} color="#2563eb" />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "1.125rem", color: t.text }}>Finance Team Members</h4>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: t.textMuted }}>These users are available as Authorized Allocators.</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                        {usersList.filter((u: any) => u.department === 'Finance' && (u as any).isApproved !== false).length === 0 ? (
                          <p style={{ fontSize: "0.875rem", color: t.textMuted, italic: "true" } as any}>No users found in Finance department.</p>
                        ) : (
                          usersList.filter((u: any) => u.department === 'Finance' && (u as any).isApproved !== false).map((u: any) => (
                            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", background: t.bg, borderRadius: "12px", border: `1px solid ${t.border}` }}>
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.875rem" }}>
                                {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: t.text }}>{u.name || "--"}</div>
                                <div style={{ fontSize: "0.7rem", color: t.textMuted }}>{u.email}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Matrix A: Module Access (Accordion) */}
                    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'ACCESS' ? '' : 'ACCESS')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'ACCESS' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'ACCESS' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'ACCESS' ? "#2563eb" : "#0f172a" }}>
                          <Shield size={20} /> Matrix A : Module Access
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'ACCESS' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: t.textMuted }} />
                      </div>
                      
                      {activeMatrixTab === 'ACCESS' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: t.textMuted }}>Define which departments have access to specific modules.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#1e293b" }}>
                                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>Department</th>
                                  {['Home', 'Tasks', 'Requests', 'Learning', 'Recurring Activities', 'Payments'].map((module: string) => (
                                    <th key={module} style={{ padding: "12px 16px", textAlign: "center", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>{module}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {settings.masterDepartments.split(',').filter((d: string) => d.trim()).map((dept: string) => {
                                  const matrix = JSON.parse(settings.moduleAccessMatrix || '{}');
                                  return (
                                    <tr key={dept} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "12px", fontWeight: 600, color: t.text, fontSize: "0.875rem" }}>{dept}</td>
                                      {['Home', 'Tasks', 'Requests', 'Learning', 'Recurring Activities', 'Payments'].map((module: string) => (
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
                    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'ALLOCATION' ? '' : 'ALLOCATION')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'ALLOCATION' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'ALLOCATION' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'ALLOCATION' ? "#2563eb" : "#0f172a" }}>
                          <Users size={20} /> Matrix B : Request Allocation
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'ALLOCATION' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: t.textMuted }} />
                      </div>

                      {activeMatrixTab === 'ALLOCATION' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: t.textMuted }}>Assign authorized allocators for each type of inter-departmental request.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#1e293b" }}>
                                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>Finance Function</th>
                                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>Authorized Allocator</th>
                                </tr>
                              </thead>
                              <tbody>
                                {settings.masterRequestTypes.split(',').filter(t => t.trim()).map((type) => {
                                  const matrix = JSON.parse(settings.allocationMatrix || '{}');
                                  const rawData = matrix[type];
                                  
                                  // Normalize data structure
                                  let primary = "";
                                  let secondary: string[] = [];
                                  
                                  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
                                    primary = rawData.primary || "";
                                    secondary = Array.isArray(rawData.secondary) ? rawData.secondary : [];
                                  } else if (Array.isArray(rawData)) {
                                    // Migration on the fly
                                    primary = rawData[0] || "";
                                    secondary = rawData.slice(1);
                                  } else if (typeof rawData === 'string' && rawData) {
                                    primary = rawData;
                                  }

                                  return (
                                    <tr key={type} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "16px 12px", fontWeight: 600, color: t.text, fontSize: "0.875rem", verticalAlign: "top", width: "200px" }}>{type}</td>
                                      <td style={{ padding: "16px 12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                          
                                          {/* Primary Allocator Section */}
                                          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Primary Allocator (Max 1)</label>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                              <select 
                                                value={primary}
                                                onChange={(e) => {
                                                  const newPrimary = e.target.value;
                                                  setSettings({
                                                    ...settings,
                                                    allocationMatrix: JSON.stringify({ 
                                                      ...matrix, 
                                                      [type]: { primary: newPrimary, secondary } 
                                                    })
                                                  });
                                                }}
                                                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`, fontSize: "0.8125rem", background: "white" }}
                                              >
                                                <option value="">Select Primary Allocator</option>
                                                {usersList
                                                  .filter(u => u.department === 'Finance' && (u as any).isApproved !== false)
                                                  .map(u => (
                                                    <option key={u.email} value={u.email}>{u.name || u.email} ({u.email})</option>
                                                  ))
                                                }
                                              </select>
                                              {primary && (
                                                <button 
                                                  onClick={() => {
                                                    setSettings({
                                                      ...settings,
                                                      allocationMatrix: JSON.stringify({ 
                                                        ...matrix, 
                                                        [type]: { primary: "", secondary } 
                                                      })
                                                    });
                                                  }}
                                                  style={{ background: "#fee2e2", border: "none", color: "#ef4444", padding: "8px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}
                                                  title="Clear Primary"
                                                >
                                                  <X size={14} />
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {/* Secondary Allocators Section */}
                                          <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Secondary Allocators (Backup)</label>
                                            
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                                              {secondary.length === 0 ? (
                                                <span style={{ fontSize: "0.75rem", color: t.textMuted, fontStyle: "italic" }}>No secondary allocators assigned</span>
                                              ) : (
                                                secondary.map((email: string) => (
                                                  <div key={email} style={{ 
                                                    background: "#f1f5f9", border: "1px solid #e2e8f0", 
                                                    padding: "4px 10px", borderRadius: "8px", 
                                                    fontSize: "0.75rem", color: "#475569", 
                                                    display: "flex", alignItems: "center", gap: "8px" 
                                                  }}>
                                                    {usersList.find(u => u.email === email)?.name || email}
                                                    <button 
                                                      onClick={() => {
                                                        const updatedSec = secondary.filter((e: string) => e !== email);
                                                        setSettings({ ...settings, allocationMatrix: JSON.stringify({ ...matrix, [type]: { primary, secondary: updatedSec } }) });
                                                      }}
                                                      style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, display: "flex" }}
                                                    >
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                ))
                                              )}
                                            </div>

                                            <select 
                                              value=""
                                              onChange={(e) => {
                                                if (!e.target.value) return;
                                                if (e.target.value === primary) return; // Already primary
                                                if (secondary.includes(e.target.value)) return;
                                                setSettings({
                                                  ...settings,
                                                  allocationMatrix: JSON.stringify({ 
                                                    ...matrix, 
                                                    [type]: { primary, secondary: [...secondary, e.target.value] } 
                                                  })
                                                });
                                              }}
                                              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`, fontSize: "0.8125rem" }}
                                            >
                                              <option value="">+ Add Secondary Allocator</option>
                                              {usersList
                                                .filter(u => u.department === 'Finance' && (u as any).isApproved !== false)
                                                .map(u => (
                                                  <option key={u.email} value={u.email} disabled={u.email === primary}>
                                                    {u.name || u.email} {u.email === primary ? "(Primary)" : ""}
                                                  </option>
                                                ))
                                              }
                                            </select>
                                          </div>

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
                    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'ENTITY' ? '' : 'ENTITY')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'ENTITY' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'ENTITY' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'ENTITY' ? "#2563eb" : "#0f172a" }}>
                          <Briefcase size={20} /> Matrix C : Entity Controls
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'ENTITY' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: t.textMuted }} />
                      </div>
                      
                      {activeMatrixTab === 'ENTITY' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: t.textMuted }}>Control which users have access to specific entities in Task and Request forms.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#1e293b" }}>
                                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>User Name / Email</th>
                                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#ffffff", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", background: "#1e40af", borderBottom: "2px solid #60a5fa" }}>Consolidated (ALL)</th>
                                  {settings.masterEntities.split(',').filter(e => e.trim()).map(entity => (
                                    <th key={entity} style={{ padding: "12px 16px", textAlign: "center", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #3b82f6" }}>{entity.trim()}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {usersList.filter(u => (u as any).isApproved !== false).map((u) => {
                                  const matrix = JSON.parse(settings.entityMatrix || '{}');
                                  const userEntities = matrix[u.id] || [];
                                  const isConsolidated = userEntities.includes('ALL');
                                  
                                  return (
                                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                                        <div style={{ fontWeight: 600, color: t.text }}>{u.name || "--"}</div>
                                        <div style={{ fontSize: "0.7rem", color: t.textMuted }}>{u.email}</div>
                                      </td>
                                      <td style={{ padding: "12px", textAlign: "center", background: t.bg }}>
                                        <input 
                                          type="checkbox" 
                                          checked={isConsolidated} 
                                          onChange={(e) => {
                                            const updated = e.target.checked ? ['ALL'] : [];
                                            setSettings({
                                              ...settings, 
                                              entityMatrix: JSON.stringify({ ...matrix, [u.id]: updated })
                                            });
                                          }}
                                          style={{ width: "20px", height: "20px", cursor: "pointer" }}
                                        />
                                      </td>
                                      {settings.masterEntities.split(',').filter(e => e.trim()).map(entity => {
                                        const entityName = entity.trim();
                                        return (
                                          <td key={entityName} style={{ padding: "12px", textAlign: "center" }}>
                                            <input 
                                              type="checkbox" 
                                              disabled={isConsolidated}
                                              checked={isConsolidated || userEntities.includes(entityName)} 
                                              onChange={(e) => {
                                                const current = userEntities.filter((en: string) => en !== 'ALL');
                                                const updated = e.target.checked 
                                                  ? [...current, entityName] 
                                                  : current.filter((en: string) => en !== entityName);
                                                setSettings({
                                                  ...settings, 
                                                  entityMatrix: JSON.stringify({ ...matrix, [u.id]: updated })
                                                });
                                              }}
                                              style={{ width: "18px", height: "18px", cursor: "pointer", opacity: isConsolidated ? 0.5 : 1 }}
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

                    {/* Matrix D: Bulk Import Controls */}
                    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'BULK_IMPORT_MATRIX' ? '' : 'BULK_IMPORT_MATRIX')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'BULK_IMPORT_MATRIX' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'BULK_IMPORT_MATRIX' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'BULK_IMPORT_MATRIX' ? "#2563eb" : "#0f172a" }}>
                          <FileSpreadsheet size={20} /> Matrix D : Bulk Import Controls
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'BULK_IMPORT_MATRIX' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: t.textMuted }} />
                      </div>
                      
                      {activeMatrixTab === 'BULK_IMPORT_MATRIX' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: t.textMuted }}>Select users who should have access to the Bulk Import tools.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#1e293b" }}>
                                  <th style={{ padding: "14px 20px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "2px solid #3b82f6" }}>User & Department</th>
                                  <th style={{ padding: "14px 20px", textAlign: "center", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "2px solid #3b82f6" }}>Grant Import Access</th>
                                </tr>
                              </thead>
                              <tbody>
                                {usersList
                                  .filter(u => !extReqSearch || (u.name || u.email).toLowerCase().includes(extReqSearch.toLowerCase()))
                                  .filter(u => matrixDeptFilter.length === 0 || matrixDeptFilter.includes(u.department))
                                  .filter(u => (u as any).isApproved !== false)
                                  .map((u) => {
                                    const matrix = JSON.parse(settings.bulkImportMatrix || '{}');
                                    const hasAccess = matrix[u.id]?.includes('BULK_IMPORT') || matrix[u.email]?.includes('BULK_IMPORT');
                                    
                                    return (
                                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px" }}>
                                           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                             <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", border: "1px solid #e2e8f0" }}>
                                               {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                                             </div>
                                             <div>
                                               <div style={{ fontWeight: 600, color: t.text, fontSize: "0.875rem" }}>{u.name || "--"}</div>
                                               <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: 600 }}>{u.department}</div>
                                             </div>
                                           </div>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "center" }}>
                                          <input 
                                            type="checkbox" 
                                            checked={!!hasAccess}
                                            onChange={(e) => {
                                              const updated = e.target.checked ? ['BULK_IMPORT'] : [];
                                              setSettings({
                                                ...settings, 
                                                bulkImportMatrix: JSON.stringify({ ...matrix, [u.id]: updated, [u.email]: updated })
                                              });
                                            }}
                                            style={{ width: "20px", height: "20px", cursor: "pointer" }}
                                          />
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
                    
                    {/* Matrix E: Department Head Assignments */}
                    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'DEPT_HEADS' ? '' : 'DEPT_HEADS')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'DEPT_HEADS' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'DEPT_HEADS' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'DEPT_HEADS' ? "#2563eb" : "#0f172a" }}>
                          <UserCheck size={20} /> Matrix E : Department Head Assignments
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'DEPT_HEADS' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: t.textMuted }} />
                      </div>
                      
                      {activeMatrixTab === 'DEPT_HEADS' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <p style={{ margin: "0 0 20px 0", fontSize: "0.875rem", color: t.textMuted }}>Select users who act as Department Heads for Team Approval workflows.</p>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#1e293b" }}>
                                  <th style={{ padding: "14px 20px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "2px solid #3b82f6" }}>Department</th>
                                  <th style={{ padding: "14px 20px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "2px solid #3b82f6" }}>Assigned Department Heads</th>
                                </tr>
                              </thead>
                              <tbody>
                                {settings.masterDepartments.split(',').map(dept => dept.trim()).filter(Boolean).map(dept => {
                                  const matrix = JSON.parse(settings.departmentHeadMatrix || '{}');
                                  const assignedHeads = matrix[dept] || [];
                                  
                                  return (
                                    <tr key={dept} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "16px", fontWeight: 700, fontSize: "0.875rem", color: t.text }}>{dept}</td>
                                      <td style={{ padding: "16px" }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                          <MultiSelectFilter
                                            options={usersList.filter(u => u.isApproved !== false).map(u => u.email).sort()}
                                            selected={assignedHeads}
                                            onChange={(selected) => {
                                              setSettings({
                                                ...settings,
                                                departmentHeadMatrix: JSON.stringify({ ...matrix, [dept]: selected })
                                              });
                                            }}
                                            placeholder="Assign Dept Heads"
                                            theme={theme}
                                            t={t}
                                          />
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


                    {/* User Module Controls (Matrix D) */}
                    <div style={{ background: t.card, borderRadius: "16px", border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                      <div 
                        onClick={() => setActiveMatrixTab(activeMatrixTab === 'USER_CONTROLS' ? '' : 'USER_CONTROLS')}
                        style={{ padding: "20px 24px", background: activeMatrixTab === 'USER_CONTROLS' ? "#f8fafc" : "white", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: activeMatrixTab === 'USER_CONTROLS' ? "1px solid #e2e8f0" : "none", transition: "all 0.2s" }}
                      >
                        <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "12px", color: activeMatrixTab === 'USER_CONTROLS' ? "#2563eb" : "#0f172a" }}>
                          <ShieldCheck size={20} /> User Module Controls
                        </h4>
                        <ChevronDown size={20} style={{ transform: activeMatrixTab === 'USER_CONTROLS' ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", color: t.textMuted }} />
                      </div>
                      
                      {activeMatrixTab === 'USER_CONTROLS' && (
                        <div style={{ padding: "24px", animation: "slideDown 0.3s ease-out" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div>
                              <h5 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: t.text }}>Granular User Exceptions</h5>
                              <p style={{ margin: 0, fontSize: "0.875rem", color: t.textMuted }}>Disable specific modules for individual users, even if their department has access.</p>
                            </div>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                              {/* Department Filter */}
                              <MultiSelectFilter
                                options={settings.masterDepartments?.split(',').map(d => d.trim()).filter(Boolean).sort() || []}
                                selected={matrixDeptFilter}
                                onChange={setMatrixDeptFilter}
                                placeholder="All Departments"
                                theme={theme}
                                t={t}
                              />

                              <div style={{ position: "relative" }}>
                                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
                                <input 
                                  type="text" 
                                  placeholder="Search users..." 
                                  value={extReqSearch}
                                  onChange={(e) => setExtReqSearch(e.target.value)} 
                                  style={{ padding: "8px 12px 8px 36px", borderRadius: "10px", border: `1px solid ${t.border}`, fontSize: "0.875rem", width: "200px", background: t.card, color: t.text }}
                                />
                              </div>
                            </div>
                          </div>

                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#1e293b" }}>
                                  <th style={{ padding: "14px 20px", textAlign: "left", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "2px solid #3b82f6" }}>User & Department</th>
                                  {['Home', 'Tasks', 'Requests', 'Learning', 'Recurring Activities', 'Payments'].map(module => (
                                    <th key={module} style={{ padding: "14px 20px", textAlign: "center", color: "#ffffff", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "2px solid #3b82f6" }}>{module}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {usersList
                                  .filter(u => !extReqSearch || (u.name || u.email).toLowerCase().includes(extReqSearch.toLowerCase()))
                                  .filter(u => matrixDeptFilter.length === 0 || matrixDeptFilter.includes(u.department))
                                  .filter(u => (u as any).isApproved !== false)
                                  .map((u) => {
                                    const accessMatrix = JSON.parse(settings.moduleAccessMatrix || '{}');
                                    const exceptions = JSON.parse(settings.userModuleExceptions || '{}');
                                    const userExceptions = exceptions[u.email] || [];
                                    
                                    return (
                                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px" }}>
                                           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                             <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", border: "1px solid #e2e8f0" }}>
                                               {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                                             </div>
                                             <div>
                                               <div style={{ fontWeight: 600, color: t.text, fontSize: "0.875rem" }}>{u.name || "--"}</div>
                                               <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: 600 }}>{u.department}</div>
                                             </div>
                                           </div>
                                        </td>
                                        {['Home', 'Tasks', 'Requests', 'Learning', 'Recurring Activities', 'Payments'].map(module => {
                                          const deptHasAccess = accessMatrix[module]?.includes(u.department);
                                          const isManuallyBlocked = userExceptions.includes(module);
                                          const effectiveAccess = deptHasAccess && !isManuallyBlocked;
                                          
                                          return (
                                            <td key={module} style={{ padding: "12px", textAlign: "center" }}>
                                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                                <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
                                                  <input 
                                                    type="checkbox" 
                                                    disabled={!deptHasAccess}
                                                    checked={effectiveAccess}
                                                    onChange={(e) => {
                                                      let updatedExceptions = [...userExceptions];
                                                      if (!e.target.checked) {
                                                        if (!updatedExceptions.includes(module)) updatedExceptions.push(module);
                                                      } else {
                                                        updatedExceptions = updatedExceptions.filter(m => m !== module);
                                                      }
                                                      setSettings({
                                                        ...settings,
                                                        userModuleExceptions: JSON.stringify({ ...exceptions, [u.email]: updatedExceptions })
                                                      });
                                                    }}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                  />
                                                  <span style={{ 
                                                    position: "absolute", cursor: deptHasAccess ? "pointer" : "not-allowed", 
                                                    top: 0, left: 0, right: 0, bottom: 0, 
                                                    backgroundColor: !deptHasAccess ? "#e2e8f0" : (effectiveAccess ? "#10b981" : "#ef4444"), 
                                                    transition: ".4s", borderRadius: "34px", opacity: deptHasAccess ? 1 : 0.5 
                                                  }}>
                                                    <span style={{ 
                                                      position: "absolute", content: '""', height: "14px", width: "14px", 
                                                      left: effectiveAccess ? "23px" : "3px", bottom: "3px", 
                                                      backgroundColor: "white", transition: ".4s", borderRadius: "50%" 
                                                    }}></span>
                                                  </span>
                                                </label>
                                                {!deptHasAccess ? (
                                                  <span style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700 }}>Dept Blocked</span>
                                                ) : isManuallyBlocked ? (
                                                  <span style={{ fontSize: "0.6rem", color: "#ef4444", fontWeight: 700 }}>User Blocked</span>
                                                ) : (
                                                  <span style={{ fontSize: "0.6rem", color: "#10b981", fontWeight: 700 }}>Active</span>
                                                )}
                                              </div>
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
          <div style={{ background: t.card, borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Share Report via Email</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>Send the current report as an attachment.</p>
              </div>
              <button onClick={() => setShowShareModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Recipient Emails *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: `1px solid ${t.border}`, borderRadius: "10px", minHeight: "45px", background: t.bg }}>
                  {recipientTags.map((email, idx) => (
                    <div key={idx} style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      {email}
                      <X size={14} style={{ cursor: "pointer" }} onClick={() => setRecipientTags(prev => prev.filter((_, i) => i !== idx))} />
                    </div>
                  ))}
                  <input 
                    type="text" 
                    placeholder={recipientTags.length === 0 ? "Type email and press Enter..." : ""}
                    value={recipientInput}
                    onChange={e => setRecipientInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const email = recipientInput.trim().toLowerCase();
                            if (email && email.includes('@') && !recipientTags.includes(email)) {
                              setRecipientTags([...recipientTags, email]);
                              setRecipientInput("");
                            }
                        }
                    }}
                    style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", flex: 1, minWidth: "120px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>CC Emails (Optional)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: `1px solid ${t.border}`, borderRadius: "10px", minHeight: "45px", background: t.bg }}>
                  {ccTags.map((email, idx) => (
                    <div key={idx} style={{ background: t.bg, color: t.textMuted, border: `1px solid ${t.border}`, padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      {email}
                      <X size={14} style={{ cursor: "pointer" }} onClick={() => setCcTags(prev => prev.filter((_, i) => i !== idx))} />
                    </div>
                  ))}
                  <input 
                    type="text" 
                    placeholder={ccTags.length === 0 ? "Type email and press Enter..." : ""}
                    value={ccInput}
                    onChange={e => setCcInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const email = ccInput.trim().toLowerCase();
                            if (email && email.includes('@') && !ccTags.includes(email)) {
                              setCcTags([...ccTags, email]);
                              setCcInput("");
                            }
                        }
                    }}
                    style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", flex: 1, minWidth: "120px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Report Format</label>
                    <select 
                      value={shareData.format}
                      onChange={e => setShareData({...shareData, format: e.target.value as any})}
                      style={getInputStyle(t)}
                    >
                      <option value="excel">Excel Spreadsheet (.xlsx)</option>
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="both">Both (Excel & PDF)</option>
                    </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Subject</label>
                <input 
                  type="text" 
                  value={shareData.subject}
                  onChange={e => setShareData({...shareData, subject: e.target.value})}
                  style={getInputStyle(t)} 
                />
              </div>

              <div style={{ padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: "12px" }}>
                {shareData.format === 'both' ? <FileCode size={24} color="#0369a1" /> : <FileSpreadsheet size={24} color="#0369a1" />}
                <div>
                  <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#0369a1" }}>Attachment Info</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#0ea5e9" }}>
                    {shareData.type === 'task' ? 'Task Dash Board' : shareData.type === 'lo' ? 'LO Dashboard' : 'Requests'} Export ({shareData.format === 'both' ? 'Both Formats' : shareData.format.toUpperCase()})
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button 
                  onClick={() => setShowShareModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.card, color: t.textMuted, fontWeight: 600, cursor: "pointer" }}
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
          <div style={{ background: t.card, borderRadius: "20px", width: "100%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
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
              <button onClick={() => setShowRejectModal(false)} style={{ background: t.card, border: "1px solid #fee2e2", color: "#ef4444", cursor: "pointer", width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>×</button>
            </div>
            
            <div style={{ padding: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, textTransform: "uppercase" }}>Rejection Reason</label>
              <textarea 
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ ...getInputStyle(t), minHeight: "120px", resize: "none", padding: "12px" }} 
              />
              
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button 
                  onClick={() => setShowRejectModal(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.card, color: t.textMuted, fontWeight: 600, cursor: "pointer" }}
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


      {/* ── Analytics Share Modal (Co-Branded) ─────────────────── */}
      {showAnaShareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "520px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

            {/* Header */}
            <div style={{ background: anaShareConfig.reportType === 'lo' ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "white" }}>Share {anaShareConfig.reportType === 'lo' ? 'LO' : 'Task'} Analytics Report</h3>
                <p style={{ margin: "4px 0 0 0", color: "rgba(255,255,255,0.8)", fontSize: "0.8125rem" }}>Send the current {anaShareConfig.reportType === 'lo' ? 'LO' : 'task'} analytics as an attachment.</p>
              </div>
              <button onClick={() => setShowAnaShareModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* TO Recipients - Chip Input */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>RECIPIENT EMAILS <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "46px", alignItems: "center", cursor: "text" }}
                     onClick={() => (document.getElementById('ana-to-input') as HTMLInputElement)?.focus()}>
                  {anaShareConfig.recipients.map((email: string) => (
                    <span key={email} style={{ background: anaShareConfig.reportType === 'lo' ? "#dcfce7" : "#e0e7ff", color: anaShareConfig.reportType === 'lo' ? "#166534" : "#4338ca", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      {email}
                      <button onClick={(e) => { e.stopPropagation(); setAnaShareConfig({...anaShareConfig, recipients: anaShareConfig.recipients.filter((r: string) => r !== email)}); }} style={{ background: "none", border: "none", color: anaShareConfig.reportType === 'lo' ? "#166534" : "#4338ca", cursor: "pointer", padding: 0, fontSize: "1rem", lineHeight: "1" }}>×</button>
                    </span>
                  ))}
                  <input id="ana-to-input" type="email" placeholder={anaShareConfig.recipients.length === 0 ? "Type email and press Enter..." : "Add more..."} value={anaShareConfig.recipientInput}
                    onChange={(e) => setAnaShareConfig({...anaShareConfig, recipientInput: e.target.value})}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && anaShareConfig.recipientInput.includes('@')) { e.preventDefault(); setAnaShareConfig({...anaShareConfig, recipients: [...anaShareConfig.recipients, anaShareConfig.recipientInput.trim()], recipientInput: ''}); } }}
                    style={{ border: "none", outline: "none", fontSize: "0.875rem", minWidth: "180px", flex: 1, color: "#111827" }} />
                </div>
              </div>

              {/* CC Emails - Chip Input */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>CC EMAILS (OPTIONAL)</label>
                <div style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "46px", alignItems: "center", cursor: "text" }}
                     onClick={() => (document.getElementById('ana-cc-input') as HTMLInputElement)?.focus()}>
                  {anaShareConfig.ccEmails.map((email: string) => (
                    <span key={email} style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      {email}
                      <button onClick={(e) => { e.stopPropagation(); setAnaShareConfig({...anaShareConfig, ccEmails: anaShareConfig.ccEmails.filter((r: string) => r !== email)}); }} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0, fontSize: "1rem", lineHeight: "1" }}>×</button>
                    </span>
                  ))}
                  <input id="ana-cc-input" type="email" placeholder="Type email and press Enter..." value={anaShareConfig.ccInput}
                    onChange={(e) => setAnaShareConfig({...anaShareConfig, ccInput: e.target.value})}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && anaShareConfig.ccInput.includes('@')) { e.preventDefault(); setAnaShareConfig({...anaShareConfig, ccEmails: [...anaShareConfig.ccEmails, anaShareConfig.ccInput.trim()], ccInput: ''}); } }}
                    style={{ border: "none", outline: "none", fontSize: "0.875rem", minWidth: "180px", flex: 1, color: "#111827" }} />
                </div>
              </div>

              {/* Format Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>REPORT FORMAT</label>
                <div style={{ position: "relative" }}>
                  <select value={anaShareConfig.format} onChange={(e) => setAnaShareConfig({...anaShareConfig, format: e.target.value as "excel" | "pdf" | "both"})}
                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px 40px 12px 16px", fontSize: "0.9375rem", color: "#111827", background: "white", appearance: "none", cursor: "pointer", outline: "none" }}>
                    <option value="excel">Excel Spreadsheet (.xlsx)</option>
                    <option value="pdf">PDF Report (.pdf)</option>
                    <option value="both">Both Excel + PDF</option>
                  </select>
                  <ChevronDown size={18} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>SUBJECT</label>
                <input type="text" value={anaShareConfig.subject} onChange={(e) => setAnaShareConfig({...anaShareConfig, subject: e.target.value})}
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111827", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Attachment Info Box (from Screenshot) */}
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ background: "#3b82f6", color: "white", width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#0369a1" }}>Attachment Info</h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#0ea5e9", fontWeight: 500 }}>
                    {anaShareConfig.reportType === 'lo' ? 'LO Analytics Dashboard Export' : 'Task Analytics Dashboard Export'} ({anaShareConfig.format.toUpperCase()})
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
                <button onClick={() => setShowAnaShareModal(false)} style={{ flex: 1, height: "46px", background: "white", border: "1px solid #d1d5db", borderRadius: "10px", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.9375rem" }}>Cancel</button>
                <button
                  disabled={anaShareLoading || (anaShareConfig.recipients.length === 0 && !anaShareConfig.recipientInput.includes('@'))}
                  onClick={() => {
                    if (anaShareConfig.recipientInput.includes('@')) {
                      const updated = {...anaShareConfig, recipients: [...anaShareConfig.recipients, anaShareConfig.recipientInput.trim()], recipientInput: ''};
                      setAnaShareConfig(updated);
                    }
                    if (anaShareConfig.reportType === 'lo') {
                      handleAnaShareEmail();
                    } else {
                      handleTaskAnaShareEmail();
                    }
                  }}
                  style={{ flex: 2, height: "46px", background: (anaShareLoading || (anaShareConfig.recipients.length === 0 && !anaShareConfig.recipientInput.includes('@'))) ? "#cbd5e1" : (anaShareConfig.reportType === 'lo' ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"), border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: (anaShareLoading || (anaShareConfig.recipients.length === 0 && !anaShareConfig.recipientInput.includes('@'))) ? "not-allowed" : "pointer", fontSize: "0.9375rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  {anaShareLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  {anaShareLoading ? "Sending..." : "Send Email"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

        </main>
      {importPreview && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "24px", width: "100%", maxWidth: "1000px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ padding: "24px 32px", borderBottom: `1px solid ${t.border}`, background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Import Preview: {importPreview.type.toUpperCase()}</h3>
                <p style={{ margin: "4px 0 0 0", opacity: 0.8, fontSize: "0.875rem" }}>Review your data below before committing to the database.</p>
              </div>
              <button onClick={() => setImportPreview(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>

            {/* Summary Banner */}
            <div style={{ background: t.bg, padding: "16px 32px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: t.text }}>{importPreview.rows.length}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Total Records</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#10b981" }}>{importPreview.rows.length - importPreview.errors.length}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Ready to Import</span>
              </div>
              {importPreview.errors.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ef4444" }}>{importPreview.errors.length}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Rows with Errors</span>
                </div>
              )}
            </div>

            {/* Data Table */}
            <div style={{ flex: 1, overflow: "auto", padding: "0 32px" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "0.75rem", color: t.textMuted }}>ROW</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "0.75rem", color: t.textMuted }}>PRIMARY DETAILS</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "0.75rem", color: t.textMuted }}>ENTITY</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "0.75rem", color: t.textMuted }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, idx) => {
                    const rowNumber = idx + 2;
                    const rowErrors = importPreview.errors.filter(e => e.row === rowNumber);
                    const hasError = rowErrors.length > 0;

                    return (
                      <tr key={idx}>
                        <td style={{ padding: "12px", background: hasError ? "rgba(239,68,68,0.05)" : t.bg, borderRadius: "10px 0 0 10px", color: t.textMuted, fontSize: "0.875rem", fontWeight: 700 }}>#{rowNumber}</td>
                        <td style={{ padding: "12px", background: hasError ? "rgba(239,68,68,0.05)" : t.bg }}>
                          <div style={{ fontWeight: 700, color: t.text, fontSize: "0.875rem" }}>
                            {importPreview.type === 'tasks' ? row.taskName : 
                             importPreview.type === 'lo' ? row.learningOpportunity :
                             importPreview.type === 'payments' ? row.paymentDescription : row.taskNamePattern}
                          </div>
                          {hasError && <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "4px", fontWeight: 500 }}>{rowErrors.map(e => e.msg).join(", ")}</div>}
                        </td>
                        <td style={{ padding: "12px", background: hasError ? "rgba(239,68,68,0.05)" : t.bg, color: t.text, fontSize: "0.875rem" }}>
                          {row.entityName || row.entity || "N/A"}
                        </td>
                        <td style={{ padding: "12px", background: hasError ? "rgba(239,68,68,0.05)" : t.bg, borderRadius: "0 10px 10px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasError ? "#ef4444" : "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                            {hasError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                            {hasError ? "INVALID" : "READY"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={{ padding: "24px 32px", borderTop: `1px solid ${t.border}`, background: t.bg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {importPreview.errors.length > 0 && (
                  <button 
                    onClick={() => downloadErrorReport()}
                    style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #ef4444", background: "white", color: "#ef4444", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem" }}
                  >
                    <Download size={16} /> Download Error Report
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <button 
                  onClick={() => setImportPreview(null)}
                  style={{ padding: "12px 24px", borderRadius: "12px", border: `1px solid ${t.border}`, background: t.card, color: t.text, fontWeight: 600, cursor: "pointer" }}
                >
                  Discard & Close
                </button>
                <button 
                  onClick={handleConfirmBulkImport}
                  disabled={isImporting}
                  style={{ padding: "12px 32px", borderRadius: "12px", border: "none", background: "#10b981", color: "white", fontWeight: 700, cursor: isImporting ? "not-allowed" : "pointer", boxShadow: "0 10px 20px -5px rgba(16, 185, 129, 0.4)", display: "flex", alignItems: "center", gap: "10px" }}
                >
                  {isImporting ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={18} />}
                  {isImporting ? "Processing..." : `Confirm & Import (${importPreview.rows.length - importPreview.errors.length} Ready)`}
                </button>
              </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
          </div>
        </div>
      )}

      {notification.type && (
        <div style={{
          position: "fixed",
          top: "36px",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10000,
          animation: "toast-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{
            background: theme === 'DARK' ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            padding: "10px 24px",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            border: `1px solid ${theme === 'DARK' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: "280px"
          }}>
            <div style={{
              background: notification.type === 'success' ? "#22c55e" : "#ef4444",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white"
            }}>
              {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            </div>
            <p style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: t.text,
              letterSpacing: "-0.01em"
            }}>
              {notification.message}
            </p>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes toast-slide-down {
              from { opacity: 0; transform: translate(-50%, -100%); }
              to { opacity: 1; transform: translate(-50%, -50%); }
            }
          `}} />
        </div>
      )}

      {confirmState.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11000
        }}>
          <div style={{
            background: theme === 'DARK' ? "rgba(30, 41, 59, 0.95)" : "white",
            padding: "32px", borderRadius: "24px", width: "400px", maxWidth: "90%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: `1px solid ${t.border}`, textAlign: "center",
            animation: "modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}>
             <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
               <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "16px" }}>
                 <AlertTriangle size={32} color="#ef4444" />
               </div>
             </div>
             <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: t.text, marginBottom: "12px" }}>Confirmation Required</h3>
             <p style={{ color: t.textMuted, fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "32px" }}>{confirmState.message}</p>
             <div style={{ display: "flex", gap: "12px" }}>
               <button 
                 onClick={() => setConfirmState({ ...confirmState, isOpen: false })}
                 style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, cursor: "pointer" }}
               >
                 Cancel
               </button>
               <button 
                 onClick={() => { confirmState.onConfirm(); setConfirmState({ ...confirmState, isOpen: false }); }}
                 style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", fontWeight: 600, cursor: "pointer" }}
               >
                 Yes, Proceed
               </button>
             </div>
          </div>
        </div>
      )}

      {promptState.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11000
        }}>
          <div style={{
            background: theme === 'DARK' ? "rgba(30, 41, 59, 0.95)" : "white",
            padding: "32px", borderRadius: "24px", width: "450px", maxWidth: "90%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: `1px solid ${t.border}`,
            animation: "modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}>
             <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: t.text, marginBottom: "12px" }}>Action Required</h3>
             <p style={{ color: t.textMuted, fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "20px" }}>{promptState.message}</p>
             
             <textarea 
               value={promptValue}
               onChange={(e) => setPromptValue(e.target.value)}
               placeholder="Provide reason here..."
               autoFocus
               style={{
                 width: "100%", height: "100px", padding: "12px", borderRadius: "12px",
                 border: `1px solid ${t.border}`, background: t.bg, color: t.text,
                 marginBottom: "24px", resize: "none", outline: "none",
                 fontSize: "0.95rem"
               }}
             />

             <div style={{ display: "flex", gap: "12px" }}>
               <button 
                 onClick={() => setPromptState({ ...promptState, isOpen: false })}
                 style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600, cursor: "pointer" }}
               >
                 Cancel
               </button>
               <button 
                 onClick={() => { promptState.onConfirm(promptValue); setPromptState({ ...promptState, isOpen: false }); }}
                 disabled={!promptValue.trim()}
                 style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "#4f46e5", color: "white", fontWeight: 600, cursor: !promptValue.trim() ? "not-allowed" : "pointer", opacity: !promptValue.trim() ? 0.6 : 1 }}
               >
                 Submit Request
               </button>
             </div>
          </div>
        </div>
      )}



      {showLogoutConfirm && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20000,
          animation: "modal-fade-in 0.2s ease-out"
        }}>
          <div style={{
            background: isDarkMode ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.9)",
            padding: "28px", borderRadius: "20px", width: "340px", maxWidth: "90%",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.3)",
            border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
            textAlign: "center",
            animation: "modal-pop-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            backdropFilter: "blur(16px)"
          }}>
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
              <div style={{ 
                background: "#fee2e2", 
                padding: "12px", borderRadius: "14px",
              }}>
                <LogOut size={24} color="#ef4444" />
              </div>
            </div>
            
            <h3 style={{ 
              fontSize: "1.25rem", fontWeight: 700, color: t.text, 
              marginBottom: "8px", letterSpacing: "-0.01em" 
            }}>Sign out?</h3>
            
            <p style={{ 
              color: t.textMuted, fontSize: "0.9rem", lineHeight: 1.5, 
              marginBottom: "24px"
            }}>You'll need to log in again to access your dashboard.</p>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ 
                  flex: 1, padding: "10px", borderRadius: "10px", 
                  border: `1px solid ${t.border}`, background: "transparent", 
                  color: t.text, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  sessionStorage.removeItem('finpulse_session_active');
                  localStorage.removeItem('finpulse_active_view');
                  localStorage.removeItem('finpulse_active_subview');
                  localStorage.removeItem('finpulse_active_mainview');
                  await fetch("/api/logout", { method: "POST", credentials: "include" });
                  document.cookie = "session-token=; path=/; max-age=0";
                  window.location.href = "/login";
                }}
                style={{ 
                  flex: 1, padding: "10px", borderRadius: "10px", border: "none", 
                  background: "#ef4444", color: "white", fontWeight: 600, 
                  cursor: "pointer", fontSize: "0.875rem"
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modal-pop-up { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}} />
        </div>
      )}

      {/* Acknowledgment Modal */}
      {showAckModal && acknowledgingLO && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "24px", width: "100%", maxWidth: "550px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "32px", background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", color: "white" }}>
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Acknowledge Learning</h3>
              <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: "0.9375rem" }}>Confirm your understanding of the finding and the resolution provided.</p>
            </div>
            
            <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ padding: "20px", background: t.bg, borderRadius: "16px", border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: "8px" }}>Finding</div>
                <div style={{ fontSize: "0.9375rem", color: t.text, fontWeight: 500 }}>{acknowledgingLO.learningOpportunity}</div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.8125rem", fontWeight: 700, color: t.text, textTransform: "uppercase" }}>Your Understanding & Resolution Plan</label>
                <textarea 
                  rows={4}
                  placeholder="Explain how you have resolved this or what you learned to avoid this in future..."
                  value={ackComments}
                  onChange={e => setAckComments(e.target.value)}
                  style={{ ...getInputStyle(t), resize: "none", fontSize: "0.9375rem", padding: "16px" }}
                />
                <p style={{ margin: "8px 0 0 0", fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>* Note: Once submitted, this acknowledgment cannot be edited.</p>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={() => setShowAckModal(false)}
                  style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 700, cursor: "pointer" }}
                >
                  Go Back
                </button>
                <button 
                  onClick={handleAcknowledgeLO}
                  disabled={!ackComments.trim()}
                  style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "none", background: "#4f46e5", color: "white", fontWeight: 700, cursor: !ackComments.trim() ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)" }}
                >
                  Submit Acknowledgment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Upload Modal */}
      {showResourceModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "24px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Add New Resource</h3>
            </div>
            
            <form onSubmit={handleResourceUpload} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>RESOURCE NAME / BOOK TITLE</label>
                <input 
                  type="text" required
                  value={resourceName}
                  onChange={e => setResourceName(e.target.value)}
                  style={getInputStyle(t)} 
                  placeholder="e.g. Finance Reporting Best Practices"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>CATEGORY / SUBJECT</label>
                <select 
                  value={resourceCategory}
                  onChange={e => { setResourceCategory(e.target.value); setResourceSubfolderId(""); }}
                  style={getInputStyle(t)}
                >
                  {settings.masterResourceCategories?.split(',').map(c => c.trim()).filter(Boolean).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>SUBFOLDER (OPTIONAL)</label>
                <select 
                  value={resourceSubfolderId}
                  onChange={e => setResourceSubfolderId(e.target.value)}
                  style={getInputStyle(t)}
                >
                  <option value="">-- No Subfolder (Direct in Category) --</option>
                  {subfolders.filter(f => f.category === resourceCategory).map(sf => (
                    <option key={sf.id} value={sf.id}>{sf.name}</option>
                  ))}
                  <option value="NEW">+ Create New Subfolder...</option>
                </select>
              </div>

              {resourceSubfolderId === "NEW" && (
                <div style={{ animation: "slideDown 0.2s ease-out" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>NEW SUBFOLDER NAME</label>
                  <input 
                    type="text"
                    value={newSubfolderName}
                    onChange={e => setNewSubfolderName(e.target.value)}
                    style={getInputStyle(t)}
                    placeholder="Enter folder name..."
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>TYPE</label>
                <div style={{ display: "flex", gap: "12px" }}>
                  {['LINK', 'FILE'].map(type => (
                    <button 
                      key={type} type="button"
                      onClick={() => setResourceType(type as any)}
                      style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `1px solid ${resourceType === type ? '#10b981' : t.border}`, background: resourceType === type ? '#ecfdf5' : t.bg, color: resourceType === type ? '#059669' : t.textMuted, fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
                    >
                      {type === 'LINK' ? 'External Link' : 'Upload File'}
                    </button>
                  ))}
                </div>
              </div>

              {resourceType === 'LINK' ? (
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>URL / LINK</label>
                  <input 
                    type="url" required
                    value={resourceLink}
                    onChange={e => setResourceLink(e.target.value)}
                    style={getInputStyle(t)} 
                    placeholder="https://example.com/book-name"
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>SELECT FILE</label>
                    <input 
                      type="file" required
                      onChange={e => setResourceFile(e.target.files?.[0] || null)}
                      style={{ ...getInputStyle(t), padding: "8px" }} 
                    />
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.65rem", color: t.textMuted }}>Supported: All Formats - PPT, Excel, Word, PDF, etc. (Max 3.5MB)</p>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setShowResourceModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={resourcesLoading} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#10b981", color: "white", fontWeight: 600, cursor: resourcesLoading ? "not-allowed" : "pointer" }}>
                  {resourcesLoading ? "Uploading..." : "Save Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: t.card, borderRadius: "16px", width: "100%", maxWidth: "450px", border: `1px solid ${t.border}`, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }} className="animate-fade-in-up">
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", background: "#dcfce7", borderRadius: "10px" }}>
                  <UserPlus size={20} color="#166534" />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.125rem", color: t.text }}>Add New Employee</h3>
              </div>
              <button onClick={() => setShowAddEmployeeModal(false)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddEmployee} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>EMPLOYEE ID</label>
                <input 
                  type="text" required
                  value={newEmployeeData.employeeId}
                  onChange={e => setNewEmployeeData({...newEmployeeData, employeeId: e.target.value.replace(/\D/g, '')})}
                  style={getInputStyle(t)} 
                  placeholder="e.g. 123456"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>FULL NAME</label>
                <input 
                  type="text" required
                  value={newEmployeeData.name}
                  onChange={e => setNewEmployeeData({...newEmployeeData, name: e.target.value})}
                  style={getInputStyle(t)} 
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>EMAIL ADDRESS</label>
                <input 
                  type="email" required
                  value={newEmployeeData.email}
                  onChange={e => setNewEmployeeData({...newEmployeeData, email: e.target.value})}
                  style={getInputStyle(t)} 
                  placeholder="e.g. john@intellicar.in"
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>DEPARTMENT</label>
                  <select 
                    required
                    value={newEmployeeData.department}
                    onChange={e => setNewEmployeeData({...newEmployeeData, department: e.target.value})}
                    style={getInputStyle(t)}
                  >
                    <option value="">Select Dept</option>
                    {settings.masterDepartments.split(',').filter(d => d.trim()).map(dept => (
                      <option key={dept.trim()} value={dept.trim()}>{dept.trim()}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>ROLE</label>
                  <select 
                    required
                    value={newEmployeeData.role}
                    onChange={e => setNewEmployeeData({...newEmployeeData, role: e.target.value})}
                    style={getInputStyle(t)}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>

              <div style={{ background: "#fef9c3", padding: "12px", borderRadius: "10px", border: "1px solid #fde047", marginTop: "4px" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#854d0e", fontWeight: 500 }}>
                  <Key size={12} style={{ marginRight: "4px" }} /> Default password will be <strong>Intellicar@123</strong>
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowAddEmployeeModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={isAddingEmployee} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#10b981", color: "white", fontWeight: 600, cursor: isAddingEmployee ? "not-allowed" : "pointer" }}>
                  {isAddingEmployee ? "Creating..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subfolder Modal */}
      {showAddSubfolderModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "24px" }}>
          <div style={{ background: t.card, borderRadius: "24px", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", background: "#4f46e5", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Add Folder in {currentLibraryPath}</h3>
              <button onClick={() => setShowAddSubfolderModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 700, color: t.textMuted }}>FOLDER NAME</label>
              <input 
                type="text"
                value={newSubfolderName}
                onChange={e => setNewSubfolderName(e.target.value)}
                style={getInputStyle(t)}
                placeholder="e.g. FY 2024-25"
                autoFocus
              />
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button onClick={() => setShowAddSubfolderModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 600 }}>Cancel</button>
                <button 
                  onClick={async () => {
                    if (currentLibraryPath) {
                      const res = await handleCreateSubfolder(newSubfolderName, currentLibraryPath);
                      if (res) {
                        setShowAddSubfolderModal(false);
                        setNewSubfolderName("");
                        showNotification("Folder created successfully!");
                      }
                    }
                  }} 
                  disabled={isAddingSubfolder || !newSubfolderName.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", background: "#4f46e5", color: "white", fontWeight: 600, cursor: (isAddingSubfolder || !newSubfolderName.trim()) ? "not-allowed" : "pointer" }}
                >
                  {isAddingSubfolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTaskForView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", padding: "24px" }}>
          <div style={{ background: "white", width: "100%", maxWidth: "800px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "12px", color: "#2563eb" }}>
                  <Eye size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>Task Details</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>{selectedTaskForView.displayId || `#${selectedTaskForView.id}`}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTaskForView(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", borderRadius: "10px" }} className="hover-bg-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: "32px", maxHeight: "70vh", overflowY: "auto" }} className="custom-scrollbar">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.05em" }}>Task Name</label>
                  <div style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#1e293b", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", lineHeight: 1.5 }}>
                    {selectedTaskForView.taskName}
                  </div>
                </div>
                
                <DetailItemView label="Entity" value={selectedTaskForView.entityName} />
                <DetailItemView label="Department" value={selectedTaskForView.departmentName} />
                <DetailItemView label="Task Type" value={selectedTaskForView.taskType} />
                <DetailItemView label="Frequency" value={selectedTaskForView.frequency || "Ad-hoc"} />
                <DetailItemView label="Owner" value={selectedTaskForView.ownerName} />
                <DetailItemView label="Reviewer" value={selectedTaskForView.reviewerName || "N/A"} />
                <DetailItemView label="Due Date" value={selectedTaskForView.dueDate ? formatDate(selectedTaskForView.dueDate) : "N/A"} />
                <DetailItemView label="Mail Sub" value={selectedTaskForView.mailLink || "N/A"} />
                <DetailItemView label="Created At" value={formatDateTime(selectedTaskForView.createdAt)} />
                
                <div style={{ gridColumn: "span 1" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Task Status</label>
                  <div style={{ display: "inline-flex", padding: "6px 12px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: "0.875rem" }}>
                    {selectedTaskForView.taskStatus}
                  </div>
                </div>
                
                <div style={{ gridColumn: "span 1" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Review Status</label>
                  <div style={{ display: "inline-flex", padding: "6px 12px", borderRadius: "8px", background: "#f5f3ff", color: "#7c3aed", fontWeight: 700, fontSize: "0.875rem" }}>
                    {selectedTaskForView.reviewStatus}
                  </div>
                </div>

                <DetailItemView label="Completion Date" value={selectedTaskForView.completionDate ? formatDate(selectedTaskForView.completionDate) : "Pending"} />
                <DetailItemView label="Review Completion" value={selectedTaskForView.reviewCompletionDate ? formatDate(selectedTaskForView.reviewCompletionDate) : "Pending"} />
                
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Owner Comments</label>
                  <div style={{ fontSize: "0.9375rem", color: "#475569", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", minHeight: "60px" }}>
                    {selectedTaskForView.ownerComments || "No comments added."}
                  </div>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Reviewer Comments</label>
                  <div style={{ fontSize: "0.9375rem", color: "#475569", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", minHeight: "60px" }}>
                    {selectedTaskForView.reviewerComments || "No comments added."}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", textAlign: "right", background: "#f8fafc" }}>
              <button 
                onClick={() => setSelectedTaskForView(null)}
                style={{ padding: "10px 24px", background: "#2563eb", border: "none", color: "white", borderRadius: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View: External Request Details */}
      {selectedExternalReqForView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", padding: "24px" }}>
          <div style={{ background: "white", width: "100%", maxWidth: "700px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "12px", color: "#16a34a" }}>
                  <Eye size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>Shared Request Details</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>External Interaction</span>
                </div>
              </div>
              <button onClick={() => setSelectedExternalReqForView(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", borderRadius: "10px" }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: "32px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>What is Needed</label>
                  <div style={{ fontSize: "1rem", color: "#1e293b", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", lineHeight: 1.5 }}>
                    {selectedExternalReqForView.requirement}
                  </div>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Reason for Request</label>
                  <div style={{ fontSize: "0.9375rem", color: "#475569", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", minHeight: "60px" }}>
                    {selectedExternalReqForView.reason}
                  </div>
                </div>
                
                <DetailItemView label="From Department" value={selectedExternalReqForView.fromDepartment} />
                <DetailItemView label="To Department" value={selectedExternalReqForView.toDepartment} />
                <DetailItemView label="Raised By" value={selectedExternalReqForView.raisedBy} />
                <DetailItemView label="Current Owner" value={selectedExternalReqForView.currentOwner || "Unassigned"} />
                <DetailItemView label="Timeline" value={selectedExternalReqForView.timeline} />
                <DetailItemView label="Status" value={selectedExternalReqForView.status} />
              </div>
            </div>
            
            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", textAlign: "right", background: "#f8fafc" }}>
              <button onClick={() => setSelectedExternalReqForView(null)} style={{ padding: "10px 24px", background: "#2563eb", border: "none", color: "white", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View: Learning Opportunity Details */}
      {selectedLOForView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)", padding: "24px" }}>
          <div style={{ background: "white", width: "100%", maxWidth: "700px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "#fff7ed", padding: "10px", borderRadius: "12px", color: "#ea580c" }}>
                  <Eye size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>LO Hub Detail</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>Learning Opportunity</span>
                </div>
              </div>
              <button onClick={() => setSelectedLOForView(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", borderRadius: "10px" }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: "32px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Finding / Opportunity</label>
                  <div style={{ fontSize: "1rem", color: "#1e293b", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", lineHeight: 1.5 }}>
                    {selectedLOForView.learningOpportunity}
                  </div>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Resolution Plan</label>
                  <div style={{ fontSize: "0.9375rem", color: "#475569", background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", minHeight: "60px" }}>
                    {selectedLOForView.resolutionPlan || "No resolution plan provided yet."}
                  </div>
                </div>
                
                <DetailItemView label="Source Task" value={selectedLOForView.sourceTaskName} />
                <DetailItemView label="Owner" value={selectedLOForView.ownerName} />
                <DetailItemView label="Status" value={selectedLOForView.status} />
                <DetailItemView label="Raised Date" value={formatDate(selectedLOForView.createdAt)} />
                
                {selectedLOForView.ackBy && (
                  <>
                    <DetailItemView label="Acknowledged By" value={selectedLOForView.ackBy} />
                    <DetailItemView label="Ack Date" value={formatDate(selectedLOForView.ackAt!)} />
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Ack Comments</label>
                      <div style={{ fontSize: "0.9375rem", color: "#475569", background: "#f0f9ff", padding: "16px", borderRadius: "16px", border: "1px solid #e0f2fe" }}>
                        {selectedLOForView.ackComments}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div style={{ padding: "24px 32px", borderTop: "1px solid #f1f5f9", textAlign: "right", background: "#f8fafc" }}>
              <button onClick={() => setSelectedLOForView(null)} style={{ padding: "10px 24px", background: "#2563eb", border: "none", color: "white", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showProcessingModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "550px", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", animation: "modal-in 0.3s ease-out" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={24} color="#10b981" />
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Mark as Processed</h2>
              </div>
              <button onClick={() => setShowProcessingModal(false)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Mode of Communication <span style={{ color: "#ef4444" }}>*</span></label>
                <select 
                  value={processingMode}
                  onChange={(e) => setProcessingMode(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }}
                >
                  <option value="">Select Mode</option>
                  {settings.masterCommunicationModes.split(',').map(m => (
                    <option key={m.trim()} value={m.trim()}>{m.trim()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>
                  Mail Subject {processingMode.toLowerCase() === 'email' && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <Mail size={16} color="#94a3b8" />
                  <input 
                    type="text"
                    placeholder={processingMode.toLowerCase() === 'email' ? "Enter email subject line (Mandatory)..." : "Enter mail subject (Optional)..."}
                    value={processingMailLink}
                    onChange={(e) => setProcessingMailLink(e.target.value)}
                    style={{ flex: 1, border: "none", outline: "none", fontSize: "0.875rem" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Attachments (Max 5, 3.5MB each)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  {processingAttachments.map((file, idx) => (
                    <div key={file.id || idx} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem" }}>
                          <FileText size={14} color="#64748b" />
                          <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{file.name}</span>
                          {!file.isLoaded && <span style={{ color: "#2563eb", fontWeight: 700 }}>{file.progress}%</span>}
                        </div>
                        <button onClick={() => setProcessingAttachments(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {!file.isLoaded && (
                        <div style={{ width: "100%", height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${file.progress}%`, height: "100%", background: "#2563eb", transition: "width 0.2s" }} />
                        </div>
                      )}
                    </div>
                  ))}
                  {processingAttachments.length < 5 && (
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: "#f0fdf4", border: "1px dashed #22c55e", borderRadius: "6px", color: "#166534", fontSize: "0.75rem", cursor: "pointer" }}>
                      <Paperclip size={14} />
                      Attach
                      <input type="file" multiple onChange={handleFileUpload} style={{ display: "none" }} />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowProcessingModal(false)} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button 
                onClick={handleFinalizeProcessing}
                disabled={isProcessing || processingAttachments.some(att => !att.isLoaded)}
                style={{ 
                  padding: "10px 20px", 
                  borderRadius: "8px", 
                  border: "none", 
                  background: (isProcessing || processingAttachments.some(att => !att.isLoaded)) ? "#94a3b8" : "#10b981", 
                  color: "white", 
                  fontWeight: 700, 
                  cursor: (isProcessing || processingAttachments.some(att => !att.isLoaded)) ? "not-allowed" : "pointer", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px" 
                }}
              >
                {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isProcessing ? "Processing..." : processingAttachments.some(att => !att.isLoaded) ? "Loading Files..." : "Submit Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processed Details View Modal */}
      {viewingProcessedTask && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", width: "100%", maxWidth: "600px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", position: "relative" }} className="animate-fade-in-up">
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <Eye size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#1e293b" }}>Processing Details</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{viewingProcessedTask.taskName}</p>
                </div>
              </div>
              <button onClick={() => { setViewingProcessedTask(null); setProcessedDetails(null); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}><X size={20} /></button>
            </div>

            <div style={{ padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>
              {!processedDetails ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <RefreshCw size={32} className="animate-spin" style={{ color: "#4f46e5", margin: "0 auto 16px" }} />
                  <p style={{ color: "#64748b" }}>Loading details...</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Basic Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Mode</label>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{processedDetails.task.processedMode || "Not Specified"}</span>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Date</label>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{processedDetails.task.processedSubmissionAt ? formatDateTime(processedDetails.task.processedSubmissionAt) : "--"}</span>
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Processed By</label>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{processedDetails.task.processedBy || "Unknown"}</span>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#475569", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Paperclip size={16} /> Attachments
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {processedDetails.task.processedAttachments && processedDetails.task.processedAttachments.length > 0 ? (
                        processedDetails.task.processedAttachments.map((att: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", transition: "all 0.2s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                              <div style={{ padding: "8px", background: "#f1f5f9", borderRadius: "8px" }}>
                                <FileText size={16} color="#64748b" />
                              </div>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name || "Document"}</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => window.open(att.url, '_blank')} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Download size={14} /> View
                              </button>
                              {isAdmin && (
                                <button 
                                  onClick={() => handleDeleteProcessedAttachment(processedDetails.task, att)}
                                  disabled={isUpdatingProcessed}
                                  style={{ padding: "6px", borderRadius: "8px", border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer" }}
                                >
                                  {isUpdatingProcessed ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "0.875rem", color: "#94a3b8", textAlign: "center", fontStyle: "italic" }}>No attachments found.</p>
                      )}
                    </div>
                  </div>

                  {/* Audit History */}
                  <div>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#475569", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Clock size={16} /> History & Audit Trail
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "12px", borderLeft: "2px solid #f1f5f9" }}>
                      {processedDetails.auditLogs && processedDetails.auditLogs.length > 0 ? (
                        processedDetails.auditLogs.map((log: any, idx: number) => (
                          <div key={idx} style={{ position: "relative" }}>
                            <div style={{ position: "absolute", left: "-17px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#4f46e5", border: "2px solid white" }} />
                            <div style={{ fontSize: "0.8125rem", color: "#1e293b", fontWeight: 600 }}>{log.action.replace(/_/g, ' ')}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{log.details}</div>
                            <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "4px", fontWeight: 600 }}>{log.performedBy} • {formatDateTime(log.createdAt)}</div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "0.8125rem", color: "#94a3b8", fontStyle: "italic" }}>No specific audit entries found yet.</p>
                      )}
                      {/* Initial Processing Log */}
                      {processedDetails.task.processedSubmissionAt && (
                        <div style={{ position: "relative" }}>
                          <div style={{ position: "absolute", left: "-17px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", border: "2px solid white" }} />
                          <div style={{ fontSize: "0.8125rem", color: "#1e293b", fontWeight: 600 }}>TASK PROCESSED</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Task was marked as processed.</div>
                          <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "4px", fontWeight: 600 }}>{processedDetails.task.processedBy} • {formatDateTime(processedDetails.task.processedSubmissionAt)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Revert Action */}
                  {isAdmin && (
                    <div style={{ marginTop: "8px", padding: "16px", background: "#fff1f2", borderRadius: "16px", border: "1px solid #ffe4e6" }}>
                      <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#9f1239", margin: "0 0 8px 0" }}>Danger Zone</h4>
                      <p style={{ fontSize: "0.75rem", color: "#be123c", margin: "0 0 12px 0" }}>If this task was processed by mistake, you can revert it. This will reset the status to Pending and clear all processing data.</p>
                      <button 
                        onClick={() => handleRevertProcessedStatus(processedDetails.task)}
                        disabled={isUpdatingProcessed}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#ef4444", color: "white", fontWeight: 700, fontSize: "0.8125rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                      >
                        {isUpdatingProcessed ? <RefreshCw size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        Revert Processed Status
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
  </div>
</div>
  );
}

// Subcomponents

function MetricCard({ title, value, icon, bg, isActive, onClick, t }: { title: string, value: number, icon: any, bg: string, isActive?: boolean, onClick?: () => void, t: any }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        background: t.card, 
        padding: "16px", 
        borderRadius: "12px", 
        border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0", 
        boxShadow: isActive ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "0 1px 3px 0 rgb(0 0 0 / 0.1)", 
        display: "flex", 
        alignItems: "center", 
        gap: "12px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s"
      }}
    >
      <div style={{ background: bg, padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: "0 0 2px 0", fontSize: "0.8rem", color: t.textMuted, fontWeight: 500 }}>{title}</p>
        <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: t.text, letterSpacing: "-0.025em" }}>{value}</p>
      </div>
    </div>
  );
}

const DetailItemView = ({ label, value }: { label: string; value: string }) => (
  <div style={{ gridColumn: "span 1" }}>
    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.05em" }}>{label}</label>
    <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#1e293b" }}>
      {value}
    </div>
  </div>
);

function StatusPill({ 
  status, type, taskId, onUpdate, disabled, t, trackingStatus, dueDate, completionDate 
}: { 
  status: string, type: "task" | "review", taskId: number, onUpdate: any, disabled?: boolean, t: any, 
  trackingStatus?: string, dueDate?: any, completionDate?: any 
}) {
  // Recalculate tracking status locally for real-time accuracy and fallback
  const effectiveTrackingStatus = trackingStatus || (type === "task" ? getTrackingStatus({ taskStatus: status, dueDate, completionDate }) : null);

  let bg = "#f1f5f9";
  let color = "#475569";

  const isCompleted = status === "Completed" || COMPLETION_STATUSES.includes(status) || (type === "task" && !!trackingStatus && COMPLETION_STATUSES.includes(trackingStatus));

  if (isCompleted) {
    bg = "#dcfce7";
    color = "#166534";
  } else if (effectiveTrackingStatus === "Over Due") {
    bg = "#fee2e2";
    color = "#b91c1c";
  } else if (effectiveTrackingStatus === "Due on Today") {
    bg = "#fff7ed";
    color = "#c2410c";
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
    whiteSpace: "nowrap",
    border: "none",
    outline: "none",
    appearance: "none" as const,
    cursor: type === "task" && !disabled ? "pointer" : disabled ? "not-allowed" : "default",
  };

  if (type === "task") {
    const selectValue = isCompleted ? "Completed" : (status === "In Progress" ? "In Progress" : "Pending");
    const displayLabel = effectiveTrackingStatus || status;

    if (disabled) {
      return <span style={pillStyle}>{displayLabel}</span>;
    }

    return (
      <select 
        value={selectValue} 
        onChange={(e) => onUpdate(taskId, "taskStatus", e.target.value)}
        style={pillStyle}
      >
        <option value="Pending">{(!isCompleted && effectiveTrackingStatus) ? effectiveTrackingStatus : "Pending"}</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">{isCompleted ? (effectiveTrackingStatus || "Completed") : "Completed"}</option>
      </select>
    );
  }

  return <span style={pillStyle}>{status}</span>;
}

// Styles

const getThStyle = (t: any) => ({
  background: "#1e293b",
  color: "#ffffff",
  padding: "14px 24px",
  fontWeight: 700,
  fontSize: "0.7rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  borderBottom: "2px solid #3b82f6",
  whiteSpace: "nowrap" as const,
});

const getTdStyle = (t: any) => ({
  padding: "16px 24px",
  verticalAlign: "middle" as const,
});

const getInputStyle = (t: any) => ({
  width: "100%", 
  border: `1px solid ${t.border}`, 
  borderRadius: "6px", 
  padding: "8px 12px", 
  fontSize: "0.875rem", 
  outline: "none", 
  boxShadow: "0 0 0 2px rgba(59,130,246,0.2)",
  fontFamily: "inherit"
});

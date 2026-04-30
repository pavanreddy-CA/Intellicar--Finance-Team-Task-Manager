"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, Calendar, Users, Briefcase, Filter, Search, ChevronRight, ListChecks, StopCircle, Download, Share2, FileText, Table as TableIcon, Eye, EyeOff, ArrowUp, ArrowDown, ChevronDown, Mail, X, FileSpreadsheet, Send } from "lucide-react";
import { resolveTaskName, getPeriodKey, isWithinLeadTime, FREQUENCIES, Frequency, getOccurrencesBetween } from "@/lib/recurringUtils";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RecurringTemplate = {
  id: number;
  taskNamePattern: string;
  entityName: string;
  taskType: string;
  departmentName: string;
  financeFunction: string | null;
  frequency: Frequency;
  dayOffset: number;
  monthOffset: number;
  defaultOwner: string | null;
  defaultReviewer: string | null;
  isActive: boolean;
  lastGeneratedPeriod: string | null;
  endDate: string | null;
  stopDate: string | null;
  isStopped: boolean;
  weeklyDay: string | null;
  excludedDates: string[] | null;
  startDate: string | null;
  freqLabel: string | null;
};

type StagingTask = {
  templateId: number;
  taskName: string;
  entityName: string;
  taskType: string;
  departmentName: string;
  financeFunction: string | null;
  frequency: Frequency;
  periodKey: string;
  dueDate: string;
  ownerName: string;
  reviewerName: string;
  isReady: boolean;
  isConverted?: boolean;
  convertedTaskId?: number;
  freqLabel?: string | null;
};

export default function RecurringActivities({   settings, usersList = [] , showNotification , showConfirm, showPrompt }: { settings: any; usersList: any[] ; showNotification: any;  showConfirm: any; showPrompt: any; }) {
  const [activeSubTab, setActiveSubTab] = useState<'STAGING' | 'MASTER' | 'D'>('STAGING');
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [stagingTasks, setStagingTasks] = useState<StagingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [bulkAssign, setBulkAssign] = useState({ owner: "", reviewer: "", dueDate: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  
  // Advanced Filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateFilter, setDateFilter] = useState({ 
    from: formatDate(firstDay), 
    to: formatDate(lastDay) 
  });
  const [freqFilter, setFreqFilter] = useState<string>("ALL");
  const [showConverted, setShowConverted] = useState(true);
  const [searchStaging, setSearchStaging] = useState("");
  const [entityFilterStaging, setEntityFilterStaging] = useState("ALL");
  const [searchMaster, setSearchMaster] = useState("");
  const [stagingSortConfig, setStagingSortConfig] = useState<{ key: keyof StagingTask; direction: 'asc' | 'desc' } | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState({
    recipients: [] as string[],
    cc: [] as string[],
    subject: "Recurring Task Conversion Report",
    format: "excel" as "excel" | "pdf" | "both",
    recipientInput: "",
    ccInput: ""
  });
  const [showMasterDownloadDropdown, setShowMasterDownloadDropdown] = useState(false);
  const [shareMode, setShareMode] = useState<'STAGING' | 'MASTER'>('STAGING');

  // Daily Tasks State
  const [dailyDateFilter, setDailyDateFilter] = useState({ 
    from: formatDate(firstDay), 
    to: formatDate(lastDay) 
  });
  const [dailySearch, setDailySearch] = useState("");
  const [dailyOwnerFilter, setDailyOwnerFilter] = useState("ALL");
  const [dailyCompletionData, setDailyCompletionData] = useState<any[]>([]);
  const [selectedDailyOccs, setSelectedDailyOccs] = useState<string[]>([]);
  const [dailyDownloadMenu, setDailyDownloadMenu] = useState(false);
  const [dailyShareModal, setDailyShareModal] = useState(false);
  const [dailySortConfig, setDailySortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'targetDate', direction: 'desc' });

  const handleDailySort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (dailySortConfig.key === key && dailySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setDailySortConfig({ key, direction });
  };

  const [templateForm, setTemplateForm] = useState<Partial<RecurringTemplate>>({
    taskNamePattern: "",
    entityName: "",
    taskType: "External",
    departmentName: "Finance",
    financeFunction: "",
    frequency: "M" as Frequency,
    dayOffset: 1,
    monthOffset: 0,
    defaultOwner: "",
    defaultReviewer: "",
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    freqLabel: ""
  });

  const financeUsers = usersList.filter(u => u.department === 'Finance' && u.isApproved !== false);

  useEffect(() => {
    fetchTemplates();
    if (activeSubTab === 'D') fetchDailyData();
  }, [dateFilter, freqFilter, showConverted, activeSubTab, dailyDateFilter]);

  const fetchDailyData = async () => {
    try {
      const res = await fetch(`/api/daily-tasks?from=${dailyDateFilter.from}&to=${dailyDateFilter.to}`);
      if (res.ok) {
        setDailyCompletionData(await res.json());
      }
    } catch (err) {
      console.error("Fetch daily data error:", err);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // 1. Fetch Templates
      const tRes = await fetch("/api/recurring-templates");
      const allTemplates: RecurringTemplate[] = await tRes.json();
      setTemplates(allTemplates);

      // 2. Fetch Existing Tasks (to find converted ones)
      const tasksRes = await fetch("/api/tasks");
      const allTasks: any[] = await tasksRes.json();
      const recurringTasks = allTasks.filter(t => t.templateId !== null);

      generateStagingTasks(allTemplates, recurringTasks);
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateStagingTasks = (allTemplates: RecurringTemplate[], existingTasks: any[]) => {
    const staging: StagingTask[] = [];
    const searchStart = new Date(dateFilter.from);
    const searchEnd = new Date(dateFilter.to);
    
    allTemplates.filter(t => t.isActive && !t.isStopped && t.frequency !== 'D').forEach(t => {
      // Apply frequency filter
      if (freqFilter !== "ALL" && t.frequency !== freqFilter) return;

      const occurrences = getOccurrencesBetween(t, searchStart, searchEnd);
      
      occurrences.forEach(occ => {
        // Check if this occurrence already exists in the Task table
        const converted = existingTasks.find(et => 
            Number(et.templateId) === Number(t.id) && 
            et.periodKey === occ.periodKey &&
            et.entityName === t.entityName
        );

        if (converted) {
          if (!showConverted) return; // Skip if user doesn't want to see history
          
          staging.push({
            templateId: t.id,
            taskName: converted.taskName,
            entityName: converted.entityName,
            taskType: converted.taskType,
            departmentName: converted.departmentName,
            financeFunction: converted.financeFunction,
            frequency: t.frequency,
            periodKey: occ.periodKey,
            dueDate: converted.dueDate ? new Date(converted.dueDate).toISOString().split('T')[0] : "",
            ownerName: converted.ownerName,
            reviewerName: converted.reviewerName,
            isReady: true,
            isConverted: true,
            convertedTaskId: converted.id,
            freqLabel: converted.frequency || t.freqLabel
          });
        } else {
          // It's a pending task
          const dueDate = new Date(occ.date);
          // Only apply dayOffset override for monthly/longer frequencies
          if (['M', 'Q', 'H', 'Y', '2Y'].includes(t.frequency)) {
            dueDate.setDate(t.dayOffset || 1);
          }

          staging.push({
            templateId: t.id,
            taskName: resolveTaskName(t.taskNamePattern, occ.date),
            entityName: t.entityName,
            taskType: t.taskType,
            departmentName: t.departmentName || "Finance",
            financeFunction: t.financeFunction,
            frequency: t.frequency,
            periodKey: occ.periodKey,
            dueDate: dueDate.toISOString().split('T')[0],
            ownerName: t.defaultOwner || "",
            reviewerName: t.defaultReviewer || "",
            isReady: !!t.defaultOwner,
            isConverted: false,
            freqLabel: t.freqLabel
          });
        }
      });
    });

    // Sort: Converted at bottom, otherwise by due date
    staging.sort((a, b) => {
        if (a.isConverted !== b.isConverted) return a.isConverted ? 1 : -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    setStagingTasks(staging);
  };

  const handleDismissOccurrence = async (templateId: number, periodKey: string) => {
    showConfirm("Are you sure you want to dismiss this occurrence? It will no longer show in the pending list.", async () => {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const excluded = Array.isArray(template.excludedDates) ? [...template.excludedDates] : [];
      if (!excluded.includes(periodKey)) {
          excluded.push(periodKey);
      }

      try {
          await fetch(`/api/recurring-templates/${templateId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ excludedDates: excluded })
          });
          fetchTemplates();
          showNotification("Occurrence dismissed.");
      } catch (err) {
          console.error("Dismiss error:", err);
      }
    });
  };

  const handleBulkApply = () => {
    const updated = [...stagingTasks];
    selectedTasks.forEach(idx => {
      if (updated[idx].isConverted) return;
      if (bulkAssign.owner) updated[idx].ownerName = bulkAssign.owner;
      if (bulkAssign.reviewer) updated[idx].reviewerName = bulkAssign.reviewer;
      if (bulkAssign.dueDate) updated[idx].dueDate = bulkAssign.dueDate;
      updated[idx].isReady = !!updated[idx].ownerName;
    });
    setStagingTasks(updated);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.taskNamePattern || !templateForm.entityName) {
      showNotification("Please fill all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const url = editingTemplate ? `/api/recurring-templates/${editingTemplate.id}` : "/api/recurring-templates";
      const method = editingTemplate ? "PATCH" : "POST";
      
      // Clean dates to avoid "Invalid Date" errors
      const submissionData = {
        ...templateForm,
        startDate: templateForm.startDate || null,
        endDate: templateForm.endDate || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        setShowTemplateForm(false);
        setEditingTemplate(null);
        fetchTemplates();
        alert(editingTemplate ? "Rule updated successfully!" : "Recurring rule created successfully!");
      } else {
        const err = await res.json();
        showNotification(`Failed to save: ${err.error || 'Unknown error'}\n\nDetails: ${err.details || 'No details available'}`);
      }
    } catch (err) {
      console.error("Save template error:", err);
      showNotification("A network error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStopTemplate = async (id: number) => {
    showPrompt("Enter the effective Stop Date (YYYY-MM-DD):", async (stopDate: string) => {
      try {
        await fetch(`/api/recurring-templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isStopped: true, stopDate: stopDate, isActive: false })
        });
        fetchTemplates();
        showNotification("Template stopped successfully.");
      } catch (err) {
        console.error("Stop error:", err);
      }
    }, new Date().toISOString().split('T')[0]);
  };

  const handleDeleteTemplate = async (id: number) => {
    showConfirm("Are you sure you want to delete this template?", async () => {
      try {
        await fetch(`/api/recurring-templates/${id}`, { method: "DELETE" });
        fetchTemplates();
        showNotification("Template deleted successfully.");
      } catch (err) {
        console.error("Delete template error:", err);
      }
    });
  };

  const handleGenerateTasks = async () => {
    const tasksToPost = stagingTasks.filter((_, idx) => selectedTasks.includes(idx) && _.isReady && !_.isConverted);
    if (tasksToPost.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/recurring-tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksToPost })
      });
      fetchTemplates();
      setSelectedTasks([]);
    } catch (err) {
      showNotification("Failed to generate tasks");
    } finally {
      setLoading(false);
    }
  };

  const openEditTemplate = (t: RecurringTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({
        ...t,
        startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : "",
        endDate: t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : "",
        taskType: t.taskType || "External"
    });
    setShowTemplateForm(true);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Recurring Conversion Report');
    
    worksheet.columns = [
      { header: 'Entity', key: 'entityName', width: 25 },
      { header: 'Task Name', key: 'taskName', width: 40 },
      { header: 'Function', key: 'financeFunction', width: 20 },
      { header: 'Frequency', key: 'frequency', width: 15 },
      { header: 'Period', key: 'periodKey', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Owner', key: 'ownerName', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    stagingTasks.forEach(task => {
      worksheet.addRow({
        ...task,
        status: task.isConverted ? 'CONVERTED' : 'PENDING'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Recurring_Report_${dateFilter.from}_to_${dateFilter.to}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(`Recurring Task Conversion Report (${dateFilter.from} to ${dateFilter.to})`, 14, 15);
    
    const tableData = stagingTasks.map(t => [
      t.entityName,
      t.taskName,
      t.financeFunction || '--',
      t.frequency,
      t.periodKey,
      t.dueDate,
      t.ownerName,
      t.isConverted ? 'CONVERTED' : 'PENDING'
    ]);

    autoTable(doc, {
      head: [['Entity', 'Task Name', 'Function', 'Freq', 'Period', 'Due Date', 'Owner', 'Status']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' }
    });

    doc.save(`Recurring_Report_${dateFilter.from}.pdf`);
  };

  const handleShare = () => {
    setShareData({
        ...shareData,
        subject: `Recurring Task Conversion Report (${dateFilter.from} to ${dateFilter.to})`,
        format: "excel"
    });
    setShowShareModal(true);
  };

  const handleShareViaEmail = async () => {
    if (shareData.recipients.length === 0) {
      showNotification("Please add at least one recipient email.");
      return;
    }
    setShareLoading(true);
    try {
      let buffer: ArrayBuffer | Uint8Array;
      let contentType = "";
      let attachmentName = "";

      if (shareData.format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Recurring Report');
        worksheet.columns = [
          { header: 'Entity', key: 'entityName', width: 25 },
          { header: 'Task Name', key: 'taskName', width: 40 },
          { header: 'Function', key: 'financeFunction', width: 20 },
          { header: 'Frequency', key: 'frequency', width: 15 },
          { header: 'Period', key: 'periodKey', width: 15 },
          { header: 'Due Date', key: 'dueDate', width: 15 },
          { header: 'Owner', key: 'ownerName', width: 20 },
          { header: 'Status', key: 'status', width: 15 }
        ];
        stagingTasks.forEach(task => {
          worksheet.addRow({ ...task, status: task.isConverted ? 'CONVERTED' : 'PENDING' });
        });
        buffer = await workbook.xlsx.writeBuffer();
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        attachmentName = `Recurring_Report_${dateFilter.from}.xlsx`;
      } else {
        const doc = new jsPDF('l', 'mm', 'a4');
        const tableData = stagingTasks.map(t => [t.entityName, t.taskName, t.financeFunction || '--', t.frequency, t.periodKey, t.dueDate, t.ownerName, t.isConverted ? 'CONVERTED' : 'PENDING']);
        autoTable(doc, {
          head: [['Entity', 'Task Name', 'Function', 'Freq', 'Period', 'Due Date', 'Owner', 'Status']],
          body: tableData,
          startY: 20
        });
        buffer = doc.output('arraybuffer');
        contentType = 'application/pdf';
        attachmentName = `Recurring_Report_${dateFilter.from}.pdf`;
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(new Blob([buffer as any]));
      });

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: shareData.recipients.join(','),
          ccEmail: shareData.cc.join(','),
          subject: shareData.subject,
          attachmentName,
          attachmentBuffer: base64,
          contentType
        })
      });

      if (res.ok) {
        showNotification("Report shared successfully via email!");
        setShowShareModal(false);
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

  const exportMasterToExcel = async (data: RecurringTemplate[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Master Registry");
    worksheet.columns = [
      { header: "Entity", key: "entityName", width: 25 },
      { header: "Task Name", key: "taskName", width: 40 },
      { header: "Frequency", key: "frequency", width: 15 },
      { header: "Default Owner", key: "defaultOwner", width: 20 },
      { header: "Start Date", key: "startDate", width: 15 },
      { header: "Stop Date", key: "stopDate", width: 15 }
    ];
    data.forEach(t => {
      worksheet.addRow({
        entityName: t.entityName,
        taskName: t.taskNamePattern,
        frequency: t.frequency,
        defaultOwner: t.defaultOwner,
        startDate: t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB') : "--",
        stopDate: t.stopDate ? new Date(t.stopDate).toLocaleDateString('en-GB') : "--"
      });
    });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Recurring_Master_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportMasterToPDF = (data: RecurringTemplate[]) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Recurring Activities - Master Registry", 14, 15);
    autoTable(doc, {
      head: [['Entity', 'Task Name', 'Frequency', 'Owner', 'Reviewer', 'Validity']],
      body: data.map(t => [
        t.entityName, 
        t.taskNamePattern, 
        t.frequency, 
        t.defaultOwner || "--", 
        t.defaultReviewer || "--",
        `${t.startDate ? new Date(t.startDate).toLocaleDateString() : "--"} - ${t.endDate ? new Date(t.endDate).toLocaleDateString() : "Ongoing"}`
      ]),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: '#1e293b' }
    });
    doc.save(`Recurring_Master_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleMasterShareViaEmail = async (data: RecurringTemplate[]) => {
    if (shareData.recipients.length === 0) {
      showNotification("Please add at least one recipient email.");
      return;
    }
    setShareLoading(true);
    try {
      const attachments = [];
      const dateSuffix = new Date().toISOString().split('T')[0];

      if (shareData.format === 'excel' || shareData.format === 'both') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Master Registry");
        worksheet.columns = [
          { header: "Entity", key: "entityName", width: 25 },
          { header: "Task Name", key: "taskName", width: 40 },
          { header: "Frequency", key: "frequency", width: 15 },
          { header: "Default Owner", key: "defaultOwner", width: 20 },
          { header: "Start Date", key: "startDate", width: 15 }
        ];
        data.forEach(t => {
          worksheet.addRow({
            entityName: t.entityName,
            taskName: t.taskNamePattern,
            frequency: t.frequency,
            defaultOwner: t.defaultOwner,
            startDate: t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB') : "--"
          });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(new Blob([buffer as any]));
        });
        attachments.push({
          filename: `Master_Registry_${dateSuffix}.xlsx`,
          content: base64,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      }

      if (shareData.format === 'pdf' || shareData.format === 'both') {
        const doc = new jsPDF('l', 'mm', 'a4');
        autoTable(doc, {
          head: [['Entity', 'Task Name', 'Freq', 'Owner', 'Start Date']],
          body: data.map(t => [t.entityName, t.taskNamePattern, t.frequency, t.defaultOwner, t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB') : "--"]),
          startY: 20
        });
        const buffer = doc.output('arraybuffer');
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(new Blob([buffer as any]));
        });
        attachments.push({
          filename: `Master_Registry_${dateSuffix}.pdf`,
          content: base64,
          contentType: 'application/pdf'
        });
      }

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: shareData.recipients.join(','),
          ccEmail: shareData.cc.join(','),
          subject: shareData.subject || "Master Registry Report",
          attachments
        })
      });

      if (res.ok) {
        showNotification("Master Registry shared successfully!");
        setShowShareModal(false);
      } else {
        showNotification("Failed to share master registry.");
      }
    } catch (err) {
      console.error("Master share error", err);
      showNotification("Error sharing master registry.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleAddEmail = (type: 'recipients' | 'cc', val: string) => {
    const email = val.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@')) return;
    if (shareData[type].includes(email)) return;
    
    setShareData({
        ...shareData,
        [type]: [...shareData[type], email],
        [`${type === 'recipients' ? 'recipient' : 'cc'}Input`]: ""
    });
  };

  const removeEmail = (type: 'recipients' | 'cc', idx: number) => {
    setShareData({
        ...shareData,
        [type]: shareData[type].filter((_, i) => i !== idx)
    });
  };

  const handleUpdateDailyStatus = async (templateId: number, date: string, status: 'Completed' | 'Not Completed') => {
    try {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: [{ templateId, taskDate: date, status }] })
      });
      if (res.ok) {
        fetchDailyData();
      }
    } catch (err) {
      console.error("Update daily status error:", err);
    }
  };

  const handleBulkDailyStatus = async (status: 'Completed' | 'Not Completed') => {
    const tasks = selectedDailyOccs.map(idDate => {
      const [tId, date] = idDate.split('_');
      return { templateId: parseInt(tId), taskDate: date, status };
    });

    if (tasks.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks })
      });
      if (res.ok) {
        setSelectedDailyOccs([]);
        fetchDailyData();
      }
    } catch (err) {
      console.error("Bulk daily status error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDailyOccurrences = () => {
    const occs: any[] = [];
    const fromDate = new Date(dailyDateFilter.from);
    const toDate = new Date(dailyDateFilter.to);
    const dailyTemplates = templates.filter(t => t.frequency === 'D' && t.isActive);

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      dailyTemplates.forEach(t => {
        // Simple date check: must be >= start date and <= end date (if exists)
        const tStart = t.startDate ? new Date(t.startDate) : null;
        const tEnd = t.endDate ? new Date(t.endDate) : null;
        const tStop = t.stopDate ? new Date(t.stopDate) : null;

        if (tStart && d < tStart) return;
        if (tEnd && d > tEnd) return;
        if (tStop && d >= tStop) return;

        const completion = dailyCompletionData.find(c => c.templateId === t.id && formatDate(new Date(c.taskDate)) === dateStr);
        
        occs.push({
          id: `${t.id}_${dateStr}`,
          templateId: t.id,
          taskName: t.taskNamePattern,
          entityName: t.entityName,
          taskType: t.taskType,
          ownerName: t.defaultOwner,
          reviewerName: t.defaultReviewer,
          targetDate: dateStr,
          status: completion ? completion.status : 'Not Completed',
          completedAt: completion?.completedAt,
          completedBy: completion?.completedBy
        });
      });
    }
    return occs;
  };

  const exportDailyExcel = async (data: any[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Tasks Report');
    worksheet.columns = [
      { header: 'Sl No', key: 'sl', width: 8 },
      { header: 'Task Details', key: 'taskName', width: 35 },
      { header: 'Entity', key: 'entityName', width: 25 },
      { header: 'Task Type', key: 'taskType', width: 15 },
      { header: 'Owner', key: 'ownerName', width: 20 },
      { header: 'Reviewer', key: 'reviewerName', width: 20 },
      { header: 'Target Date', key: 'targetDate', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    data.forEach((row, i) => worksheet.addRow({ ...row, sl: i + 1 }));
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Daily_Tasks_Report_${dailyDateFilter.from}.xlsx`);
  };

  const exportDailyPDF = (data: any[]) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(`Daily Tasks Report (${dailyDateFilter.from} to ${dailyDateFilter.to})`, 14, 15);
    autoTable(doc, {
      head: [['Sl No', 'Task Details', 'Entity', 'Type', 'Owner', 'Reviewer', 'Target Date', 'Status']],
      body: data.map((r, i) => [i+1, r.taskName, r.entityName, r.taskType, r.ownerName, r.reviewerName, r.targetDate, r.status]),
      startY: 20
    });
    doc.save(`Daily_Tasks_Report_${dailyDateFilter.from}.pdf`);
  };

  const handleDailyShareViaEmail = async () => {
    if (shareData.recipients.length === 0) {
      showNotification("Please add at least one recipient email.");
      return;
    }
    setShareLoading(true);
    try {
      let buffer: ArrayBuffer | Uint8Array;
      let contentType = "";
      let attachmentName = "";
      const data = getDailyOccurrences();

      if (shareData.format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Tasks Report');
        worksheet.columns = [
          { header: 'Sl No', key: 'sl', width: 8 },
          { header: 'Task Details', key: 'taskName', width: 35 },
          { header: 'Entity', key: 'entityName', width: 25 },
          { header: 'Task Type', key: 'taskType', width: 15 },
          { header: 'Owner', key: 'ownerName', width: 20 },
          { header: 'Reviewer', key: 'reviewerName', width: 20 },
          { header: 'Target Date', key: 'targetDate', width: 15 },
          { header: 'Status', key: 'status', width: 15 }
        ];
        data.forEach((row, i) => worksheet.addRow({ ...row, sl: i + 1 }));
        buffer = await workbook.xlsx.writeBuffer();
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        attachmentName = `Daily_Tasks_Report_${dailyDateFilter.from}.xlsx`;
      } else {
        const doc = new jsPDF('l', 'mm', 'a4');
        autoTable(doc, {
          head: [['Sl No', 'Task Details', 'Entity', 'Type', 'Owner', 'Reviewer', 'Target Date', 'Status']],
          body: data.map((r, i) => [i+1, r.taskName, r.entityName, r.taskType, r.ownerName, r.reviewerName, r.targetDate, r.status]),
        });
        buffer = doc.output('arraybuffer');
        contentType = 'application/pdf';
        attachmentName = `Daily_Tasks_Report_${dailyDateFilter.from}.pdf`;
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(new Blob([buffer as any]));
      });

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: shareData.recipients.join(','),
          ccEmail: shareData.cc.join(','),
          subject: shareData.subject || `Daily Tasks Report (${dailyDateFilter.from} to ${dailyDateFilter.to})`,
          attachmentName,
          attachmentBuffer: base64,
          contentType
        })
      });

      if (res.ok) {
        showNotification("Report shared successfully via email!");
        setDailyShareModal(false);
      } else {
        showNotification("Failed to share report.");
      }
    } catch (error) {
      console.error("Daily Share error", error);
    } finally {
      setShareLoading(false);
    }
  };

  const thStyle = { 
    background: "#1e293b",
    color: "#ffffff",
    padding: "14px 20px", 
    textAlign: "left" as const, 
    fontSize: "0.7rem", 
    fontWeight: 700, 
    textTransform: "uppercase" as const, 
    letterSpacing: "0.05em",
    borderBottom: "2px solid #3b82f6"
  };
  const tdStyle = { padding: "12px 16px", fontSize: "0.875rem", color: "#334155" };
  const inputStyle = { padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8125rem", outline: "none", width: "100%" };
  
  const handleStagingSort = (key: keyof StagingTask) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (stagingSortConfig && stagingSortConfig.key === key && stagingSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setStagingSortConfig({ key, direction });
  };

  const filteredAndSortedStaging = [...stagingTasks]
    .filter(task => {
      const search = searchStaging.toLowerCase();
      const matchesSearch = 
        task.taskName.toLowerCase().includes(search) ||
        task.entityName.toLowerCase().includes(search) ||
        (task.financeFunction || "").toLowerCase().includes(search) ||
        task.periodKey.toLowerCase().includes(search);
      
      const matchesEntity = entityFilterStaging === "ALL" || task.entityName === entityFilterStaging;
      
      return matchesSearch && matchesEntity;
    })
    .sort((a, b) => {
      if (!stagingSortConfig) return 0;
      const { key, direction } = stagingSortConfig;
      const valA = a[key] || "";
      const valB = b[key] || "";
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div style={{ padding: "24px" }}>
      {/* Sub-Tabs */}
      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e2e8f0", marginBottom: "24px" }}>
        <button 
          onClick={() => setActiveSubTab('STAGING')}
          style={{ padding: "12px 4px", fontSize: "0.875rem", fontWeight: 600, color: activeSubTab === 'STAGING' ? "#2563eb" : "#64748b", borderBottom: activeSubTab === 'STAGING' ? "2px solid #2563eb" : "none", background: "none", cursor: "pointer" }}
        >
          Pending to Task Conversion
        </button>
        <button 
          onClick={() => setActiveSubTab('MASTER')}
          style={{ padding: "12px 4px", fontSize: "0.875rem", fontWeight: 600, color: activeSubTab === 'MASTER' ? "#2563eb" : "#64748b", borderBottom: activeSubTab === 'MASTER' ? "2px solid #2563eb" : "none", background: "none", cursor: "pointer" }}
        >
          Recurring Tasks-Master Data
        </button>
        <button 
          onClick={() => setActiveSubTab('D')}
          style={{ padding: "12px 4px", fontSize: "0.875rem", fontWeight: 600, color: activeSubTab === 'D' ? "#2563eb" : "#64748b", borderBottom: activeSubTab === 'D' ? "2px solid #2563eb" : "none", background: "none", cursor: "pointer" }}
        >
          Daily Tasks
        </button>
      </div>

      {activeSubTab === 'STAGING' && (
        <div>
          {/* Advanced Filters Bar */}
          <div style={{ background: "white", padding: "16px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
               <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b" }}>FROM:</label>
               <input type="date" value={dateFilter.from} onChange={e => setDateFilter({...dateFilter, from: e.target.value})} style={{...inputStyle, width: "135px"}} />
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
               <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b" }}>TO:</label>
               <input type="date" value={dateFilter.to} onChange={e => setDateFilter({...dateFilter, to: e.target.value})} style={{...inputStyle, width: "135px"}} />
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
               <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b" }}>FREQ:</label>
               <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)} style={{...inputStyle, width: "110px"}}>
                 <option value="ALL">ALL Freq</option>
                 {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
               </select>
             </div>
             
             <button 
                onClick={() => setShowConverted(!showConverted)}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: showConverted ? "#f0fdf4" : "white", color: showConverted ? "#15803d" : "#64748b", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
             >
                {showConverted ? <Eye size={16} /> : <EyeOff size={16} />}
                {showConverted ? "History" : "History"}
             </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "4px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "240px" }}>
                <Search size={16} color="#64748b" />
                <input 
                  type="text" 
                  placeholder="Search staging..." 
                  value={searchStaging}
                  onChange={e => setSearchStaging(e.target.value)}
                  style={{ border: "none", background: "none", outline: "none", fontSize: "0.8125rem", width: "100%", color: "#334155" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select 
                  value={entityFilterStaging} 
                  onChange={e => setEntityFilterStaging(e.target.value)} 
                  style={{ ...inputStyle, width: "130px" }}
                >
                  <option value="ALL">All Entities</option>
                  {Array.from(new Set(stagingTasks.map(t => t.entityName))).sort().map(entity => (
                    <option key={entity} value={entity}>{entity}</option>
                  ))}
                </select>
              </div>

             <div style={{ flex: 1 }}></div>

             <div style={{ position: "relative" }}>
                <button 
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#334155", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", transition: "all 0.2s" }}
                >
                  <Download size={18} />
                  Download Report
                  <ChevronDown size={16} style={{ transform: showDownloadMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </button>

                {showDownloadMenu && (
                  <>
                    <div 
                      onClick={() => setShowDownloadMenu(false)} 
                      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                    />
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "200px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", zIndex: 50, padding: "8px", animation: "slideDown 0.2s ease" }}>
                      <button 
                        onClick={() => { exportToExcel(); setShowDownloadMenu(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#166534", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                        className="hover:bg-slate-50"
                      >
                        <TableIcon size={18} /> Export to Excel
                      </button>
                      <button 
                        onClick={() => { exportToPDF(); setShowDownloadMenu(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#991b1b", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                        className="hover:bg-slate-50"
                      >
                        <FileText size={18} /> Export to PDF
                      </button>
                      <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />
                      <button 
                        onClick={() => { 
                          setShareData({...shareData, subject: "Recurring Task Conversion Report", format: "excel"}); 
                          setShareMode('STAGING');
                          setShowShareModal(true); 
                          setShowDownloadMenu(false); 
                        }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#075985", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                        className="hover:bg-slate-50"
                      >
                        <Share2 size={18} /> Share via Email
                      </button>
                    </div>
                  </>
                )}
             </div>
          </div>

          {/* Share via Email Modal */}
          {showShareModal && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
              <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "550px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", animation: "modalIn 0.3s ease-out" }}>
                <div style={{ padding: "24px", background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ background: "rgba(255,255,255,0.2)", padding: "10px", borderRadius: "12px" }}><Mail size={24} /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Share via Email</h3>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.9 }}>Send the conversion report as an attachment.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowShareModal(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
                </div>
                
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Recipients Tag Input */}
                  <div>
                    <label style={labelStyle}>Recipient Emails *</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", minHeight: "45px", background: "#f8fafc" }}>
                      {shareData.recipients.map((email, idx) => (
                        <div key={idx} style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                          {email}
                          <X size={14} style={{ cursor: "pointer" }} onClick={() => removeEmail('recipients', idx)} />
                        </div>
                      ))}
                      <input 
                        type="text" 
                        placeholder={shareData.recipients.length === 0 ? "Type email and press Enter..." : ""}
                        value={shareData.recipientInput}
                        onChange={e => setShareData({...shareData, recipientInput: e.target.value})}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddEmail('recipients', shareData.recipientInput);
                            }
                        }}
                        style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", flex: 1, minWidth: "120px" }}
                      />
                    </div>
                  </div>

                  {/* CC Tag Input */}
                  <div>
                    <label style={labelStyle}>CC Emails</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", minHeight: "45px", background: "#f8fafc" }}>
                      {shareData.cc.map((email, idx) => (
                        <div key={idx} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                          {email}
                          <X size={14} style={{ cursor: "pointer" }} onClick={() => removeEmail('cc', idx)} />
                        </div>
                      ))}
                      <input 
                        type="text" 
                        placeholder={shareData.cc.length === 0 ? "Type email and press Enter..." : ""}
                        value={shareData.ccInput}
                        onChange={e => setShareData({...shareData, ccInput: e.target.value})}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddEmail('cc', shareData.ccInput);
                            }
                        }}
                        style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", flex: 1, minWidth: "120px" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Subject</label>
                    <input 
                      type="text" 
                      value={shareData.subject}
                      onChange={e => setShareData({...shareData, subject: e.target.value})}
                      style={inputStyle} 
                    />
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Format</label>
                        <select 
                            value={shareData.format} 
                            onChange={e => setShareData({...shareData, format: e.target.value as any})}
                            style={inputStyle}
                        >
                            <option value="excel">Excel Spreadsheet</option>
                            <option value="pdf">PDF Document</option>
                            <option value="both">Both (Excel & PDF)</option>
                        </select>
                    </div>
                  </div>

                  <div style={{ padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: "12px" }}>
                    <FileSpreadsheet size={24} color="#0369a1" />
                    <div>
                      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#0369a1" }}>Attachment Ready</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#0ea5e9" }}>
                        {shareMode === 'MASTER' ? "Master Registry rule definitions" : `Conversion report from ${dateFilter.from} to ${dateFilter.to}`}
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
                      onClick={shareMode === 'MASTER' ? () => handleMasterShareViaEmail(templates) : handleShareViaEmail}
                      disabled={shareLoading}
                      style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: shareLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    >
                      {shareLoading ? "Sending..." : <><Send size={18} /> Send Email</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedTasks.length > 0 && stagingTasks.some((t, i) => selectedTasks.includes(i) && !t.isConverted) && (
            <div style={{ background: "linear-gradient(to right, #f8fafc, #eff6ff)", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px", animation: "slideDown 0.3s ease" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e40af" }}>{selectedTasks.filter(i => !stagingTasks[i].isConverted).length} activities ready for conversion</span>
              <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                <select value={bulkAssign.owner} onChange={e => setBulkAssign({...bulkAssign, owner: e.target.value})} style={{...inputStyle, width: "180px"}}>
                  <option value="">Assign Owner...</option>
                  {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <select value={bulkAssign.reviewer} onChange={e => setBulkAssign({...bulkAssign, reviewer: e.target.value})} style={{...inputStyle, width: "180px"}}>
                  <option value="">Assign Reviewer...</option>
                  <option value="Not Applicable">Not Applicable</option>
                  {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <input type="date" value={bulkAssign.dueDate} onChange={e => setBulkAssign({...bulkAssign, dueDate: e.target.value})} style={{...inputStyle, width: "150px"}} />
                <button onClick={handleBulkApply} style={{ padding: "6px 12px", background: "#fff", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>Apply All</button>
              </div>
              <button 
                onClick={handleGenerateTasks}
                disabled={loading}
                style={{ padding: "10px 24px", background: "#2563eb", color: "white", borderRadius: "10px", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)" }}
              >
                <CheckCircle2 size={18} />
                Convert to Tasks
              </button>
            </div>
          )}

          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }} className="custom-scrollbar">
            <table style={{ width: "100%", minWidth: "1500px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ width: "40px", padding: "12px 16px" }}>
                    <input 
                      type="checkbox" 
                      onChange={e => setSelectedTasks(e.target.checked ? filteredAndSortedStaging.map((_, i) => i) : [])}
                      checked={selectedTasks.length === filteredAndSortedStaging.length && filteredAndSortedStaging.length > 0}
                    />
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleStagingSort('entityName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Entity {stagingSortConfig?.key === 'entityName' && (stagingSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleStagingSort('taskName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Task Details {stagingSortConfig?.key === 'taskName' && (stagingSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleStagingSort('periodKey')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Freq / Period {stagingSortConfig?.key === 'periodKey' && (stagingSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleStagingSort('ownerName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Owner & Reviewer {stagingSortConfig?.key === 'ownerName' && (stagingSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleStagingSort('dueDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Target Date {stagingSortConfig?.key === 'dueDate' && (stagingSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={thStyle}>Status</th>
                  <th style={{...thStyle, textAlign: "right"}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStaging.map((task, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: task.isConverted ? "#f9fafb" : "white", opacity: task.isConverted ? 0.8 : 1 }}>
                    <td style={{ padding: "12px 16px" }}>
                      {!task.isConverted && (
                        <input 
                            type="checkbox" 
                            checked={selectedTasks.includes(idx)}
                            onChange={e => setSelectedTasks(e.target.checked ? [...selectedTasks, idx] : selectedTasks.filter(i => i !== idx))}
                        />
                      )}
                      {task.isConverted && <CheckCircle2 size={16} style={{ color: "#10b981" }} />}
                    </td>
                    <td style={tdStyle}>{task.entityName}</td>
                    <td style={tdStyle}>
                       <div style={{ fontWeight: 600, color: "#1e293b" }}>{task.taskName}</div>
                       <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>Func: {task.financeFunction || "--"}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: "2px 8px", background: task.isConverted ? "#e2e8f0" : "#eff6ff", color: task.isConverted ? "#64748b" : "#2563eb", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>{task.frequency}</span>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, marginTop: "4px" }}>{task.periodKey}</div>
                    </td>
                    <td style={tdStyle}>
                      {task.isConverted ? (
                        <div style={{ fontSize: "0.8125rem" }}>
                            <strong>O:</strong> {task.ownerName}<br/>
                            <strong>R:</strong> {task.reviewerName}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <select 
                                value={task.ownerName} 
                                onChange={e => {
                                    const updated = [...stagingTasks];
                                    const actualIdx = stagingTasks.findIndex(t => t.templateId === task.templateId && t.periodKey === task.periodKey);
                                    if (actualIdx !== -1) {
                                      updated[actualIdx].ownerName = e.target.value;
                                      updated[actualIdx].isReady = !!e.target.value;
                                      setStagingTasks(updated);
                                    }
                                }}
                                style={inputStyle}
                            >
                                <option value="">Choose Owner...</option>
                                {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                            <select 
                                value={task.reviewerName} 
                                onChange={e => {
                                    const updated = [...stagingTasks];
                                    const actualIdx = stagingTasks.findIndex(t => t.templateId === task.templateId && t.periodKey === task.periodKey);
                                    if (actualIdx !== -1) {
                                      updated[actualIdx].reviewerName = e.target.value;
                                      setStagingTasks(updated);
                                    }
                                }}
                                style={inputStyle}
                            >
                                <option value="Not Applicable">Not Applicable</option>
                                {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {task.isConverted ? (
                        <span>{task.dueDate}</span>
                      ) : (
                        <input 
                            type="date" 
                            value={task.dueDate} 
                            onChange={e => {
                                const updated = [...stagingTasks];
                                const actualIdx = stagingTasks.findIndex(t => t.templateId === task.templateId && t.periodKey === task.periodKey);
                                if (actualIdx !== -1) {
                                  updated[actualIdx].dueDate = e.target.value;
                                  setStagingTasks(updated);
                                }
                            }}
                            style={inputStyle} 
                        />
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: "4px 8px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap",
                        background: task.isConverted ? "#dcfce7" : "#fef3c7",
                        color: task.isConverted ? "#15803d" : "#b45309"
                      }}>
                        {task.isConverted ? "CONVERTED" : "PENDING"}
                      </span>
                    </td>
                    <td style={{...tdStyle, textAlign: "right"}}>
                        {!task.isConverted && (
                            <button 
                                onClick={() => handleDismissOccurrence(task.templateId, task.periodKey)}
                                title="Dismiss this occurrence"
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </td>
                  </tr>
                ))}
                {filteredAndSortedStaging.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                      <Calendar size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
                      <p>No tasks found for the selected period.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'MASTER' && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>Recurring Template Master Registry</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>Define the rules for automatic task generation.</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <button 
                  onClick={() => setShowMasterDownloadDropdown(!showMasterDownloadDropdown)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#334155", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <Download size={18} /> Download <ChevronDown size={16} />
                </button>
                {showMasterDownloadDropdown && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "200px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, padding: "8px" }}>
                    <button onClick={() => { exportMasterToExcel(templates); setShowMasterDownloadDropdown(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#166534", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      <TableIcon size={18} /> Export to Excel
                    </button>
                    <button onClick={() => { exportMasterToPDF(templates); setShowMasterDownloadDropdown(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#991b1b", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      <FileText size={18} /> Export to PDF
                    </button>
                    <button onClick={() => { 
                      setShareData({
                        ...shareData, 
                        subject: "Recurring Master Registry Report", 
                        format: "excel"
                      });
                      setShareMode('MASTER');
                      setShowShareModal(true); 
                      setShowMasterDownloadDropdown(false); 
                    }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#075985", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      <Mail size={18} /> Share via Email
                    </button>
                  </div>
                )}
              </div>
            <button 
              onClick={() => { 
                setEditingTemplate(null); 
                setTemplateForm({
                  taskNamePattern: "",
                  entityName: "",
                  taskType: "External",
                  departmentName: "Finance",
                  financeFunction: "",
                  frequency: "M",
                  dayOffset: 15,
                  monthOffset: 0,
                  defaultOwner: "",
                  defaultReviewer: "",
                  isActive: true,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: ""
                });
                setShowTemplateForm(true); 
              }}
              style={{ padding: "10px 20px", background: "#2563eb", color: "white", borderRadius: "10px", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
            >
              <Plus size={18} /> Add Recurring Task
            </button>
          </div>
        </div>

          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} className="custom-scrollbar">
            <table style={{ width: "100%", minWidth: "1200px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr style={{ background: "#1e293b" }}>
                  <th style={thStyle}>Rule Name / Pattern</th>
                  <th style={thStyle}>Entity & Function</th>
                  <th style={thStyle}>Frequency</th>
                  <th style={thStyle}>Validity</th>
                  <th style={thStyle}>Default Assignments</th>
                  <th style={thStyle}>Status</th>
                  <th style={{...thStyle, textAlign: "right"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="table-row">
                    <td style={{...tdStyle, fontWeight: 600, color: "#0f172a"}}>{t.taskNamePattern}</td>
                    <td style={tdStyle}>
                        <div>{t.entityName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t.financeFunction || "--"}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: "4px 10px", background: "#eff6ff", color: "#2563eb", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700 }}>{t.frequency}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Starts: {t.startDate ? new Date(t.startDate).toLocaleDateString() : "--"}<br/>
                        Ends: {t.endDate ? new Date(t.endDate).toLocaleDateString() : "Ongoing"}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "0.75rem" }}><strong>Owner:</strong> {t.defaultOwner || "--"}</span>
                        <span style={{ fontSize: "0.75rem" }}><strong>Rev:</strong> {t.defaultReviewer || "--"}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ 
                            padding: "4px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 800, width: "fit-content",
                            background: t.isActive ? "#dcfce7" : "#fee2e2",
                            color: t.isActive ? "#15803d" : "#b91c1c"
                        }}>
                            {t.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                        {t.isStopped && (
                            <span style={{ fontSize: "0.65rem", color: "#ef4444", fontWeight: 700 }}>STOPPED ({new Date(t.stopDate!).toLocaleDateString()})</span>
                        )}
                      </div>
                    </td>
                    <td style={{...tdStyle, textAlign: "right"}}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        {!t.isStopped && (
                            <button onClick={() => handleStopTemplate(t.id)} title="Stop this recurring rule" style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><StopCircle size={16} /></button>
                        )}
                        <button onClick={() => openEditTemplate(t)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteTemplate(t.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "600px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", animation: "modalIn 0.3s ease-out" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{editingTemplate ? "Edit Template" : "Add Recurring Task"}</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", opacity: 0.8 }}>Define how the system should generate this activity.</p>
              </div>
              <button onClick={() => setShowTemplateForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", width: "32px", height: "32px", borderRadius: "8px" }}>×</button>
            </div>
            
            <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Task Name Pattern</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ageing report for {{MONTH}} {{YEAR}}" 
                    value={templateForm.taskNamePattern} 
                    onChange={e => setTemplateForm({...templateForm, taskNamePattern: e.target.value})} 
                    style={inputStyle} 
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.7rem", color: "#94a3b8" }}>Tip: Use placeholders like {'{{MONTH}}'}, {'{{YEAR}}'}, {'{{QUARTER}}'}</p>
                </div>

                <div>
                  <label style={labelStyle}>Entity Name</label>
                  <select value={templateForm.entityName} onChange={e => setTemplateForm({...templateForm, entityName: e.target.value})} style={inputStyle}>
                    <option value="">Select Entity...</option>
                    {(settings.masterEntities || "").split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Department</label>
                  <select value={templateForm.departmentName} onChange={e => setTemplateForm({...templateForm, departmentName: e.target.value})} style={inputStyle}>
                    <option value="">Select Department...</option>
                    {(settings.masterDepartments || "").split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Finance Function</label>
                  <select value={templateForm.financeFunction || ""} onChange={e => setTemplateForm({...templateForm, financeFunction: e.target.value})} style={inputStyle}>
                    <option value="">Select Function...</option>
                    {(settings.masterRequestTypes || "").split(',').map((e: string) => <option key={e} value={e.trim()}>{e.trim()}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Frequency (Logic & Master)</label>
                  <select 
                    value={templateForm.frequency || "M"} 
                    onChange={e => {
                      const freq = e.target.value as any;
                      setTemplateForm({
                        ...templateForm, 
                        frequency: freq,
                        freqLabel: freq 
                      });
                    }} 
                    style={inputStyle}
                  >
                    <option value="">Select Frequency...</option>
                    {(settings.masterFrequencies || "").split(',').map((f: string) => <option key={f.trim()} value={f.trim()}>{f.trim()}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Start Date (Anchor)</label>
                  <input type="date" value={templateForm.startDate || ""} onChange={e => setTemplateForm({...templateForm, startDate: e.target.value})} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>End Date (Optional)</label>
                  <input type="date" value={templateForm.endDate || ""} onChange={e => setTemplateForm({...templateForm, endDate: e.target.value})} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Day of Month (Due Date)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={templateForm.dayOffset === undefined ? "" : templateForm.dayOffset} 
                    onChange={e => {
                        const val = e.target.value;
                        setTemplateForm({...templateForm, dayOffset: val === "" ? undefined : parseInt(val)});
                    }} 
                    style={inputStyle} 
                  />
                </div>

                {templateForm.frequency === 'W' && (
                    <div>
                        <label style={labelStyle}>Day of Week</label>
                        <select 
                            value={templateForm.weeklyDay || ""} 
                            onChange={e => setTemplateForm({...templateForm, weeklyDay: e.target.value})} 
                            style={inputStyle}
                        >
                            <option value="">Align to Start Date</option>
                            {(settings.masterWeekDays || 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday').split(',').map((d: string) => (
                                <option key={d} value={d.trim()}>{d.trim()}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                  <label style={labelStyle}>Default Owner</label>
                  <select value={templateForm.defaultOwner || ""} onChange={e => setTemplateForm({...templateForm, defaultOwner: e.target.value})} style={inputStyle}>
                    <option value="">Select Owner...</option>
                    {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Default Reviewer</label>
                  <select value={templateForm.defaultReviewer || ""} onChange={e => setTemplateForm({...templateForm, defaultReviewer: e.target.value})} style={inputStyle}>
                    <option value="">Select Reviewer...</option>
                    <option value="Not Applicable">Not Applicable</option>
                    {financeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                  <input type="checkbox" checked={templateForm.isActive} onChange={e => setTemplateForm({...templateForm, isActive: e.target.checked})} style={{ width: "20px", height: "20px" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>Template is Active</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Inactive templates will not appear for conversion.</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button onClick={() => setShowTemplateForm(false)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button 
                  onClick={handleSaveTemplate} 
                  disabled={isSaving}
                  style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
                >
                  {isSaving ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'D' && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Daily Filters Bar */}
          <div style={{ background: "white", padding: "16px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
               <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b" }}>FROM:</label>
               <input type="date" value={dailyDateFilter.from} onChange={e => setDailyDateFilter({...dailyDateFilter, from: e.target.value})} style={{...inputStyle, width: "135px"}} />
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
               <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b" }}>TO:</label>
               <input type="date" value={dailyDateFilter.to} onChange={e => setDailyDateFilter({...dailyDateFilter, to: e.target.value})} style={{...inputStyle, width: "135px"}} />
             </div>

             <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "4px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "240px" }}>
               <Search size={16} color="#64748b" />
               <input 
                 type="text" 
                 placeholder="Search daily tasks..." 
                 value={dailySearch}
                 onChange={e => setDailySearch(e.target.value)}
                 style={{ border: "none", background: "none", outline: "none", fontSize: "0.8125rem", width: "100%", color: "#334155" }}
               />
             </div>

             <select 
               value={dailyOwnerFilter} 
               onChange={e => setDailyOwnerFilter(e.target.value)} 
               style={{ ...inputStyle, width: "130px" }}
             >
               <option value="ALL">All Owners</option>
               {Array.from(new Set(templates.filter(t => t.frequency === 'D').map(t => t.defaultOwner))).filter(Boolean).map(owner => (
                 <option key={owner} value={owner!}>{owner}</option>
               ))}
             </select>

             <div style={{ flex: 1 }}></div>

             <div style={{ position: "relative" }}>
                <button 
                  onClick={() => setDailyDownloadMenu(!dailyDownloadMenu)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#334155", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <Download size={18} /> Download
                  <ChevronDown size={16} />
                </button>
                {dailyDownloadMenu && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "200px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, padding: "8px" }}>
                    <button onClick={() => { exportDailyExcel(getDailyOccurrences()); setDailyDownloadMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#166534", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      <TableIcon size={18} /> Excel
                    </button>
                    <button onClick={() => { exportDailyPDF(getDailyOccurrences()); setDailyDownloadMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#991b1b", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      <FileText size={18} /> PDF
                    </button>
                    <button onClick={() => { setDailyShareModal(true); setDailyDownloadMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#075985", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      <Mail size={18} /> Share Email
                    </button>
                  </div>
                )}
             </div>
          </div>

          {/* Bulk Action for Daily */}
          {selectedDailyOccs.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "16px", animation: "slideDown 0.3s ease" }}>
               <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#166534" }}>{selectedDailyOccs.length} occurrences selected</span>
               <button 
                 onClick={() => handleBulkDailyStatus('Completed')}
                 style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#16a34a", color: "white", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
               >
                 Mark as Completed
               </button>
               <button 
                 onClick={() => setSelectedDailyOccs([])}
                 style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #bbf7d0", background: "white", color: "#166534", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
               >
                 Cancel
               </button>
            </div>
          )}

          {/* Daily Tracker Table */}
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} className="custom-scrollbar">
            <table style={{ width: "100%", minWidth: "1200px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1e293b" }}>
                  <th style={thStyle}>
                    <input 
                      type="checkbox" 
                      onChange={e => {
                        const all = getDailyOccurrences().filter(o => o.status !== 'Completed').map(o => o.id);
                        setSelectedDailyOccs(e.target.checked ? all : []);
                      }}
                      checked={selectedDailyOccs.length > 0 && selectedDailyOccs.length === getDailyOccurrences().filter(o => o.status !== 'Completed').length}
                    />
                  </th>
                  <th style={thStyle}>Sl No</th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleDailySort('taskName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Task Details {dailySortConfig.key === 'taskName' && (dailySortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleDailySort('taskType')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Type {dailySortConfig.key === 'taskType' && (dailySortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleDailySort('ownerName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Owner {dailySortConfig.key === 'ownerName' && (dailySortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleDailySort('reviewerName')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Reviewer {dailySortConfig.key === 'reviewerName' && (dailySortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={{...thStyle, cursor: "pointer"}} onClick={() => handleDailySort('targetDate')}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Target Date {dailySortConfig.key === 'targetDate' && (dailySortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </div>
                  </th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {getDailyOccurrences()
                  .filter(o => {
                    const search = dailySearch.toLowerCase();
                    const matchesSearch = o.taskName.toLowerCase().includes(search) || o.entityName.toLowerCase().includes(search) || o.ownerName?.toLowerCase().includes(search);
                    const matchesOwner = dailyOwnerFilter === "ALL" || o.ownerName === dailyOwnerFilter;
                    return matchesSearch && matchesOwner;
                  })
                  .sort((a, b) => {
                    const key = dailySortConfig.key;
                    const dir = dailySortConfig.direction === 'asc' ? 1 : -1;
                    
                    if (key === 'targetDate') {
                      return (new Date(a[key]).getTime() - new Date(b[key]).getTime()) * dir;
                    }
                    
                    const valA = (a as any)[key] || "";
                    const valB = (b as any)[key] || "";
                    if (valA < valB) return -1 * dir;
                    if (valA > valB) return 1 * dir;
                    return 0;
                  })
                  .map((occ, idx) => (
                  <tr key={occ.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>
                      <input 
                        type="checkbox" 
                        disabled={occ.status === 'Completed'}
                        checked={selectedDailyOccs.includes(occ.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedDailyOccs([...selectedDailyOccs, occ.id]);
                          else setSelectedDailyOccs(selectedDailyOccs.filter(id => id !== occ.id));
                        }}
                      />
                    </td>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{occ.taskName}</div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{occ.entityName}</div>
                    </td>
                    <td style={tdStyle}>{occ.taskType}</td>
                    <td style={tdStyle}>{occ.ownerName}</td>
                    <td style={tdStyle}>{occ.reviewerName}</td>
                    <td style={tdStyle}>{new Date(occ.targetDate).toLocaleDateString('en-GB')}</td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700,
                        background: occ.status === 'Completed' ? "#dcfce7" : "#fee2e2",
                        color: occ.status === 'Completed' ? "#16a34a" : "#ef4444"
                      }}>
                        {occ.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {occ.status !== 'Completed' ? (
                        <button 
                          onClick={() => handleUpdateDailyStatus(occ.templateId, occ.targetDate, 'Completed')}
                          style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          Mark Completed
                        </button>
                      ) : (
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          By {occ.completedBy} at {new Date(occ.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Share Modal */}
      {dailyShareModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "550px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Mail size={24} />
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Share Daily Report</h3>
              </div>
              <button onClick={() => setDailyShareModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Recipients</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" }}>
                  {shareData.recipients.map((email, idx) => (
                    <div key={idx} style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      {email} <X size={14} style={{ cursor: "pointer" }} onClick={() => removeEmail('recipients', idx)} />
                    </div>
                  ))}
                  <input 
                    type="text" 
                    value={shareData.recipientInput}
                    onChange={e => setShareData({...shareData, recipientInput: e.target.value})}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddEmail('recipients', shareData.recipientInput); }}
                    style={{ border: "none", background: "none", outline: "none", flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <input type="text" value={shareData.subject} onChange={e => setShareData({...shareData, subject: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setDailyShareModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleDailyShareViaEmail} disabled={shareLoading} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#16a34a", color: "white", fontWeight: 600, cursor: "pointer" }}>
                  {shareLoading ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "6px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.025em" };

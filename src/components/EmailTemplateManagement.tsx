"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mail, 
  Search, 
  Filter, 
  Plus, 
  Copy, 
  Eye, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  Check, 
  CheckSquare, 
  FileText, 
  UploadCloud, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Send, 
  ChevronRight,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
  Palette,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link as LinkIcon,
  Image as ImageFormIcon,
  Columns,
  Grid,
  FileCode,
  Layout,
  Clock,
  Sparkle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Type definitions
export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  inspectionType: "Entry Inspection" | "Exit Inspection" | "Routine Inspection";
  isDefault: boolean;
  lastUpdated: string;
  snippet: string;
  body: string;
  fontFamily: string;
  lineSpacing: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  status: "Draft" | "Published";
}

const INITIAL_TEMPLATES: EmailTemplateItem[] = [
  {
    id: "tpl-1",
    name: "Entry Inspection Confirmation",
    subject: "Upcoming Entry Condition Inspection - %PropertyAddress%",
    inspectionType: "Entry Inspection",
    isDefault: true,
    lastUpdated: "2 hours ago",
    snippet: "Dear %TenantFullName%, this is to confirm your upcoming Entry Condition Inspection scheduled...",
    body: "Hi %TenantFullName%,\n\nThis email is to confirm that your Entry Condition Inspection has been scheduled for %InspectionDate%.\n\nWe look forward to meeting you at the property: %PropertyAddress%.\n\nYou can review your preliminary inspection checklist and instructions via the link below:\n\n%InspectionReportLink%\n\nIf you have any questions, please contact %OfficeName%.\n\nWarm regards,",
    fontFamily: "Inter, sans-serif",
    lineSpacing: "1.6",
    primaryColor: "#0f172a",
    accentColor: "#10b981",
    backgroundColor: "#f8fafc",
    status: "Published"
  },
  {
    id: "tpl-2",
    name: "Exit Inspection Check-out Checklist",
    subject: "Important: Exit Inspection & Key Return - %PropertyAddress%",
    inspectionType: "Exit Inspection",
    isDefault: true,
    lastUpdated: "Yesterday",
    snippet: "Hello, as your tenancy is concluding, we have scheduled the final exit inspection on...",
    body: "Hello %TenantFullName%,\n\nAs your lease is coming to an end, the Exit Inspection for the property at %PropertyAddress% has been scheduled for %InspectionDate%.\n\nTo ensure your bond refund is processed promptly, please ensure that:\n1. All keys are returned to our office.\n2. The property is cleaned in accordance with the check-out checklist.\n\nYou can view your inspection report draft and checklist here:\n%InspectionReportLink%\n\nShould you have any queries, please let us know.\n\nSincerely,",
    fontFamily: "Inter, sans-serif",
    lineSpacing: "1.5",
    primaryColor: "#0f172a",
    accentColor: "#ef4444",
    backgroundColor: "#fff5f5",
    status: "Published"
  },
  {
    id: "tpl-3",
    name: "Routine Tenant Inspection Notice",
    subject: "Notice of Upcoming Routine Inspection - %PropertyAddress%",
    inspectionType: "Routine Inspection",
    isDefault: true,
    lastUpdated: "3 days ago",
    snippet: "Dear Tenant, please note that we will be carrying out a routine inspection of your rental property on...",
    body: "Dear %TenantFullName%,\n\nPlease be advised that our agency will be conducting a routine inspection of the property located at %PropertyAddress% on %InspectionDate%.\n\nYou do not need to be present for the inspection as we will use our management keys, but you are welcome to attend if you wish.\n\nPlease leave any notes for the inspector in the portal: %InspectionReportLink%.\n\nThank you for your cooperation.\n\nKind regards,",
    fontFamily: "Inter, sans-serif",
    lineSpacing: "1.6",
    primaryColor: "#1e3a8a",
    accentColor: "#3b82f6",
    backgroundColor: "#f0f9ff",
    status: "Published"
  },
  {
    id: "tpl-4",
    name: "Routine Inspection Follow-up",
    subject: "Inspection Report Update: Routine Inspection Completed at %PropertyAddress%",
    inspectionType: "Routine Inspection",
    isDefault: false,
    lastUpdated: "5 days ago",
    snippet: "Hello %TenantFullName%, we want to thank you for maintaining the property so well. The routine...",
    body: "Hello %TenantFullName%,\n\nWe wanted to say thank you for your time during our routine inspection at %PropertyAddress% on %InspectionDate%.\n\nOur inspector noted that the property is being beautifully maintained. You can access the copy of your completed routine inspection report via this link:\n\n%InspectionReportLink%\n\nThanks again, and please let us know if there are any maintenance requests you would like to submit.\n\nBest regards,",
    fontFamily: "Inter, sans-serif",
    lineSpacing: "1.6",
    primaryColor: "#1e3a8a",
    accentColor: "#3b82f6",
    backgroundColor: "#ffffff",
    status: "Published"
  }
];

export const EmailTemplateManagement: React.FC = () => {
  // Navigation State
  const [view, setView] = useState<"list" | "create" | "editor">("list");
  
  // Data States
  const [templates, setTemplates] = useState<EmailTemplateItem[]>(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateItem | null>(null);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectionFilter, setInspectionFilter] = useState<string>("All");
  
  // Edit/Form states
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formType, setFormType] = useState<"Entry Inspection" | "Exit Inspection" | "Routine Inspection">("Routine Inspection");
  const [formFontFamily, setFormFontFamily] = useState("Inter, sans-serif");
  const [formLineSpacing, setFormLineSpacing] = useState("1.6");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [selectedLayoutType, setSelectedLayoutType] = useState<string>("Simple Text");
  const [formBody, setFormBody] = useState("");
  const [formPrimaryColor, setFormPrimaryColor] = useState("#0f172a");
  const [formAccentColor, setFormAccentColor] = useState("#3b82f6");
  const [formBackgroundColor, setFormBackgroundColor] = useState("#f8fafc");
  const [formStatus, setFormStatus] = useState<"Draft" | "Published">("Published");
  
  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");
  const [isSendTestOpen, setIsSendTestOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailMessage, setTestEmailMessage] = useState("");
  const [testSendStatus, setTestSendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  
  // UI indicators
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("Saved just now");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload state simulator
  const [uploadedAssets, setUploadedAssets] = useState<Array<{ name: string; url: string; size: string }>>([
    { name: "office-logo-primary.png", url: "/icon-logo.png", size: "24 KB" },
    { name: "sydney-agency-banner.jpg", url: "/public/property-hero-bg.png", size: "120 KB" }
  ]);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Auto-save simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "editor" && hasUnsavedChanges) {
      interval = setInterval(() => {
        setIsSaving(true);
        setTimeout(() => {
          setIsSaving(false);
          setHasUnsavedChanges(false);
          const now = new Date();
          setLastSavedTime(`Saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        }, 1000);
      }, 10000); // Autosave every 10s if dirty
    }
    return () => clearInterval(interval);
  }, [view, hasUnsavedChanges]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Merge tag list
  const mergeTags = [
    { tag: "%TenantFullName%", label: "Tenant Full Name", category: "Tenant Details" },
    { tag: "%PropertyAddress%", label: "Property Address", category: "Property Details" },
    { tag: "%InspectionDate%", label: "Inspection Date", category: "Inspection Details" },
    { tag: "%InspectionType%", label: "Inspection Type", category: "Inspection Details" },
    { tag: "%OfficeName%", label: "Office Name", category: "Office Details" },
    { tag: "%InspectionReportLink%", label: "Inspection Report Link", category: "Inspection Details" }
  ];

  // Templates layout cards
  const presetLayouts = [
    { id: "simple", title: "Simple Text", desc: "Clean markdown text layout", icon: FileText },
    { id: "1col", title: "1 Column", desc: "Central branded layout", icon: Layout },
    { id: "2col", title: "2 Column", desc: "Detailed side-by-side grid", icon: Columns },
    { id: "banner", title: "Banner Layout", desc: "Top image focal point", icon: ImageIcon },
    { id: "newsletter", title: "Newsletter Layout", desc: "Multi-section digest style", icon: Grid }
  ];

  // Filter templates list
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = inspectionFilter === "All" || t.inspectionType === inspectionFilter;
    return matchesSearch && matchesType;
  });

  const getBadgeStyles = (type: string) => {
    switch (type) {
      case "Entry Inspection":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Exit Inspection":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "Routine Inspection":
      default:
        return "bg-blue-50 text-blue-700 border border-blue-200";
    }
  };

  // Actions
  const handleMarkDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.map(t => {
      if (t.id === id) return { ...t, isDefault: true };
      // If of same type, unmark default
      const targetType = templates.find(item => item.id === id)?.inspectionType;
      if (t.inspectionType === targetType) return { ...t, isDefault: false };
      return t;
    });
    setTemplates(updated);
    triggerToast("Default template updated successfully.");
  };

  const handleDuplicate = (template: EmailTemplateItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTpl: EmailTemplateItem = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      lastUpdated: "Just now"
    };
    setTemplates([newTpl, ...templates]);
    triggerToast("Template duplicated.");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this template?")) {
      setTemplates(templates.filter(t => t.id !== id));
      triggerToast("Template deleted.");
    }
  };

  const handleOpenEdit = (template: EmailTemplateItem) => {
    setSelectedTemplate(template);
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormType(template.inspectionType);
    setFormFontFamily(template.fontFamily);
    setFormLineSpacing(template.lineSpacing);
    setFormIsDefault(template.isDefault);
    setFormBody(template.body);
    setFormPrimaryColor(template.primaryColor);
    setFormAccentColor(template.accentColor);
    setFormBackgroundColor(template.backgroundColor);
    setFormStatus(template.status);
    setView("editor");
  };

  const handleSaveTemplate = () => {
    if (!formName.trim() || !formSubject.trim()) {
      alert("Please enter a name and subject for the template.");
      return;
    }

    const tplData: EmailTemplateItem = {
      id: selectedTemplate ? selectedTemplate.id : `tpl-${Date.now()}`,
      name: formName,
      subject: formSubject,
      inspectionType: formType,
      isDefault: formIsDefault,
      lastUpdated: "Just now",
      snippet: formBody.substring(0, 100) + "...",
      body: formBody,
      fontFamily: formFontFamily,
      lineSpacing: formLineSpacing,
      primaryColor: formPrimaryColor,
      accentColor: formAccentColor,
      backgroundColor: formBackgroundColor,
      status: formStatus
    };

    let updatedTemplates = [...templates];

    // If marked default, unmark others of same inspection type
    if (formIsDefault) {
      updatedTemplates = updatedTemplates.map(t => 
        t.inspectionType === formType ? { ...t, isDefault: false } : t
      );
    }

    if (selectedTemplate) {
      updatedTemplates = updatedTemplates.map(t => t.id === selectedTemplate.id ? tplData : t);
    } else {
      updatedTemplates = [tplData, ...updatedTemplates];
    }

    setTemplates(updatedTemplates);
    triggerToast("Template saved successfully.");
    setView("list");
    setSelectedTemplate(null);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormName("");
    setFormSubject("");
    setFormType("Routine Inspection");
    setFormFontFamily("Inter, sans-serif");
    setFormLineSpacing("1.6");
    setFormIsDefault(false);
    setSelectedLayoutType("Simple Text");
    setFormBody("Dear %TenantFullName%,\n\n[Write your email content here]\n\nWarm regards,\n%OfficeName%");
    setFormPrimaryColor("#1e3a8a");
    setFormAccentColor("#3b82f6");
    setFormBackgroundColor("#f8fafc");
    setFormStatus("Published");
    setView("create");
  };

  const insertMergeTag = (tag: string) => {
    // Append at cursor position or simply at the end of body
    setFormBody(prev => prev + " " + tag);
    setHasUnsavedChanges(true);
  };

  const insertMergeTagToSubject = (tag: string) => {
    setFormSubject(prev => prev + " " + tag);
    setHasUnsavedChanges(true);
  };

  // Simulating asset uploading
  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadProgress(10);
    
    // Simulate upload ticks
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setUploadedAssets([
              { name: file.name, url: "/icon-logo.png", size: `${Math.round(file.size / 1024)} KB` },
              ...uploadedAssets
            ]);
            setUploadProgress(null);
            triggerToast("Asset uploaded successfully.");
          }, 400);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  // Dynamic preview compiler (replaces merge tags with preview data)
  const compilePreview = (subjectOrBody: string) => {
    return subjectOrBody
      .replace(/%TenantFullName%/g, "Jane Smith")
      .replace(/%PropertyAddress%/g, "Unit 12, 45 Oxford Street, Paddington NSW 2021")
      .replace(/%InspectionDate%/g, "Thursday, 21st May 2026")
      .replace(/%InspectionType%/g, formType)
      .replace(/%OfficeName%/g, "EaseInspect Paddington Office")
      .replace(/%InspectionReportLink%/g, "https://easeinspect.com/reports/preview-491a");
  };

  const handleSendTestEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) return;
    setTestSendStatus("sending");
    setTimeout(() => {
      if (testEmailAddress.includes("@")) {
        setTestSendStatus("success");
      } else {
        setTestSendStatus("error");
      }
    }, 1500);
  };

  // Build Layout templates when proceeding to Editor from Create page
  const proceedToEditor = () => {
    let layoutBody = "";
    if (selectedLayoutType === "1 Column") {
      layoutBody = `Hi %TenantFullName%,\n\nThis is a clean, centered single-column notification regarding your upcoming %InspectionType%.\n\nProperty Details:\n- Address: %PropertyAddress%\n- Date: %InspectionDate%\n\nPlease click below to access the checklist:\n%InspectionReportLink%\n\nThanks,\n%OfficeName%`;
    } else if (selectedLayoutType === "2 Column") {
      layoutBody = `Dear %TenantFullName%,\n\nYour scheduled %InspectionType% details are below.\n\n---------------------------------------------\nLeft Column: Property Details\nAddress: %PropertyAddress%\nOffice: %OfficeName%\n---------------------------------------------\nRight Column: Date & Time\nDate: %InspectionDate%\nType: %InspectionType%\n---------------------------------------------\n\nReport link: %InspectionReportLink%`;
    } else if (selectedLayoutType === "Banner Layout") {
      layoutBody = `[BANNER IMAGE CAPTION]\n\nHello %TenantFullName%,\n\nWe will be conducting a %InspectionType% at %PropertyAddress% on %InspectionDate%.\n\nAccess portal link: %InspectionReportLink%\n\nWarm regards,\n%OfficeName%`;
    } else {
      layoutBody = `Dear %TenantFullName%,\n\nAn inspection has been scheduled for your property at %PropertyAddress%.\n\nDetails:\n- Inspection: %InspectionType%\n- Date: %InspectionDate%\n\nLink: %InspectionReportLink%\n\nBest regards,\n%OfficeName%`;
    }
    setFormBody(layoutBody);
    setView("editor");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased py-6 px-4 md:px-8 space-y-6 overflow-x-hidden">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 animate-slide-up">
          <Sparkle className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. EMAIL TEMPLATES LISTING VIEW                         */}
      {/* ──────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email Templates</h1>
              <p className="text-slate-500 text-sm mt-1">Manage automated client communications, notifications, and follow-ups for inspections.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateNew} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-md flex items-center gap-2 px-5 py-6">
                <Plus className="w-5 h-5" />
                Add New Template
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            {/* Search */}
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by name, subject, or keywords..." 
                className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-[#3b82f6] focus:border-[#3b82f6]"
              />
            </div>
            
            {/* Dropdown filter */}
            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={inspectionFilter}
                onChange={(e) => setInspectionFilter(e.target.value)}
                className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all"
              >
                <option value="All">All Inspection Types</option>
                <option value="Entry Inspection">Entry Inspection</option>
                <option value="Exit Inspection">Exit Inspection</option>
                <option value="Routine Inspection">Routine Inspection</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => handleOpenEdit(template)}
                  className="group relative bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px]"
                >
                  <div>
                    {/* Top line badges & actions */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase tracking-wider ${getBadgeStyles(template.inspectionType)}`}>
                        {template.inspectionType}
                      </span>
                      
                      {template.isDefault && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 border border-slate-200">
                          <Check className="w-3 h-3 text-slate-800" /> Default
                        </span>
                      )}
                    </div>

                    {/* Template name & snippet */}
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-[#3b82f6] transition-colors leading-snug">
                      {template.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Updated {template.lastUpdated}
                    </p>
                    
                    <p className="text-sm text-slate-500 mt-3 line-clamp-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {template.snippet}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <button
                      onClick={(e) => handleMarkDefault(template.id, e)}
                      disabled={template.isDefault}
                      className={`text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all ${
                        template.isDefault 
                          ? "bg-slate-50 text-slate-400 border-slate-100 cursor-default"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      Make Default
                    </button>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setFormType(template.inspectionType);
                          setFormSubject(template.subject);
                          setFormBody(template.body);
                          setFormPrimaryColor(template.primaryColor);
                          setFormAccentColor(template.accentColor);
                          setFormBackgroundColor(template.backgroundColor);
                          setIsPreviewOpen(true);
                        }}
                        title="Preview email"
                        className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDuplicate(template, e)}
                        title="Duplicate template"
                        className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(template.id, e)}
                        title="Delete template"
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 text-center max-w-xl mx-auto shadow-sm">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">No matching templates found</h3>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your keyword searches or inspection filters, or build a new template from scratch.</p>
              <Button onClick={() => setSearchQuery("")} variant="outline" className="mt-4 border-slate-200 text-slate-600">
                Clear Filters
              </Button>
            </div>
          )}

          {/* Listing Footer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 border-t border-slate-200">
            <div className="text-xs text-slate-400">
              Showing {filteredTemplates.length} of {templates.length} templates
            </div>
            
            <button 
              onClick={() => triggerToast("Global Office default fallback templates synchronized.")}
              className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition-colors shadow-sm self-start"
            >
              Change Default Office Template
            </button>
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. CREATE TEMPLATE PAGE                                 */}
      {/* ──────────────────────────────────────────────────────── */}
      {view === "create" && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView("list")} 
                className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Create Email Template</h1>
                <p className="text-xs text-slate-400 mt-0.5">Define your template properties and select a starting layout.</p>
              </div>
            </div>
            
            <Button onClick={proceedToEditor} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-md px-6">
              Continue to Editor <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* Form */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="text-base font-bold text-slate-900">1. Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="create-name" className="text-slate-700 font-semibold">Template Name</Label>
                  <Input 
                    id="create-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ingoing Report Signature Request" 
                    className="border-slate-200 h-11 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-type" className="text-slate-700 font-semibold">Inspection Type</Label>
                  <select
                    id="create-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full h-11 border border-slate-200 rounded-lg px-3 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-all"
                  >
                    <option value="Entry Inspection">Entry Inspection</option>
                    <option value="Exit Inspection">Exit Inspection</option>
                    <option value="Routine Inspection">Routine Inspection</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="create-subject" className="text-slate-700 font-semibold">Email Subject</Label>
                    <span className="text-[10px] text-slate-400">Click to insert merge tag</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="create-subject"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="e.g. Schedule for Ingoing Condition Report at %PropertyAddress%" 
                      className="border-slate-200 h-11 pr-32 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <select 
                        onChange={(e) => {
                          if(e.target.value) {
                            insertMergeTagToSubject(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded px-2 py-1 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="">+ Insert Tag</option>
                        {mergeTags.map(t => (
                          <option key={t.tag} value={t.tag}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-font" className="text-slate-700 font-semibold">Font Family</Label>
                  <select
                    id="create-font"
                    value={formFontFamily}
                    onChange={(e) => setFormFontFamily(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-lg px-3 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-all"
                  >
                    <option value="Inter, sans-serif">Inter (SaaS Standard)</option>
                    <option value="system-ui, sans-serif">System Sans</option>
                    <option value="Georgia, serif">Georgia Editorial</option>
                    <option value="Courier New, monospace">Plain Text Monospace</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-spacing" className="text-slate-700 font-semibold">Line Spacing</Label>
                  <select
                    id="create-spacing"
                    value={formLineSpacing}
                    onChange={(e) => setFormLineSpacing(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-lg px-3 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-all"
                  >
                    <option value="1.4">1.4 (Compact)</option>
                    <option value="1.6">1.6 (Recommended)</option>
                    <option value="1.8">1.8 (Spacious)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="create-is-default" 
                  checked={formIsDefault} 
                  onCheckedChange={(checked) => setFormIsDefault(Boolean(checked))}
                />
                <label 
                  htmlFor="create-is-default"
                  className="text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Make this default office template for {formType}s
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection Split Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left side layouts list */}
            <div className="col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#3b82f6]" /> Use a Template
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {presetLayouts.map(layout => {
                  const Icon = layout.icon;
                  const isSelected = selectedLayoutType === layout.title;
                  return (
                    <div 
                      key={layout.id}
                      onClick={() => setSelectedLayoutType(layout.title)}
                      className={`group border rounded-xl p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-blue-50/50 border-[#3b82f6] ring-1 ring-[#3b82f6]" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${isSelected ? "bg-[#3b82f6] text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{layout.title}</h3>
                          <p className="text-xs text-slate-400">{layout.desc}</p>
                        </div>
                      </div>
                      
                      {/* Mini Thumbnail mockup */}
                      <div className="mt-3 bg-slate-100 rounded-lg p-2 h-20 flex flex-col gap-1.5 justify-center overflow-hidden">
                        <div className="w-1/3 h-2 bg-slate-200 rounded"></div>
                        <div className="w-full h-1 bg-slate-200 rounded"></div>
                        <div className="w-5/6 h-1 bg-slate-200 rounded"></div>
                        <div className="w-2/3 h-1.5 bg-slate-200 rounded mt-1"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side upload layouts */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" /> Build Your Own
              </h2>
              
              <div className="space-y-4">
                {/* Visual Editor */}
                <div 
                  onClick={() => { setSelectedLayoutType("Blank Canvas"); proceedToEditor(); }}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[125px]"
                >
                  <Sparkles className="w-8 h-8 text-indigo-500 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Open Visual Editor</h3>
                  <p className="text-xs text-slate-400 mt-1">Drag & drop rich template widgets</p>
                </div>

                {/* Upload HTML */}
                <label className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer bg-white transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[125px]">
                  <FileCode className="w-8 h-8 text-slate-400 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Upload Custom HTML</h3>
                  <p className="text-xs text-slate-400 mt-1">Select and import .html files</p>
                  <input type="file" accept=".html,.txt" className="hidden" onChange={() => triggerToast("HTML template loaded to canvas")} />
                </label>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. EMAIL EDITOR PAGE                                    */}
      {/* ──────────────────────────────────────────────────────── */}
      {view === "editor" && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Panel bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView("list")} 
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{formName || "Untitled Template"}</h1>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded border border-slate-200">
                    {formType}
                  </span>
                </div>
                
                {/* Autosave status indicator */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span>{isSaving ? "Saving changes..." : lastSavedTime}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={formStatus}
                onChange={(e) => {
                  setFormStatus(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="h-9 text-xs font-semibold px-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
              >
                <option value="Published">Published Status</option>
                <option value="Draft">Draft Status</option>
              </select>

              <Button 
                variant="outline" 
                onClick={() => {
                  triggerToast("Template version history loaded.");
                }}
                className="h-10 text-xs border-slate-200 text-slate-600 rounded-xl"
              >
                Version History
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setIsPreviewOpen(true)}
                className="h-10 text-xs border-slate-200 text-[#3b82f6] hover:bg-blue-50/50 rounded-xl"
              >
                <Eye className="w-4 h-4 mr-1.5" /> Preview
              </Button>

              <Button 
                onClick={handleSaveTemplate}
                className="h-10 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-sm"
              >
                Save & Exit
              </Button>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left side editor canvas */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Rich editing toolbar mockup */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-1">
                {/* Font selection */}
                <select className="h-8 text-xs px-2 border border-slate-200 rounded focus:outline-none">
                  <option>Inter</option>
                  <option>Georgia</option>
                  <option>Courier</option>
                </select>

                <select className="h-8 text-xs px-1 border border-slate-200 rounded focus:outline-none">
                  <option>14px</option>
                  <option>16px</option>
                  <option>18px</option>
                </select>

                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* Inline formats */}
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 active:bg-slate-200" title="Bold"><Bold className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Italic"><Italic className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Underline"><Underline className="w-4 h-4" /></button>
                
                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* Alignment */}
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Align Right"><AlignRight className="w-4 h-4" /></button>
                
                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* Lists & blocks */}
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Bulleted List"><List className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Hyperlink"><LinkIcon className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Insert Image"><ImageFormIcon className="w-4 h-4" /></button>
                <button 
                  onClick={() => {
                    setFormBody(prev => prev + "\n---------------------------------------------\n");
                    setHasUnsavedChanges(true);
                  }}
                  className="text-xs px-2 py-1 hover:bg-slate-100 rounded border border-slate-200 text-slate-600 font-semibold"
                >
                  Divider
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* Undo/Redo */}
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 cursor-not-allowed"><Undo2 className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 cursor-not-allowed"><Redo2 className="w-4 h-4" /></button>
              </div>

              {/* Subject details card */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Details</span>
                  <button 
                    onClick={() => setIsSendTestOpen(true)}
                    className="text-xs font-bold text-[#3b82f6] flex items-center gap-1 hover:underline"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Test Email
                  </button>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Subject Line</label>
                  <Input 
                    value={formSubject}
                    onChange={(e) => { setFormSubject(e.target.value); setHasUnsavedChanges(true); }}
                    className="border-slate-200 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Editor Workspace Canvas */}
              <div 
                className="rounded-2xl p-6 min-h-[480px] flex items-start justify-center shadow-inner overflow-y-auto"
                style={{ backgroundColor: formBackgroundColor }}
              >
                {/* Email Box mockup */}
                <div className="bg-white rounded-xl shadow-md border border-slate-100 w-full max-w-[620px] overflow-hidden flex flex-col">
                  {/* Branded Header banner color bar */}
                  <div className="h-4" style={{ backgroundColor: formAccentColor }}></div>
                  
                  {/* Email header details */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <p className="text-xs text-slate-400">From: <strong className="text-slate-600">EaseInspect Automated (notifications@easeinspect.com)</strong></p>
                      <p className="text-xs text-slate-400 mt-0.5">To: <span className="text-[#3b82f6]">%TenantFullName%</span></p>
                    </div>
                    {/* Branded Logo representation */}
                    <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden">
                      <img src="/icon-logo.png" alt="Logo" className="w-8 h-8 object-cover" />
                    </div>
                  </div>

                  {/* Body Textarea Canvas */}
                  <div className="p-6 space-y-4">
                    <textarea
                      value={formBody}
                      onChange={(e) => { setFormBody(e.target.value); setHasUnsavedChanges(true); }}
                      style={{ fontFamily: formFontFamily, lineSpacing: formLineSpacing }}
                      className="w-full min-h-[250px] border-none text-slate-700 focus:outline-none resize-none text-sm placeholder-slate-300"
                      placeholder="Insert text layout or write body content here..."
                    />

                    {/* Styled Call-to-action button representation */}
                    <div className="pt-2 text-center">
                      <button 
                        className="text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-sm"
                        style={{ backgroundColor: formAccentColor }}
                      >
                        View Full Inspection Report
                      </button>
                    </div>
                  </div>

                  {/* Branded Footer */}
                  <div className="p-6 border-t border-slate-100 text-center bg-slate-50/30">
                    <p className="text-[11px] text-slate-400">This is an automated notification from %OfficeName%.</p>
                    <p className="text-[10px] text-slate-300 mt-1">Powered by EaseInspect Property Inspection Platforms</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right side sidebar tools */}
            <div className="space-y-6">
              
              {/* Section 1: Mail Merge Fields */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mail Merge Fields</h3>
                  <p className="text-xs text-slate-400">Click a variable tag to append it into the editor canvas.</p>
                </div>
                
                {/* Grouped tags */}
                <div className="space-y-3 pt-1">
                  {/* Categories */}
                  {Array.from(new Set(mergeTags.map(t => t.category))).map(cat => (
                    <div key={cat} className="space-y-1.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{cat}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {mergeTags.filter(t => t.category === cat).map(t => (
                          <button
                            key={t.tag}
                            onClick={() => insertMergeTag(t.tag)}
                            className="text-[10px] bg-slate-50 hover:bg-[#3b82f6] hover:text-white text-slate-600 border border-slate-200 rounded-lg px-2 py-1 font-semibold transition-all"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Uploaded Assets */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Uploaded Assets</h3>
                  <p className="text-xs text-slate-400">Manage logo assets or banners to inject in template designs.</p>
                </div>

                {/* Upload drag drop box */}
                <label className="border border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600 mt-1">Upload New Asset</span>
                  <span className="text-[9px] text-slate-400">PNG, JPG, SVG up to 2MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAssetUpload} />
                </label>

                {/* Upload progress state */}
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Uploading asset file...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#3b82f6] transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Asset search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    placeholder="Search asset files..."
                    className="h-8 w-full border border-slate-200 rounded-lg pl-8 pr-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-2 gap-2 pt-1 max-h-[140px] overflow-y-auto">
                  {uploadedAssets
                    .filter(a => a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()))
                    .map((asset, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setFormBody(prev => prev + `\n![${asset.name}](${asset.url})\n`);
                          setHasUnsavedChanges(true);
                          triggerToast("Asset markdown tag injected.");
                        }}
                        className="group border border-slate-100 hover:border-[#3b82f6] bg-slate-50/30 hover:bg-white rounded-lg p-1.5 text-center cursor-pointer transition-colors relative"
                      >
                        <div className="h-10 flex items-center justify-center bg-slate-100 rounded overflow-hidden">
                          <img src="/icon-logo.png" alt="" className="h-8 object-contain" />
                        </div>
                        <div className="text-[9px] text-slate-700 truncate mt-1">{asset.name}</div>
                        <div className="text-[8px] text-slate-400">{asset.size}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Section 3: Color Palette presets */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Theme Settings</h3>
                  <p className="text-xs text-slate-400">Match the communication style to corporate guidelines.</p>
                </div>
                
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={formPrimaryColor} 
                        onChange={(e) => { setFormPrimaryColor(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-8 h-8 rounded border p-0.5 cursor-pointer focus:outline-none" 
                      />
                      <input 
                        type="text" 
                        value={formPrimaryColor} 
                        onChange={(e) => { setFormPrimaryColor(e.target.value); setHasUnsavedChanges(true); }}
                        className="h-8 flex-1 border border-slate-200 rounded px-2 text-xs focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Accent Accent Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={formAccentColor} 
                        onChange={(e) => { setFormAccentColor(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-8 h-8 rounded border p-0.5 cursor-pointer focus:outline-none" 
                      />
                      <input 
                        type="text" 
                        value={formAccentColor} 
                        onChange={(e) => { setFormAccentColor(e.target.value); setHasUnsavedChanges(true); }}
                        className="h-8 flex-1 border border-slate-200 rounded px-2 text-xs focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Background Canvas</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={formBackgroundColor} 
                        onChange={(e) => { setFormBackgroundColor(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-8 h-8 rounded border p-0.5 cursor-pointer focus:outline-none" 
                      />
                      <input 
                        type="text" 
                        value={formBackgroundColor} 
                        onChange={(e) => { setFormBackgroundColor(e.target.value); setHasUnsavedChanges(true); }}
                        className="h-8 flex-1 border border-slate-200 rounded px-2 text-xs focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* PREVIEW EMAIL MODAL                                      */}
      {/* ──────────────────────────────────────────────────────── */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#3b82f6]" /> Template Preview
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Simulated rendering of dynamic properties and data.</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Tab layout selector toggle */}
                <div className="bg-slate-200 p-0.5 rounded-lg flex items-center gap-0.5">
                  <button 
                    onClick={() => setPreviewTab("desktop")}
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                      previewTab === "desktop" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </button>
                  <button 
                    onClick={() => setPreviewTab("mobile")}
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                      previewTab === "mobile" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </button>
                </div>
                
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-[#f8fafc] flex-1 overflow-y-auto flex items-start justify-center">
              
              <div className={`transition-all duration-300 w-full ${previewTab === "mobile" ? "max-w-[360px]" : "max-w-[620px]"}`}>
                
                <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
                  {/* Accent Header */}
                  <div className="h-3" style={{ backgroundColor: formAccentColor }}></div>

                  {/* Header Branded info bar */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500 truncate"><strong>Subject:</strong> {compilePreview(formSubject)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5"><strong>Date:</strong> 21 May 2026</p>
                    </div>
                    <div className="h-8 w-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200 shrink-0 ml-3">
                      <img src="/icon-logo.png" alt="Logo" className="h-6 object-contain" />
                    </div>
                  </div>

                  {/* Compiled Body Copy */}
                  <div className="p-5 space-y-4">
                    <div 
                      style={{ fontFamily: formFontFamily, lineHeight: formLineSpacing }}
                      className="text-slate-700 text-sm whitespace-pre-wrap"
                    >
                      {compilePreview(formBody)}
                    </div>

                    <div className="pt-2 text-center">
                      <button 
                        className="text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-sm"
                        style={{ backgroundColor: formAccentColor }}
                      >
                        View Full Inspection Report
                      </button>
                    </div>
                  </div>

                  {/* Footer info */}
                  <div className="p-4 border-t border-slate-100 text-center bg-slate-50/30 text-[10px] text-slate-400">
                    <p>This is an automated notification from EaseInspect Paddington Office.</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
                className="border-slate-200 text-slate-600 rounded-xl"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setIsPreviewOpen(false);
                  setIsSendTestOpen(true);
                }}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-4 h-4" /> Send Test Email
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SEND TEST EMAIL MODAL                                    */}
      {/* ──────────────────────────────────────────────────────── */}
      {isSendTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#3b82f6]" /> Send Test Email
              </h3>
              <button 
                onClick={() => { setIsSendTestOpen(false); setTestSendStatus("idle"); }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form & States wrapper */}
            {testSendStatus === "idle" && (
              <form onSubmit={handleSendTestEmailSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="test-recipient" className="text-slate-700 font-semibold">Recipient Email Address</Label>
                  <Input 
                    id="test-recipient"
                    type="email"
                    required
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="e.g. inspector@youragency.com"
                    className="border-slate-200 h-10 focus:ring-[#3b82f6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="test-msg" className="text-slate-700 font-semibold">Optional Message Prefix</Label>
                  <textarea
                    id="test-msg"
                    rows={2}
                    value={testEmailMessage}
                    onChange={(e) => setTestEmailMessage(e.target.value)}
                    placeholder="e.g. This is a layout mockup test from Ingoing Inspection Type"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsSendTestOpen(false)}
                    className="border-slate-200 text-slate-600 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-sm"
                  >
                    Send Test
                  </Button>
                </div>
              </form>
            )}

            {/* Sending Loader State */}
            {testSendStatus === "sending" && (
              <div className="p-10 text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-[#3b82f6] animate-spin mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-800">Sending test email...</h4>
                  <p className="text-xs text-slate-400 mt-1">Assembling payload and merging tags with sandbox variables.</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {testSendStatus === "success" && (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Email dispatched successfully!</h4>
                  <p className="text-xs text-slate-400 mt-1">Dispatched to <strong>{testEmailAddress}</strong>. Check inbox/spam folder.</p>
                </div>
                <Button 
                  onClick={() => { setIsSendTestOpen(false); setTestSendStatus("idle"); }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Done
                </Button>
              </div>
            )}

            {/* Error State */}
            {testSendStatus === "error" && (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ✕
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Transmission Failed</h4>
                  <p className="text-xs text-slate-400 mt-1">Invalid domain or sandbox mailing capacity limit hit.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => { setTestSendStatus("idle"); }}
                    className="flex-1 border-slate-200 text-slate-700"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => { setIsSendTestOpen(false); setTestSendStatus("idle"); }}
                    className="flex-1 bg-slate-900 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

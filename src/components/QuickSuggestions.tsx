"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  X,
  FileText,
  MessageSquare,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  Grid,
  Loader2
} from "lucide-react";
import { quickSuggestionsApi } from "@/lib/api/quickSuggestions";
import {
  QuickSuggestionType,
  QuickSuggestionResponse,
  CreateQuickSuggestionRequest,
  UpdateQuickSuggestionRequest,
  QuickSuggestionSettingsResponse,
  UpdateQuickSuggestionSettingsRequest,
  ImportPreviewResult,
  QuickSuggestionImportRow
} from "@/types/api";

interface LibraryState {
  suggestions: QuickSuggestionResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  loading: boolean;
}

const QuickSuggestions: React.FC = () => {
  // Global messages/alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<QuickSuggestionSettingsResponse | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Tab State for Separate View
  const [activeLibraryTab, setActiveLibraryTab] = useState<QuickSuggestionType>(QuickSuggestionType.EntryExit);

  // Search input values (for debouncing)
  const [searchInputs, setSearchInputs] = useState<Record<QuickSuggestionType, string>>({
    [QuickSuggestionType.EntryExit]: "",
    [QuickSuggestionType.Routine]: ""
  });

  // Library Data State
  const [libStates, setLibStates] = useState<Record<QuickSuggestionType, LibraryState>>({
    [QuickSuggestionType.EntryExit]: {
      suggestions: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      search: "",
      sortBy: "a-z",
      loading: false
    },
    [QuickSuggestionType.Routine]: {
      suggestions: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      search: "",
      sortBy: "a-z",
      loading: false
    }
  });

  // Inline forms for adding suggestions
  const [addForms, setAddForms] = useState<Record<QuickSuggestionType, { text: string; shortcut: string }>>({
    [QuickSuggestionType.EntryExit]: { text: "", shortcut: "" },
    [QuickSuggestionType.Routine]: { text: "", shortcut: "" }
  });
  const [addingStates, setAddingStates] = useState<Record<QuickSuggestionType, boolean>>({
    [QuickSuggestionType.EntryExit]: false,
    [QuickSuggestionType.Routine]: false
  });

  // Edit Suggestion Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<QuickSuggestionResponse | null>(null);
  const [editForm, setEditForm] = useState({ text: "", shortcut: "", isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSuggestion, setDeletingSuggestion] = useState<QuickSuggestionResponse | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Import CSV Wizard State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<QuickSuggestionType | null>(null);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview/Validation, 3: Completed
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Clear messages automatically
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  // Fetch Settings
  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await quickSuggestionsApi.getSettings();
      setSettings(res);
      // Auto select active tab based on what's enabled
      if (res.isEntryExitEnabled) {
        setActiveLibraryTab(QuickSuggestionType.EntryExit);
      } else if (res.isRoutineEnabled) {
        setActiveLibraryTab(QuickSuggestionType.Routine);
      }
    } catch (err: any) {
      console.error("Failed to load quick suggestion settings:", err);
      showError("Failed to load quick suggestion settings.");
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Update settings handler
  const handleUpdateSettings = async (updates: Partial<UpdateQuickSuggestionSettingsRequest>) => {
    if (!settings) return;
    try {
      setSavingSettings(true);
      const request: UpdateQuickSuggestionSettingsRequest = {
        isEntryExitEnabled: updates.isEntryExitEnabled !== undefined ? updates.isEntryExitEnabled : settings.isEntryExitEnabled,
        isRoutineEnabled: updates.isRoutineEnabled !== undefined ? updates.isRoutineEnabled : settings.isRoutineEnabled,
        combineDictionaries: updates.combineDictionaries !== undefined ? updates.combineDictionaries : settings.combineDictionaries
      };
      const updated = await quickSuggestionsApi.updateSettings(request);
      setSettings(updated);
      showSuccess("Settings updated successfully!");
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      showError("Failed to update settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Fetch Suggestions
  const fetchSuggestions = useCallback(async (
    type: QuickSuggestionType,
    page: number,
    pageSize: number,
    search: string,
    sortBy: string
  ) => {
    setLibStates(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true }
    }));
    try {
      const result = await quickSuggestionsApi.getSuggestions(
        type,
        search || undefined,
        sortBy,
        page,
        pageSize
      );
      setLibStates(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          suggestions: result.data || [],
          totalCount: result.totalCount || 0,
          loading: false
        }
      }));
    } catch (error: any) {
      console.error(`Error fetching suggestions for library ${type}:`, error);
      setLibStates(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false }
      }));
    }
  }, []);

  // Trigger fetches on dependency changes
  useEffect(() => {
    if (settings?.isEntryExitEnabled) {
      const s = libStates[QuickSuggestionType.EntryExit];
      fetchSuggestions(QuickSuggestionType.EntryExit, s.page, s.pageSize, s.search, s.sortBy);
    }
  }, [
    settings?.isEntryExitEnabled,
    libStates[QuickSuggestionType.EntryExit].page,
    libStates[QuickSuggestionType.EntryExit].pageSize,
    libStates[QuickSuggestionType.EntryExit].search,
    libStates[QuickSuggestionType.EntryExit].sortBy,
    fetchSuggestions
  ]);

  useEffect(() => {
    if (settings?.isRoutineEnabled) {
      const s = libStates[QuickSuggestionType.Routine];
      fetchSuggestions(QuickSuggestionType.Routine, s.page, s.pageSize, s.search, s.sortBy);
    }
  }, [
    settings?.isRoutineEnabled,
    libStates[QuickSuggestionType.Routine].page,
    libStates[QuickSuggestionType.Routine].pageSize,
    libStates[QuickSuggestionType.Routine].search,
    libStates[QuickSuggestionType.Routine].sortBy,
    fetchSuggestions
  ]);

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setLibStates(prev => {
        if (prev[QuickSuggestionType.EntryExit].search !== searchInputs[QuickSuggestionType.EntryExit]) {
          return {
            ...prev,
            [QuickSuggestionType.EntryExit]: {
              ...prev[QuickSuggestionType.EntryExit],
              search: searchInputs[QuickSuggestionType.EntryExit],
              page: 1
            }
          };
        }
        return prev;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInputs[QuickSuggestionType.EntryExit]]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setLibStates(prev => {
        if (prev[QuickSuggestionType.Routine].search !== searchInputs[QuickSuggestionType.Routine]) {
          return {
            ...prev,
            [QuickSuggestionType.Routine]: {
              ...prev[QuickSuggestionType.Routine],
              search: searchInputs[QuickSuggestionType.Routine],
              page: 1
            }
          };
        }
        return prev;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInputs[QuickSuggestionType.Routine]]);

  // CRUD Actions
  const handleAddSuggestion = async (type: QuickSuggestionType, e: React.FormEvent) => {
    e.preventDefault();
    const form = addForms[type];
    if (!form.text.trim()) return;

    try {
      setAddingStates(prev => ({ ...prev, [type]: true }));
      await quickSuggestionsApi.create({
        type,
        text: form.text.trim(),
        shortcut: form.shortcut.trim() || undefined
      });
      setAddForms(prev => ({
        ...prev,
        [type]: { text: "", shortcut: "" }
      }));
      showSuccess("Suggestion phrase created successfully!");
      // Refresh list
      const s = libStates[type];
      fetchSuggestions(type, s.page, s.pageSize, s.search, s.sortBy);
    } catch (err: any) {
      console.error("Add suggestion failed:", err);
      showError(err?.response?.data?.message || "Failed to create suggestion. Make sure text and shortcut are unique.");
    } finally {
      setAddingStates(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleOpenEdit = (suggestion: QuickSuggestionResponse) => {
    setEditingSuggestion(suggestion);
    setEditForm({
      text: suggestion.text,
      shortcut: suggestion.shortcut || "",
      isActive: suggestion.isActive
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuggestion) return;
    if (!editForm.text.trim()) return;

    try {
      setSavingEdit(true);
      await quickSuggestionsApi.update(editingSuggestion.id, {
        text: editForm.text.trim(),
        shortcut: editForm.shortcut.trim() || undefined,
        isActive: editForm.isActive
      });
      setEditModalOpen(false);
      setEditingSuggestion(null);
      showSuccess("Suggestion updated successfully.");
      // Refresh list
      const type = editingSuggestion.type;
      const s = libStates[type];
      fetchSuggestions(type, s.page, s.pageSize, s.search, s.sortBy);
    } catch (err: any) {
      console.error("Edit suggestion failed:", err);
      showError(err?.response?.data?.message || "Failed to update suggestion. Make sure text and shortcut are unique.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (suggestion: QuickSuggestionResponse) => {
    try {
      await quickSuggestionsApi.update(suggestion.id, {
        text: suggestion.text,
        shortcut: suggestion.shortcut,
        isActive: !suggestion.isActive
      });
      // Refresh list
      const type = suggestion.type;
      const s = libStates[type];
      fetchSuggestions(type, s.page, s.pageSize, s.search, s.sortBy);
      showSuccess(`Suggestion status updated.`);
    } catch (err: any) {
      console.error("Status toggle failed:", err);
      showError("Failed to update status.");
    }
  };

  const handleOpenDelete = (suggestion: QuickSuggestionResponse) => {
    setDeletingSuggestion(suggestion);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSuggestion) return;
    try {
      setDeletingLoading(true);
      await quickSuggestionsApi.delete(deletingSuggestion.id);
      setDeleteConfirmOpen(false);
      showSuccess("Suggestion deleted successfully.");
      // Refresh list
      const type = deletingSuggestion.type;
      const s = libStates[type];
      fetchSuggestions(type, s.page, s.pageSize, s.search, s.sortBy);
      setDeletingSuggestion(null);
    } catch (err: any) {
      console.error("Delete suggestion failed:", err);
      showError("Failed to delete suggestion.");
    } finally {
      setDeletingLoading(false);
    }
  };

  // CSV Import Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImportFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImportFile(e.target.files[0]);
    }
  };

  const processImportFile = async (file: File) => {
    if (!importType) return;
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setImportError("Invalid file type. Please upload a CSV (.csv) file.");
      return;
    }
    setImportFile(file);
    setImportError(null);
    setImportLoading(true);

    try {
      const previewResult = await quickSuggestionsApi.previewImport(importType, file);
      setImportPreview(previewResult);
      setImportStep(2); // Go to Preview
    } catch (err: any) {
      console.error("CSV import preview failed:", err);
      setImportError(err?.response?.data?.message || "Failed to parse CSV file. Ensure it is formatted correctly with a header or text column.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importType || !importPreview) return;
    const validRecords = importPreview.rows.filter(r => r.isValid).map(r => ({
      type: importType,
      text: r.text,
      shortcut: r.shortcut || undefined
    }));

    if (validRecords.length === 0) {
      setImportError("There are no valid records to import.");
      return;
    }

    try {
      setImportLoading(true);
      setImportError(null);
      const resultCount = await quickSuggestionsApi.commitImport({
        type: importType,
        records: validRecords
      });
      setCommittedCount(resultCount);
      setImportStep(3); // Completed step
      // Refresh list
      const s = libStates[importType];
      fetchSuggestions(importType, s.page, s.pageSize, s.search, s.sortBy);
      showSuccess(`Import completed! Successfully imported ${resultCount} suggestions.`);
    } catch (err: any) {
      console.error("Import commit failed:", err);
      setImportError(err?.response?.data?.message || "An error occurred while committing the imported suggestions.");
    } finally {
      setImportLoading(false);
    }
  };

  const resetImportWizard = () => {
    setImportModalOpen(false);
    setImportType(null);
    setImportStep(1);
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    setImportLoading(false);
  };

  const handleOpenImport = (type: QuickSuggestionType) => {
    setImportType(type);
    setImportStep(1);
    setImportModalOpen(true);
  };

  const handleExportCsv = async (type: QuickSuggestionType) => {
    try {
      const blob = await quickSuggestionsApi.exportCsv(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quick_suggestions_${type === QuickSuggestionType.EntryExit ? "entry_exit" : "routine"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("CSV file downloaded successfully.");
    } catch (err) {
      console.error("CSV export failed:", err);
      showError("Failed to export suggestions to CSV.");
    }
  };

  const renderPagination = (type: QuickSuggestionType) => {
    const state = libStates[type];
    const totalPages = Math.max(1, Math.ceil(state.totalCount / state.pageSize));

    const handlePrev = () => {
      if (state.page > 1) {
        setLibStates(prev => ({
          ...prev,
          [type]: { ...prev[type], page: state.page - 1 }
        }));
      }
    };

    const handleNext = () => {
      if (state.page < totalPages) {
        setLibStates(prev => ({
          ...prev,
          [type]: { ...prev[type], page: state.page + 1 }
        }));
      }
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Rows per page:</span>
          <select
            className="h-9 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={state.pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setLibStates(prev => ({
                ...prev,
                [type]: { ...prev[type], pageSize: newSize, page: 1 }
              }));
            }}
          >
            {[5, 10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500 ml-4">
            Showing {Math.min(state.totalCount, (state.page - 1) * state.pageSize + 1)} to{" "}
            {Math.min(state.totalCount, state.page * state.pageSize)} of {state.totalCount} entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={state.page <= 1 || state.loading}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3">
            Page {state.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={state.page >= totalPages || state.loading}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Render a single suggestions library panel
  const renderLibraryPanel = (type: QuickSuggestionType, title: string, subtitle: string) => {
    const state = libStates[type];
    const form = addForms[type];
    const isAdding = addingStates[type];

    return (
      <Card className="border-gray-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenImport(type)}
                className="h-9 text-xs px-3 hover:bg-gray-100"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv(type)}
                className="h-9 text-xs px-3 hover:bg-gray-100"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 flex-1 flex flex-col">
          {/* Quick Add Form */}
          <form onSubmit={(e) => handleAddSuggestion(type, e)} className="mb-6 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label htmlFor={`phrase-text-${type}`} className="text-xs font-semibold text-gray-700">
                  New Suggestion Phrase *
                </Label>
                <Input
                  id={`phrase-text-${type}`}
                  placeholder="e.g. Wall paint is chipping slightly near the doorway."
                  value={form.text}
                  onChange={(e) => setAddForms(prev => ({
                    ...prev,
                    [type]: { ...prev[type], text: e.target.value }
                  }))}
                  required
                  className="mt-1 bg-white h-10 border-gray-200"
                />
              </div>
              <div className="w-full lg:w-48">
                <Label htmlFor={`phrase-shortcut-${type}`} className="text-xs font-semibold text-gray-700">
                  Text Shortcut (Optional)
                </Label>
                <Input
                  id={`phrase-shortcut-${type}`}
                  placeholder="e.g. wpch"
                  value={form.shortcut}
                  onChange={(e) => setAddForms(prev => ({
                    ...prev,
                    [type]: { ...prev[type], shortcut: e.target.value }
                  }))}
                  className="mt-1 bg-white h-10 border-gray-200"
                />
              </div>
              <Button
                type="submit"
                disabled={isAdding || !form.text.trim()}
                className="w-full lg:w-auto h-10 px-4 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Phrase
              </Button>
            </div>
          </form>

          {/* Search, Sort and Filters Row */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phrase or shortcut..."
                value={searchInputs[type]}
                onChange={(e) => setSearchInputs(prev => ({ ...prev, [type]: e.target.value }))}
                className="pl-9 h-10 border-gray-200"
              />
              {searchInputs[type] && (
                <button
                  type="button"
                  onClick={() => setSearchInputs(prev => ({ ...prev, [type]: "" }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                value={state.sortBy}
                onChange={(e) => {
                  setLibStates(prev => ({
                    ...prev,
                    [type]: { ...prev[type], sortBy: e.target.value, page: 1 }
                  }));
                }}
              >
                <option value="a-z">Phrase (A-Z)</option>
                <option value="z-a">Phrase (Z-A)</option>
                <option value="shortcutasc">Shortcut (A-Z)</option>
                <option value="shortcutdesc">Shortcut (Z-A)</option>
                <option value="createdatdesc">Newest First</option>
                <option value="createdatasc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Suggestions List Table */}
          <div className="flex-1 responsive-table-wrapper border border-gray-100 rounded-xl">
            {state.loading && state.suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm text-gray-500 mt-2">Loading suggestions...</span>
              </div>
            ) : state.suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-gray-900">No suggestions found</h4>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  {state.search
                    ? "We couldn't find any suggestions matching your search query. Try another term."
                    : "Get started by adding your first inspection shortcut or template phrase above."}
                </p>
              </div>
            ) : (
              <div className="responsive-table-wrapper">
                <Table className="responsive-table">
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="w-[60%]">Phrase Text</TableHead>
                      <TableHead className="w-[20%]">Shortcut</TableHead>
                      <TableHead className="w-[10%] text-center">Active</TableHead>
                      <TableHead className="w-[10%] text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.suggestions.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <TableCell className="font-medium align-top py-4">
                          <p className="text-gray-900 break-words leading-relaxed">{item.text}</p>
                        </TableCell>
                        <TableCell className="align-top py-4">
                          {item.shortcut ? (
                            <Badge variant="outline" className="font-mono text-xs bg-gray-50 px-2 py-0.5 border-gray-200">
                              {item.shortcut}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center align-top py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.isActive ? "bg-green-500" : "bg-gray-200"
                              }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.isActive ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-right align-top py-3 pr-6">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-gray-100"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(item)}
                              className="h-8 w-8 text-gray-500 hover:text-destructive hover:bg-gray-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {state.suggestions.length > 0 && renderPagination(type)}
        </CardContent>
      </Card>
    );
  };

  if (loadingSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-gray-500 mt-2">Loading suggestion module...</span>
      </div>
    );
  }

  const isAnyLibraryEnabled = settings?.isEntryExitEnabled || settings?.isRoutineEnabled;

  return (
    <div className="space-y-6">
      {/* Settings Module Control Header */}
      <Card className="border-gray-200 shadow-sm bg-gradient-to-r from-white to-gray-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                Library Configuration
              </h3>
              <p className="text-sm text-gray-500">
                Quick suggestions provide templates and shortcuts for typing inspection notes quickly. Customize your libraries here.
              </p>
            </div>

            {/* Configure Toggles */}
            <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
              {/* Toggle Entry / Exit */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateSettings({ isEntryExitEnabled: !settings?.isEntryExitEnabled })}
                  disabled={savingSettings}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings?.isEntryExitEnabled ? "bg-primary" : "bg-gray-200"
                    } ${savingSettings ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings?.isEntryExitEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">Entry/Exit Dictionaries</span>
                  <span className="text-xs text-gray-400">Isolated settings dict</span>
                </div>
              </div>

              <div className="h-8 w-px bg-gray-100 hidden sm:block" />

              {/* Toggle Routine */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateSettings({ isRoutineEnabled: !settings?.isRoutineEnabled })}
                  disabled={savingSettings}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings?.isRoutineEnabled ? "bg-primary" : "bg-gray-200"
                    } ${savingSettings ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings?.isRoutineEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">Routine Dictionaries</span>
                  <span className="text-xs text-gray-400">Isolated routine dict</span>
                </div>
              </div>

              {isAnyLibraryEnabled && (
                <>
                  <div className="h-8 w-px bg-gray-100 hidden sm:block" />

                  {/* Toggle Combine */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings({ combineDictionaries: !settings?.combineDictionaries })}
                      disabled={savingSettings}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings?.combineDictionaries ? "bg-primary" : "bg-gray-200"
                        } ${savingSettings ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings?.combineDictionaries ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800">Combine Layout</span>
                      <span className="text-xs text-gray-400">Show libraries side-by-side</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Alerts */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 text-green-800 shadow-sm animate-fade-in">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800 shadow-sm animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {!isAnyLibraryEnabled ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4 border border-amber-100">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h4 className="font-bold text-lg text-gray-900">All Quick Suggestion libraries disabled</h4>
          <p className="text-sm text-gray-500 mt-2 max-w-md">
            Please enable the "Entry/Exit Dictionaries" or "Routine Dictionaries" settings toggle above to manage suggestion terms.
          </p>
        </div>
      ) : settings?.combineDictionaries ? (
        /* Side by side layout / Combined layout */
        <div className="responsive-grid-2">
          {settings.isEntryExitEnabled && (
            <div className="w-full">
              {renderLibraryPanel(
                QuickSuggestionType.EntryExit,
                "Entry / Exit Suggestions",
                "Dedicated dictionary library used exclusively for Entry and Exit property inspections."
              )}
            </div>
          )}
          {settings.isRoutineEnabled && (
            <div className="w-full">
              {renderLibraryPanel(
                QuickSuggestionType.Routine,
                "Routine Suggestions",
                "Dedicated dictionary library used exclusively for Routine property inspections."
              )}
            </div>
          )}
        </div>
      ) : (
        /* Tabbed Layout / Separated View */
        <div className="space-y-6">
          <div className="flex border-b border-gray-200">
            {settings.isEntryExitEnabled && (
              <button
                onClick={() => setActiveLibraryTab(QuickSuggestionType.EntryExit)}
                className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all duration-150 ${activeLibraryTab === QuickSuggestionType.EntryExit
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Entry / Exit Suggestions
              </button>
            )}
            {settings.isRoutineEnabled && (
              <button
                onClick={() => setActiveLibraryTab(QuickSuggestionType.Routine)}
                className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all duration-150 ${activeLibraryTab === QuickSuggestionType.Routine
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Routine Suggestions
              </button>
            )}
          </div>

          <div>
            {activeLibraryTab === QuickSuggestionType.EntryExit && settings.isEntryExitEnabled &&
              renderLibraryPanel(
                QuickSuggestionType.EntryExit,
                "Entry / Exit Suggestions",
                "Dedicated dictionary library used exclusively for Entry and Exit property inspections."
              )}
            {activeLibraryTab === QuickSuggestionType.Routine && settings.isRoutineEnabled &&
              renderLibraryPanel(
                QuickSuggestionType.Routine,
                "Routine Suggestions",
                "Dedicated dictionary library used exclusively for Routine property inspections."
              )}
          </div>
        </div>
      )}

      {/* Edit Suggestion Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingSuggestion(null);
        }}
        title="Edit Quick Suggestion"
        widthClassName="max-w-lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-5">
          <div>
            <Label htmlFor="edit-text" className="text-sm font-semibold text-gray-800">
              Suggestion Phrase *
            </Label>
            <Input
              id="edit-text"
              value={editForm.text}
              onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
              required
              className="mt-1 h-11 border-gray-200"
            />
          </div>

          <div>
            <Label htmlFor="edit-shortcut" className="text-sm font-semibold text-gray-800">
              Text Shortcut (Optional)
            </Label>
            <Input
              id="edit-shortcut"
              value={editForm.shortcut}
              onChange={(e) => setEditForm(prev => ({ ...prev, shortcut: e.target.value }))}
              className="mt-1 h-11 border-gray-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.isActive ? "bg-green-500" : "bg-gray-200"
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
            <span className="text-sm font-semibold text-gray-700">Suggestion Active / Enabled</span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingSuggestion(null);
              }}
              className="h-10 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit || !editForm.text.trim()} className="h-10 px-5">
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingSuggestion(null);
        }}
        title="Delete Quick Suggestion"
        widthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Warning: Destructive Action</h4>
              <p className="text-xs mt-0.5">This action cannot be undone.</p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete this suggestion?
          </p>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-800 font-medium break-words italic">
              "{deletingSuggestion?.text}"
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeletingSuggestion(null);
              }}
              className="h-10 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingLoading}
              onClick={handleDeleteConfirm}
              className="h-10 px-5"
            >
              {deletingLoading ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal (Wizard) */}
      <Modal
        isOpen={importModalOpen}
        onClose={resetImportWizard}
        title={`Import ${importType === QuickSuggestionType.EntryExit ? "Entry/Exit" : "Routine"
          } Suggestions`}
        widthClassName={importStep === 2 ? "max-w-4xl" : "max-w-lg"}
      >
        {importStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-900">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">CSV Import Instructions</p>
                <p>Upload a CSV file containing your custom suggestions. The CSV should have two columns:</p>
                <ul className="list-disc pl-4 space-y-0.5 mt-1 font-mono">
                  <li><strong>Text / Phrase</strong> (Required, max 1000 chars)</li>
                  <li><strong>Shortcut</strong> (Optional, unique, max 50 chars)</li>
                </ul>
                <p className="mt-1.5 italic text-blue-700">Example: "Door hinge needs lubrication.","dhlub"</p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${dragActive
                ? "border-primary bg-primary/5 scale-[0.99]"
                : "border-gray-300 hover:border-primary/50 hover:bg-gray-50/50"
                }`}
            >
              <Upload className="h-10 w-10 text-gray-400 mb-4 animate-pulse" />
              <p className="font-semibold text-gray-800 text-sm">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">Accepts .csv files only</p>

              <input
                type="file"
                id="csv-file-picker"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("csv-file-picker")?.click()}
                className="mt-4 hover:bg-gray-100 text-xs"
              >
                Browse Files
              </Button>
            </div>

            {importLoading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-gray-500 font-medium">Parsing and validating CSV...</span>
              </div>
            )}

            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-800 shadow-sm animate-fade-in text-xs">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Upload Error</span>
                  <p className="mt-0.5">{importError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={resetImportWizard} className="h-10">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {importStep === 2 && importPreview && (
          <div className="space-y-6 flex flex-col h-[70vh]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-100 gap-4 shrink-0">
              <div>
                <h4 className="font-bold text-sm text-gray-900">Parsed CSV Statistics</h4>
                <p className="text-xs text-gray-500 mt-0.5">Please review validation warnings before importing.</p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="px-3 py-1 bg-white flex gap-1.5 items-center font-semibold">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {importPreview.totalRecords} Total Rows
                </Badge>
                <Badge variant="success" className="px-3 py-1 flex gap-1.5 items-center font-semibold">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {importPreview.validCount} Valid
                </Badge>
                {importPreview.invalidCount > 0 && (
                  <Badge variant="destructive" className="px-3 py-1 flex gap-1.5 items-center font-semibold">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {importPreview.invalidCount} Warnings/Errors
                  </Badge>
                )}
              </div>
            </div>

            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-800 text-xs shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p>{importError}</p>
              </div>
            )}

            {/* Validation Rows Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50/30 responsive-table-wrapper">
              <Table className="responsive-table">
                <TableHeader className="bg-gray-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[10%]">Row</TableHead>
                    <TableHead className="w-[45%]">Phrase Text</TableHead>
                    <TableHead className="w-[20%]">Shortcut</TableHead>
                    <TableHead className="w-[25%] pr-6">Status & Validation Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.rows.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={`border-b transition-colors ${row.isValid
                        ? "bg-green-50/40 hover:bg-green-50/70 border-green-100"
                        : "bg-red-50/50 hover:bg-red-50/80 border-red-100"
                        }`}
                    >
                      <TableCell className="font-mono text-xs font-semibold py-3 text-gray-500">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell className="py-3">
                        <p className={`text-xs break-all ${row.isValid ? "text-green-950 font-medium" : "text-red-950"}`}>
                          {row.text || <span className="italic text-red-500">Empty</span>}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        {row.shortcut ? (
                          <Badge variant="outline" className={`font-mono text-[10px] ${row.isValid ? "border-green-300 bg-green-50/80 text-green-800" : "border-red-300 bg-red-50/80 text-red-800"}`}>
                            {row.shortcut}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 pr-6 align-top">
                        {row.isValid ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Valid
                          </div>
                        ) : (
                          <div className="space-y-1 text-[11px] text-red-800 font-medium">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                              Invalid
                            </div>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {row.validationErrors.map((err, idx) => (
                                <li key={idx} className="break-words leading-tight">{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Commit Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 shrink-0">
              <div className="text-xs text-gray-500">
                {importPreview.invalidCount > 0 && (
                  <p className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Invalid rows will be skipped. Only valid rows will be committed.
                  </p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" onClick={() => setImportStep(1)} className="h-10 hover:bg-gray-100">
                  Back
                </Button>
                <Button
                  onClick={handleCommitImport}
                  disabled={importLoading || importPreview.validCount === 0}
                  className="h-10 px-5"
                >
                  {importLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    `Import ${importPreview.validCount} Valid Row${importPreview.validCount !== 1 ? "s" : ""}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {importStep === 3 && (
          <div className="space-y-6 text-center py-6">
            <div className="h-14 w-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-green-500 mb-2">
              <CheckCircle className="h-8 w-8 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-gray-900">Import Completed!</h4>
              <p className="text-sm text-gray-500 mt-1">
                Successfully committed <strong>{committedCount}</strong> new quick suggestion phrase{committedCount !== 1 ? "s" : ""} to your dictionary.
              </p>
            </div>

            <div className="flex justify-center pt-4 border-t border-gray-100">
              <Button onClick={resetImportWizard} className="h-10 px-6">
                Done & Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuickSuggestions;

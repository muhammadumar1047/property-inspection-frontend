"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, RotateCcw, Mail, Pencil, Lock, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import InspectionReport from "@/components/InspectionReport";
import SendEmailModal from "@/components/SendEmailModal";
import CloseReportModal, { CloseReportData } from "@/components/CloseReportModal";
import api from "@/lib/api/http";
import { inspectionApi } from "@/lib/api/inspection";
import { propertyApi } from "@/lib/api/property";
import type { InspectionReportData, InspectionReportResponse, ReportArea, ReportItem, ReportCondition, ReportMedia } from "@/types/report";
import type { InspectionResponse } from "@/types/api";
import { InspectionStatus } from "@/types/api";
import axios from "axios";

export default function InspectionReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isPdfMode = searchParams.get("pdf") === "1";

  const [report, setReport] = useState<InspectionReportData | null>(null);
  const [inspection, setInspection] = useState<InspectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isClosed = inspection?.inspectionStatus === InspectionStatus.Closed;
  const isCompleted = inspection?.inspectionStatus === InspectionStatus.Completed;

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [reportResponse, inspectionResponse] = await Promise.all([
          api.get<InspectionReportResponse>(`/report/inspection/${id}`),
          api.get<any>(`/inspection/${id}`),
        ]);

        const envelope = reportResponse.data;
        const reportData =
          (envelope && "data" in envelope ? envelope.data : (envelope as any)?.Data ?? envelope) as
          | InspectionReportData
          | null;

        if (!reportData || !reportData.inspectionId) {
          setError("Inspection report data is empty.");
          return;
        }
        setReport(reportData);

        const inspEnvelope = inspectionResponse.data;
        const inspData: InspectionResponse =
          inspEnvelope && "data" in inspEnvelope
            ? inspEnvelope.data
            : (inspEnvelope as any)?.Data ?? inspEnvelope;
        setInspection(inspData ?? null);
      } catch (err: any) {
        console.error("Failed to load report:", err);
        const msg = axios.isAxiosError(err)
          ? err.response?.data?.message || err.response?.data?.Message || err.message
          : err?.message || "Failed to load inspection report.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleEdit = useCallback(() => {
    if (!id || !isCompleted) return;
    setIsEditing(true);
  }, [id, isCompleted]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    // Reload report to discard any unsaved changes
    if (id) {
      setLoading(true);
      api.get<InspectionReportResponse>(`/report/inspection/${id}`)
        .then((reportResponse) => {
          const envelope = reportResponse.data;
          const reportData =
            (envelope && "data" in envelope ? envelope.data : (envelope as any)?.Data ?? envelope) as
            | InspectionReportData
            | null;
          if (reportData) setReport(reportData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!id || !report) return;
    try {
      setSaving(true);
      setSaveMessage(null);

      // Build the ReportSyncDto from the current report state
      const syncPayload = {
        agencyId: inspection?.agencyId || null,
        reportId: report.id,
        inspectionId: report.inspectionId,
        reportType: report.reportType,
        notes: report.notes || "",
        createdAt: report.createdAt,
        reportAreas: (report.areas || []).map((area) => ({
          reportAreaId: area.areaId,
          name: area.areaName,
          reportItems: (area.items || []).map((item) => ({
            reportItemId: item.itemId,
            name: item.itemName,
            reportItemConditions: (item.conditions || []).map((condition) => ({
              reportItemConditionId: condition.id,
              reportItemId: item.itemId,
              description: condition.description,
              type: condition.type,
              value: condition.value ?? null,
            })),
            reportItemComments: item.inspectorComments
              ? item.inspectorComments
                .split(/\r?\n/)
                .filter((line) => line.trim())
                .map((line) => ({
                  reportItemCommentId: crypto.randomUUID(),
                  reportItemId: item.itemId,
                  text: line.trim(),
                }))
              : [],
            reportMedia: (item.media || []).map((media) => ({
              reportMediaId: media.mediaId,
              reportItemId: item.itemId,
              url: media.url,
              type: media.type,
              reportMediaComments: (media.comments || []).map((comment) => ({
                reportMediaCommentId: crypto.randomUUID(),
                reportMediaId: media.mediaId,
                text: typeof comment === "string" ? comment : "",
                x: null,
                y: null,
              })),
            })),
          })),
        })),
      };

      await api.post(`/reportsync/sync`, syncPayload);
      setSaveMessage("Report saved successfully.");

      // Exit editing mode after successful save
      setIsEditing(false);
    } catch (err: any) {
      console.error("Save failed:", err);
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.Message || err.message
        : err?.message || "Failed to save report.";
      setSaveMessage(msg);
    } finally {
      setSaving(false);
    }
  }, [id, report, inspection?.agencyId]);

  // Auto-clear save message after 5 seconds
  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  // Update a single condition value in the report state (creates condition if missing)
  const handleConditionChange = useCallback(
    (areaId: string, itemId: string, conditionId: string, newValue: string, description?: string, type?: string) => {
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          areas: prev.areas.map((area) => {
            if (area.areaId !== areaId) return area;
            return {
              ...area,
              items: area.items.map((item) => {
                if (item.itemId !== itemId) return item;
                const existingCondition = item.conditions.find((c) => c.id === conditionId);
                if (existingCondition) {
                  return {
                    ...item,
                    conditions: item.conditions.map((condition) => {
                      if (condition.id !== conditionId) return condition;
                      return { ...condition, value: newValue };
                    }),
                  };
                }
                // Create new condition if it doesn't exist
                return {
                  ...item,
                  conditions: [
                    ...item.conditions,
                    {
                      id: conditionId,
                      reportItemId: item.itemId,
                      description: description || "",
                      type: type || "boolean",
                      value: newValue,
                    },
                  ],
                };
              }),
            };
          }),
        };
      });
    },
    []
  );

  // Update inspector comments for an item in the report state
  const handleCommentsChange = useCallback(
    (areaId: string, itemId: string, newComments: string) => {
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          areas: prev.areas.map((area) => {
            if (area.areaId !== areaId) return area;
            return {
              ...area,
              items: area.items.map((item) => {
                if (item.itemId !== itemId) return item;
                return { ...item, inspectorComments: newComments };
              }),
            };
          }),
        };
      });
    },
    []
  );

  // Add new photos to a specific item
  const handleAddPhotos = useCallback(
    async (areaId: string, itemId: string, files: File[]) => {
      if (!inspection?.propertyId || files.length === 0) return;

      try {
        const uploadedImages = await propertyApi.uploadImages(
          inspection.propertyId.toString(),
          files,
          inspection.agencyId?.toString() || null
        );

        setReport((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            areas: prev.areas.map((area) => {
              if (area.areaId !== areaId) return area;
              return {
                ...area,
                items: area.items.map((item) => {
                  if (item.itemId !== itemId) return item;
                  const newMedia: ReportMedia[] = uploadedImages.map((img) => ({
                    mediaId: crypto.randomUUID(),
                    reportItemId: itemId,
                    url: img.fileUrl || "",
                    type: "photo",
                    comments: [],
                  }));
                  return {
                    ...item,
                    media: [...(item.media || []), ...newMedia],
                  };
                }),
              };
            }),
          };
        });
      } catch (err) {
        console.error("Photo upload failed:", err);
      }
    },
    [inspection?.propertyId, inspection?.agencyId]
  );

  const handleClose = useCallback(() => {
    if (!id || !isCompleted) return;
    setShowCloseModal(true);
  }, [id, isCompleted]);

  const handleCloseReportSubmit = useCallback(async (data: CloseReportData) => {
    if (!id || !inspection) return;
    try {
      setClosingLoading(true);
      const ok = await inspectionApi.update(id, {
        id,
        propertyId: inspection.propertyId,
        agencyId: inspection.agencyId ?? null,
        inspectionType: Number(inspection.inspectionType),
        inspectionStatus: InspectionStatus.Closed,
        inspectorId: inspection.inspectorId,
        address: inspection.propertyAddress || '',
        inspectionDate: inspection.inspectionDate,
        inspectionTime: inspection.inspectionTime,
        inspectionCompletedDate: data.inspectionCompletedDate || null,
        inspectionCloseDate: data.inspectionCloseDate || null,
        signatureImageUrl: data.signatureImageUrl || null,
        signatureDate: data.signatureDate || null,
      } as any);

      if (!ok) throw new Error('Failed to close report');

      setShowCloseModal(false);
      // Reload to reflect the status change
      window.location.reload();
    } catch (err: any) {
      console.error("Close failed:", err);
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.Message || err.message
        : err?.message || "Failed to close report.";
      alert(msg);
    } finally {
      setClosingLoading(false);
    }
  }, [id, inspection]);

  const handleReopen = useCallback(async () => {
    if (!id || !isClosed || reopening) return;
    try {
      setReopening(true);

      // Fetch the full inspection data needed for the update payload
      const inspectionData = await api.get<any>(`/inspection/${id}`);
      const inspEnvelope = inspectionData.data;
      const insp: any =
        inspEnvelope && "data" in inspEnvelope
          ? inspEnvelope.data
          : (inspEnvelope as any)?.Data ?? inspEnvelope;

      const ok = await inspectionApi.update(id, {
        id,
        propertyId: insp.propertyId ?? insp.PropertyId,
        agencyId: insp.agencyId ?? insp.AgencyId ?? null,
        inspectionType: Number(insp.inspectionType ?? insp.InspectionType),
        inspectionStatus: InspectionStatus.Completed,
        inspectorId: insp.inspectorId ?? insp.InspectorId,
        address: insp.propertyAddress ?? insp.address ?? "",
        inspectionDate: insp.inspectionDate ?? insp.InspectionDate,
        inspectionTime: insp.inspectionTime ?? insp.InspectionTime,
      } as any);

      if (!ok) throw new Error("Failed to reopen report");

      // Reload the page to reflect the status change
      window.location.reload();
    } catch (err: any) {
      console.error("Reopen failed:", err);
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.Message || err.message
        : err?.message || "Failed to reopen report.";
      alert(msg);
    } finally {
      setReopening(false);
    }
  }, [id, isClosed, reopening]);

  const handleSendEmail = useCallback(() => {
    if (!id || !isClosed) return;
    setShowSendEmailModal(true);
  }, [id, isClosed]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-bold text-lg">Generating Report</p>
          <p className="text-slate-500 text-sm">Please wait while we prepare your professional document...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 transition-transform hover:rotate-0">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Report Unavailable</h2>
          <p className="text-slate-500 mb-10 leading-relaxed">{error || "The requested inspection report could not be found or is still being processed."}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.back()} className="h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()} className="h-12 rounded-xl font-semibold text-slate-500">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-200 selection:bg-primary/10"
      {...(isPdfMode ? { "data-pdf-mode": "true" } : {})}
    >
      {/* ── Action Bar (hidden in PDF mode so Puppeteer captures clean report only) ── */}
      {!isPdfMode && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
          <div className="max-w-[1250px] mx-auto px-6 py-3 flex items-center justify-center gap-3 flex-wrap">
            {/* Status message */}
            {saveMessage && (
              <span
                className={`text-xs ${saveMessage.includes("failed") || saveMessage.includes("Failed")
                  ? "text-rose-500"
                  : "text-emerald-600"
                  }`}
              >
                {saveMessage.includes("successfully") || saveMessage.includes("saved") ? (
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                ) : null}
                {saveMessage}
              </span>
            )}

            {/* Edit mode: Save and Cancel buttons */}
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 rounded-xl font-semibold gap-2 text-sm shadow-md"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  variant="outline"
                  className="h-10 rounded-xl font-semibold gap-2 text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {/* Edit button — only visible when report is completed */}
                {isCompleted && (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="h-10 rounded-xl font-semibold gap-2 text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                )}

                {/* Close button — only visible when report is completed */}
                {isCompleted && (
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="h-10 rounded-xl font-semibold gap-2 text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    Close
                  </Button>
                )}

                {/* Reopen button — only visible when report is closed */}
                {isClosed && (
                  <Button
                    onClick={handleReopen}
                    disabled={reopening}
                    variant="outline"
                    className="h-10 rounded-xl font-semibold gap-2 text-sm"
                  >
                    {reopening ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    Reopen
                  </Button>
                )}

                {/* Send Email button — only visible when report is closed */}
                {isClosed && (
                  <Button
                    onClick={handleSendEmail}
                    variant="outline"
                    className="h-10 rounded-xl font-semibold gap-2 text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PDF-style Viewer ── */}
      <div className="flex justify-center py-8 px-4">
        <div className="report-pdf-viewer-wrapper report-pdf-mode">
          <InspectionReport
            report={report}
            isEditing={isEditing && isCompleted}
            onConditionChange={handleConditionChange}
            onCommentsChange={handleCommentsChange}
            onAddPhotos={handleAddPhotos}
          />
        </div>
      </div>

      {/* ── Send Email Modal ── */}
      <SendEmailModal
        isOpen={showSendEmailModal}
        onClose={() => setShowSendEmailModal(false)}
        inspectionId={id}
        inspectionType={inspection?.inspectionType!}
      />

      {/* ── Close Report Modal ── */}
      <CloseReportModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        inspection={inspection}
        onCloseReport={handleCloseReportSubmit}
        loading={closingLoading}
      />

      {/* No bottom toolbar — removed to keep the UI clean */}
    </div>
  );
}

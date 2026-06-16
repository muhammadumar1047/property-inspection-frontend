"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft, Download, CheckCircle2, RotateCcw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import InspectionReport from "@/components/InspectionReport";
import SendEmailModal from "@/components/SendEmailModal";
import api from "@/lib/api/http";
import { inspectionApi } from "@/lib/api/inspection";
import type { InspectionReportData, InspectionReportResponse } from "@/types/report";
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
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);

  const isClosed = inspection?.inspectionStatus === InspectionStatus.Closed;

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

  const handleDownloadPdf = useCallback(async () => {
    if (!id || !isClosed || pdfDownloading) return;
    try {
      setPdfDownloading(true);
      setPdfMessage("Generating PDF...");

      const result = await inspectionApi.generatePdf(id);

      if (result.pdfUrl) {
        setPdfMessage(result.cached ? "PDF retrieved from storage." : "PDF generated successfully.");
        // Append S3 response-content-disposition=inline to force the browser to
        // display the PDF in-browser instead of auto-downloading it. Without this
        // parameter, S3 serves PDFs with Content-Disposition: attachment which
        // triggers an immediate file download.
        const separator = result.pdfUrl.includes("?") ? "&" : "?";
        window.open(result.pdfUrl + separator + "response-content-disposition=inline", "_blank");
      }
    } catch (err: any) {
      console.error("PDF download failed:", err);
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.Message || err.message
        : err?.message || "Failed to generate PDF.";
      setPdfMessage(msg);
    } finally {
      setPdfDownloading(false);
      // Clear message after 5 seconds
      setTimeout(() => setPdfMessage(null), 5000);
    }
  }, [id, isClosed, pdfDownloading]);

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
            {pdfMessage && (
              <span
                className={`text-xs ${pdfMessage.includes("failed") || pdfMessage.includes("Failed")
                  ? "text-rose-500"
                  : "text-emerald-600"
                  }`}
              >
                {pdfMessage.includes("successfully") || pdfMessage.includes("retrieved") ? (
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                ) : null}
                {pdfMessage}
              </span>
            )}

            {/* Download PDF button */}
            <Button
              onClick={handleDownloadPdf}
              disabled={!isClosed || pdfDownloading}
              className="h-10 rounded-xl font-semibold gap-2 text-sm shadow-md"
              variant={isClosed ? "default" : "secondary"}
              title={
                !isClosed
                  ? "PDF download is only available for closed inspection reports"
                  : "Download PDF"
              }
            >
              {pdfDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </Button>

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
          </div>
        </div>
      )}

      {/* ── PDF-style Viewer ── */}
      <div className="flex justify-center py-8 px-4">
        <div className="report-pdf-viewer-wrapper report-pdf-mode">
          <InspectionReport report={report} />
        </div>
      </div>

      {/* ── Send Email Modal ── */}
      <SendEmailModal
        isOpen={showSendEmailModal}
        onClose={() => setShowSendEmailModal(false)}
        inspectionId={id}
        inspectionType={inspection?.inspectionType!}
      />

      {/* No bottom toolbar — removed to keep the UI clean */}
    </div>
  );
}

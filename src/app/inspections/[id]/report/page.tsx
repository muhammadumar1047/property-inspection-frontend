"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import InspectionReport from "@/components/InspectionReport";
import api from "@/lib/api/http";
import type { InspectionReportData, InspectionReportResponse } from "@/types/report";
import axios from "axios";

export default function InspectionReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [report, setReport] = useState<InspectionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<InspectionReportResponse>(`/report/inspection/${id}`);
        const envelope = response.data;
        const reportData =
          (envelope && "data" in envelope ? envelope.data : (envelope as any)?.Data ?? envelope) as
            | InspectionReportData
            | null;

        if (!reportData || !reportData.inspectionId) {
          setError("Inspection report data is empty.");
          return;
        }
        setReport(reportData);
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

    loadReport();
  }, [id]);

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

  const isPdfMode = searchParams?.get("pdf") === "1";

  const handleDownloadPdf = () => {
    if (!id) return;
    const currentUrl = new URL(window.location.href);
    currentUrl.search = "";
    currentUrl.hash = "";
    const reportUrl = currentUrl.toString();
    const rawName = report?.header?.propertyAddress || report?.header?.reportTitle || `inspection-${id}`;
    const safeName = rawName
      .toString()
      .trim()
      .replace(/[^a-z0-9-_ ]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const filename = `${safeName || `inspection-${id}`}.pdf`;
    const pdfUrl = `/api/pdf?url=${encodeURIComponent(reportUrl)}&filename=${encodeURIComponent(filename)}`;
    setDownloading(true);
    window.location.href = pdfUrl;
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div
      className={[
        "min-h-screen bg-white p-0 m-0 selection:bg-primary/10 report-print-preview",
        isPdfMode ? "report-pdf-mode" : "",
      ].join(" ")}
    >
      {!isPdfMode ? (
        <div className="print:hidden sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-3">
            <div className="text-sm font-semibold text-slate-700">Inspection Report</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.back()} className="h-9 px-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleDownloadPdf} className="h-9 px-3" disabled={downloading}>
                <FileDown className="mr-2 h-4 w-4" />
                {downloading ? "Preparing..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
        {report ? <InspectionReport report={report} /> : null}
      </div>
    </div>
  );
}

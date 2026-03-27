"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReportViewer from "@/components/ReportViewer";
import { reportApi } from "@/lib/api";
import { mapApiReportToViewer } from "@/lib/report-mapping";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InspectionReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await reportApi.getInspectionReport(id);
        
        if (reportData) {
          // Check if inspection is closed
          const statusId = Number(reportData.inspection?.inspectionStatus);
          if (statusId !== 5) { // 5 is Closed
            setError("This report is not yet available for viewing. It must be in 'Closed' status.");
            return;
          }

          const mapped = mapApiReportToViewer(reportData);
          setReport(mapped);
        } else {
          setError("Inspection report data is empty.");
        }
      } catch (err: any) {
        console.error("Failed to load report:", err);
        const msg = err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to load inspection report.";
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

  return (
    <div className="min-h-screen bg-slate-200 py-8 px-6 print:bg-white print:p-0 print:m-0 selection:bg-primary/10">
      <div className="max-w-[1200px] mx-auto transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
        <ReportViewer report={report} />
      </div>
    </div>
  );
}

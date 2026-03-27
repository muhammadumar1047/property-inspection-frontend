"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PropertyDetail from "@/components/properties/PropertyDetail";
import ReportViewer from "@/components/ReportViewer";
import { reportApi } from "@/lib/api";
import type { ReportDto } from "@/types/api";

export default function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const search = useSearchParams();
  const inspectionIdParam = search?.get("viewReportForInspectionId");
  const mode = (search?.get('mode') || '').toLowerCase();
  const [report, setReport] = useState<ReportDto | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!inspectionIdParam) return;
      const inspectionId = Number(inspectionIdParam);
      if (!inspectionId || Number.isNaN(inspectionId)) return;
      setReportLoading(true);
      setReportError(null);
      try {
        const r = await reportApi.getInspectionReport(String(inspectionId));
        setReport(r);
      } catch (e: any) {
        setReportError(e?.response?.data?.message || e?.message || "Failed to load report");
      } finally {
        setReportLoading(false);
      }
    };
    load();
  }, [inspectionIdParam]);

  if (reportLoading) return <div className="p-6">Loading report…</div>;
  if (reportError) return <div className="p-6 text-red-600">{reportError}</div>;
  if (report) {
    const statusId = Number(report.inspection?.inspectionStatus);
    const isPendingOrActive = [1, 2, 3].includes(statusId);
    
    if (mode === 'edit' && isPendingOrActive) {
      return (
        <div className="p-10 text-center bg-amber-50 rounded-xl border border-amber-200 m-6">
          <h2 className="text-xl font-bold text-amber-800 mb-2">Report Editor Unavailable</h2>
          <p className="text-amber-700">The report is not yet ready for editing. The inspection must be in 'Completed' status.</p>
          <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors">Go Back</button>
        </div>
      );
    }

    return <ReportViewer report={report} editable={mode === 'edit' && statusId === 4} onSave={async (changed) => {
      try {
        const updated = await reportApi.updateInspectionReport(report.inspectionId, changed);
        setReport(updated);
      } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Failed to save report');
      }
    }} />;
  }

  return <PropertyDetail id={id} />;
}



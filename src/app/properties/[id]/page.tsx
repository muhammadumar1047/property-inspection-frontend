"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PropertyDetail from "@/components/properties/PropertyDetail";
import ReportViewer from "@/components/ReportViewer";
import { reportApi } from "@/lib/api";
import type { InspectionReportDto } from "@/types/api";

export default function PropertyPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const search = useSearchParams();
  const inspectionIdParam = search?.get("viewReportForInspectionId");
  const mode = (search?.get('mode') || '').toLowerCase();
  const [report, setReport] = useState<InspectionReportDto | null>(null);
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
        const r = await reportApi.getInspectionReport(inspectionId);
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
  if (report) return <ReportViewer report={report} editable={mode === 'edit'} onSave={async (changed) => {
    try {
      const updated = await reportApi.updateInspectionReport(report.inspectionId, changed);
      setReport(updated);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to save report');
    }
  }} />;

  return <PropertyDetail id={id} />;
}



"use client";

import React from "react";
import ReportViewer from "@/components/ReportViewer";
import { MOCK_INSPECTION_REPORT } from "@/lib/mock-report";

export default function InspectionReportPage() {
  return (
    <div className="min-h-screen bg-slate-200 py-8 px-6 print:bg-white print:p-0 print:m-0">
      <ReportViewer report={MOCK_INSPECTION_REPORT as any} />
    </div>
  );
}

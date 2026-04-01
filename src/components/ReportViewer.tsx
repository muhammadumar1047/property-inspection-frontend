"use client";

import React from "react";

/* ══════════════════════════════════════════════════════
   PREMIUM REPORT VIEWER — PropCheck360
   Expert frontend design for professional agencies
   ══════════════════════════════════════════════════════ */

/* Status Badges */
const Check = () => (
  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200">
    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </span>
);
const Cross = () => (
  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 border border-rose-200">
    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </span>
);
const Dash = () => (
  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 border border-slate-200">
    <span className="w-3 h-0.5 bg-slate-300 rounded" />
  </span>
);
const StatusCell = ({ value }: { value?: boolean | null }) =>
  value === true ? <Check /> : value === false ? <Cross /> : <Dash />;

/* ─── Page Footer ─── */
function PageFooter({ report, pageNum, totalPages }: { report: any; pageNum: number; totalPages: number }) {
  return (
    <div className="mt-auto">
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-8" />
      <div className="px-10 py-5 flex items-end justify-between">
        <div className="min-w-[170px]">
          <p className="text-[11px] font-semibold text-slate-800 tracking-wide">{report.agencyName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{report.agencyAddress}</p>
        </div>
        <div className="flex gap-12 items-end">
          <div className="text-center">
            <p className="text-[11px] font-medium text-slate-700 italic tracking-wide">{report.inspectorName}</p>
            <div className="w-32 h-px bg-slate-300 mt-1.5 mb-1" />
            <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400">Inspector</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium text-slate-700 italic tracking-wide">{report.signatures?.tenant?.name || "—"}</p>
            <div className="w-32 h-px bg-slate-300 mt-1.5 mb-1" />
            <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400">Tenant</p>
          </div>
        </div>
        <div className="text-right min-w-[100px]">
          <p className="text-[10px] text-slate-400">
            <span className="font-semibold text-slate-600">{pageNum}</span> / {totalPages}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Page Header (inner pages) ─── */
function InnerHeader({ report }: { report: any }) {
  return (
    <div className="flex items-center justify-between px-10 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] flex items-center justify-center">
          <span className="text-white text-xs font-black">P</span>
        </div>
        <span className="text-sm font-bold text-slate-800 tracking-tight">{report.agencyName}</span>
      </div>
      <p className="text-[11px] text-slate-400 tracking-wide">{report.propertyAddress}</p>
    </div>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ title, id, subtitle }: { title: string; id?: string; subtitle?: string }) {
  return (
    <div id={id} className="scroll-mt-6 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary-600)]" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.08em]">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function ReportViewer({
  report,
  editable,
  onSave,
}: {
  report: any;
  editable?: boolean;
  onSave?: (changed: any) => Promise<void>;
}) {
  React.useEffect(() => {
    // Handle initial hash scrolling after data is likely rendered
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Highlight effect
          if (id.startsWith("photo-")) {
            element.classList.add("ring-4", "ring-primary", "ring-offset-4", "scale-105");
            setTimeout(() => {
              element.classList.remove("ring-4", "ring-primary", "ring-offset-4", "scale-105");
            }, 3000);
          }
        }
      }, 500);
    }
  }, []);

  const areas = report.areas || report.reportAreas || [];
  const areaCount = areas.length;
  const totalPages = 4 + areaCount;

  const defaultGuidelines = {
    howToComplete: [
      "Complete and sign three copies (or one electronic copy) as landlord or agent.",
      "Give two copies to the tenant before or when signing the agreement.",
      "Inspect premises and mark each item \"Y\" or \"N\" in the condition columns.",
      "Tenant must return one signed copy within 7 days.",
    ],
    importantInformation: [
      "This report records the premises condition at tenancy commencement and may be used as evidence.",
      "At tenancy end, the premises condition will be compared to this original report.",
      "Complete a condition report whether or not a rental bond is paid.",
    ],
  };

  const australiaGuidelinesByState: Record<string, { howToComplete: string[]; importantInformation: string[] }> = {
    NSW: {
      howToComplete: [
        "Landlord/agent completes this condition report before or at the start of tenancy.",
        "Provide two copies to the tenant within the required start-of-tenancy period.",
        "Tenant checks each item and records agreement/disagreement with condition notes.",
        "Tenant returns one signed copy to the landlord/agent within 7 days.",
      ],
      importantInformation: [
        "This report may be used as evidence for bond claims at the end of tenancy.",
        "If tenant and landlord/agent disagree, both comments should be kept on the report.",
        "Keep a signed copy safely with the tenancy records.",
      ],
    },
    VIC: {
      howToComplete: [
        "Rental provider/agent prepares the condition report before tenant occupation.",
        "Give the tenant the report at the start of the rental agreement.",
        "Tenant reviews, adds comments where needed, and signs the report.",
        "Tenant returns the signed report within the required timeframe.",
      ],
      importantInformation: [
        "The condition report is used to compare property condition at move-out.",
        "Document all pre-existing wear and damage to avoid later disputes.",
        "Retain the final signed report as part of rental records.",
      ],
    },
  };

  const normalize = (value?: string | null) => (value || "").toString().trim().toUpperCase();
  const rawCountry = report?.country || report?.propertyCountry || report?.jurisdictionCountry || "";
  const rawState = report?.state || report?.propertyState || report?.jurisdiction || "";
  const isAustralia = ["AU", "AUS", "AUSTRALIA"].includes(normalize(rawCountry));
  const stateKey = normalize(rawState);

  const selectedGuidelines = isAustralia
    ? (australiaGuidelinesByState[stateKey] || defaultGuidelines)
    : defaultGuidelines;

  let pageCounter = 0;
  const nextPage = () => ++pageCounter;

  // Collect all images
  const allImages: { area: string; item: string; imgId: number; comment?: string; url?: string }[] = [];
  areas.forEach((area: any) => {
    const items = area.items || area.reportItems || [];
    items.forEach((item: any) => {
      // Direct images array (legacy/mock)
      item.images?.forEach((img: number) => {
        allImages.push({ area: area.name, item: item.name, imgId: img, comment: item.comments });
      });
      // New mediaItems structure (dynamic)
      item.mediaItems?.forEach((media: any) => {
        // Only push if not already added by legacy logic (to avoid duplicates)
        if (!allImages.find(x => x.imgId === media.id)) {
           allImages.push({ 
             area: area.name, 
             item: item.name, 
             imgId: media.id, 
             comment: media.comments || item.comments, 
             url: media.url 
           });
        }
      });
    });
  });

  // Navigation
  const navSections = [
    { id: "cover", label: "Cover Page", icon: "◎" },
    { id: "standards", label: "Standards", icon: "◈" },
    ...areas.map((a: any, i: number) => ({ id: `area-${i}`, label: a.name || a.areaName, icon: `${i + 1}` })),
    ...(allImages.length > 0 ? [{ id: "media", label: "Photos", icon: "◉" }] : []),
    { id: "summary", label: "Summary", icon: "◆" },
  ];

  return (
    <div className="flex gap-8">

      {/* ═══════════ SIDEBAR ═══════════ */}
      <nav className="w-52 shrink-0 print:hidden sticky top-6 self-start">
        <div className="rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
          <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] px-5 py-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-medium">Navigation</p>
            <p className="font-bold text-white text-sm mt-0.5">Report Sections</p>
          </div>
          <div className="py-3 px-2">
            {navSections.map((s, idx) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-50 hover:text-[var(--primary)] transition-all duration-200"
              >
                <span className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-[var(--primary-50)] flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-[var(--primary)] transition-colors">
                  {s.icon}
                </span>
                <span className="font-medium">{s.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══════════ REPORT BODY ═══════════ */}
      <div className="report-document flex-1 min-w-0">

        {/* ╔══════════════════════════════════════╗
           ║       PAGE 1 — COVER PAGE            ║
           ╚══════════════════════════════════════╝ */}
        <section id="cover" className="a4-page overflow-hidden">
          {/* Hero */}
          <div className="relative text-white overflow-hidden">
            {/* Property image background */}
            <div className="absolute inset-0">
              <img src="/property-hero-bg.png" alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/90 via-[var(--primary)]/85 to-[#001d3a]/95" />
            </div>

            <div className="relative px-10 pt-10 pb-8">
              {/* Agency row */}
              <div className="flex items-start justify-between mb-12">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/15 shadow-lg shadow-black/10">
                    <span className="text-3xl font-black text-white/90">P</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight leading-tight">{report.agencyName}</h1>
                    <p className="text-white/50 text-[13px] mt-1">{report.agencyAddress}</p>
                    <p className="text-white/50 text-[13px]">{report.agencyPhone}</p>
                  </div>
                </div>
                <div className="bg-white/[0.07] backdrop-blur-md rounded-xl px-5 py-3 border border-white/10">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1">Report ID</p>
                  <p className="font-mono text-[13px] font-bold tracking-wide">{report.id}</p>
                </div>
              </div>

              {/* Title block */}
              <div className="border-t border-white/10 pt-8">
                <div className="inline-block bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded mb-3">
                  Condition Report
                </div>
                <h2 className="text-4xl font-black tracking-tight leading-[1.1]">{report.reportTitle}</h2>
                <p className="text-white/40 text-sm mt-3 font-medium">{report.regulation} — {report.jurisdiction}</p>
              </div>
            </div>
          </div>

          {/* Details section */}
          <div className="px-10 py-8 flex-1 space-y-6">

            {/* Key Details — Single clean split card */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_1px_1fr]">
                {/* Left — Property */}
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Property Details</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Address</p>
                      <p className="text-[15px] font-bold text-slate-900 leading-snug">{report.propertyAddress}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Tenant(s)</p>
                      <p className="text-[15px] font-semibold text-slate-700">{report.tenantNames?.join(", ")}</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="bg-slate-200" />

                {/* Right — Inspection */}
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary-50)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Inspection Details</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Type</p>
                      <span className="inline-block text-[13px] font-bold text-[var(--primary)] bg-[var(--primary-50)] px-2.5 py-0.5 rounded-md">Ingoing</span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Inspector</p>
                      <p className="text-[14px] font-semibold text-slate-700">{report.inspectorName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Lease Start</p>
                      <p className="text-sm text-slate-600">{report.leaseStartDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Inspection Date</p>
                      <p className="text-sm font-semibold text-slate-800">{report.inspectionDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guidelines — Subtle background, two-column */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-6">
              <div className="grid grid-cols-2 gap-8">
                {/* How to Complete */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-5 rounded-full bg-amber-400" />
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-700">How to Complete</p>
                  </div>
                  <ol className="space-y-2.5 list-none">
                    {selectedGuidelines.howToComplete.map((text, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm mt-px">{i + 1}</span>
                        <p className="text-[12px] text-slate-500 leading-relaxed">{text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Important Information */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-5 rounded-full bg-[var(--primary)]" />
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-700">Important Information</p>
                  </div>
                  <ul className="space-y-2.5 list-none">
                    {selectedGuidelines.importantInformation.map((text, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm mt-px">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                        </span>
                        <p className="text-[12px] text-slate-500 leading-relaxed">{text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>

          <PageFooter report={report} pageNum={nextPage()} totalPages={totalPages} />
        </section>

        {/* ╔══════════════════════════════════════╗
           ║     PAGE 2 — STANDARDS & CHECKS      ║
           ╚══════════════════════════════════════╝ */}
        <section id="standards" className="a4-page">
          <InnerHeader report={report} />
          <div className="px-10 py-8 flex-1 space-y-6">

            {/* Communication Facilities */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Communication Facilities</h4>
                  <p className="text-[11px] text-slate-400">Connectivity & telecommunications</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {report.summaryInfo?.communicationFacilities?.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <p className="text-[13px] text-slate-600 pr-4">{f.label}</p>
                    <div className="flex-shrink-0 w-16 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N/A</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Water Efficiency */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Water Efficiency Standards</h4>
                  <p className="text-[11px] text-slate-400">Regulatory compliance checks</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {report.summaryInfo?.waterEfficiency?.standards?.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <p className="text-[13px] text-slate-600 pr-4">{s.label}</p>
                    <div className="flex-shrink-0 w-16 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N/A</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Issues */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Health Issues</h4>
                  <p className="text-[11px] text-slate-400">Safety & environmental assessment</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {report.summaryInfo?.healthIssues?.map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <p className="text-[13px] text-slate-600 pr-4">{h.label}</p>
                    <div className="flex-shrink-0 w-16 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N/A</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
          <PageFooter report={report} pageNum={nextPage()} totalPages={totalPages} />
        </section>

        {/* ╔══════════════════════════════════════╗
           ║    PAGES 3+ — ROOM / AREA DETAILS    ║
           ╚══════════════════════════════════════╝ */}
        {areas.map((area: any, areaIdx: number) => {
          const items = area.items || area.reportItems || [];
          const areaName = area.name || area.areaName || `Area ${areaIdx + 1}`;
          
          return (
            <section key={areaIdx} id={`area-${areaIdx}`} className="a4-page !overflow-visible">
              <InnerHeader report={report} />
              <div className="px-10 py-8 flex-1">
                {/* Area Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-700)] flex items-center justify-center shadow-md shadow-[var(--primary)]/20">
                    <span className="text-white font-black text-sm">{areaIdx + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">{areaName}</h3>
                    <p className="text-[11px] text-slate-400">{items.length} items inspected</p>
                  </div>
                </div>

                {/* Condition Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider w-[22%]">Item</th>
                        <th className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider w-[10%]">Clean</th>
                        <th className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider w-[10%]">Undam.</th>
                        <th className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider w-[10%]">Working</th>
                        <th className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider w-[10%]">Keys</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, itemIdx: number) => {
                        const itemName = item.name || item.itemName;
                        // Helper for raw structures if mapper wasn't used
                        const getVal = (field: string) => {
                          if (item[field] !== undefined) return item[field];
                          const conditions = item.reportItemConditions || [];
                          const cond = conditions.find((c: any) => c.description?.toLowerCase() === field.toLowerCase());
                          if (!cond || !cond.value) return null;
                          return cond.value.toUpperCase() === 'Y' || cond.value.toUpperCase() === 'YES';
                        };
                        const comments = item.comments || item.reportItemComments?.map((c: any) => c.text).join('\n') || "";

                        return (
                          <tr key={itemIdx} className={`border-b border-slate-100 last:border-0 ${itemIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                            <td className="px-5 py-4 font-semibold text-slate-800">{itemName}</td>
                            <td className="px-3 py-4 text-center"><StatusCell value={getVal('clean')} /></td>
                            <td className="px-3 py-4 text-center"><StatusCell value={getVal('undamaged')} /></td>
                            <td className="px-3 py-4 text-center"><StatusCell value={getVal('working')} /></td>
                            <td className="px-3 py-4 text-center"><StatusCell value={getVal('keys')} /></td>
                            <td className="px-5 py-4 text-slate-500 text-[13px]">
                              {comments && <span className="text-slate-600 whitespace-pre-wrap">{comments}</span>}
                              {(item.images || item.reportMedia) && (
                                <span className="inline-flex gap-1 ml-2">
                                  {(item.images || []).map((img: number) => (
                                    <a
                                      key={img}
                                      href={`#photo-${img}`}
                                      className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 pl-1.5 pr-2 py-0.5 rounded-full font-semibold hover:bg-blue-100 transition-colors no-underline border border-blue-100"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      {img}
                                    </a>
                                  ))}
                                  {(item.mediaItems || []).map((media: any) => (
                                    <a
                                      key={media.id}
                                      href={`#photo-${media.id}`}
                                      className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 pl-1.5 pr-2 py-0.5 rounded-full font-semibold hover:bg-blue-100 transition-colors no-underline border border-blue-100"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      {media.id}
                                    </a>
                                  ))}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <PageFooter report={report} pageNum={nextPage()} totalPages={totalPages} />
            </section>
          );
        })}

        {/* ╔══════════════════════════════════════╗
           ║      PHOTOS & MEDIA PAGE             ║
           ╚══════════════════════════════════════╝ */}
        {allImages.length > 0 && (
          <section id="media" className="a4-page">
            <InnerHeader report={report} />
            <div className="px-10 py-8 flex-1">
              <SectionLabel title="Photos & Media" subtitle={`${allImages.length} images captured during inspection`} id="media-heading" />
              <div className="grid grid-cols-3 gap-5 mt-6">
                {allImages.map((img) => (
                  <div
                    key={`${img.area}-${img.item}-${img.imgId}`}
                    id={`photo-${img.imgId}`}
                    className="rounded-xl border border-slate-200 overflow-hidden scroll-mt-6 group hover:shadow-lg hover:border-slate-300 transition-all duration-500"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 relative flex items-center justify-center overflow-hidden">
                      {img.url ? (
                        <img 
                          src={img.url} 
                          alt={`${img.area} - ${img.item}`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="text-center opacity-60 group-hover:opacity-80 transition-opacity">
                          <svg className="w-8 h-8 text-slate-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[11px] text-slate-400 font-mono">#{img.imgId}</p>
                        </div>
                      )}
                      {img.comment && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3 pt-8 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                          <p className="text-white text-[11px] leading-snug font-medium line-clamp-2">{img.comment}</p>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[12px] font-bold text-slate-800">{img.area}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{img.item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <PageFooter report={report} pageNum={nextPage()} totalPages={totalPages} />
          </section>
        )}

        {/* ╔══════════════════════════════════════╗
           ║     LAST PAGE — SUMMARY              ║
           ╚══════════════════════════════════════╝ */}
        <section id="summary" className="a4-page">
          <InnerHeader report={report} />
          <div className="px-10 py-8 flex-1 space-y-10">
            {/* Summary Stats */}
            <div>
              <SectionLabel title="Inspection Summary" subtitle="Overview of findings" />
              <div className="grid grid-cols-4 gap-4 mt-4">
                {[
                  { value: areaCount, label: "Areas", color: "from-[var(--primary)] to-[var(--primary-700)]" },
                  { value: areas.reduce((a: number, ar: any) => a + (ar.items || ar.reportItems || []).length, 0), label: "Items", color: "from-emerald-500 to-emerald-600" },
                  { value: allImages.length, label: "Photos", color: "from-blue-500 to-blue-600" },
                  { value: report.inspectionDate, label: "Date", color: "from-amber-500 to-amber-600", isText: true },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className={`h-1.5 bg-gradient-to-r ${stat.color}`} />
                    <div className="p-4 text-center">
                      <p className={`${(stat as any).isText ? 'text-sm' : 'text-3xl'} font-black text-slate-800`}>{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium mt-1">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspector Comments */}
            <div>
              <SectionLabel title="Inspector Comments" subtitle="Additional observations" />
              <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/30 min-h-[100px]">
                <p className="text-[13px] text-slate-400 italic">No additional comments recorded for this inspection.</p>
              </div>
            </div>

            {/* Signatures */}
            <div>
              <SectionLabel title="Formal Signatures" subtitle="Parties acknowledge the contents of this report" />
              <div className="grid grid-cols-2 gap-6 mt-4">
                {[
                  { role: "Landlord / Agent", name: report.signatures?.inspector?.name, date: report.signatures?.inspector?.date },
                  { role: "Tenant", name: report.signatures?.tenant?.name, date: report.signatures?.tenant?.date },
                ].map((sig) => (
                  <div key={sig.role} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200">
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{sig.role}</p>
                    </div>
                    <div className="p-6">
                      <div className="h-20 border-b-2 border-slate-800 mb-3 flex items-end justify-center pb-2">
                        <span className="text-[15px] font-semibold text-slate-600 italic">{sig.name}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                        <span>Signature</span>
                        <span>Date: {sig.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <PageFooter report={report} pageNum={nextPage()} totalPages={totalPages} />
        </section>
      </div>
    </div>
  );
}

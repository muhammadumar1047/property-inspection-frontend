"use client";

import React from "react";
import type { InspectionReportData, ReportCondition, ReportMedia } from "@/types/report";

const isTruthy = (value?: string | null) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return ["true", "yes", "y", "1"].includes(normalized);
};

const formatValue = (condition: ReportCondition) => {
  const raw = condition.value ?? "";
  const trimmed = String(raw).trim();

  if (condition.type === "boolean") {
    if (!trimmed) return "N/A";
    return isTruthy(raw) ? "Yes" : "No";
  }

  if (condition.type === "date") {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }
    return trimmed || "N/A";
  }

  if (condition.type === "number") {
    const num = Number(trimmed);
    return Number.isFinite(num) ? num.toString() : trimmed || "Ã¢â‚¬â€";
  }

  return trimmed || "N/A";
};

const displayValue = (value?: string | null) => {
  const trimmed = (value || "").toString().trim();
  return trimmed || "N/A";
};

const getYoutubeEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com") {
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.replace("/shorts/", "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
};

const MediaGrid = ({ media }: { media: ReportMedia[] }) => {
  if (!media || media.length === 0) return null;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {media.map((m) => {
        const isPhoto = m.type === "photo";
        const youtubeEmbed = !isPhoto ? getYoutubeEmbedUrl(m.url) : null;
        return (
          <div key={m.mediaId} className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            {isPhoto ? (
              <img src={m.url} alt="Inspection media" className="h-40 w-full object-cover" />
            ) : youtubeEmbed ? (
              <iframe
                className="h-40 w-full"
                src={youtubeEmbed}
                title="Inspection video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="h-40 w-full flex items-center justify-center text-xs text-slate-500 bg-slate-50 px-3 text-center">
                Video link: {m.url}
              </div>
            )}
            <div className="px-3 py-2 text-[11px] text-slate-500 border-t border-slate-100">
              {m.type.toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PageHeader = ({ title, address }: { title?: string | null; address?: string | null }) => (
  <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100">
    <div className="text-sm font-semibold text-slate-800">{displayValue(title) || "Inspection Report"}</div>
    <div className="text-[11px] text-slate-400">{displayValue(address)}</div>
  </div>
);

const PageFooter = ({ page, total }: { page: number; total: number }) => (
  <div className="mt-auto border-t border-slate-100 px-8 py-4 flex items-center justify-end text-[10px] text-slate-400">
    <span className="font-semibold text-slate-600">{page}</span> / {total}
  </div>
);

const resolveCoverImage = (report: InspectionReportData) => {
  const raw =
    (report.header as any)?.propertyImageUrl ||
    (report as any)?.propertyImageUrl ||
    (report as any)?.propertyImages ||
    (report as any)?.inspection?.property?.propertyImages;

  if (!raw) return "/property-hero-bg.png";
  if (Array.isArray(raw)) return raw[0] || "/property-hero-bg.png";
  if (typeof raw === "string") {
    const first = raw.split(",").map((s) => s.trim()).find(Boolean);
    return first || "/property-hero-bg.png";
  }
  return "/property-hero-bg.png";
};

export default function InspectionReport({ report }: { report: InspectionReportData }) {
  const header = report.header || ({} as InspectionReportData["header"]);
  const areas = report.areas || [];
  const totalPages = 1 + areas.length;
  const coverImage = resolveCoverImage(report);

  return (
    <div className="report-document space-y-8">
      <section className="a4-page overflow-hidden pt-10">
        <div className="relative h-80">
          <img src={coverImage} alt="Property" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/65 via-slate-900/40 to-slate-900/10" />
          <div className="absolute bottom-6 left-8 right-8">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-6 py-5 text-white shadow-xl">
              <div className="flex items-start gap-4">
                {header.agencyLogoUrl ? (
                  <div className="h-12 w-12 rounded-lg bg-white/95 border border-white/70 shadow-md flex items-center justify-center overflow-hidden">
                    <img
                      src={header.agencyLogoUrl}
                      alt={header.agencyName ?? "Agency logo"}
                      className="h-9 w-9 object-contain"
                    />
                  </div>
                ) : null}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.35em] text-white/70">Condition Report</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{displayValue(header.reportTitle)}</div>
                  <div className="text-sm text-white/80 mt-1">{displayValue(header.propertyAddress)}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-6 text-[11px] text-white/90">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Tenant</div>
                  <div className="font-semibold text-white">{displayValue(header.tenant?.name)}</div>
                  <div>{displayValue(header.tenant?.contactInfo)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Inspector</div>
                  <div className="font-semibold text-white">{displayValue(header.inspector?.name)}</div>
                  <div>{displayValue(header.inspector?.email)}</div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/60">Lease</div>
                  <div>
                    {header.leaseStartDate ? new Date(header.leaseStartDate).toLocaleDateString() : "N/A"}
                  </div>
                  <div>
                    {header.leaseEndDate ? new Date(header.leaseEndDate).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/60">Inspection Date</div>
                  <div>
                    {header.inspectionDate ? new Date(header.inspectionDate).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-8 py-6 flex-1 space-y-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div>{displayValue(header.agencyName)}</div>
            <div>{displayValue(header.agencyPhone)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-[11px] leading-relaxed text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">How to Complete This Report</div>
              <p>Three copies, or one electronic copy, of this condition report should be completed and signed by the landlord or the landlord’s agent.</p>
            <p className="mt-2">Two copies, or one electronic copy, of the report, which have been completed and signed by the landlord or landlord’s agent, must be given to the tenant before or when the tenant signs the agreement. The landlord or landlord’s agent keeps the third copy or an electronic copy.</p>
            <p className="mt-2">Before the tenancy begins, the landlord or the landlord’s agent must inspect the residential premises and record the condition of the premises by indicating whether the particular room item is clean, undamaged and working by placing “Y” (YES) or “N” (NO) in the appropriate column (see example below). Where necessary, comments should be included in the report. The landlord or landlord’s agent must also indicate “yes” or “no” in relation to the matters set out under the headings “Health issues” and “Communications facilities”.</p>
            <p className="mt-2">If the tenant has agreed to pay for water usage charges under the residential tenancy agreement, the landlord or landlord’s agent must also indicate whether the residential premises have the required water efficiency measures.</p>
            <p className="mt-2">As soon as possible after the tenant signs the agreement, the tenant must inspect the residential premises and complete the tenant section of the condition report. The tenant indicates agreement or disagreement with the condition indicated by the landlord or landlord’s agent by placing “Y” (YES) or “N” (NO) in the appropriate column and by making any appropriate comments on the form. The tenant may also comment on the matters under the headings “Health issues”, “Communications facilities” and “Water efficiency devices”.</p>
            <p className="mt-2">The tenant must return one copy of the completed condition report to the landlord or landlord’s agent within 7 days after receiving it and is to keep the second copy.</p>
            <p className="mt-2">At, or as soon as practicable after, the termination of the tenancy agreement, both the landlord and tenant should complete the copy of the condition report that they retained, indicating the condition of the premises at the end of the tenancy. This should be done in the presence of the other party, unless the other party has been given a reasonable opportunity to be present and has not attended the inspection.</p>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">Important Information</div>
            <p>It is a requirement that a condition report be completed by the landlord and the tenant (see above). This condition report is an important record of the condition of the residential premises when the tenancy begins and may be used as evidence of the state of repair or general condition of the premises at the commencement of the tenancy. It is important to complete the condition report accurately. It may be vital if there is a dispute, particularly about the return of the rental bond money and any damage to the premises.</p>
            <p className="mt-2">At the end of the tenancy the premises will be inspected and the condition of the premises at that time will be compared to that stated in the original condition report.</p>
            <p className="mt-2">A condition report should be filled out whether or not a rental bond is paid.</p>
            <p className="mt-2">If you do not have enough space on the report attach a separate sheet.</p>
            <p className="mt-2">Call Fair Trading on 13 32 20 or visit the website for information about the rights and responsibilities of landlords and tenants or before completing the condition report.</p>
          </div>
        </div>
        <PageFooter page={1} total={totalPages} />
      </section>

      {areas.map((area, idx) => (
        <section key={area.areaId} className="a4-page pt-8">
          <PageHeader title={displayValue(header.reportTitle)} address={displayValue(header.propertyAddress)} />
          <div className="px-8 py-6 flex-1">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{displayValue(area.areaName)}</h2>
              <div className="mt-4 space-y-6">
                {area.items.map((item) => (
                  <div key={item.itemId} className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-800">{displayValue(item.itemName)}</h3>
                      <span className="text-xs text-slate-500">
                        Comments: {displayValue(item.inspectorComments)}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(item.conditions || []).map((condition) => (
                        <div
                          key={condition.id}
                          className="flex items-center justify-between gap-4 rounded-md border border-slate-100 bg-white px-3 py-2 text-sm"
                        >
                          <dt className="text-slate-600">{displayValue(condition.description)}</dt>
                          <dd className="font-medium text-slate-900">{formatValue(condition)}</dd>
                        </div>
                      ))}
                    </dl>
                    <MediaGrid media={item.media || []} />
                  </div>
                ))}
              </div>
            </section>
          </div>
          <PageFooter page={idx + 2} total={totalPages} />
        </section>
      ))}
    </div>
  );
}


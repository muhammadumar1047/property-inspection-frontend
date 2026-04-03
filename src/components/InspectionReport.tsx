"use client";

import React from "react";
import type { InspectionReportData, ReportCondition, ReportMedia } from "@/types/report";

const DEFAULT_ACCENT = "#f59e0b";

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
    return isTruthy(raw) ? "Y" : "N";
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
  if (!trimmed) return "N/A";
  const normalized = trimmed.toLowerCase();
  if (normalized === "true") return "Y";
  if (normalized === "false") return "N";
  return trimmed;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? displayValue(value) : parsed.toLocaleDateString();
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

const StatusBadge = ({ value }: { value?: string | null }) => {
  if (!value) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400">
        —
      </span>
    );
  }

  const isYes = isTruthy(value);
  return (
    <span
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
        isYes ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200",
      ].join(" ")}
    >
      {isYes ? "Y" : "N"}
    </span>
  );
};

const MediaGrid = ({ media, label }: { media: ReportMedia[]; label: string }) => {
  if (!media || media.length === 0) return null;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {media.map((m, index) => {
        const isPhoto = m.type === "photo";
        const youtubeEmbed = !isPhoto ? getYoutubeEmbedUrl(m.url) : null;
        return (
          <div key={m.mediaId} className="rounded-md border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between bg-[var(--report-accent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              <span className="truncate">{label}</span>
              <span>Image {index + 1}</span>
            </div>
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
            <div className="px-2 py-1 text-[10px] text-slate-500 border-t border-slate-100">
              {m.type.toUpperCase()} {m.comments?.length ? `• ${m.comments.join(" ")}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PageHeader = ({ address }: { address?: string | null }) => (
  <div className="px-8 pt-4">
    <div className="text-[10px] uppercase tracking-wide text-slate-400">Address of premises</div>
    <div className="text-[12px] font-semibold text-slate-800">{displayValue(address)}</div>
    <div className="mt-2 h-px w-full bg-slate-200" />
  </div>
);

const PageFooter = ({
  page,
  total,
  inspectorName,
  inspectionDate,
  tenantName,
}: {
  page: number;
  total: number;
  inspectorName?: string | null;
  inspectionDate?: string | null;
  tenantName?: string | null;
}) => (
  <div className="mt-auto border-t border-slate-200 px-8 py-3 text-[10px] text-slate-500">
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Inspector Signature</span>
          <span className="font-semibold text-slate-600">{displayValue(inspectorName)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Date</span>
          <span>{formatDate(inspectionDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Tenant</span>
          <span className="font-semibold text-slate-600">{displayValue(tenantName)}</span>
        </div>
      </div>
      <div className="text-[10px] text-slate-400">
        <span className="font-semibold text-slate-600">{page}</span> / {total}
      </div>
    </div>
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
  const utilitiesAreas = areas.filter((area) => area.areaName?.toString().trim().toLowerCase().includes("utilities"));
  const nonUtilitiesAreas = areas.filter((area) => !area.areaName?.toString().trim().toLowerCase().includes("utilities"));
  const orderedAreas = [...utilitiesAreas, ...nonUtilitiesAreas];
  const totalPages = 1 + areas.length;
  const coverImage = resolveCoverImage(report);
  const theme = header.agencyWhiteLabel || {};
  const accentColor = theme.accentColor || theme.primaryColor || DEFAULT_ACCENT;
  const fontFamily = theme.fontFamily || "Helvetica, Arial, sans-serif";
  const accentFontFamily = theme.accentFontFamily || fontFamily;

  return (
    <div
      className="report-document mx-auto w-full max-w-[1000px] space-y-8 px-6 text-[12px] text-slate-700 sm:px-10"
      style={
        {
          "--report-accent": accentColor,
          fontFamily,
        } as React.CSSProperties
      }
    >
      <section className="a4-page overflow-hidden pt-6">
        <div className="px-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              {header.agencyLogoUrl ? (
                <div className="h-12 w-12 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={header.agencyLogoUrl}
                    alt={header.agencyName ?? "Agency logo"}
                    className="h-10 w-10 object-contain"
                  />
                </div>
              ) : null}
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: theme.agencyNameColor || "inherit", fontFamily: accentFontFamily }}>
                  {displayValue(header.agencyName)}
                </div>
                <div className="text-[11px] text-slate-500">{displayValue(header.agencyPhone)}</div>
                <div className="text-[11px] text-slate-500">{displayValue(header.inspector?.name)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-800">
                {displayValue(header.reportTitle) || "Ingoing Condition Report"}
              </div>
              <div className="text-[11px] text-slate-500">{displayValue(header.reportType)}</div>
            </div>
          </div>
          <div className="mt-3 h-px w-full bg-slate-200" />
        </div>

        <div className="px-8 py-6 flex-1">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
            <div className="space-y-4">
              <div className="border border-slate-200 bg-slate-50/80">
                <div className="flex">
                  <div className="w-1.5 bg-[var(--report-accent)]" />
                  <div className="flex-1 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Address of premises</div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-700">{displayValue(header.propertyAddress)}</div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50/80">
                <div className="flex">
                  <div className="w-1.5 bg-[var(--report-accent)]" />
                  <div className="flex-1 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Tenant&apos;s name(s)</div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-700">{displayValue(header.tenant?.name)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Lease Start Date</div>
                  <div className="mt-2 inline-flex items-center rounded bg-[var(--report-accent)] px-2 py-1 text-[11px] font-semibold text-white">
                    {formatDate(header.leaseStartDate)}
                  </div>
                </div>
                <div className="border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Inspection Date</div>
                  <div className="mt-2 inline-flex items-center rounded bg-[var(--report-accent)] px-2 py-1 text-[11px] font-semibold text-white">
                    {formatDate(header.inspectionDate)}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-white px-3 py-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Condition / Action Codes</div>
                <div className="mt-3 flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-2">
                    <StatusBadge value="yes" />
                    <span className="text-slate-600">YES</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value="no" />
                    <span className="text-slate-600">NO</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-200 bg-white px-4 py-3">
                <div className="inline-flex items-center rounded-sm bg-[var(--report-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  How to complete this report
                </div>
                <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
                  <p>Three copies, or one electronic copy, of this condition report should be completed and signed by the landlord or the landlord’s agent.</p>
                  <p>Two copies, or one electronic copy, of the report, which have been completed and signed by the landlord or landlord’s agent, must be given to the tenant before or when the tenant signs the agreement. The landlord or landlord’s agent keeps the third copy or an electronic copy.</p>
                  <p>Before the tenancy begins, the landlord or the landlord’s agent must inspect the residential premises and record the condition of the premises by indicating whether the particular room item is clean, undamaged and working by placing “Y” (YES) or “N” (NO) in the appropriate column. Where necessary, comments should be included in the report.</p>
                  <p>If the tenant has agreed to pay for water usage charges under the residential tenancy agreement, the landlord or landlord’s agent must also indicate whether the residential premises have the required water efficiency measures.</p>
                </div>
              </div>

              <div className="border border-slate-200 bg-white px-4 py-3">
                <div className="inline-flex items-center rounded-sm bg-[var(--report-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Important information
                </div>
                <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
                  <p>This condition report is an important record of the condition of the residential premises when the tenancy begins and may be used as evidence of the state of repair or general condition of the premises.</p>
                  <p>At the end of the tenancy the premises will be inspected and the condition of the premises at that time will be compared to that stated in the original condition report.</p>
                  <p>A condition report should be filled out whether or not a rental bond is paid.</p>
                  <p>If you do not have enough space on the report attach a separate sheet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PageFooter
          page={1}
          total={totalPages}
          inspectorName={header.inspector?.name}
          inspectionDate={header.inspectionDate}
          tenantName={header.tenant?.name}
        />
      </section>

      {orderedAreas.map((area, idx) => (
        <section key={area.areaId} className="a4-page pt-4">
          <PageHeader address={displayValue(header.propertyAddress)} />
          <div className="px-8 py-5 flex-1">
            <div className="border border-slate-200 bg-white">
              <div className="bg-[var(--report-accent)] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-white">
                {displayValue(area.areaName)}
              </div>
              <div className="grid grid-cols-[2.2fr_0.9fr_2fr_1fr] gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                <div>Condition</div>
                <div>Result</div>
                <div>Inspector Comments</div>
                <div>Tenant Comments</div>
              </div>

              {area.items.map((item) => (
                <div key={item.itemId} className="border-b border-slate-200 last:border-0">
                  <div className="bg-[var(--report-accent)]/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                    {displayValue(item.itemName)}
                  </div>
                  {(item.conditions || []).map((condition, conditionIndex) => (
                    <div
                      key={condition.id}
                      className={`grid grid-cols-[2.2fr_0.9fr_2fr_1fr] gap-3 px-3 py-2 text-[11px] ${
                        conditionIndex % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                      }`}
                    >
                      <div className="text-slate-700">{displayValue(condition.description)}</div>
                      <div className="flex items-center gap-2">
                        {condition.type === "boolean" ? (
                          <StatusBadge value={condition.value} />
                        ) : (
                          <span className="text-slate-700">{formatValue(condition)}</span>
                        )}
                      </div>
                      <div className="text-slate-500">
                        {conditionIndex === 0 ? displayValue(item.inspectorComments) : ""}
                        {conditionIndex === 0 && item.media?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.media.map((m, mediaIndex) => (
                              <span
                                key={m.mediaId}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500"
                              >
                                Media {mediaIndex + 1}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-slate-400">N/A</div>
                    </div>
                  ))}
                  <div className="px-3 py-3">
                    <MediaGrid media={item.media || []} label={displayValue(item.itemName)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PageFooter
            page={idx + 2}
            total={totalPages}
            inspectorName={header.inspector?.name}
            inspectionDate={header.inspectionDate}
            tenantName={header.tenant?.name}
          />
        </section>
      ))}
    </div>
  );
}


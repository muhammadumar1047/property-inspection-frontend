"use client";

import React from "react";
import type { InspectionReportData, ReportCondition, ReportMedia } from "@/types/report";
import { parsePropertyImages } from "@/lib/propertyImages";

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

const CONDITION_COLUMNS = [
  { key: "clean", label: "Clean" },
  { key: "undamaged", label: "Undamaged" },
  { key: "working", label: "Working" },
  { key: "keys", label: "Keys" },
];

const normalizeConditionKey = (description?: string | null) => {
  const normalized = (description || "").toString().trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("clean")) return "clean";
  if (normalized.includes("undamaged") || normalized.includes("damage")) return "undamaged";
  if (normalized.includes("working") || normalized.includes("works") || normalized.includes("operational")) return "working";
  if (normalized.includes("keys") || normalized.includes("key")) return "keys";
  return null;
};

const buildConditionMap = (conditions?: ReportCondition[] | null) => {
  const map: Record<string, ReportCondition | undefined> = {};
  (conditions || []).forEach((condition) => {
    const key = normalizeConditionKey(condition.description);
    if (key && !map[key]) {
      map[key] = condition;
    }
  });
  return map;
};

const splitComments = (value?: string | null) => {
  const raw = (value || "").toString().trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
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
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-400">
        —
      </span>
    );
  }

  const isYes = isTruthy(value);
  return (
    <span
      className={[
        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
        isYes ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200",
      ].join(" ")}
    >
      {isYes ? "Y" : "N"}
    </span>
  );
};

const MediaGrid = ({
  media,
  label,
  onSelect,
}: {
  media: ReportMedia[];
  label: string;
  onSelect: (item: ReportMedia, itemLabel: string, mediaIndex: number) => void;
}) => {
  if (!media || media.length === 0) return null;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {media.map((m, index) => {
        const isPhoto = m.type === "photo";
        const youtubeEmbed = !isPhoto ? getYoutubeEmbedUrl(m.url) : null;
        return (
          <div key={m.mediaId} className="rounded-md border border-slate-200 overflow-hidden bg-white break-inside-avoid">
            <div className="flex items-center justify-between bg-[var(--report-accent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              <span className="truncate">{label}</span>
              <span>Image {index + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelect(m, label, index)}
              className="relative block h-40 w-full bg-transparent text-left"
              aria-label="Open media"
            >
              <span className="absolute left-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Media {index + 1}
              </span>
              {isPhoto ? (
                <img src={m.url} alt="Inspection media" className="h-40 w-full object-cover" />
              ) : youtubeEmbed ? (
                <iframe
                  className="h-40 w-full pointer-events-none"
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
            </button>
            <div className="px-2 py-1 text-[11px] text-slate-500 border-t border-slate-100">
              {m.type.toUpperCase()} {m.comments?.length ? `• ${m.comments.join(" ")}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PageHeader = ({ address }: { address?: string | null }) => (
  <div className="px-10 pt-4">
    <div className="text-[11px] uppercase tracking-wide text-slate-400">Address of premises</div>
    <div className="text-[13px] font-semibold text-slate-800">{displayValue(address)}</div>
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
  <div className="report-footer mt-auto border-t border-slate-200 px-10 py-3 text-[11px] text-slate-500 break-inside-avoid">
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
      <div className="text-[11px] text-slate-400 report-page-number">
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
    const images = parsePropertyImages(raw);
    return images[0] || "/property-hero-bg.png";
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
  const [selectedMedia, setSelectedMedia] = React.useState<{
    media: ReportMedia;
    label: string;
    index: number;
  } | null>(null);
  const selectedIsPhoto = selectedMedia?.media.type === "photo";
  const selectedYoutubeEmbed = selectedMedia ? getYoutubeEmbedUrl(selectedMedia.media.url) : null;
  const selectedItemLabel = selectedMedia?.label ? displayValue(selectedMedia.label) : "";
  const selectedMediaNumber = selectedMedia ? `Media ${selectedMedia.index + 1}` : "";

  return (
    <div
      className="report-document mx-auto w-full max-w-[1000px] space-y-8 px-12 text-[14px] text-slate-700 sm:px-20"
      style={
        {
          "--report-accent": accentColor,
          fontFamily,
        } as React.CSSProperties
      }
    >
      <section className="a4-page overflow-hidden pt-6">
        <div className="px-10">
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
                <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: theme.agencyNameColor || "inherit", fontFamily: accentFontFamily }}>
                  {displayValue(header.agencyName)}
                </div>
                <div className="text-[12px] text-slate-500">{displayValue(header.agencyPhone)}</div>
                <div className="text-[12px] text-slate-500">{displayValue(header.inspector?.name)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-800">
                {displayValue(header.reportTitle) || "Ingoing Condition Report"}
              </div>
              <div className="text-[12px] text-slate-500">{displayValue(header.reportType)}</div>
            </div>
          </div>
          <div className="mt-3 h-px w-full bg-slate-200" />
        </div>

        <div className="px-10 py-6 flex-1">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
            <div className="space-y-4">
              <div className="border border-slate-200 bg-slate-50/80 break-inside-avoid">
                <div className="flex">
                  <div className="w-1.5 bg-[var(--report-accent)]" />
                  <div className="flex-1 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Address of premises</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(header.propertyAddress)}</div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50/80 break-inside-avoid">
                <div className="flex">
                  <div className="w-1.5 bg-[var(--report-accent)]" />
                  <div className="flex-1 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Tenant&apos;s name(s)</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(header.tenant?.name)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 break-inside-avoid">
                <div className="border border-slate-200 bg-slate-50/80 px-3 py-2 break-inside-avoid">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Lease Start Date</div>
                  <div className="mt-2 inline-flex items-center rounded bg-[var(--report-accent)] px-2 py-1 text-[12px] font-semibold text-white">
                    {formatDate(header.leaseStartDate)}
                  </div>
                </div>
                <div className="border border-slate-200 bg-slate-50/80 px-3 py-2 break-inside-avoid">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Inspection Date</div>
                  <div className="mt-2 inline-flex items-center rounded bg-[var(--report-accent)] px-2 py-1 text-[12px] font-semibold text-white">
                    {formatDate(header.inspectionDate)}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-white px-3 py-3 break-inside-avoid">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Condition / Action Codes</div>
                <div className="mt-3 flex items-center gap-4 text-[12px]">
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

              <div className="border border-slate-200 bg-white break-inside-avoid">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Sample Condition Report
                </div>
                <div className="bg-[var(--report-accent)] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-white">
                  Bedroom 2
                </div>
                <div className="grid grid-cols-[2.2fr_repeat(4,0.9fr)] gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  <div>Item</div>
                  <div className="text-center">Clean</div>
                  <div className="text-center">Undamaged</div>
                  <div className="text-center">Working</div>
                  <div className="text-center">Keys</div>
                </div>
                {[
                  "Walls",
                  "Blinds / Curtains",
                  "Door / Doorframe",
                  "TV aerial port",
                  "Floors covering",
                ].map((label, rowIdx) => (
                  <div
                    key={label}
                    className={`grid grid-cols-[2.2fr_repeat(4,0.9fr)] gap-2 px-3 py-1.5 text-[12px] ${
                      rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                    }`}
                  >
                    <div className="text-slate-700">{label}</div>
                    <div className="flex justify-center">
                      <StatusBadge value={rowIdx % 2 === 0 ? "yes" : "no"} />
                    </div>
                    <div className="flex justify-center">
                      <StatusBadge value="yes" />
                    </div>
                    <div className="flex justify-center">
                      <StatusBadge value={rowIdx === 1 ? "no" : "yes"} />
                    </div>
                    <div className="flex justify-center">
                      <StatusBadge value={rowIdx === 3 ? "no" : "yes"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-200 bg-white px-4 py-3 break-inside-avoid">
                <div className="inline-flex items-center rounded-sm bg-[var(--report-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  How to complete this report
                </div>
                <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-slate-600">
                  <p>Three copies, or one electronic copy, of this condition report should be completed and signed by the landlord or the landlord’s agent.</p>
                  <p>Two copies, or one electronic copy, of the report, which have been completed and signed by the landlord or landlord’s agent, must be given to the tenant before or when the tenant signs the agreement. The landlord or landlord’s agent keeps the third copy or an electronic copy.</p>
                  <p>Before the tenancy begins, the landlord or the landlord’s agent must inspect the residential premises and record the condition of the premises by indicating whether the particular room item is clean, undamaged and working by placing “Y” (YES) or “N” (NO) in the appropriate column. Where necessary, comments should be included in the report.</p>
                  <p>If the tenant has agreed to pay for water usage charges under the residential tenancy agreement, the landlord or landlord’s agent must also indicate whether the residential premises have the required water efficiency measures.</p>
                </div>
              </div>

              <div className="border border-slate-200 bg-white px-4 py-3 break-inside-avoid">
                <div className="inline-flex items-center rounded-sm bg-[var(--report-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Important information
                </div>
                <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-slate-600">
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
          <div className="px-10 py-5 flex-1">
            <div className="border border-slate-200 bg-white">
              <div className="bg-[var(--report-accent)] px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-white">
                {displayValue(area.areaName)}
              </div>
              {area.areaName?.toString().trim().toLowerCase().includes("utilities") ? (
                <>
                  <div className="grid grid-cols-[2.2fr_0.9fr_2fr] gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <div>Condition</div>
                    <div>Result</div>
                    <div>Inspector Comments</div>
                  </div>

                  {area.items.map((item) => (
                    <div key={item.itemId} className="border-b border-slate-200 last:border-0 break-inside-avoid">
                      <div className="bg-[var(--report-accent)]/90 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-white">
                        {displayValue(item.itemName)}
                      </div>
                      {(item.conditions || []).map((condition, conditionIndex) => (
                        <div
                          key={condition.id}
                          className={`grid grid-cols-[2.2fr_0.9fr_2fr] gap-3 px-3 py-2 text-[12px] ${
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
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                                  >
                                    Media {mediaIndex + 1}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      <div className="px-3 py-3">
                        <MediaGrid
                          media={item.media || []}
                          label={displayValue(item.itemName)}
                          onSelect={(media, label, index) => setSelectedMedia({ media, label, index })}
                        />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-[2.2fr_repeat(4,0.9fr)_2.4fr] gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <div>Item</div>
                    {CONDITION_COLUMNS.map((column) => (
                      <div key={column.key} className="text-center">
                        {column.label}
                      </div>
                    ))}
                    <div>Inspector Comments</div>
                  </div>

                  {area.items.map((item, itemIndex) => {
                    const conditionMap = buildConditionMap(item.conditions);
                    const rowBackground = itemIndex % 2 === 0 ? "bg-white" : "bg-slate-50/70";
                    const hasComments = Boolean(item.inspectorComments?.toString().trim());
                    const hasMedia = Boolean(item.media?.length);
                    const commentEntries = splitComments(item.inspectorComments);

                    return (
                      <div key={item.itemId} className="border-b border-slate-200 last:border-0 break-inside-avoid">
                        <div className={`grid grid-cols-[2.2fr_repeat(4,0.9fr)_2.4fr] gap-2 px-3 py-2 text-[12px] ${rowBackground}`}>
                          <div className="text-slate-700">{displayValue(item.itemName)}</div>
                          {CONDITION_COLUMNS.map((column) => {
                            const condition = conditionMap[column.key];
                            if (!condition) {
                              return (
                                <div key={column.key} className="flex justify-center">
                                  <StatusBadge value={null} />
                                </div>
                              );
                            }
                            if (condition.type === "boolean") {
                              return (
                                <div key={column.key} className="flex justify-center">
                                  <StatusBadge value={condition.value} />
                                </div>
                              );
                            }
                            return (
                              <div key={column.key} className="flex justify-center text-[11px] font-semibold text-slate-600">
                                {formatValue(condition)}
                              </div>
                            );
                          })}
                          <div className="text-[11px] text-slate-500">
                            {commentEntries.length ? (
                              <div className="space-y-1">
                                {commentEntries.map((entry, entryIndex) => (
                                  <div key={`${item.itemId}-comment-${entryIndex}`}>
                                    {entryIndex + 1}. {entry}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                            {hasMedia ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {item.media?.map((m, mediaIndex) => (
                                  <span
                                    key={m.mediaId}
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                                  >
                                    Media {mediaIndex + 1}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {hasMedia ? (
                          <div className="px-3 py-3">
                            <MediaGrid
                              media={item.media || []}
                              label={displayValue(item.itemName)}
                              onSelect={(media, label, index) => setSelectedMedia({ media, label, index })}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              )}
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

      {selectedMedia ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-slate-600 shadow"
              aria-label="Close media"
            >
              Close
            </button>
            <div className="bg-[var(--report-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-white">
              {selectedMediaNumber ? `${selectedMediaNumber} • ` : ""}Media Preview
              {selectedItemLabel ? ` • ${selectedItemLabel}` : ""}
            </div>
            <div className="flex items-center justify-center bg-black">
              {selectedIsPhoto ? (
                <img
                  src={selectedMedia.media.url}
                  alt="Inspection media"
                  className="max-h-[80vh] w-full object-contain"
                />
              ) : selectedYoutubeEmbed ? (
                <iframe
                  className="h-[80vh] w-full"
                  src={selectedYoutubeEmbed}
                  title="Inspection video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="p-6 text-center text-sm text-slate-100">
                  Video link: {selectedMedia.media.url}
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 px-4 py-2 text-[12px] text-slate-500">
              {selectedMedia.media.type.toUpperCase()}{" "}
              {selectedMedia.media.comments?.length ? `• ${selectedMedia.media.comments.join(" ")}` : ""}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

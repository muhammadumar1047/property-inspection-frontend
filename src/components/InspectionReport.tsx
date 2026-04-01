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
    if (!trimmed) return "—";
    return isTruthy(raw) ? "Yes" : "No";
  }

  if (condition.type === "date") {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }
    return trimmed || "—";
  }

  if (condition.type === "number") {
    const num = Number(trimmed);
    return Number.isFinite(num) ? num.toString() : trimmed || "—";
  }

  return trimmed || "—";
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

export default function InspectionReport({ report }: { report: InspectionReportData }) {
  const header = report.header || ({} as InspectionReportData["header"]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {header.agencyLogoUrl ? (
            <img
              src={header.agencyLogoUrl}
              alt={header.agencyName ?? "Agency logo"}
              className="h-12 w-12 rounded-lg object-contain bg-slate-50 border border-slate-200"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">{header.reportTitle}</h1>
            <p className="text-sm text-slate-500">{header.propertyAddress}</p>
          </div>
          <div className="ml-auto text-right text-sm text-slate-500">
            <div>{header.agencyName}</div>
            <div>{header.agencyPhone}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Tenant</div>
            <div className="text-sm text-slate-700">{header.tenant?.name || "—"}</div>
            <div className="text-xs text-slate-400">{header.tenant?.contactInfo || ""}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Inspector</div>
            <div className="text-sm text-slate-700">{header.inspector?.name || "—"}</div>
            <div className="text-xs text-slate-400">{header.inspector?.email || ""}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Lease</div>
            <div className="text-sm text-slate-700">
              {header.leaseStartDate ? new Date(header.leaseStartDate).toLocaleDateString() : "—"}
            </div>
            <div className="text-xs text-slate-400">
              {header.leaseEndDate ? new Date(header.leaseEndDate).toLocaleDateString() : ""}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Inspection Date</div>
            <div className="text-sm text-slate-700">
              {header.inspectionDate ? new Date(header.inspectionDate).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
      </section>

      {(report.areas || []).map((area) => (
        <section key={area.areaId} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{area.areaName}</h2>
          <div className="mt-4 space-y-6">
            {area.items.map((item) => (
              <div key={item.itemId} className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-800">{item.itemName}</h3>
                  {item.inspectorComments ? (
                    <span className="text-xs text-slate-500">Comments: {item.inspectorComments}</span>
                  ) : null}
                </div>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(item.conditions || []).map((condition) => (
                    <div
                      key={condition.id}
                      className="flex items-center justify-between gap-4 rounded-md border border-slate-100 bg-white px-3 py-2 text-sm"
                    >
                      <dt className="text-slate-600">{condition.description}</dt>
                      <dd className="font-medium text-slate-900">{formatValue(condition)}</dd>
                    </div>
                  ))}
                </dl>
                <MediaGrid media={item.media || []} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

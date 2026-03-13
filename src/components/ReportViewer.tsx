 'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InspectionReportDto, ReportAreaDto, ReportItemDto, ReportMediaDto } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api/http';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Modal from '@/components/ui/Modal';

interface ReportViewerProps {
  report: InspectionReportDto;
  editable?: boolean;
  onSave?: (payload: Partial<{ notes: string; reportAreas: any }>) => Promise<void> | void;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso || '';
  }
};

// ---------- Template: Default (current design) ----------
function DefaultTemplate({ report, editable, onSave }: { report: InspectionReportDto; editable?: boolean; onSave?: (payload: any) => Promise<void> | void }) {
  const whitelabel = report?.inspection?.agency?.agencyWhitelabel || {};
  const property = report?.inspection?.property as any;
  const agency = report?.inspection?.agency as any;
  const themeVars = useMemo(() => ({
    '--report-primary': whitelabel.primaryColor || '#1E40AF',
    '--report-secondary': whitelabel.secondaryColor || whitelabel.accentColor || '#2563EB',
    '--report-accent': whitelabel.accentColor || whitelabel.secondaryColor || '#3B82F6',
    '--report-text': whitelabel.textColor || '#0f172a',
    '--report-bg': whitelabel.backgroundColor || '#ffffff',
  } as React.CSSProperties), [whitelabel]);

  const headerLogo = whitelabel.logoUrl || '/vercel.svg';
  const stateKey = property?.state || property?.stateName || agency?.state || property?.stateId || property?.stateLookupId;
  const templateKey = `${String(stateKey || 'default')}:${String(report?.reportType || 'Ingoing')}`;

  const [zoomMedia, setZoomMedia] = useState<ReportMediaDto | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [draft, setDraft] = useState<InspectionReportDto>(() => JSON.parse(JSON.stringify(report)) as InspectionReportDto);
  useEffect(() => { setDraft(JSON.parse(JSON.stringify(report)) as InspectionReportDto); }, [report]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Normalize tenancy snapshots from various possible API shapes
  const tenancySnapshots = useMemo(() => {
    const fromSnapshots = (report as any)?.inspection?.tenancySnapshots as any[] | undefined;
    if (fromSnapshots && fromSnapshots.length) return fromSnapshots;

    const fromInspections = (report as any)?.inspection?.tenancies as any[] | undefined;
    if (fromInspections && fromInspections.length) {
      return fromInspections.map((t: any) => ({
        tenancyId: t.tenancyId || t.id,
        tenantName: t.tenantName || t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim(),
        tenantEmail: t.email,
        tenantPhone: t.phone || t.mobile,
        startDate: t.leaseStartDate || t.startDate || t.originalLeaseDate,
        endDate: t.leaseEndDate || t.endDate,
        rentAmount: t.currentRentAmount || t.rentAmount,
      }));
    }

    const fromProperty = (report as any)?.inspection?.property?.tenancies as any[] | undefined;
    if (fromProperty && fromProperty.length) {
      return fromProperty.map((t: any) => ({
        tenancyId: t.tenancyId || t.id,
        tenantName: t.tenantName || t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim(),
        tenantEmail: t.email,
        tenantPhone: t.phone || t.mobile,
        startDate: t.leaseStartDate || t.startDate || t.originalLeaseDate,
        endDate: t.leaseEndDate || t.endDate,
        rentAmount: t.currentRentAmount || t.rentAmount,
      }));
    }

    const active = (report as any)?.inspection?.property?.activeTenancy;
    if (active) {
      return [{
        tenancyId: active.tenancyId || active.id,
        tenantName: active.fullName || `${active.firstName || ''} ${active.lastName || ''}`.trim(),
        tenantEmail: active.email,
        tenantPhone: active.phone || active.mobile,
        startDate: active.leaseStartDate || active.originalLeaseDate,
        endDate: active.leaseEndDate,
        rentAmount: active.currentRentAmount,
      }];
    }
    return [] as any[];
  }, [report]);

  useEffect(() => {
    // Count report pages in the DOM and set data-page labels like "1/total"
    const update = () => {
      const pages = Array.from(document.querySelectorAll('.report-page')) as HTMLElement[];
      const total = pages.length;
      pages.forEach((el, idx) => {
        el.setAttribute('data-page', `${idx + 1}/${total}`);
      });
      setPageCount(total);
    };
    update();
    const ro = new ResizeObserver(() => update());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [report]);

  const getMediaComments = (m: any) => {
    const raw = (m?.reportMediaComments || m?.reportPhotoComments || m?.comments || []) as any[];
    return (raw || []).map((c, idx) => {
      const x = typeof c.x === 'number' ? c.x : undefined;
      const y = typeof c.y === 'number' ? c.y : undefined;
      const toPct = (v?: number) => v == null ? undefined : (v <= 1 ? v * 100 : v);
      return {
        reportMediaCommentId: c.reportMediaCommentId || c.id || `mc-${m.reportMediaId}-${idx}`,
        text: c.text || c.comment || '',
        x: toPct(x) ?? 50,
        y: toPct(y) ?? 50,
      };
    });
  };

  const renderMediaThumbs = (media: ReportMediaDto[]) => (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {media.map((m) => (
        <div key={m.reportMediaId} className="rounded-md overflow-hidden border bg-white">
          <div className="relative cursor-zoom-in" onClick={() => setZoomMedia(m)}>
            <img src={m.url} alt={m.type} className="w-full h-28 object-cover" />
            {(getMediaComments(m).length) > 0 && (
              <>
                {getMediaComments(m).map((c, idx) => (
                  <span
                    key={c.reportMediaCommentId || idx}
                    className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    title={c.text}
                  >
                    {idx + 1}
                  </span>
                ))}
              </>
            )}
          </div>
          {(getMediaComments(m).length) > 0 && (
            <div className="p-2 border-t text-xs text-muted-foreground space-y-0.5">
              {getMediaComments(m).map((c, idx) => (
                <div key={c.reportMediaCommentId || idx} className="flex gap-1">
                  <span className="font-semibold">{idx + 1})</span>
                  <span className="flex-1">{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const setCondition = (areaId: number, itemId: number, label: string, value: 'true' | 'false' | '' ) => {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as InspectionReportDto;
      const area = next.reportAreas.find(a => a.reportAreaId === areaId);
      if (!area) return prev;
      const it = area.reportItems?.find(i => i.reportItemId === itemId);
      if (!it) return prev;
      const cond = (it.reportItemConditions || []).find(c => String(c.description || '').toLowerCase().includes(label));
      if (cond) cond.value = value as any; else (it.reportItemConditions = it.reportItemConditions || []).push({ reportItemConditionId: Date.now(), reportItemId: itemId, description: label, value: value as any } as any);
      return next;
    });
  };

  const setComment = (areaId: number, itemId: number, idx: number, text: string) => {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as InspectionReportDto;
      const area = next.reportAreas.find(a => a.reportAreaId === areaId);
      const it = area?.reportItems?.find(i => i.reportItemId === itemId);
      if (!it) return prev;
      it.reportItemComments = it.reportItemComments || [] as any;
      if (idx >= 0 && idx < it.reportItemComments.length) (it.reportItemComments as any)[idx].text = text; else (it.reportItemComments as any).push({ reportItemCommentId: Date.now(), text });
      return next;
    });
  };

  const removeComment = (areaId: number, itemId: number, idx: number) => {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as InspectionReportDto;
      const area = next.reportAreas.find(a => a.reportAreaId === areaId);
      const it = area?.reportItems?.find(i => i.reportItemId === itemId);
      if (!it) return prev;
      it.reportItemComments = (it.reportItemComments || []).filter((_, i) => i !== idx) as any;
      return next;
    });
  };

  const renderItem = (item: ReportItemDto, options?: { showHeader?: boolean; hideStandardColumns?: boolean }, meta?: { areaId: number }) => (
    <div key={item.reportItemId} className="mb-4">
      <Table className="w-full">
        {(options?.showHeader ?? true) && (
          <TableHeader>
            {options?.hideStandardColumns ? (
              <TableRow className="bg-muted/50">
                <TableHead className="text-left w-2/5">{item.name}</TableHead>
              </TableRow>
            ) : (
              <TableRow className="bg-muted/50">
                <TableHead className="text-left w-2/5">{item.name}</TableHead>
                <TableHead className="text-center w-16">Clean</TableHead>
                <TableHead className="text-center w-16">Undamaged</TableHead>
                <TableHead className="text-center w-16">Working</TableHead>
                <TableHead className="text-left">Inspector Comments</TableHead>
              </TableRow>
            )}
          </TableHeader>
        )}
        <TableBody>
          {!options?.hideStandardColumns && (() => {
            const byLabel = (label: string) =>
              (item.reportItemConditions || []).find((c) =>
                String(c.description || '').toLowerCase().includes(label)
              );
            const clean = byLabel('clean');
            const undamaged = byLabel('undamaged');
            const working = byLabel('working');
            const commentTextList = (item.reportItemComments || []).filter((c) => !!(c.text || '').length);
            const commentNodes = editable
              ? (
                <div className="space-y-2">
                  {(item.reportItemComments || []).map((c, idx) => (
                    <div key={c.reportItemCommentId || idx} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{idx + 1})</span>
                      <input
                        value={c.text || ''}
                        onChange={(e) => setComment(meta!.areaId, item.reportItemId, idx, e.target.value)}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      />
                      <button className="text-red-600 text-xs" onClick={() => removeComment(meta!.areaId, item.reportItemId, idx)}>Remove</button>
                    </div>
                  ))}
                  <button className="text-xs px-2 py-1 border rounded" onClick={() => setComment(meta!.areaId, item.reportItemId, (item.reportItemComments || []).length, '')}>Add comment</button>
                </div>
              )
              : (commentTextList.length
                ? commentTextList.map((c, idx) => (
                    <span key={c.reportItemCommentId} className="inline-flex items-start gap-1 mr-3">
                      <span className="text-xs font-semibold text-muted-foreground">{idx + 1})</span>
                      <span className="text-sm">{c.text}</span>
                    </span>
                  ))
                : null);
            const ynPill = (val?: string) => (
              val === 'true' ? (
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--color-yes)', color: '#fff' }}
                >
                  Y
                </span>
              ) : val === 'false' ? (
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
                  style={{ background: 'lab(55% 70 50)', color: '#fff' }}
                >
                  N
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">-</span>
              )
            );
            return (
              <TableRow>
                <TableCell className="font-medium">&nbsp;</TableCell>
                <TableCell className="text-center">
                  {editable ? (
                    <select defaultValue={clean?.value || ''} onChange={(e) => setCondition(meta!.areaId, item.reportItemId, 'clean', (e.target.value as any))} className="border rounded px-1 py-0.5 text-xs">
                      <option value="">-</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : ynPill(clean?.value)}
                </TableCell>
                <TableCell className="text-center">
                  {editable ? (
                    <select defaultValue={undamaged?.value || ''} onChange={(e) => setCondition(meta!.areaId, item.reportItemId, 'undamaged', (e.target.value as any))} className="border rounded px-1 py-0.5 text-xs">
                      <option value="">-</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : ynPill(undamaged?.value)}
                </TableCell>
                <TableCell className="text-center">
                  {editable ? (
                    <select defaultValue={working?.value || ''} onChange={(e) => setCondition(meta!.areaId, item.reportItemId, 'working', (e.target.value as any))} className="border rounded px-1 py-0.5 text-xs">
                      <option value="">-</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : ynPill(working?.value)}
                </TableCell>
                <TableCell className="text-sm">{commentNodes || '-'}</TableCell>
              </TableRow>
            );
          })()}
          {(item.reportItemConditions || []).filter((c) => {
            const d = String(c.description || '').toLowerCase();
            return !(d.includes('clean') || d.includes('undamaged') || d.includes('working'));
          }).map((c) => (
            <TableRow key={c.reportItemConditionId} className="bg-white">
              <TableCell className="text-muted-foreground">{c.description}</TableCell>
              {options?.hideStandardColumns ? (
                <TableCell className="text-left">
                  {editable ? (
                    <select defaultValue={c.value as any || ''} onChange={(e) => setCondition(meta!.areaId, item.reportItemId, String(c.description || '').toLowerCase(), e.target.value as any)} className="border rounded px-1 py-0.5 text-xs">
                      <option value="">-</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <>
                      {c.value === 'true' && <span className="status-indicator status-yes">Yes</span>}
                      {c.value === 'false' && <span className="status-indicator status-no">No</span>}
                      {c.value !== 'true' && c.value !== 'false' && <span className="text-sm">{c.value || '-'}</span>}
                    </>
                  )}
                </TableCell>
              ) : (
                <TableCell colSpan={3} className="text-left">
                  {editable ? (
                    <select defaultValue={c.value as any || ''} onChange={(e) => setCondition(meta!.areaId, item.reportItemId, String(c.description || '').toLowerCase(), e.target.value as any)} className="border rounded px-1 py-0.5 text-xs">
                      <option value="">-</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <>
                      {c.value === 'true' && <span className="status-indicator status-yes">Yes</span>}
                      {c.value === 'false' && <span className="status-indicator status-no">No</span>}
                      {c.value !== 'true' && c.value !== 'false' && <span className="text-sm">{c.value || '-'}</span>}
                    </>
                  )}
                </TableCell>
              )}
              {!options?.hideStandardColumns && <TableCell />}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {item.reportMedia?.length ? (
        <div className="mt-2">{renderMediaThumbs(item.reportMedia)}</div>
      ) : null}
    </div>
  );

  const renderAdditionalArea = (area: ReportAreaDto) => (
    <Card key={area.reportAreaId} className="overflow-hidden">
      <div className="px-4 py-2 text-white font-semibold text-sm uppercase tracking-wide" style={{ background: 'var(--report-primary)' }}>{area.name}</div>
      <div className="p-3 space-y-4">
        {(area.reportItems || []).map((it) => (
          <div key={it.reportItemId} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 text-xs font-semibold">{it.name}</div>
            <div className="p-3 space-y-2">
              {(it.reportItemConditions || []).map((c: any) => (
                <div key={c.reportItemConditionId || c.description} className="flex items-center justify-between bg-white border rounded-md px-3 py-2">
                  <div className="text-sm text-foreground/90">{c.description}</div>
                  <div className="ml-3">
                    {c.value === 'true' && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-yes)', color: '#fff' }}>Y</span>
                    )}
                    {c.value === 'false' && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold" style={{ background: 'lab(55% 70 50)', color: '#fff' }}>N</span>
                    )}
                    {c.value !== 'true' && c.value !== 'false' && (
                      (c.value ? (
                        <span className="inline-block min-w-[100px] px-2 py-1 text-xs rounded-md border bg-gray-50 text-foreground/80 text-center">{c.value}</span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">-</span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderAreaCard = (area: ReportAreaDto) => (
    <Card key={area.reportAreaId} className="overflow-hidden page-allow-split report-area">
      <div className="px-4 py-2 text-white font-semibold text-sm uppercase tracking-wide" style={{ background: 'var(--report-primary)' }}>{area.name}</div>
      <div className="p-3">
        {(area.reportItems || []).map((it) => {
          const isAdditional = String(area.name || '').toLowerCase().includes('additional');
          return renderItem(it, { showHeader: true, hideStandardColumns: isAdditional }, { areaId: area.reportAreaId });
        })}
      </div>
    </Card>
  );

  return (
    <div ref={containerRef} className="min-h-screen p-4 sm:p-6 md:p-8 print-content" style={{ ...themeVars, color: 'var(--report-text)', background: 'var(--report-bg)', fontFamily: whitelabel.fontFamily || undefined }}>
      <div className="mx-auto max-w-6xl space-y-6">
        {editable && (
          <div className="flex items-center justify-end gap-2">
            <button
              className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50"
              onClick={() => onSave?.({ notes: draft.notes, reportAreas: draft.reportAreas })}
            >
              Save
            </button>
          </div>
        )}
        
        {/* Cover page */}
        <div className="report-page" style={{ position: 'relative' }}>
        <Card className="report-section">
          <div className="report-header p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ color: 'var(--report-text)', background: 'var(--report-bg)' }}>
            <div className="flex items-center gap-4">
              <img src={headerLogo} alt="Agency Logo" className="h-14 w-auto max-h-12 sm:max-h-14 md:max-h-16 max-w-[160px] rounded-md object-contain bg-white" />
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--report-text)' }}>{agency?.name || 'Agency'}</h1>
                <div className="text-sm text-muted-foreground">
                  {agency?.address || ''}
                </div>
                {whitelabel?.contactDetails && (
                  <div className="text-xs mt-1" style={{ color: 'var(--report-secondary)' }}>
                    {whitelabel.contactDetails}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block text-white px-5 py-3 rounded-lg shadow" style={{ background: 'linear-gradient(135deg, var(--report-primary), var(--report-accent))' }}>
                <div className="text-xs opacity-90">{String(report?.inspection?.inspectorName || 'Inspector')}</div>
                <div className="text-lg font-bold uppercase tracking-wide">{whitelabel?.reportHeaderText || `${String(report?.reportType || 'Ingoing')} Condition Report`}</div>
                <div className="text-xs opacity-90">{(agency?.state || 'State')} - 2010</div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="text-white px-4 py-2 text-sm font-semibold" style={{ background: 'var(--report-primary)' }}>Address of premises</div>
                <div className="p-4 text-sm">
                  <div className="font-medium">{property?.address1} {property?.address2}</div>
                  <div>{property?.cityOrSuburb}, {agency?.state || ''} {property?.postcode}</div>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="text-white px-4 py-2 text-sm font-semibold" style={{ background: 'var(--report-primary)' }}>Tenant's name(s)</div>
                <div className="p-4 text-sm">
                  {(() => {
                    debugger;
                    const names = (tenancySnapshots || []).map((t: any) => t.tenantName).filter(Boolean);
                    return names.length ? names.join(', ') : '-';
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg overflow-hidden">
                  <div className="text-white px-3 py-2 text-xs font-semibold" style={{ background: 'var(--report-primary)' }}>Lease Start Date</div>
                  <div className="px-3 py-2 text-sm font-medium">{formatDate((tenancySnapshots || [])[0]?.startDate)}</div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="text-white px-3 py-2 text-xs font-semibold" style={{ background: 'var(--report-primary)' }}>Inspection Date</div>
                  <div className="px-3 py-2 text-sm font-medium">{formatDate(report?.inspection?.inspectionDate)}</div>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="text-white px-4 py-2 text-sm font-semibold" style={{ background: 'var(--report-primary)' }}>Condition / Action Codes</div>
                <div className="p-4 flex items-center gap-6" style={{ color: 'var(--report-text)' }}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: 'var(--color-yes)', color: '#fff' }}>Y</span>
                    <span className="text-sm" style={{ color: 'var(--report-secondary)' }}>YES</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: 'lab(55% 70 50)', color: '#fff' }}>N</span>
                    <span className="text-sm" style={{ color: 'var(--report-secondary)' }}>NO</span>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="text-white px-4 py-2 text-sm font-semibold" style={{ background: 'var(--report-primary)' }}>Sample Condition Report</div>
                <div className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-3 py-2 text-sm">Bedroom 2</th>
                        <th className="text-center px-3 py-2 text-xs">Y</th>
                        <th className="text-center px-3 py-2 text-xs">Y</th>
                        <th className="text-center px-3 py-2 text-xs">-</th>
                        <th className="text-left px-3 py-2 text-xs">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Walls','Blinds / Curtains','Door / Doorway frame','TV Aerial port','Floor Coverings'].map((label, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 text-sm">{label}</td>
                          <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-yes)', color: '#fff' }}>Y</span></td>
                          <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-yes)', color: '#fff' }}>Y</span></td>
                          <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">-</span></td>
                          <td className="px-3 py-2 text-sm"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
          <div className="rounded-lg overflow-hidden border">
            <div className="text-white px-4 py-2 font-bold" style={{ background: 'var(--report-primary)' }}>How to complete this report</div>
                <div className="p-4 text-sm leading-relaxed">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Three copies, or one electronic copy, of this condition report should be completed and signed by the landlord or the landlord's agent.</li>
                    <li>Two copies, or one electronic copy, of the report must be given to the tenant before or when the tenant signs the agreement.</li>
                    <li>Before the tenancy begins, record whether each room item is clean, undamaged and working by placing “Y” or “N”. Include necessary comments.</li>
                    <li>If the tenant agrees to pay for water usage, indicate whether the premises are water efficient and separately metered.</li>
                    <li>The tenant must return one copy of the completed report to the landlord or agent within 7 days of receiving it and keep the second copy.</li>
                  </ul>
                </div>
              </div>
          <div className="rounded-lg overflow-hidden border">
            <div className="text-white px-4 py-2 font-bold" style={{ background: 'var(--report-primary)' }}>Important information</div>
                <div className="p-4 text-sm leading-relaxed space-y-2">
                  <p>This condition report is an important record of the condition of the premises when the tenancy begins and may be used as evidence at the end of the tenancy. It is important to complete the report accurately.</p>
                  <p>At the end of the tenancy the premises will be inspected and compared to this report. A condition report should be filled out whether or not a rental bond is paid.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Page break between Cover and next sections */}
        <div className="page-break" />
        </div>

        {/* Landlord/Tenant snapshot section removed as requested */}

        {/* Additional Checks page */}
        {(() => {
          const areas = (report?.reportAreas || []);
          const additionalAreas = areas.filter(a => String(a.name || '').toLowerCase().includes('additional'));
          const otherAreas = areas.filter(a => !String(a.name || '').toLowerCase().includes('additional'));
          return (
            <>
              {additionalAreas.length > 0 && (
                <>
                  {/* Additional checks title and each additional area on its own page */}
                  <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-wide" style={{ color: 'var(--report-secondary)' }}>
                    <div className="h-px bg-border flex-1" />
                    <span>Additional Checks</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="space-y-4">
                    {additionalAreas.map((a) => (
                      <div key={a.reportAreaId} className="report-page" style={{ position: 'relative' }}>
                        {renderAdditionalArea(a)}
                      </div>
                    ))}
                  </div>
                  {/* Page break between Additional Checks and Report Areas */}
                  <div className="page-break" />
                  {/* Report Areas title */}
                  <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-wide" style={{ color: 'var(--report-secondary)' }}>
                    <div className="h-px bg-border flex-1" />
                    <span>Report Areas</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="space-y-4">
                    {otherAreas.map((a) => (
                      <div key={a.reportAreaId} className="report-page" style={{ position: 'relative' }}>
                        {renderAreaCard(a)}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {additionalAreas.length === 0 && (
                <>
                  <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-wide" style={{ color: 'var(--report-secondary)' }}>
                    <div className="h-px bg-border flex-1" />
                    <span>Report Areas</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="space-y-4">
                    {otherAreas.map((a) => (
                      <div key={a.reportAreaId} className="report-page" style={{ position: 'relative' }}>
                        {renderAreaCard(a)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })()}

        <Card className="report-section p-4">
          <h3 className="text-base font-semibold mb-2">Notes</h3>
          {editable ? (
            <textarea
              value={draft.notes || ''}
              onChange={(e) => setDraft({ ...(draft as any), notes: e.target.value } as any)}
              className="w-full border rounded-md p-2 text-sm"
              rows={4}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
          )}
        </Card>
      </div>
      {/* Image zoom modal */}
      {zoomMedia && (
        <Modal isOpen={!!zoomMedia} onClose={() => setZoomMedia(null)} title="Photo" widthClassName="max-w-5xl">
          <div className="relative">
            <img src={zoomMedia.url} alt={zoomMedia.type} className="w-full max-h-[70vh] object-contain" />
            {(getMediaComments(zoomMedia).length) > 0 && getMediaComments(zoomMedia).map((c, idx) => (
              <span
                key={c.reportMediaCommentId || idx}
                className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold shadow"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                {idx + 1}
              </span>
            ))}
            {(getMediaComments(zoomMedia).length) > 0 && (
              <div className="mt-3 space-y-1">
                {getMediaComments(zoomMedia).map((c, idx) => (
                  <div key={c.reportMediaCommentId || idx} className="text-sm"><span className="font-semibold mr-1">{idx + 1})</span>{c.text}</div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
      {/* Unified footer (screen + print fixed) */}
   
    </div>
  );
}

// ---------- Template Resolver ----------
type TemplateComponent = React.FC<{ report: InspectionReportDto; editable?: boolean; onSave?: (payload: any) => Promise<void> | void }>;

const templateRegistry: Record<string, TemplateComponent> = {
  // Future: register specific templates e.g. 'NSW:Ingoing': NSWIngoingTemplate
};

function resolveTemplate(report: InspectionReportDto): TemplateComponent {
  const property: any = report?.inspection?.property || {};
  const agency: any = report?.inspection?.agency || {};
  const rawState = property.state || property.stateName || agency.state || property.stateId || property.stateLookupId;
  const normState = typeof rawState === 'string' ? rawState.toUpperCase() : String(rawState || 'DEFAULT');
  const type = String(report?.reportType || 'Ingoing');

  const exactKey = `${normState}:${type}`;
  if (templateRegistry[exactKey]) return templateRegistry[exactKey];

  const byTypeKey = `DEFAULT:${type}`;
  if (templateRegistry[byTypeKey]) return templateRegistry[byTypeKey];

  return DefaultTemplate;
}

export default function ReportViewer({ report, editable, onSave }: ReportViewerProps) {
  const Template = resolveTemplate(report);
  return <Template report={report} editable={editable} onSave={onSave} />;
}



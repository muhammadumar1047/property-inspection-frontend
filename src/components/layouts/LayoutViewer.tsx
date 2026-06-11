'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyLayoutResponse, PropertyType } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Layers, ChevronRight, Sparkles, Building2,
    Calendar, Hash, Eye, LayoutDashboard
} from 'lucide-react';

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const LAYOUT_TYPES = [
    { id: PropertyType.Residential, name: 'Residential' },
    { id: PropertyType.Office, name: 'Office' },
    { id: PropertyType.RetailShop, name: 'Retail Shop' },
    { id: PropertyType.Factory, name: 'Factory' },
    { id: PropertyType.Building, name: 'Building' },
];

function getLayoutTypeName(typeId: number): string {
    return LAYOUT_TYPES.find(t => t.id === typeId)?.name || 'Unknown';
}

/* ────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */

interface LayoutViewerProps {
    layout: PropertyLayoutResponse;
    /** When true, hides the internal header — used inside AdminDashboard */
    embedded?: boolean;
    /** Called when user clicks Back (embedded mode) */
    onBack?: () => void;
    /** Called when user clicks Edit Layout (embedded mode) */
    onEdit?: (id: string) => void;
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function LayoutViewer({ layout, embedded = false, onBack, onEdit }: LayoutViewerProps) {
    const router = useRouter();

    const areas = layout.layoutArea || [];
    const [selectedAreaIndex, setSelectedAreaIndex] = useState<number>(areas.length > 0 ? 0 : -1);

    const selectedArea = selectedAreaIndex >= 0 && selectedAreaIndex < areas.length
        ? areas[selectedAreaIndex]
        : null;

    const selectedItems = selectedArea?.layoutItem || [];

    return (
        <>
            {/* Header — only shown in standalone mode */}
            {!embedded && (
                <header className="bg-white border-b border-[var(--border)] sticky top-[61px] z-20 shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/layouts')}
                                className="text-[var(--muted-500)] hover:text-[var(--foreground)] gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-[var(--foreground)]">
                                        {layout.name}
                                    </h1>
                                    <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 text-xs px-2.5 py-0.5">
                                        <Eye className="w-3 h-3 mr-1" />
                                        View Only
                                    </Badge>
                                </div>
                                <p className="text-sm text-[var(--muted-500)] mt-0.5">
                                    Layout template details and structure
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/layouts/${layout.id}/edit`)}
                                className="gap-1.5"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Edit Layout
                            </Button>
                        </div>
                    </div>
                </header>
            )}

            {/* Embedded toolbar */}
            {embedded && (
                <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="text-[var(--muted-500)] hover:text-[var(--foreground)] gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Layouts
                        </Button>
                        <span className="text-base font-semibold text-[var(--foreground)]">
                            {layout.name}
                        </span>
                        <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 text-xs px-2.5 py-0.5">
                            <Eye className="w-3 h-3 mr-1" />
                            View Only
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => embedded && onEdit ? onEdit(layout.id) : router.push(`/layouts/${layout.id}/edit`)}
                            className="gap-1.5"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Edit Layout
                        </Button>
                    </div>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto p-6">
                {/* Layout Details Card */}
                <Card className="mb-6 !shadow-none border border-[var(--border)]">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-[var(--primary)]" />
                            Layout Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <span className="text-xs font-medium text-[var(--muted-400)] uppercase tracking-wider">Type</span>
                                <div className="mt-1">
                                    <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 font-medium">
                                        {getLayoutTypeName(layout.layoutType)}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-[var(--muted-400)] uppercase tracking-wider">Display Order</span>
                                <p className="mt-1 text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-[var(--muted-300)]" />
                                    {layout.displayOrder}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-[var(--muted-400)] uppercase tracking-wider">Total Areas</span>
                                <p className="mt-1 text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[var(--muted-300)]" />
                                    {areas.length} area{areas.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-[var(--muted-400)] uppercase tracking-wider">Created</span>
                                <p className="mt-1 text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[var(--muted-300)]" />
                                    {layout.createdAt
                                        ? new Date(layout.createdAt).toLocaleDateString('en-AU', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                        })
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Side-by-side: Areas List | Items Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                    {/* LEFT: Areas List */}
                    <div>
                        <Card className="!shadow-none border border-[var(--border)] h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[var(--primary)]" />
                                    Areas ({areas.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {areas.length === 0 ? (
                                    <div className="text-center py-12 text-[var(--muted-400)]">
                                        <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No areas defined for this layout.</p>
                                    </div>
                                ) : (
                                    <ul className="space-y-1">
                                        {areas.map((area, idx) => (
                                            <li key={area.id ?? idx}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedAreaIndex(idx)}
                                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                                ${selectedAreaIndex === idx
                                                            ? 'bg-[var(--primary)] text-white shadow-sm'
                                                            : 'hover:bg-[var(--muted-100)] text-[var(--foreground)]'
                                                        }`}
                                                >
                                                    <span className="flex-1 text-sm font-medium truncate">
                                                        {area.areaName}
                                                    </span>
                                                    <Badge className={`text-[10px] shrink-0 ${selectedAreaIndex === idx ? 'bg-white/20 text-white border-white/30' : 'bg-[var(--muted-100)]'}`}>
                                                        {(area.layoutItem || []).length} items
                                                    </Badge>
                                                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${selectedAreaIndex === idx ? 'rotate-90' : ''}`} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: Items Panel */}
                    <div>
                        {!selectedArea ? (
                            <Card className="!shadow-none border border-dashed border-[var(--border)]">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-[var(--muted-400)]">
                                    <Layers className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Select an area to view its items</p>
                                    <p className="text-xs mt-1">Click on any area in the left panel</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="!shadow-none border border-[var(--border)]">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-[var(--secondary)]" />
                                                Items for: <span className="text-[var(--primary)] font-semibold">{selectedArea.areaName}</span>
                                            </CardTitle>
                                            <p className="text-xs text-[var(--muted-400)] mt-0.5">
                                                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} defined
                                                {selectedArea.displayOrder ? ` · Order: ${selectedArea.displayOrder}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {selectedItems.length === 0 ? (
                                        <div className="text-center py-10 text-[var(--muted-400)]">
                                            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No items in this area.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {selectedItems.map((item, itemIdx) => (
                                                <div
                                                    key={item.id ?? itemIdx}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
                                                >
                                                    <span className="text-xs text-[var(--muted-400)] font-mono w-6 shrink-0">
                                                        {itemIdx + 1}.
                                                    </span>
                                                    <span className="flex-1 text-sm font-medium text-[var(--foreground)]">
                                                        {item.itemName}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--muted-400)] bg-[var(--muted-100)] px-2 py-0.5 rounded-full font-mono">
                                                        #{item.displayOrder}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
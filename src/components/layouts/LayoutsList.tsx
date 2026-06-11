'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyLayoutResponse, PropertyType } from '@/types/api';
import layoutApi from '@/lib/api/propertyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
    Plus, Eye, Edit, Trash2, Search, Building2, Layers,
    Loader2, AlertCircle, ChevronLeft, ChevronRight
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
   Badge builder
   ──────────────────────────────────────────── */

function renderLayoutBadges(layout: PropertyLayoutResponse): Array<{ text: string; color: string }> {
    const components: Array<{ text: string; color: string }> = [];

    (layout.layoutArea || []).forEach((area: any) => {
        (area.layoutItem || []).forEach((item: any) => {
            const itemName = (item.itemName || '').toLowerCase();
            if (itemName.includes('bed')) {
                const count = itemName.match(/\d+/)?.[0] || '1';
                components.push({ text: `${count} Bed`, color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' });
            } else if (itemName.includes('bath')) {
                const count = itemName.match(/\d+/)?.[0] || '1';
                components.push({ text: `${count} Bath`, color: 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20' });
            } else if (itemName.includes('kitchen')) {
                components.push({ text: 'Kitchen', color: 'bg-orange-100 text-orange-800 border-orange-200' });
            } else if (itemName.includes('lounge') || itemName.includes('living')) {
                components.push({ text: 'Lounge', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' });
            } else if (itemName.includes('dining')) {
                components.push({ text: 'Dining', color: 'bg-amber-100 text-amber-800 border-amber-200' });
            } else if (itemName.includes('laundry')) {
                components.push({ text: 'Laundry', color: 'bg-gray-100 text-gray-800 border-gray-200' });
            } else if (itemName.includes('garage')) {
                components.push({ text: 'Garage', color: 'bg-slate-100 text-slate-800 border-slate-200' });
            } else if (itemName.includes('balcony')) {
                components.push({ text: 'Balcony', color: 'bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/10' });
            } else if (itemName.includes('garden')) {
                components.push({ text: 'Garden', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' });
            } else if (itemName.includes('pool')) {
                components.push({ text: 'Pool', color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' });
            } else if (itemName.includes('ensuite')) {
                components.push({ text: 'Ensuite', color: 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20' });
            } else if (itemName.includes('toilet')) {
                components.push({ text: 'Toilet', color: 'bg-[var(--secondary)]/5 text-[var(--secondary)] border-[var(--secondary)]/10' });
            } else if (itemName.includes('study')) {
                components.push({ text: 'Study', color: 'bg-amber-50 text-amber-700 border-amber-100' });
            }
        });
    });

    return components;
}

/* ────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */

export interface LayoutsListProps {
    /** When true, hides the StandaloneHeader and full-page wrapper — used inside AdminDashboard */
    embedded?: boolean;
    /** Callbacks for embedded mode — navigate within dashboard instead of router.push */
    onCreateLayout?: () => void;
    onEditLayout?: (id: string) => void;
    onViewLayout?: (id: string) => void;
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function LayoutsList({ embedded = false, onCreateLayout, onEditLayout, onViewLayout }: LayoutsListProps) {
    const router = useRouter();

    const [layouts, setLayouts] = useState<PropertyLayoutResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedLayoutType, setSelectedLayoutType] = useState<number | null>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<PropertyLayoutResponse | null>(null);
    const [deleting, setDeleting] = useState(false);

    /* ── Load layouts with backend filters ── */
    const loadLayouts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const filters: { search?: string; layoutType?: number } = {};
            if (searchTerm) filters.search = searchTerm;
            if (selectedLayoutType !== null) filters.layoutType = selectedLayoutType;
            const result = await layoutApi.getPaged(page, pageSize, filters);
            setLayouts(result.data);
            setTotalCount(result.totalCount);
            setTotalPages(result.totalPages);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to load layouts';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm, selectedLayoutType]);

    useEffect(() => {
        loadLayouts();
    }, [loadLayouts]);

    /* ── Filter handlers ── */
    const handleSearch = () => {
        setSearchTerm(searchInput);
        setPage(1);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleTypeChange = (value: string) => {
        setSelectedLayoutType(value ? Number(value) : null);
        setPage(1);
    };

    /* ── Delete ── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await layoutApi.delete(deleteTarget.id as string);
            setDeleteTarget(null);
            await loadLayouts();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to delete layout';
            setError(msg);
        } finally {
            setDeleting(false);
        }
    };

    /* ── Pagination ── */
    const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);

    /* ── Render ── */
    return (
        <>
            {/* Page title bar with action button — only when embedded in dashboard */}
            {embedded && (
                <header className="bg-white border-b border-[var(--border)] sticky top-[61px] z-20 shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                <Layers className="w-5 h-5 text-[var(--primary)]" />
                                Layout Management
                            </h1>
                            <p className="text-sm text-[var(--muted-500)] mt-0.5">
                                Manage property inspection layout templates
                            </p>
                        </div>
                        <Button
                            onClick={() => embedded && onCreateLayout ? onCreateLayout() : router.push('/layouts/create')}
                            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-2 px-4"
                        >
                            <Plus className="w-4 h-4" />
                            Create Layout
                        </Button>
                    </div>
                </header>
            )}

            <div className="max-w-[1600px] mx-auto p-6 space-y-6">
                {/* Error banner */}
                {error && (
                    <div className="bg-[var(--destructive-50)] border border-[var(--destructive-200)] text-[var(--destructive)] px-4 py-3 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                        <button onClick={() => setError('')} className="ml-auto shrink-0 text-sm underline">Dismiss</button>
                    </div>
                )}

                {/* Search & Filters */}
                <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm">
                    <div className="p-6 border-b border-[var(--border)]">
                        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Search & Filters</h3>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--muted-700)]" htmlFor="layout-search">Layout Name</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="layout-search"
                                        placeholder="Search by layout name…"
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        className="flex-1"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSearch}
                                        className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-3"
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--muted-700)]" htmlFor="layout-type-filter">Layout Type</Label>
                                <select
                                    id="layout-type-filter"
                                    value={selectedLayoutType ?? ''}
                                    onChange={e => handleTypeChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-shadow"
                                >
                                    <option value="">All Types</option>
                                    {LAYOUT_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                    </div>

                    {/* Info bar */}
                    <div className="px-6 py-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[var(--muted-400)]" />
                            Property Layouts
                        </h3>
                        <span className="text-sm text-[var(--muted-400)]">
                            Showing {startItem}–{endItem} of {totalCount} layout{totalCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[var(--muted-50)] border-b border-[var(--border)]">
                                    <TableHead className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-500)] uppercase tracking-wider">
                                        Layout Name
                                    </TableHead>
                                    <TableHead className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-500)] uppercase tracking-wider">
                                        Layout Type
                                    </TableHead>
                                    <TableHead className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-500)] uppercase tracking-wider">
                                        Components
                                    </TableHead>
                                    <TableHead className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-500)] uppercase tracking-wider">
                                        Areas
                                    </TableHead>
                                    <TableHead className="w-32 px-6 py-4 text-left text-xs font-medium text-[var(--muted-500)] uppercase tracking-wider">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white divide-y divide-[var(--border)]">
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-6 py-16 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                                                <span className="text-sm text-[var(--muted-500)]">Loading layouts…</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : layouts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-6 py-16 text-center">
                                            <div className="text-[var(--muted-400)]">
                                                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                                <p className="text-base font-medium">No layouts found</p>
                                                <p className="text-sm mt-1">
                                                    {searchTerm || selectedLayoutType
                                                        ? 'No layouts match your current filters.'
                                                        : 'Get started by creating your first layout.'}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    layouts.map(layout => {
                                        const badges = renderLayoutBadges(layout);
                                        return (
                                            <TableRow key={layout.id} className="hover:bg-[var(--muted-50)] transition-colors">
                                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-[var(--foreground)]">
                                                        {layout.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                                    <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20">
                                                        {getLayoutTypeName(layout.layoutType)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-wrap gap-1">
                                                        {badges.slice(0, 4).map((b, i) => (
                                                            <Badge key={i} className={`text-[10px] px-1.5 py-0 border ${b.color}`}>
                                                                {b.text}
                                                            </Badge>
                                                        ))}
                                                        {badges.length > 4 && (
                                                            <Badge className="text-[10px] bg-[var(--muted-100)] text-[var(--muted-500)]">
                                                                +{badges.length - 4}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-600)]">
                                                    {(layout.layoutArea || []).length ?? 0}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted-50)] p-1 shadow-sm">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => embedded && onViewLayout ? onViewLayout(layout.id) : router.push(`/layouts/${layout.id}`)}
                                                            className="h-10 w-10 rounded-lg text-[var(--muted-600)] hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                            title="View Layout"
                                                            aria-label="View layout"
                                                        >
                                                            <Eye className="h-5 w-5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => embedded && onEditLayout ? onEditLayout(layout.id) : router.push(`/layouts/${layout.id}/edit`)}
                                                            className="h-10 w-10 rounded-lg text-[var(--muted-600)] hover:text-amber-600 hover:bg-amber-50 transition-all"
                                                            title="Edit Layout"
                                                            aria-label="Edit layout"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setDeleteTarget(layout)}
                                                            className="h-10 w-10 rounded-lg text-[var(--muted-600)] hover:text-red-600 hover:bg-red-50 transition-all"
                                                            title="Delete Layout"
                                                            aria-label="Delete layout"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--muted-50)] flex items-center justify-between">
                            <span className="text-sm text-[var(--muted-500)]">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="gap-1"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="gap-1"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[var(--border)]">
                        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--muted-50)] rounded-t-2xl">
                            <h2 className="text-lg font-semibold text-[var(--foreground)]">Delete Layout</h2>
                        </div>
                        <div className="px-6 py-5 space-y-3">
                            <p className="text-sm text-[var(--muted-600)]">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-[var(--foreground)]">
                                    {(deleteTarget as any).name || 'this layout'}
                                </span>
                                ? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--muted-50)] rounded-b-2xl flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-[var(--destructive)] hover:bg-[var(--destructive)]/90 text-white gap-1.5"
                            >
                                {deleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                {deleting ? 'Deleting…' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
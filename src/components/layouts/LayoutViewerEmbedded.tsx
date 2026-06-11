'use client';

import React, { useEffect, useState } from 'react';
import LayoutViewer from '@/components/layouts/LayoutViewer';
import { PropertyLayoutResponse } from '@/types/api';
import layoutApi from '@/lib/api/propertyLayout';
import { Loader2, AlertCircle } from 'lucide-react';

interface LayoutViewerEmbeddedProps {
    layoutId: string;
    onBack: () => void;
    onEdit: (id: string) => void;
}

/**
 * Thin wrapper around LayoutViewer for embedded use inside AdminDashboard.
 * Handles loading layout data, just like the standalone page does.
 */
export default function LayoutViewerEmbedded({ layoutId, onBack, onEdit }: LayoutViewerEmbeddedProps) {
    const [layout, setLayout] = useState<PropertyLayoutResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const fullLayout = await layoutApi.getById(layoutId);
                setLayout(fullLayout);
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to load layout';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [layoutId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    <p className="text-sm text-[var(--muted-500)]">Loading layout…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-10 h-10 text-[var(--destructive)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--destructive)] mb-4">{error}</p>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-hover)] transition-colors"
                    >
                        Back to Layouts
                    </button>
                </div>
            </div>
        );
    }

    if (!layout) return null;

    return (
        <LayoutViewer
            layout={layout}
            embedded={true}
            onBack={onBack}
            onEdit={onEdit}
        />
    );
}
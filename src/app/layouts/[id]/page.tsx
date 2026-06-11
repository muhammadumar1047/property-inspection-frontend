"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LayoutViewer from '@/components/layouts/LayoutViewer';
import StandaloneHeader from '@/components/layouts/StandaloneHeader';
import { PropertyLayoutResponse } from '@/types/api';
import layoutApi from '@/lib/api/propertyLayout';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ViewLayoutPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const [layout, setLayout] = useState<PropertyLayoutResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const fullLayout = await layoutApi.getById(id);
                setLayout(fullLayout);
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to load layout';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-surface)]">
                <StandaloneHeader subtitle="View Layout" backRoute="/layouts" />
                <div className="flex items-center justify-center py-32">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                        <p className="text-sm text-[var(--muted-500)]">Loading layout…</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg-surface)]">
                <StandaloneHeader subtitle="View Layout" backRoute="/layouts" />
                <div className="flex items-center justify-center py-32">
                    <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-8 max-w-md w-full text-center">
                        <AlertCircle className="w-10 h-10 text-[var(--destructive)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--destructive)] mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/layouts')}
                            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-hover)] transition-colors"
                        >
                            Back to Layouts
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!layout) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-surface)]">
            <StandaloneHeader subtitle="View Layout" backRoute="/layouts" />
            <LayoutViewer layout={layout} />
        </div>
    );
}
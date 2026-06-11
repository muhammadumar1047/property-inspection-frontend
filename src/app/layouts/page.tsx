'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import StandaloneHeader from '@/components/layouts/StandaloneHeader';
import LayoutsList from '@/components/layouts/LayoutsList';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';

export default function LayoutsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[var(--bg-surface)] animate-fade-in">
            <StandaloneHeader subtitle="Layout Management" backRoute="/dashboard" />
            {/* Page toolbar */}
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
                        onClick={() => router.push('/layouts/create')}
                        className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-2 px-4"
                    >
                        <Plus className="w-4 h-4" />
                        Create Layout
                    </Button>
                </div>
            </header>
            <LayoutsList embedded={false} />
        </div>
    );
}
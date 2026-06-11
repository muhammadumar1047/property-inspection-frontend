"use client";

import LayoutForm from "@/components/layouts/LayoutForm";
import StandaloneHeader from "@/components/layouts/StandaloneHeader";

export default function CreateLayoutPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-surface)]">
            <StandaloneHeader subtitle="Create Layout" backRoute="/layouts" />
            <LayoutForm mode="create" />
        </div>
    );
}
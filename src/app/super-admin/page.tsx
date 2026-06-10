"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/components/AdminDashboard";

export default function SuperAdminPage() {
    const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.replace("/");
            } else if (!isSuperAdmin) {
                router.replace("/dashboard");
            }
        }
    }, [isLoading, isAuthenticated, isSuperAdmin, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    if (!isAuthenticated || !isSuperAdmin) {
        return null;
    }

    return <AdminDashboard />;
}

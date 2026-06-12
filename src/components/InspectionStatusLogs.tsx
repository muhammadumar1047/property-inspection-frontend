"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    History,
    Search,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Filter,
    X,
    ArrowUpDown,
    Monitor,
    Smartphone,
    Globe,
    Calendar,
} from "lucide-react";
import inspectionApi from "@/lib/api/inspection";
import type { InspectionStatusLogResponse } from "@/types/api";

const PAGE_SIZE = 15;

const statusBadgeStyles: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    InProgress: "bg-blue-100 text-blue-800 border-blue-200",
    InSync: "bg-indigo-100 text-indigo-800 border-indigo-200",
    Completed: "bg-green-100 text-green-800 border-green-200",
    Closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const defaultStatusStyle = "bg-slate-100 text-slate-700 border-slate-200";

const InspectionStatusLogs: React.FC = () => {
    const [logs, setLogs] = useState<InspectionStatusLogResponse[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [filterInspectionId, setFilterInspectionId] = useState("");
    const [filterUserId, setFilterUserId] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

    // Active filters (applied when user clicks search)
    const [activeFilters, setActiveFilters] = useState<{
        inspectionId?: string;
        userId?: string;
        startDate?: string;
        endDate?: string;
    }>({});

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const result = await inspectionApi.getAllStatusLogs(page, PAGE_SIZE, activeFilters);
            setLogs(result.data);
            setTotalCount(result.totalCount);
        } catch (err) {
            console.error("Failed to fetch inspection status logs:", err);
            setLogs([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [page, activeFilters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleApplyFilters = () => {
        setPage(1);
        setActiveFilters({
            inspectionId: filterInspectionId.trim() || undefined,
            userId: filterUserId.trim() || undefined,
            startDate: filterStartDate || undefined,
            endDate: filterEndDate || undefined,
        });
    };

    const handleClearFilters = () => {
        setFilterInspectionId("");
        setFilterUserId("");
        setFilterStartDate("");
        setFilterEndDate("");
        setPage(1);
        setActiveFilters({});
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const hasActiveFilters = activeFilters.inspectionId || activeFilters.userId || activeFilters.startDate || activeFilters.endDate;

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const getStatusBadge = (status: string | null) => {
        if (!status) return <span className="text-gray-400 text-xs italic">—</span>;
        const style = statusBadgeStyles[status] ?? defaultStatusStyle;
        return (
            <Badge variant="outline" className={`text-xs font-medium px-2 py-0.5 ${style}`}>
                {status === "InProgress" ? "In Progress" : status}
            </Badge>
        );
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType.toLowerCase()) {
            case "mobile":
            case "ios":
            case "android":
                return <Smartphone className="w-3.5 h-3.5" />;
            case "web":
                return <Monitor className="w-3.5 h-3.5" />;
            default:
                return <Globe className="w-3.5 h-3.5" />;
        }
    };

    const truncateId = (id: string) => id.substring(0, 8) + "...";

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <History className="w-6 h-6 text-[var(--primary)]" />
                        Inspection Status Logs
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Complete audit trail of all inspection status changes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-1.5"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 bg-[var(--primary)] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                {Object.values(activeFilters).filter(Boolean).length}
                            </span>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">Inspection ID</label>
                                <Input
                                    placeholder="e.g. a1b2c3d4..."
                                    value={filterInspectionId}
                                    onChange={(e) => setFilterInspectionId(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">User ID</label>
                                <Input
                                    placeholder="e.g. a1b2c3d4..."
                                    value={filterUserId}
                                    onChange={(e) => setFilterUserId(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">Start Date</label>
                                <Input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">End Date</label>
                                <Input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                            <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-1.5">
                                <X className="w-3.5 h-3.5" />
                                Clear
                            </Button>
                            <Button size="sm" onClick={handleApplyFilters} className="gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb]">
                                <Search className="w-3.5 h-3.5" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Summary */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-white to-slate-50/50">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm">
                        <History className="w-4 h-4 text-[var(--primary)]" />
                        <span className="font-medium">
                            {totalCount} total log{totalCount !== 1 ? "s" : ""}
                        </span>
                        {hasActiveFilters && (
                            <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Filtered
                            </Badge>
                        )}
                        {loading && (
                            <span className="ml-2 text-gray-400 text-xs animate-pulse">Loading...</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Status Change History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && logs.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
                                <p className="text-sm text-gray-500">Loading audit logs...</p>
                            </div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <History className="w-8 h-8 text-gray-300" />
                                <p className="text-sm text-gray-500">
                                    {hasActiveFilters
                                        ? "No logs match the current filters."
                                        : "No inspection status logs recorded yet."}
                                </p>
                                {hasActiveFilters && (
                                    <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Timestamp
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Inspection
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            User
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Previous Status
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            New Status
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Device
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            IP Address
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Comments
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-gray-50/70 transition-colors">
                                            <TableCell className="text-xs text-gray-600 whitespace-nowrap py-3">
                                                {formatDateTime(log.timestamp)}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-gray-700 py-3">
                                                <span title={log.inspectionId}>{truncateId(log.inspectionId)}</span>
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-700 py-3 font-medium">
                                                {log.userName}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {getStatusBadge(log.previousStatus)}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {getStatusBadge(log.newStatus)}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    {getDeviceIcon(log.deviceType)}
                                                    <span>{log.deviceType}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-gray-500 py-3">
                                                {log.ipAddress || (
                                                    <span className="text-gray-400 italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-600 max-w-[200px] truncate py-3">
                                                {log.comments || (
                                                    <span className="text-gray-400 italic">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                            <p className="text-xs text-gray-500">
                                Page {page} of {totalPages} ({totalCount} total records)
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="h-8 px-2.5"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <select
                                    className="h-8 text-xs px-2 border border-slate-200 rounded focus:outline-none bg-white"
                                    value={page}
                                    onChange={(e) => setPage(Number(e.target.value))}
                                >
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="h-8 px-2.5"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default InspectionStatusLogs;
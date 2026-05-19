"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Building,
  ClipboardList,
  FileText,
  FileStack,
  Settings as SettingsIcon,
  Search,
  Bell,
  User,
  UserCircle,
  LogOut,
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  Clock3,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  UserCog,
  Users,
  Mail,
  PenTool,
  History,
  Layers,
  MapPin,
  CreditCard,
  ShieldCheck,
  Shield,
  Plug,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import dynamic from "next/dynamic";
import { propertyApi } from "@/lib/api/property";
import inspectionApi from "@/lib/api/inspection";
import { analyticsApi } from "@/lib/api/analytics";
import type { AnalyticsChartDto, AnalyticsSummaryDto } from "@/types/api";
import Modal from "@/components/ui/Modal";
import NotificationsBell from "@/components/NotificationsBell";
const PropertiesTable = dynamic(() => import("@/components/PropertiesTable"), { ssr: false });
const InspectionManagement = dynamic(() => import("@/components/InspectionManagement"), { ssr: false });
const Settings = dynamic(() => import("@/components/Settings"), { ssr: false });
const GeneralSettings = dynamic(() => import("@/components/GeneralSettings"), { ssr: false });
const UserSettings = dynamic(() => import("@/components/UserSettings"), { ssr: false });
const AgencySettings = dynamic(() => import("@/components/AgencySettings"), { ssr: false });
const AgencyManagement = dynamic(() => import("@/components/AgencyManagement"), { ssr: false });
const BillingPlans = dynamic(() => import("@/components/BillingPlans"), { ssr: false });
import LayoutManagement from "@/components/LayoutManagement";
import UserProfile from "@/components/UserProfile";
import ReferenceData from "@/components/ReferenceData";
import PropertyCreation from "@/components/PropertyCreation";
import GlobalSearch from "@/components/GlobalSearch";


type StatCard = {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
};

const INSPECTION_TYPES = ["Entry", "Exit", "Routine"] as const;

type SparklineProps = {
  data: number[];
  width?: number | string;
  height?: number;
  padding?: number;
};

function Sparkline({ data, width = "100%", height = 80, padding = 8 }: SparklineProps) {
  if (!data || data.length === 0) {
    return null;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerWidth = 600; // virtual width for viewBox
  const innerHeight = height;
  const usableWidth = innerWidth - padding * 2;
  const usableHeight = innerHeight - padding * 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index * usableWidth) / (data.length - 1);
      const y = padding + (1 - (value - min) / range) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const lastX = padding + ((data.length - 1) * usableWidth) / (data.length - 1);
  const lastY = padding + (1 - (data[data.length - 1] - min) / range) * usableHeight;

  return (
    <svg viewBox={`0 0 ${innerWidth} ${innerHeight}`} width={width} height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparklineGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
      <polyline
        fill="url(#sparklineGradient)"
        stroke="none"
        points={`${points} ${lastX},${innerHeight - padding} ${padding},${innerHeight - padding}`}
      />
      <circle cx={lastX} cy={lastY} r="3" fill="currentColor" />
    </svg>
  );
}

function fmtPct(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "0%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

const mainSidebarItems = [
  { icon: ClipboardList, label: "Inspections" },
  { icon: Building2, label: "Properties" },
  { icon: LayoutDashboard, label: "Analytics" },
];

const settingsMenuItems = [
  { icon: SettingsIcon, label: "General Settings" },
  { icon: Users, label: "User Settings" },
  { icon: Building, label: "Agency Settings" },
  { icon: Mail, label: "Email Templates" },
  // { icon: PenTool, label: "Signatures" },
  // { icon: History, label: "Email Logs" },
  //{ icon: Layers, label: "Areas / Items" },
  //{ icon: ShieldCheck, label: "Account Settings" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-secondary text-secondary-foreground">Completed</Badge>;
    case "in-progress":
      return <Badge className="bg-accent text-accent-foreground">In Progress</Badge>;
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "issues-found":
      return <Badge variant="destructive">Issues Found</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminDashboard() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryDto | null>(null);
  const [analyticsCharts, setAnalyticsCharts] = useState<AnalyticsChartDto | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('inspections');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSection = localStorage.getItem('dashboard-active-section');
    if (savedSection) {
      setActiveSection(savedSection);
    }
  }, []);


  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);



  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [propertyResults, setPropertyResults] = useState<any[]>([]);
  const [inspectionResults, setInspectionResults] = useState<any[]>([]);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [showingSearchResults, setShowingSearchResults] = useState<{ type: 'properties' | 'inspections' | null, query: string }>({ type: null, query: '' });
  const router = useRouter();
  const { logout, user, isSuperAdmin, impersonatedAgencyId, impersonatedAgencyName, effectiveAgencyId, stopImpersonating } = useAuth();

  // Analytics filters
  const [selectedRange, setSelectedRange] = useState<'current' | '3m' | '6m' | '12m' | 'custom'>('12m');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...INSPECTION_TYPES]);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const availableChartTypes = useMemo(
    () => (analyticsCharts?.datasets ?? []).map((d) => d.label),
    [analyticsCharts]
  );
  const availableChartTypesKey = useMemo(() => availableChartTypes.join("|"), [availableChartTypes]);

  useEffect(() => {
    if (availableChartTypes.length === 0) return;
    setSelectedTypes((prev) => {
      if (prev.length === 0) return availableChartTypes;
      const filtered = prev.filter((t) => availableChartTypes.includes(t));
      return filtered.length ? filtered : availableChartTypes;
    });
  }, [availableChartTypesKey]);

  const isAgencyAdmin = useMemo(() => {
    if (!user || isSuperAdmin) return false;
    return (user.roles || []).some(r => r.toLowerCase() === 'admin');
  }, [user, isSuperAdmin]);

  const isSuperAdminRoute = pathname === "/super-admin";
  const showAgencyView = !isSuperAdmin || (!!impersonatedAgencyId && !isSuperAdminRoute);
  const sidebarItems = showAgencyView
    ? mainSidebarItems
    : [
      { icon: Building2, label: 'Agencies' },
      { icon: CreditCard, label: 'Billing Plans' }
    ];

  const handleViewReport = (inspectionId: string | number, propertyId?: string) => {
    const targetPropertyId = propertyId || 0;
    const url = `/properties/${targetPropertyId}?viewReportForInspectionId=${inspectionId}`;
    try {
      window.open(url, '_blank');
    } catch (e) {
      window.location.href = url;
    }
  };

  const fetchInspectionCount = async () => {
    try {
      const response = await inspectionApi.getPaged(1, 1);
      setInspectionCount(response.totalCount || 0);
    } catch {
      setInspectionCount(0);
    }
  };

  const fetchPropertyCount = async () => {
    try {
      const response = await propertyApi.getAllFiltered(1, 1);
      setPropertyCount(response.totalCount || 0);
    } catch {
      setPropertyCount(0);
    }
  };

  const didFetchCountsRef = useRef(false);
  useEffect(() => {
    if (didFetchCountsRef.current) return;
    if (!showAgencyView) return;
    if (isSuperAdminRoute) return;
    didFetchCountsRef.current = true;
    fetchInspectionCount();
    fetchPropertyCount();
  }, [showAgencyView]);

  const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

  const buildAnalyticsFilters = () => {
    const now = new Date();
    const today = toIsoDate(now);

    if (selectedRange === 'custom') {
      if (customStart && customEnd) {
        return { startDate: customStart, endDate: customEnd };
      }
      if (customStart) {
        return { startDate: customStart, endDate: today };
      }
      if (customEnd) {
        return { startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: customEnd };
      }
    }

    if (selectedRange === 'current') {
      return {
        startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: today,
      };
    }

    const months = selectedRange === '3m' ? 3 : selectedRange === '6m' ? 6 : 12;
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    return { startDate: toIsoDate(start), endDate: today };
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (ignore) return;
      if (!showAgencyView) return;
      if (isSuperAdminRoute) return;
      if (activeSection !== 'analytics') return;
      setAnalyticsLoading(true);
      try {
        const filters = buildAnalyticsFilters();
        const [summary, charts] = await Promise.all([
          analyticsApi.getSummary(filters),
          analyticsApi.getCharts(filters),
        ]);
        if (!ignore) {
          setAnalyticsSummary(summary);
          setAnalyticsCharts(charts);
        }
      } catch {
        if (!ignore) {
          setAnalyticsSummary(null);
          setAnalyticsCharts(null);
        }
      } finally {
        if (!ignore) setAnalyticsLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 20000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [showAgencyView, isSuperAdminRoute, activeSection, selectedRange, customStart, customEnd]);



  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleNavigation = (path: string) => {
    if (path === "logout") {
      handleLogout();
      return;
    }
    if (path !== "edit property") {
      setEditingPropertyId(null);
    }
    setActiveSection(path);
    // Save the active section to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-active-section', path);
    }
    // Clear property filter when navigating away from inspections
    if (path !== "inspections") {
      setSelectedPropertyId(null);
    }
    // Clear search results when navigating to a different section
    setShowingSearchResults({ type: null, query: '' });
  };

  // Force superadmin to Agencies or Billing Plans section only (unless impersonating)
  useEffect(() => {
    if (isSuperAdmin && !impersonatedAgencyId && !['agencies', 'billing plans'].includes(activeSection)) {
      setActiveSection('agencies');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard-active-section', 'agencies');
      }
    }
    // When impersonating, redirect away from the agencies view to the agency's default view
    if (isSuperAdmin && impersonatedAgencyId && activeSection === 'agencies' && !isSuperAdminRoute) {
      setActiveSection('inspections');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard-active-section', 'inspections');
      }
    }
  }, [isSuperAdmin, impersonatedAgencyId, activeSection, isSuperAdminRoute]);



  const clearSearchResults = () => {
    setShowingSearchResults({ type: null, query: '' });
  };

  const handleInspectionClick = async (inspectionId: string | number) => {
    try {
      // Call /inspection/{id} API to get the specific inspection
      console.log('Fetching inspection details for ID:', inspectionId);
      const inspectionDetails = await inspectionApi.getById(inspectionId.toString());
      console.log('Inspection details:', inspectionDetails);

      // Navigate to Inspections section and show the specific inspection
      setActiveSection('inspections');
      // Save the active section to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard-active-section', 'inspections');
      }
      setShowingSearchResults({ type: 'inspections', query: '' });
      setInspectionResults([inspectionDetails]); // Show only the selected inspection
    } catch (error) {
      console.error('Error fetching inspection details:', error);
    }
  };



  const renderMainContent = () => {
    switch (activeSection) {
      case "profile":
        return <UserProfile />;
      case "agencies":
        return <AgencyManagement />;
      case "billing plans":
        return <BillingPlans />;
      // removed agency management
      case "analytics": {
        const stats: StatCard[] = [
          {
            title: "Total Properties",
            value: analyticsSummary ? String(analyticsSummary.totalProperties ?? 0) : "--",
            change: analyticsSummary ? fmtPct(Number(analyticsSummary.totalPropertiesChangePercent ?? 0)) : "--",
            icon: Building2,
            color: "text-primary",
          },
          {
            title: "Completed Inspections",
            value: analyticsSummary ? String(analyticsSummary.completedInspections ?? 0) : "--",
            change: analyticsSummary ? fmtPct(Number(analyticsSummary.completedInspectionsChangePercent ?? 0)) : "--",
            icon: CheckCircle2,
            color: "text-secondary",
          },
          {
            title: "Pending Inspections",
            value: analyticsSummary ? String(analyticsSummary.pendingInspections ?? 0) : "--",
            change: analyticsSummary ? fmtPct(Number(analyticsSummary.pendingInspectionsChangePercent ?? 0)) : "--",
            icon: Clock3,
            color: "text-accent",
          },
          {
            title: "Reports Generated",
            value: analyticsSummary ? String(analyticsSummary.reportsGenerated ?? 0) : "--",
            change: analyticsSummary ? fmtPct(Number(analyticsSummary.reportsGeneratedChangePercent ?? 0)) : "--",
            icon: FileStack,
            color: "text-primary",
          },
        ];

        const recentInspections =
          (analyticsSummary?.recentInspections ?? []).map((r: any, idx: number) => ({
            id: `recent-${idx}`,
            property: r.propertyAddress,
            inspector: r.inspectorName,
            date: r.date,
            status: String(r.status || "").toLowerCase(),
          })) ?? [];

        const upcomingInspections =
          (analyticsSummary?.upcomingInspections ?? []).map((u: any, idx: number) => {
            const dt = u.scheduledDateTime ? new Date(u.scheduledDateTime) : null;
            const dateLabel = dt ? dt.toLocaleDateString() : "--";
            const timeLabel = dt ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
            return {
              id: `upcoming-${idx}`,
              property: u.propertyAddress,
              inspector: u.inspectorName,
              time: timeLabel,
              date: dateLabel,
            };
          }) ?? [];

        const chartLabels = analyticsCharts?.labels ?? [];
        const chartDatasets = analyticsCharts?.datasets ?? [];
        const availableTypes = availableChartTypes;
        const activeTypes = selectedTypes.length > 0 ? selectedTypes : (availableTypes.length ? availableTypes : [...INSPECTION_TYPES]);

        const labelDates = chartLabels.map((l) => new Date(l));
        let selectedIndices: number[] = [];
        if (chartLabels.length > 0) {
          if (selectedRange === 'current') {
            selectedIndices = [chartLabels.length - 1];
          } else if (selectedRange === '3m' || selectedRange === '6m' || selectedRange === '12m') {
            const months = selectedRange === '3m' ? 3 : selectedRange === '6m' ? 6 : 12;
            const startIndex = Math.max(0, chartLabels.length - months);
            selectedIndices = Array.from({ length: chartLabels.length - startIndex }, (_, i) => startIndex + i);
          } else {
            const start = customStart ? new Date(customStart) : null;
            const end = customEnd ? new Date(customEnd) : null;
            if (start && end) {
              const startTime = new Date(start.getFullYear(), start.getMonth(), 1).getTime();
              const endTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime();
              const [from, to] = startTime <= endTime ? [startTime, endTime] : [endTime, startTime];
              selectedIndices = labelDates
                .map((d, idx) => ({ t: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), idx }))
                .filter((x) => x.t >= from && x.t <= to)
                .map((x) => x.idx);
            }
            if (selectedIndices.length === 0) {
              selectedIndices = [chartLabels.length - 1];
            }
          }
        }

        const seriesByType: Record<string, number[]> = {};
        chartDatasets.forEach((d) => {
          seriesByType[d.label] = Array.isArray(d.data) ? d.data : [];
        });

        const summedAllMonths: number[] = chartLabels.map((_, idx) =>
          activeTypes.reduce((acc, t) => acc + (seriesByType[t]?.[idx] ?? 0), 0)
        );
        const sparkData = selectedIndices.map((idx) => summedAllMonths[idx] ?? 0);

        const typeLabels = availableTypes.length ? availableTypes : activeTypes;
        const computedInspectionTypeData = typeLabels.map((label) => ({
          label,
          value: selectedIndices.reduce((acc, idx) => acc + (seriesByType[label]?.[idx] ?? 0), 0),
        }));
        const maxTypeValue = Math.max(1, ...computedInspectionTypeData.map((x) => x.value));

        const cardDesc = (() => {
          if (selectedRange === 'current') return 'Trend for current month';
          if (selectedRange === 'custom') {
            if (customStart && customEnd) return `Trend from ${customStart} to ${customEnd}`;
            if (customStart) return `Trend from ${customStart}`;
            if (customEnd) return `Trend until ${customEnd}`;
            return 'Custom date range';
          }
          const months = selectedRange === '3m' ? 3 : selectedRange === '6m' ? 6 : 12;
          return `Trend over the last ${months} months`;
        })();

        const inspectionTypeOptions = availableTypes.length ? availableTypes : [...INSPECTION_TYPES];

        const toggleType = (label: string) => {
          setSelectedTypes((prev) =>
            prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
          );
        };

        if (analyticsLoading) {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 pt-4">
                      <div className="h-3 w-32 bg-[var(--muted-200)] rounded-lg" />
                      <div className="mt-3 h-8 w-20 bg-[var(--muted-200)] rounded-lg" />
                      <div className="mt-3 h-3 w-16 bg-[var(--muted-200)] rounded-lg" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 w-48 bg-[var(--muted-200)] rounded-lg" />
                  <div className="mt-4 h-24 w-full bg-[var(--muted-200)] rounded-lg" />
                </CardContent>
              </Card>
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <Card className="!shadow-none border border-[var(--border)]">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--muted-400)] uppercase tracking-wider">Range</span>
                    <div className="flex items-center gap-1.5 bg-[var(--muted-100)] p-1 rounded-lg">
                      <Button variant={selectedRange === 'current' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedRange('current')} className="h-8 text-xs">Current</Button>
                      <Button variant={selectedRange === '3m' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedRange('3m')} className="h-8 text-xs">3M</Button>
                      <Button variant={selectedRange === '6m' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedRange('6m')} className="h-8 text-xs">6M</Button>
                      <Button variant={selectedRange === '12m' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedRange('12m')} className="h-8 text-xs">12M</Button>
                      <Button variant={selectedRange === 'custom' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedRange('custom')} className="h-8 text-xs">Custom</Button>
                    </div>
                  </div>
                  <div className="w-px h-5 bg-[var(--border)]" />
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--muted-400)] uppercase tracking-wider">Types</span>
                    <div className="flex items-center gap-4">
                      {inspectionTypeOptions.map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={selectedTypes.includes(t)} onCheckedChange={() => toggleType(t)} />
                          <span className="text-[var(--foreground)]">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedRange === 'custom' && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-[var(--muted-foreground)]">From</span>
                      <Input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); }} className="h-8 w-36" />
                      <span className="text-xs text-[var(--muted-foreground)]">To</span>
                      <Input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); }} className="h-8 w-36" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
              {stats.map((stat) => (
                <Card key={stat.title} className="group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-400)]">{stat.title}</p>
                        <p className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{stat.value}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[var(--secondary)]" />
                          <span className="text-xs font-semibold text-[var(--secondary)]">{stat.change}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl bg-[var(--muted-100)] group-hover:scale-110 transition-transform duration-200 ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Inspections</CardTitle>
                  <CardDescription>Latest property inspection activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Inspector</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentInspections.map((inspection: any) => (
                        <TableRow key={inspection.id}>
                          <TableCell className="font-semibold text-[var(--foreground)]">{inspection.property}</TableCell>
                          <TableCell className="text-[var(--muted-500)]">{inspection.inspector}</TableCell>
                          <TableCell className="text-[var(--muted-400)]">{inspection.date}</TableCell>
                          <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Inspections</CardTitle>
                  <CardDescription>Scheduled for today and tomorrow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingInspections.map((inspection: any, index: number) => (
                      <div key={inspection.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          {index < upcomingInspections.length - 1 && <div className="w-px h-12 bg-border mt-2"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{inspection.property}</p>
                          <p className="text-xs text-[var(--muted-500)]">{inspection.inspector}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3.5 h-3.5 text-[var(--muted-400)]" />
                            <span className="text-[11px] font-medium text-[var(--muted-400)]">
                              {inspection.date} at {inspection.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monthly Inspections</CardTitle>
                  <CardDescription>{cardDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-24 rounded bg-primary/5 p-2 text-primary">
                    <Sparkline data={sparkData} height={80} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Inspections by Type</CardTitle>
                  <CardDescription>Distribution of inspection types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {computedInspectionTypeData.map((d) => (
                      <div key={d.label} className="grid grid-cols-5 items-center gap-2">
                        <div className="col-span-1 text-xs text-muted-foreground">{d.label}</div>
                          <div className="col-span-4 h-2 bg-muted rounded">
                            <div className="h-2 bg-primary rounded" style={{ width: `${Math.round((d.value / maxTypeValue) * 100)}%` }} />
                          </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Suburbs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Suburbs</CardTitle>
                  <CardDescription>Most active areas by inspections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {[{ name: 'Central Park', inspections: 48 }, { name: 'Riverside', inspections: 37 }, { name: 'Hillview', inspections: 29 }, { name: 'Brookfield', inspections: 24 }].map((s) => (
                      <div key={s.name} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">City area</div>
                        </div>
                        <span className="px-2 inline-flex text-xs leading-5 font-medium rounded-full bg-primary/10 text-primary">{s.inspections} inspections</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        );
      }
      case "properties":
        return <PropertiesTable
          onCreateProperty={() => setActiveSection('create property')}
          onEditProperty={(id) => {
            setEditingPropertyId(id);
            setActiveSection('edit property');
          }}
          searchResults={showingSearchResults.type === 'properties' ? propertyResults : undefined}
          searchQuery={showingSearchResults.type === 'properties' ? showingSearchResults.query : undefined}
          onClearSearch={clearSearchResults}
        />;
      case "create property":
      case "edit property":
        return <PropertyCreation
          propertyId={editingPropertyId || undefined}
          onPropertyCreated={() => {
            setActiveSection('properties');
            setEditingPropertyId(null);
            // Save the active section to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('dashboard-active-section', 'properties');
            }
            fetchPropertyCount();
          }}
          onClose={() => {
            setActiveSection('properties');
            setEditingPropertyId(null);
          }}
        />;
      case "inspections":
        console.log('Rendering InspectionManagement with selectedPropertyId:', selectedPropertyId);
        if (isSuperAdminRoute) {
          return (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">Inspections</h2>
              <p className="text-gray-600">Inspections are not loaded on the Super Admin route.</p>
            </div>
          );
        }
        return <InspectionManagement
          onInspectionChange={fetchInspectionCount}
          selectedPropertyId={selectedPropertyId}
          onClearPropertyFilter={() => setSelectedPropertyId(null)}
          searchResults={showingSearchResults.type === 'inspections' ? inspectionResults : undefined}
          searchQuery={showingSearchResults.type === 'inspections' ? showingSearchResults.query : undefined}
          onClearSearch={clearSearchResults}
        />;
      // reports removed for now
      case "layout management":
        return <LayoutManagement />;
      case "settings":
        return <Settings />;
      case "general settings":
        return <GeneralSettings />;
      case "user settings":
        return <UserSettings />;
      case "agency settings":
        return <AgencySettings view="agency" />;
      case "email templates":
        return <AgencySettings view="email-templates" />;
      case "signatures":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Signatures</h2>
            <p className="text-gray-600">Email signature management will be displayed here.</p>
          </div>
        );
      case "email logs":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Email Logs</h2>
            <p className="text-gray-600">Email activity logs will be displayed here.</p>
          </div>
        );
      case "areas / items":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Areas / Items</h2>
            <p className="text-gray-600">Property areas and items management will be displayed here.</p>
          </div>
        );

      case "integration":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Integration</h2>
            <p className="text-gray-600">Third-party integrations and API connections will be displayed here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const sidebarWidth = isSidebarCollapsed ? 'w-[72px]' : 'w-[272px]';

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Logo */}
      <div className={`border-b border-[var(--sidebar-border)] ${isSidebarCollapsed && !isMobile ? 'px-3 py-5' : 'px-5 py-5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img src="/icon-logo.png" alt="EaseInspect" className="w-9 h-9 rounded-xl shadow-sm" />
          </div>
          {(!isSidebarCollapsed || isMobile) && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-primary tracking-tight leading-none">EaseInspect</h1>
              <p className="text-[10px] font-semibold text-muted-400 uppercase tracking-widest mt-1">Enterprise</p>
            </div>
          )}
        </div>

      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto scrollbar-thin ${isSidebarCollapsed && !isMobile ? 'px-2 py-4' : 'px-3 py-4'} space-y-6`}>
        <div>
          {(!isSidebarCollapsed || isMobile) && <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-400)]">Main</div>}
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.label.toLowerCase();
              return (
                <li key={item.label}>
                  <button
                    onClick={() => { handleNavigation(item.label.toLowerCase()); if (isMobile) setIsMobileSidebarOpen(false); }}
                    title={isSidebarCollapsed && !isMobile ? item.label : undefined}
                    className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer ${isSidebarCollapsed && !isMobile ? 'justify-center h-10 px-0' : 'h-10 px-3'
                      } ${isActive
                        ? 'bg-[var(--primary)] text-white shadow-sm font-semibold'
                        : 'text-[var(--muted-600)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)]'
                      }`}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {(!isSidebarCollapsed || isMobile) && (
                      <>
                        <span className="flex-1 text-left text-sm truncate">{item.label}</span>
                        {item.label === 'Properties' && (
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--primary-50)] text-[var(--primary)]'
                            }`}>{propertyCount}</span>
                        )}
                        {item.label === 'Inspections' && (
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--primary-50)] text-[var(--primary)]'
                            }`}>{inspectionCount}</span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {showAgencyView && (
          <div>
            {(!isSidebarCollapsed || isMobile) && <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-400)]">Manage</div>}
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => { handleNavigation('layout management'); if (isMobile) setIsMobileSidebarOpen(false); }}
                  title={isSidebarCollapsed && !isMobile ? 'Layout Management' : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer ${isSidebarCollapsed && !isMobile ? 'justify-center h-10 px-0' : 'h-10 px-3'
                    } ${activeSection === 'layout management'
                      ? 'bg-[var(--primary)] text-white shadow-sm font-semibold'
                      : 'text-[var(--muted-600)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)]'
                    }`}
                >
                  <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
                  {(!isSidebarCollapsed || isMobile) && <span className="flex-1 text-left text-sm truncate">Layout Management</span>}
                </button>
              </li>

              {/* Collapsible Settings Section */}
              <li>
                <button
                  onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer text-[var(--muted-600)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)] ${isSidebarCollapsed && !isMobile ? 'justify-center h-10 px-0' : 'h-10 px-3'
                    }`}
                >
                  <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
                  {(!isSidebarCollapsed || isMobile) && (
                    <>
                      <span className="flex-1 text-left text-sm">Settings</span>
                      {isSettingsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </>
                  )}
                </button>

                {/* Settings Sub-menu */}
                {isSettingsExpanded && (!isSidebarCollapsed || isMobile) && (
                  <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-[var(--border)] pl-3">
                    {settingsMenuItems.map((item) => {
                      const isActive = activeSection === item.label.toLowerCase();
                      return (
                        <li key={item.label}>
                          <button
                            onClick={() => { handleNavigation(item.label.toLowerCase()); if (isMobile) setIsMobileSidebarOpen(false); }}
                            className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] transition-all duration-150 cursor-pointer ${isActive
                              ? 'bg-[var(--primary-50)] text-[var(--primary)] font-semibold'
                              : 'text-[var(--muted-500)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)]'
                              }`}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-left truncate">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>

              {/* Integration Item */}
              <li>
                <button
                  onClick={() => { handleNavigation('integration'); if (isMobile) setIsMobileSidebarOpen(false); }}
                  title={isSidebarCollapsed && !isMobile ? 'Integration' : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer ${isSidebarCollapsed && !isMobile ? 'justify-center h-10 px-0' : 'h-10 px-3'
                    } ${activeSection === 'integration'
                      ? 'bg-[var(--primary)] text-white shadow-sm font-semibold'
                      : 'text-[var(--muted-600)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)]'
                    }`}
                >
                  <Plug className="w-[18px] h-[18px] shrink-0" />
                  {(!isSidebarCollapsed || isMobile) && <span className="flex-1 text-left text-sm">Integration</span>}
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="border-t border-[var(--sidebar-border)] p-3">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[var(--muted-400)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)] transition-all duration-200 cursor-pointer"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
            {!isSidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      )}
    </>
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-[var(--background)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
            <img src="/icon-logo.png" alt="Logo" className="w-8 h-8 opacity-50" />
          </div>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-primary animate-[shimmer_1.5s_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return (

    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[272px] bg-white shadow-2xl flex flex-col animate-slide-down">
            <div className="flex items-center justify-end p-2">
              <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 rounded-lg text-[var(--muted-400)] hover:bg-[var(--muted-100)] transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex ${sidebarWidth} bg-white border-r border-[var(--sidebar-border)] flex-col shrink-0 transition-all duration-300 ease-in-out`}>
        {renderSidebarContent()}
      </div>

      <div className="flex-1 flex flex-col overflow-visible min-w-0">
        {impersonatedAgencyId && (
          <div className="bg-amber-500 text-white px-6 py-3 flex items-center justify-between shadow-md z-50 shrink-0 relative">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Shield className="w-5 h-5 shrink-0" />
              <span>Tenant impersonation active: You are viewing <span className="font-bold">{impersonatedAgencyName || 'Agency'}</span> as its admin would see, including all inspections, properties, and related features.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-amber-600 hover:bg-white/90 font-bold shrink-0 ml-4"
              onClick={() => {
                stopImpersonating();
                window.location.href = '/super-admin';
              }}
            >
              Exit Impersonation
            </Button>
          </div>
        )}
        <header className="bg-white/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30">
          <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
            {/* Left side — Mobile menu + Page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--muted-500)] hover:bg-[var(--muted-100)] transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-[var(--foreground)] capitalize truncate">{activeSection}</h1>
            </div>

            {/* Center — Search bar */}
            {(!isSuperAdmin || !!impersonatedAgencyId) && (
              <div className="flex-1 max-w-xl transition-all duration-300">
                <GlobalSearch
                  setActiveSection={setActiveSection}
                  setShowingSearchResults={setShowingSearchResults}
                  setPropertyResults={setPropertyResults}
                  setInspectionResults={setInspectionResults}
                />
              </div>
            )}



            {/* Right side — Actions */}
            <div className="flex items-center gap-2">


              {!isSuperAdmin && <NotificationsBell />}

              <div className="w-px h-6 bg-[var(--border)] mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-[var(--muted-100)] transition-all duration-200 cursor-pointer focus:outline-none" aria-label="Open profile menu">
                    <Avatar className="h-8 w-8">
                      {(() => {
                        const src = (user as any)?.profileImage || (user as any)?.ProfileImage || undefined;
                        return src ? <AvatarImage src={src} alt="Profile" /> : null;
                      })()}
                      <AvatarFallback>
                        {(() => {
                          if (!user) return 'U';
                          const first = ((user as any).firstName || (user as any).FirstName || '').toString().trim();
                          const last = ((user as any).lastName || (user as any).LastName || '').toString().trim();
                          const initials = `${first.charAt(0) || ''}${last.charAt(0) || ''}`.toUpperCase();
                          if (initials) return initials;
                          const email = ((user as any).email || '').toString();
                          return email ? email.slice(0, 2).toUpperCase() : 'U';
                        })()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-medium text-[var(--foreground)] leading-tight">
                        {(() => {
                          if (!user) return 'User';
                          const first = ((user as any).firstName || (user as any).FirstName || '').toString().trim();
                          const last = ((user as any).lastName || (user as any).LastName || '').toString().trim();
                          const full = `${first} ${last}`.trim();
                          return full || ((user as any).username || (user as any).Username || 'User');
                        })()}
                      </div>
                      <div className="text-[11px] text-[var(--muted-400)]">
                        {user ? ((user as any).role || (user as any).Role || 'User') : 'User'}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-400)] hidden lg:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold leading-tight">
                        {(() => {
                          if (!user) return 'User';
                          const first = ((user as any).firstName || (user as any).FirstName || '').toString().trim();
                          const last = ((user as any).lastName || (user as any).LastName || '').toString().trim();
                          const full = `${first} ${last}`.trim();
                          return full || ((user as any).username || (user as any).Username || 'User');
                        })()}
                      </p>
                      <p className="text-xs text-[var(--muted-400)] mt-0.5">
                        {user ? ((user as any).role || (user as any).Role || 'User') : 'User'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setActiveSection('profile');
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('dashboard-active-section', 'profile');
                      }
                    }}
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <SettingsIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-[var(--destructive)] hover:!bg-[var(--destructive-50)]">
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* profile now on a dedicated page */}

        <main className="flex-1 overflow-visible p-4 lg:p-6">
          <div className="max-w-[1600px] mx-auto">
            {renderMainContent()}
          </div>
        </main>



      </div>
    </div>
  );
}

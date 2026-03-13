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
  ClipboardList,
  FileText,
  Settings as SettingsIcon,
  Search,
  Bell,
  User,
  LogOut,
  Home,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  UserCog,
  Mail,
  FileSignature,
  History,
  MapPin,
  CreditCard,
  Shield,
  Plug,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import dynamic from "next/dynamic";
import { propertyApi } from "@/lib/api/property";
import inspectionApi from "@/lib/api/inspection";
import { analyticsApi } from "@/lib/api/analytics";
import Modal from "@/components/ui/Modal";
import NotificationsBell from "@/components/NotificationsBell";
const PropertiesTable = dynamic(() => import("@/components/PropertiesTable"), { ssr: false });
const InspectionManagement = dynamic(() => import("@/components/InspectionManagement"), { ssr: false });
const Settings = dynamic(() => import("@/components/Settings"), { ssr: false });
const UserSettings = dynamic(() => import("@/components/UserSettings"), { ssr: false });
const AgencySettings = dynamic(() => import("@/components/AgencySettings"), { ssr: false });
const AgencyManagement = dynamic(() => import("@/components/AgencyManagement"), { ssr: false });
import LayoutManagement from "@/components/LayoutManagement";
import UserProfile from "@/components/UserProfile";
import ReferenceData from "@/components/ReferenceData";
import PropertyCreation from "@/components/PropertyCreation";

type StatCard = {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
};

// Mock per-type monthly data for the last 12 months (index 0 = oldest)
const INSPECTION_TYPES = ["Entry", "Exit", "Routine"] as const;
const monthlyByType: Record<(typeof INSPECTION_TYPES)[number], number[]> = {
  Entry: [10, 8, 12, 11, 15, 13, 14, 12, 16, 14, 18, 16],
  Exit: [20, 18, 24, 22, 28, 26, 30, 29, 31, 30, 33, 32],
  Routine: [60, 48, 70, 65, 80, 75, 85, 84, 90, 88, 95, 92],
};

// Helper to get Date objects for each month in the last 12 months (oldest -> newest)
function getLast12MonthDates(): Date[] {
  const list: Date[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push(d);
  }
  return list;
}

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
  { icon: Home, label: "Analytics" },
];

const settingsMenuItems = [
  { icon: SettingsIcon, label: "General Settings" },
  { icon: UserCog, label: "User Settings" },
  { icon: Building2, label: "Agency Settings" },
  { icon: Mail, label: "Email Templates" },
  { icon: FileSignature, label: "Signatures" },
  { icon: History, label: "Email Logs" },
  { icon: MapPin, label: "Areas / Items" },
  { icon: Shield, label: "Account Settings" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // Initialize activeSection from localStorage or default to "inspections" for first time
  const [activeSection, setActiveSection] = useState<string>('inspections');

  useEffect(() => {
    const savedSection = localStorage.getItem('dashboard-active-section');
    if (savedSection) {
      setActiveSection(savedSection);
    }
  }, []);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [propertyResults, setPropertyResults] = useState<any[]>([]);
  const [inspectionResults, setInspectionResults] = useState<any[]>([]);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showingSearchResults, setShowingSearchResults] = useState<{ type: 'properties' | 'inspections' | null, query: string }>({ type: null, query: '' });
  const router = useRouter();
  const { logout, user, isSuperAdmin, impersonatedAgencyId, impersonatedAgencyName, effectiveAgencyId, stopImpersonating } = useAuth();

  // Analytics filters
  const [selectedRange, setSelectedRange] = useState<'current' | '3m' | '6m' | '12m' | 'custom'>('12m');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...INSPECTION_TYPES]);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const isAgencyAdmin = useMemo(() => {
    if (!user || isSuperAdmin) return false;
    return (user.roles || []).some(r => r.toLowerCase() === 'admin');
  }, [user, isSuperAdmin]);

  const isSuperAdminRoute = pathname === "/super-admin";
  const showAgencyView = !isSuperAdmin || (!!impersonatedAgencyId && !isSuperAdminRoute);
  const sidebarItems = showAgencyView
    ? mainSidebarItems
    : [{ icon: Building2, label: 'Agencies' }];

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

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (ignore) return;
      if (!showAgencyView) return;
      if (isSuperAdminRoute) return;
      setAnalyticsLoading(true);
      try {
        const a = await analyticsApi.get();
        if (!ignore) setAnalytics(a);
      } catch {
        if (!ignore) setAnalytics(null);
      } finally {
        if (!ignore) setAnalyticsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [showAgencyView, isSuperAdminRoute]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        // Focus the search input in the modal
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleNavigation = (path: string) => {
    if (path === "logout") {
      handleLogout();
      return;
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

  // Force superadmin to Agencies section only (unless impersonating)
  useEffect(() => {
    if (isSuperAdmin && !impersonatedAgencyId && activeSection !== 'agencies') {
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

  const clearAllSearch = () => {
    console.log('clearAllSearch called - clearing all search data');
    setSearchQuery('');
    setPropertyResults([]);
    setInspectionResults([]);
    setIsSearchOpen(false);
    setShowingSearchResults({ type: null, query: '' });
    console.log('clearAllSearch completed');
  };

  const clearSearchModal = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const runSearch = async (q: string) => {
    const query = q.trim();
    console.log('runSearch called with query:', query);

    if (!query) {
      clearAllSearch();
      return;
    }

    setSearchLoading(true);
    console.log('Starting search for:', query);

    try {
      // Use the main search API that returns both properties and inspections
      console.log('Calling inspectionApi.search...');
      const searchResults = await inspectionApi.search(query, effectiveAgencyId ? String(effectiveAgencyId) : undefined);
      console.log('Search API response:', searchResults);

      setPropertyResults(searchResults.properties || []);
      setInspectionResults(searchResults.inspections || []);
      setIsSearchOpen(true);
      console.log('Search completed successfully');
    } catch (error: any) {
      console.error('Search error:', error);
      console.error('Error details:', error.response?.data || error.message);
      setPropertyResults([]);
      setInspectionResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePropertyClick = async (propertyId: string) => {
    try {
      // Call Property/{id} API to get the specific property
      console.log('handlePropertyClick called with propertyId:', propertyId);
      console.log('Calling propertyApi.getById...');
      const propertyDetails = await propertyApi.getById(propertyId);
      console.log('Property details received:', propertyDetails);

      // Navigate to Properties section and show the specific property
      console.log('Setting active section to properties...');
      setActiveSection('properties');
      // Save the active section to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard-active-section', 'properties');
      }
      setShowingSearchResults({ type: 'properties', query: searchQuery });
      setPropertyResults([propertyDetails]); // Show only the selected property

      // Clear the search modal but keep the results for display
      clearSearchModal();
      console.log('Property click handler completed successfully');
    } catch (error: any) {
      console.error('Error fetching property details:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
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
      setShowingSearchResults({ type: 'inspections', query: searchQuery });
      setInspectionResults([inspectionDetails]); // Show only the selected inspection

      // Clear the search modal but keep the results for display
      clearSearchModal();
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
      // removed agency management
      case "analytics": {
        const stats: StatCard[] = [
          {
            title: "Total Properties",
            value: analytics ? String(analytics.totalProperties ?? 0) : "—",
            change: analytics ? fmtPct(Number(analytics.totalPropertiesChangePercent ?? 0)) : "—",
            icon: Building2,
            color: "text-primary",
          },
          {
            title: "Completed Inspections",
            value: analytics ? String(analytics.completedInspections ?? 0) : "—",
            change: analytics ? fmtPct(Number(analytics.completedInspectionsChangePercent ?? 0)) : "—",
            icon: CheckCircle,
            color: "text-secondary",
          },
          {
            title: "Pending Inspections",
            value: analytics ? String(analytics.pendingInspections ?? 0) : "—",
            change: analytics ? fmtPct(Number(analytics.pendingInspectionsChangePercent ?? 0)) : "—",
            icon: Clock,
            color: "text-accent",
          },
          {
            title: "Reports Generated",
            value: analytics ? String(analytics.reportsGenerated ?? 0) : "—",
            change: analytics ? fmtPct(Number(analytics.reportsGeneratedChangePercent ?? 0)) : "—",
            icon: FileText,
            color: "text-primary",
          },
        ];

        const recentInspections =
          (analytics?.recentInspections ?? []).map((r: any, idx: number) => ({
            id: `recent-${idx}`,
            property: r.propertyAddress,
            inspector: r.inspectorName,
            date: r.date,
            status: String(r.status || "").toLowerCase(),
          })) ?? [];

        const upcomingInspections =
          (analytics?.upcomingInspections ?? []).map((u: any, idx: number) => {
            const dt = u.scheduledDateTime ? new Date(u.scheduledDateTime) : null;
            const dateLabel = dt ? dt.toLocaleDateString() : "—";
            const timeLabel = dt ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
            return {
              id: `upcoming-${idx}`,
              property: u.propertyAddress,
              inspector: u.inspectorName,
              time: timeLabel,
              date: dateLabel,
            };
          }) ?? [];

        const activeTypes = selectedTypes.length > 0 ? selectedTypes : [...INSPECTION_TYPES];

        // Determine which month indices (0..11) are selected based on range/custom
        const monthDates = getLast12MonthDates();
        let selectedIndices: number[] = [];
        if (selectedRange === 'current') {
          selectedIndices = [11];
        } else if (selectedRange === '3m' || selectedRange === '6m' || selectedRange === '12m') {
          const months = selectedRange === '3m' ? 3 : selectedRange === '6m' ? 6 : 12;
          selectedIndices = Array.from({ length: months }, (_, i) => 12 - months + i);
        } else {
          // custom range by month
          const start = customStart ? new Date(customStart) : null;
          const end = customEnd ? new Date(customEnd) : null;
          if (start && end) {
            const startTime = new Date(start.getFullYear(), start.getMonth(), 1).getTime();
            const endTime = new Date(end.getFullYear(), end.getMonth(), 1).getTime();
            const [from, to] = startTime <= endTime ? [startTime, endTime] : [endTime, startTime];
            selectedIndices = monthDates
              .map((d, idx) => ({ t: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), idx }))
              .filter((x) => x.t >= from && x.t <= to)
              .map((x) => x.idx);
          }
          // Fallback if no valid custom selection
          if (selectedIndices.length === 0) {
            selectedIndices = [11];
          }
        }

        // Build sparkline data by summing selected types per chosen indices
        const summedAllMonths: number[] = Array.from({ length: 12 }, (_, idx) =>
          activeTypes.reduce((acc, t) => acc + (monthlyByType as any)[t][idx], 0)
        );
        const sparkData = selectedIndices.map((idx) => summedAllMonths[idx]);

        const computedInspectionTypeData = INSPECTION_TYPES.map((label) => ({
          label,
          value: selectedIndices.reduce((acc, idx) => acc + monthlyByType[label][idx], 0),
        }));

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
                      <div className="h-3 w-32 bg-muted rounded" />
                      <div className="mt-3 h-8 w-20 bg-muted rounded" />
                      <div className="mt-3 h-3 w-16 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="mt-4 h-24 w-full bg-muted rounded" />
                </CardContent>
              </Card>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 border border-border rounded-lg bg-card/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Range</span>
                <div className="flex items-center gap-2">
                  <Button variant={selectedRange === 'current' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedRange('current')}>Current</Button>
                  <Button variant={selectedRange === '3m' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedRange('3m')}>3M</Button>
                  <Button variant={selectedRange === '6m' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedRange('6m')}>6M</Button>
                  <Button variant={selectedRange === '12m' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedRange('12m')}>12M</Button>
                  <Button variant={selectedRange === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedRange('custom')}>Custom</Button>
                </div>
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Types</span>
                <div className="flex items-center gap-4">
                  {INSPECTION_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={selectedTypes.includes(t)} onCheckedChange={() => toggleType(t)} />
                      <span className="text-foreground">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              {selectedRange === 'custom' && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); }} className="h-8" />
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); }} className="h-8" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-4 h-4 text-secondary" />
                          <span className="text-sm text-secondary font-medium">{stat.change}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
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
                          <TableCell className="font-medium">{inspection.property}</TableCell>
                          <TableCell>{inspection.inspector}</TableCell>
                          <TableCell>{inspection.date}</TableCell>
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
                          <p className="text-sm font-medium text-foreground">{inspection.property}</p>
                          <p className="text-xs text-muted-foreground">{inspection.inspector}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
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
                          <div className="h-2 bg-primary rounded" style={{ width: `${Math.round((d.value / Math.max(...computedInspectionTypeData.map(x => x.value))) * 100)}%` }} />
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
          searchResults={showingSearchResults.type === 'properties' ? propertyResults : undefined}
          searchQuery={showingSearchResults.type === 'properties' ? showingSearchResults.query : undefined}
          onClearSearch={clearSearchResults}
        />;
      case "create property":
        return <PropertyCreation onPropertyCreated={() => {
          setActiveSection('properties');
          // Save the active section to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('dashboard-active-section', 'properties');
          }
          fetchPropertyCount();
        }} />;
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
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">General Settings</h2>
            <p className="text-gray-600">General application settings will be displayed here.</p>
          </div>
        );
      case "user settings":
        return <UserSettings />;
      case "agency settings":
        return <AgencySettings />;
      case "email templates":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Email Templates</h2>
            <p className="text-gray-600">Email template management will be displayed here.</p>
          </div>
        );
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

  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">PropertyInspect</h1>
              <p className="text-xs text-muted-foreground">Pro Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6">
          <div>
            <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">Main</div>
            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                  <li key={item.label}>
                    <Button
                      variant={activeSection === item.label.toLowerCase() ? "default" : "ghost"}
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => handleNavigation(item.label.toLowerCase())}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.label === 'Properties' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{propertyCount}</span>
                      )}
                      {item.label === 'Inspections' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                          {inspectionCount}
                        </span>
                      )}
                    </Button>
                  </li>
              ))}
            </ul>
          </div>

          {showAgencyView && (
            <div>
              <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">Manage</div>
              <ul className="space-y-2">
                <li>
                  <Button
                    variant={activeSection === 'layout management' ? "default" : "ghost"}
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => handleNavigation('layout management')}
                  >
                    <SettingsIcon className="w-5 h-5" />
                    <span className="flex-1 text-left">Layout Management</span>
                  </Button>
                </li>

                {/* Collapsible Settings Section */}
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                  >
                    <SettingsIcon className="w-5 h-5" />
                    <span className="flex-1 text-left">Settings</span>
                    {isSettingsExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Settings Sub-menu */}
                  {isSettingsExpanded && (
                    <ul className="ml-6 mt-2 space-y-1">
                      {settingsMenuItems.map((item) => (
                        <li key={item.label}>
                          <Button
                            variant={activeSection === item.label.toLowerCase() ? "default" : "ghost"}
                            className="w-full justify-start gap-3 h-9 text-sm"
                            onClick={() => handleNavigation(item.label.toLowerCase())}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="flex-1 text-left">{item.label}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>

                {/* Integration Item */}
                <li>
                  <Button
                    variant={activeSection === 'integration' ? "default" : "ghost"}
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => handleNavigation('integration')}
                  >
                    <Plug className="w-5 h-5" />
                    <span className="flex-1 text-left">Integration</span>
                  </Button>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-visible">
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
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Page title */}
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-semibold text-gray-900 capitalize">{activeSection}</h1>
                <div className="hidden md:block w-px h-6 bg-gray-300"></div>
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <span>Analytics</span>
                  <span>/</span>
                  <span className="text-gray-900 capitalize">{activeSection}</span>
                </div>
              </div>

              {/* Center - Search bar (hidden for pure SuperAdmin, shown when impersonating) */}
              {(!isSuperAdmin || !!impersonatedAgencyId) && (
                <div className="flex-1 max-w-2xl mx-8">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                      <Input
                        placeholder="Search properties, inspections, landlords, and tenants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setIsSearchOpen(true); runSearch(searchQuery); } }}
                        onFocus={() => { setIsSearchOpen(true); if (searchQuery.trim()) runSearch(searchQuery); }}
                        className="pl-12 pr-16 py-3 w-full cursor-pointer bg-gray-50/50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder:text-gray-500 text-gray-900 font-medium"
                        onClick={() => { setIsSearchOpen(true); if (searchQuery.trim()) runSearch(searchQuery); }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <kbd className="px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded shadow-sm">
                          ⌘K
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Right side - Actions */}
              <div className="flex items-center gap-3">
                {!isSuperAdmin && <NotificationsBell />}

                <div className="w-px h-6 bg-gray-300"></div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20" aria-label="Open profile menu">
                      <Avatar className="h-8 w-8">
                        {(() => {
                          const src = (user as any)?.profileImage || (user as any)?.ProfileImage || undefined;
                          return src ? <AvatarImage src={src} alt="Profile" /> : null;
                        })()}
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
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
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {(() => {
                            if (!user) return 'User';
                            const first = ((user as any).firstName || (user as any).FirstName || '').toString().trim();
                            const last = ((user as any).lastName || (user as any).LastName || '').toString().trim();
                            const full = `${first} ${last}`.trim();
                            return full || ((user as any).username || (user as any).Username || 'User');
                          })()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user ? ((user as any).role || (user as any).Role || 'User') : 'User'}
                        </div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {(() => {
                            if (!user) return 'User';
                            const first = ((user as any).firstName || (user as any).FirstName || '').toString().trim();
                            const last = ((user as any).lastName || (user as any).LastName || '').toString().trim();
                            const full = `${first} ${last}`.trim();
                            return full || ((user as any).username || (user as any).Username || 'User');
                          })()}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          Role: {user ? ((user as any).role || (user as any).Role || 'User') : 'User'}
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
                      <div className="flex w-full items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* profile now on a dedicated page */}

        <main className="flex-1 overflow-visible p-6">{renderMainContent()}</main>

        {/* Global Search Dialog */}
        <Modal isOpen={isSearchOpen} onClose={clearAllSearch} title={searchQuery ? `Search results for "${searchQuery}"` : 'Search'} widthClassName="max-w-4xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Type to search properties and inspections..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); runSearch(e.target.value); }}
                  className="pl-12 pr-12 py-3 w-full bg-white/90 backdrop-blur-sm border-2 border-gray-200/50 rounded-xl shadow-lg focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-gray-400 text-gray-700 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={clearAllSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Properties ({propertyResults.length})</h3>
                  </div>
                  <div className="border border-border rounded-lg divide-y divide-border bg-white shadow-sm">
                    {propertyResults.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">No properties found</div>
                    ) : (
                      propertyResults.map((p: any) => {
                        console.log('Rendering property:', p);
                        const propertyId = p.id || p.propertyId || p.PropertyId;
                        console.log('Property ID to use:', propertyId);
                        return (
                          <button
                            key={propertyId || `property-${propertyId}`}
                            className="w-full text-left p-4 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border-l-4 border-transparent hover:border-primary"
                            onClick={() => handlePropertyClick(propertyId)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-foreground text-sm">#{p.id} • {p.address1}{p.address2 ? `, ${p.address2}` : ''}</div>
                                <div className="text-xs text-muted-foreground mt-1">{p.suburb || p.cityOrSuburb}</div>

                                {/* Property Details */}
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{p.type}</span>
                                    {p.landlordName && (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{p.landlordName}</span>
                                    )}
                                    {p.tenantName && (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{p.tenantName}</span>
                                    )}
                                  </div>

                                  {/* Additional Property Info */}
                                  <div className="text-xs text-gray-500 space-y-0.5">
                                    <div>Type: {p.type}</div>
                                    <div>ID: {p.id}</div>
                                    {p.landlordName && <div>Landlord: {p.landlordName}</div>}
                                    {p.tenantName && <div>Tenant: {p.tenantName}</div>}
                                  </div>
                                </div>
                              </div>
                              <div className="ml-2">
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Inspections ({inspectionResults.length})</h3>
                  </div>
                  <div className="border border-border rounded-lg divide-y divide-border bg-white shadow-sm">
                    {inspectionResults.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">No inspections found</div>
                    ) : (
                      inspectionResults.map((i: any) => (
                        <button
                          key={i.id || `inspection-${i.id}`}
                          className="w-full text-left p-4 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border-l-4 border-transparent hover:border-primary"
                          onClick={() => handleInspectionClick(i.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground text-sm">#{i.id} • {i.address1}{i.address2 ? `, ${i.address2}` : ''}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {i.inspectionType} • {new Date(i.inspectionDate).toISOString().split('T')[0]}
                              </div>

                              {/* Inspection Details */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {
                                      {
                                        1: 'Entry',
                                        2: 'Exit',
                                        3: 'Routine'
                                      }[Number(i.inspectionType || i.inspectionTypeId)] || i.inspectionType || i.type || 'Unknown'
                                    }
                                  </span>
                                  {i.landlordName && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{i.landlordName}</span>
                                  )}
                                  {i.tenantName && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">{i.tenantName}</span>
                                  )}
                                </div>

                                {/* Additional Inspection Info */}
                                <div className="text-xs text-gray-500 space-y-0.5">
                                  <div>Type: {i.type}</div>
                                  <div>ID: {i.id}</div>
                                  <div>Inspection Type: {i.inspectionType}</div>
                                  <div>Date: {new Date(i.inspectionDate).toISOString().split('T')[0]}</div>
                                  {i.landlordName && <div>Landlord: {i.landlordName}</div>}
                                  {i.tenantName && <div>Tenant: {i.tenantName}</div>}
                                  <div>Suburb: {i.subhurb}</div>
                                </div>
                              </div>
                            </div>
                            <div className="ml-2">
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { propertyApi } from "@/lib/api/property";
import { agencyApi } from "@/lib/api/agency";
import { referenceApi } from "@/lib/api/reference";
import { layoutApi } from "@/lib/api/propertyLayout";
import { roleApi } from "@/lib/api/role";
import { userApi } from "@/lib/api/user";
import { useAuth } from "@/contexts/AuthContext";
import { InspectionFrequencyType, PropertyType, RentFrequency, type CreatePropertyRequest } from "@/types/api";
import { mergePropertyImages, parsePropertyImages, serializePropertyImages } from "@/lib/propertyImages";
import { Building2, Bell, User, LogOut, MapPin, X, Info, Home, Users, Landmark, LayoutGrid, ImageIcon, Save } from "lucide-react";
import Modal from "@/components/ui/Modal";

const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ─── SectionCard (extracted outside PropertyForm to prevent re-mounting on re-render) ──
const SectionCard = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <Card className="border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

export interface PropertyFormProps {
    onSuccess?: () => void;
    propertyId?: string;
    onClose?: () => void;
    mode: "standalone" | "embedded";
}

export default function PropertyForm({ onSuccess, propertyId, onClose, mode }: PropertyFormProps) {
    const router = useRouter();
    const isStandalone = mode === "standalone";
    const isEdit = !!propertyId;

    const [states, setStates] = useState<any[]>([]);
    const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [layouts, setLayouts] = useState<any[]>([]);
    const [error, setError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [propertyData, setPropertyData] = useState<CreatePropertyRequest>({
        agencyId: null,
        name: "",
        type: PropertyType.Residential,
        propertyManagerId: "",
        address1: "",
        address2: null,
        cityOrSuburb: "",
        stateLookupId: "",
        postcode: "",
        inspectionFrequencyType: InspectionFrequencyType.Month,
        inspectionFrequencyNumber: 1,
        keyNo: null,
        alarmCode: null,
        propertyNotes: null,
        propertyImages: null,
        propertyLayoutId: "",
        latitude: null,
        longitude: null,
        landlords: [],
        tenancies: [],
    });
    const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null);
    const [landlord, setLandlord] = useState<{ name: string; email: string; phone?: string }>({ name: "", email: "", phone: "" });
    const [tenancy, setTenancy] = useState<{
        fullName: string; email: string; mobile?: string;
        leaseStartDate: string; leaseEndDate: string;
        currentRentAmount?: number; rentFrequency: RentFrequency;
        originalLeaseDate?: string; newInspectionDate?: string;
    }>({
        fullName: "", email: "", mobile: "",
        leaseStartDate: "", leaseEndDate: "",
        currentRentAmount: undefined, rentFrequency: RentFrequency.Month,
        originalLeaseDate: "", newInspectionDate: "",
    });
    const [tenants, setTenants] = useState<{ firstName: string; lastName: string; email: string; phone?: string }[]>([]);
    const [showAddTenantForm, setShowAddTenantForm] = useState(false);
    const [newTenant, setNewTenant] = useState<{ firstName: string; lastName: string; email: string; phone?: string }>({
        firstName: "", lastName: "", email: "", phone: "",
    });

    const [showMapPicker, setShowMapPicker] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [selectedLayoutDetails, setSelectedLayoutDetails] = useState<any>(null);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const STORAGE_KEY = "pc360:create-property-wizard";
    const { effectiveAgencyId } = useAuth();

    // ─── Error message helper ───────────────────────────────────────────
    const getErrorMessage = (err: any, fallback: string): string => {
        const data = err?.response?.data;
        if (typeof data === "string") return data;
        if (data && typeof data === "object") {
            if (data.errors && typeof data.errors === "object") {
                const allMessages = Object.values<any>(data.errors)
                    .flat()
                    .filter((x) => typeof x === "string") as string[];
                if (allMessages.length) return allMessages.join(" | ");
            }
            if (typeof data.message === "string") return data.message;
            if (typeof data.title === "string") return data.title;
        }
        console.error("PropertyForm error", err?.response?.data ?? err);
        if (typeof err?.message === "string") return err.message;
        return fallback;
    };

    // ─── Sync agency ID ─────────────────────────────────────────────────
    useEffect(() => {
        setPropertyData((prev) => ({
            ...prev,
            agencyId: effectiveAgencyId ? String(effectiveAgencyId) : null,
        }));
    }, [effectiveAgencyId]);

    // ─── Load reference data + edit-mode fetch ──────────────────────────
    useEffect(() => {
        if (isStandalone) {
            try {
                if (typeof window !== "undefined") {
                    const savedRaw = localStorage.getItem(STORAGE_KEY);
                    if (savedRaw) {
                        const saved = JSON.parse(savedRaw);
                        if (saved.propertyData) setPropertyData(saved.propertyData);
                        if (saved.createdPropertyId) setCreatedPropertyId(saved.createdPropertyId);
                        if (saved.tenants) setTenants(saved.tenants);
                    }
                }
            } catch { }
        }

        const load = async () => {
            setIsLoading(true);
            try {
                const [agency, typesData, layoutsData] = await Promise.all([
                    effectiveAgencyId ? agencyApi.getById(String(effectiveAgencyId)) : Promise.resolve(null as any),
                    referenceApi.getPropertyTypes(),
                    layoutApi.getAll(),
                ]);

                const countryId = agency?.countryId ?? null;
                const statesData = countryId ? await referenceApi.getStatesByCountry(countryId) : await referenceApi.getStates();
                setStates(statesData);
                setPropertyTypes(typesData || []);
                setLayouts(layoutsData);

                let mgrs: any[] = [];
                if (effectiveAgencyId) {
                    try {
                        if (isStandalone) {
                            const roles = await roleApi.getByAgency(effectiveAgencyId);
                            const pmRole = roles.find((r) => r.name.toLowerCase() === "propertymanager");
                            if (pmRole) {
                                const { data: usersPage } = await userApi.getByRole(effectiveAgencyId, pmRole.id, 1, 200);
                                mgrs = usersPage || [];
                            }
                        } else {
                            const usersPage = await userApi.list({ agencyId: String(effectiveAgencyId), page: 1, pageSize: 500 });
                            mgrs = usersPage?.data || [];
                        }
                    } catch {
                        mgrs = [];
                    }
                }
                setManagers(mgrs);

                if (isEdit && propertyId) {
                    try {
                        const prop = await propertyApi.getById(propertyId);
                        setPropertyData({
                            agencyId: prop.agencyId ? String(prop.agencyId) : (effectiveAgencyId ? String(effectiveAgencyId) : null),
                            name: prop.name || "",
                            type: prop.type,
                            propertyManagerId: String(prop.propertyManagerId || ""),
                            address1: prop.address1 || "",
                            address2: prop.address2 || null,
                            cityOrSuburb: prop.cityOrSuburb || "",
                            stateLookupId: String(prop.stateLookupId || ""),
                            postcode: prop.postcode || "",
                            inspectionFrequencyType: prop.inspectionFrequencyType,
                            inspectionFrequencyNumber: prop.inspectionFrequencyNumber,
                            keyNo: prop.keyNo || null,
                            alarmCode: prop.alarmCode || null,
                            propertyNotes: prop.propertyNotes || null,
                            propertyImages: prop.propertyImages || null,
                            propertyLayoutId: prop.propertyLayoutId ? String(prop.propertyLayoutId) : "",
                            latitude: prop.latitude || null,
                            longitude: prop.longitude || null,
                            landlords: prop.landlords || [],
                            tenancies: prop.tenancies || [],
                        } as any);

                        if (prop.landlords?.[0]) {
                            setLandlord({
                                name: prop.landlords[0].name || "",
                                email: prop.landlords[0].email || "",
                                phone: prop.landlords[0].phone || "",
                            });
                        }

                        const activeTenancy = prop.tenancies?.find(t => t.isActive) || prop.tenancies?.[0];
                        if (activeTenancy) {
                            setTenancy({
                                fullName: activeTenancy.fullName || "",
                                email: activeTenancy.email || "",
                                mobile: activeTenancy.mobile || "",
                                leaseStartDate: activeTenancy.leaseStartDate ? new Date(activeTenancy.leaseStartDate).toISOString().slice(0, 16) : "",
                                leaseEndDate: activeTenancy.leaseEndDate ? new Date(activeTenancy.leaseEndDate).toISOString().slice(0, 16) : "",
                                currentRentAmount: activeTenancy.currentRentAmount,
                                rentFrequency: activeTenancy.rentFrequency as any,
                                originalLeaseDate: activeTenancy.originalLeaseDate ? new Date(activeTenancy.originalLeaseDate).toISOString().slice(0, 16) : "",
                                newInspectionDate: activeTenancy.newInspectionDate ? new Date(activeTenancy.newInspectionDate).toISOString().slice(0, 16) : "",
                            });
                            setTenants(activeTenancy.tenants?.map(t => ({
                                firstName: t.firstName || "",
                                lastName: t.lastName || "",
                                email: t.email || "",
                                phone: t.phone || "",
                            })) || []);
                        }
                    } catch (e: any) {
                        setError(getErrorMessage(e, "Failed to load property data"));
                    }
                } else {
                    setPropertyData((prev) => ({
                        ...prev,
                        type: (typesData?.[0]?.propertyTypeId as number | undefined) ? (typesData?.[0]?.propertyTypeId as PropertyType) : prev.type,
                        stateLookupId: String(statesData?.[0]?.id ?? prev.stateLookupId ?? ""),
                        propertyManagerId: String(mgrs?.[0]?.id ?? (mgrs?.[0] as any)?.userId ?? (mgrs?.[0] as any)?.UserId ?? prev.propertyManagerId ?? ""),
                        agencyId: effectiveAgencyId ? String(effectiveAgencyId) : prev.agencyId ?? null,
                    }));
                }
            } catch (e: any) {
                setError(getErrorMessage(e, "Failed to load reference data"));
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [effectiveAgencyId]);

    // ─── Layout details fetcher ─────────────────────────────────────────
    useEffect(() => {
        const fetchLayoutDetails = async () => {
            if (propertyData.propertyLayoutId) {
                try {
                    const details = await layoutApi.getById(propertyData.propertyLayoutId);
                    setSelectedLayoutDetails(details);
                } catch (err) {
                    console.error("Failed to fetch layout details", err);
                    setSelectedLayoutDetails(null);
                }
            } else {
                setSelectedLayoutDetails(null);
            }
        };
        fetchLayoutDetails();
    }, [propertyData.propertyLayoutId]);

    // ─── Cleanup image previews on unmount ──────────────────────────────
    useEffect(() => {
        return () => {
            imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    // ─── Image handling ─────────────────────────────────────────────────
    const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) {
            setSelectedImages([]);
            setImagePreviews([]);
            return;
        }
        const validImages = files.filter((file) => file.type.startsWith("image/"));
        if (validImages.length !== files.length) {
            setError("Only image files are allowed.");
        }
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        setSelectedImages(validImages);
        setImagePreviews(validImages.map((file) => URL.createObjectURL(file)));
    };

    const removeExistingImage = (url: string) => {
        const next = parsePropertyImages(propertyData.propertyImages).filter((img) => img !== url);
        setPropertyData({ ...propertyData, propertyImages: serializePropertyImages(next) });
    };

    const removeSelectedImage = (index: number) => {
        const nextFiles = selectedImages.filter((_, i) => i !== index);
        const nextPreviews = imagePreviews.filter((_, i) => i !== index);
        imagePreviews.forEach((url, i) => {
            if (i === index) URL.revokeObjectURL(url);
        });
        setSelectedImages(nextFiles);
        setImagePreviews(nextPreviews);
    };

    const existingImages = useMemo(
        () => parsePropertyImages(propertyData.propertyImages),
        [propertyData.propertyImages],
    );

    // ─── Tenant management ──────────────────────────────────────────────
    const handleAddTenant = () => {
        if (newTenant.firstName.trim() && newTenant.lastName.trim() && newTenant.email.trim()) {
            setTenants([...tenants, { ...newTenant }]);
            setNewTenant({ firstName: "", lastName: "", email: "", phone: "" });
            setShowAddTenantForm(false);
        }
    };

    const handleRemoveTenant = (index: number) => {
        setTenants(tenants.filter((_, i) => i !== index));
    };

    // ─── Form validation ────────────────────────────────────────────────
    const formIsValid = useMemo(() => {
        const propertyValid =
            propertyData.address1.trim() !== "" &&
            propertyData.cityOrSuburb.trim() !== "" &&
            propertyData.postcode.trim() !== "" &&
            Number(propertyData.type) > 0 &&
            String(propertyData.propertyManagerId).trim() !== "" &&
            String(propertyData.stateLookupId).trim() !== "" &&
            propertyData.inspectionFrequencyNumber > 0;

        const landlordValid = landlord.name.trim() !== "" && validateEmail(landlord.email);

        const allTenantsValid = tenants.every(t => validateEmail(t.email));
        const tenancyValid =
            tenancy.fullName.trim() !== "" &&
            validateEmail(tenancy.email) &&
            allTenantsValid &&
            tenancy.leaseStartDate !== "" &&
            tenancy.leaseEndDate !== "" &&
            typeof tenancy.currentRentAmount === "number";

        const layoutValid = !!String(propertyData.propertyLayoutId).trim();

        return propertyValid && landlordValid && tenancyValid && layoutValid;
    }, [propertyData, landlord, tenancy, tenants]);

    // ─── Submit ─────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setError("");
        setIsSubmitting(true);
        try {
            // In edit mode, resolve existing IDs from the originally loaded property data
            // so the backend can match and update sub-entities instead of delete+recreate.
            const existingLandlord = propertyData.landlords?.[0];
            const activeTenancyData = propertyData.tenancies?.find((t) => (t as any).isActive) || propertyData.tenancies?.[0];

            const payload = {
                agencyId: propertyData.agencyId,
                name: propertyData.name || propertyData.address1,
                type: propertyData.type,
                propertyManagerId: propertyData.propertyManagerId,
                address1: propertyData.address1,
                address2: propertyData.address2 || null,
                cityOrSuburb: propertyData.cityOrSuburb,
                stateLookupId: propertyData.stateLookupId,
                postcode: propertyData.postcode,
                inspectionFrequencyType: propertyData.inspectionFrequencyType,
                inspectionFrequencyNumber: propertyData.inspectionFrequencyNumber,
                keyNo: propertyData.keyNo || null,
                alarmCode: propertyData.alarmCode || null,
                propertyNotes: propertyData.propertyNotes || null,
                propertyImages: serializePropertyImages(propertyData.propertyImages),
                propertyLayoutId: propertyData.propertyLayoutId || "",
                latitude: propertyData.latitude ?? null,
                longitude: propertyData.longitude ?? null,
                landlords: [
                    {
                        id: isEdit ? (existingLandlord as any)?.id : undefined,
                        propertyId: (existingLandlord as any)?.propertyId || propertyId,
                        name: landlord.name,
                        email: landlord.email,
                        phone: landlord.phone || "",
                    },
                ],
                tenancies: [
                    {
                        id: isEdit ? (activeTenancyData as any)?.id : undefined,
                        propertyId: (activeTenancyData as any)?.propertyId || propertyId,
                        fullName: tenancy.fullName,
                        email: tenancy.email,
                        mobile: tenancy.mobile || "",
                        leaseStartDate: tenancy.leaseStartDate ? new Date(tenancy.leaseStartDate).toISOString() : "",
                        leaseEndDate: tenancy.leaseEndDate ? new Date(tenancy.leaseEndDate).toISOString() : "",
                        currentRentAmount: tenancy.currentRentAmount ?? 0,
                        rentFrequency: tenancy.rentFrequency,
                        originalLeaseDate: tenancy.originalLeaseDate ? new Date(tenancy.originalLeaseDate).toISOString() : "",
                        tenantVacateDate: null,
                        newInspectionDate: tenancy.newInspectionDate ? new Date(tenancy.newInspectionDate).toISOString() : "",
                        tenants: tenants.map((tenant) => {
                            // Match existing tenants by email to preserve their IDs
                            const existingTenant = (activeTenancyData as any)?.tenants?.find(
                                (t: any) => t.email === tenant.email,
                            );
                            return {
                                id: isEdit ? existingTenant?.id : undefined,
                                tenancyId: existingTenant?.tenancyId || (activeTenancyData as any)?.id,
                                firstName: tenant.firstName ?? "",
                                lastName: tenant.lastName,
                                email: tenant.email,
                                phone: tenant.phone || "",
                                rentReviewDate: null,
                                rentReviewNotes: null,
                            };
                        }),
                    },
                ],
            };

            if (isEdit && propertyId) {
                await propertyApi.update(propertyId, payload as any);
                if (selectedImages.length > 0) {
                    const uploads = await propertyApi.uploadImages(propertyId, selectedImages, propertyData.agencyId || undefined);
                    const newUrls = uploads.map((u) => u.fileUrl);
                    const merged = mergePropertyImages(propertyData.propertyImages, newUrls);
                    setPropertyData((prev) => ({ ...prev, propertyImages: serializePropertyImages(merged) }));
                    setSelectedImages([]);
                    setImagePreviews([]);
                }
            } else {
                const created = await propertyApi.create(payload as any);
                if (selectedImages.length > 0) {
                    const uploads = await propertyApi.uploadImages(created.id, selectedImages, propertyData.agencyId || undefined);
                    const newUrls = uploads.map((u) => u.fileUrl);
                    const merged = mergePropertyImages(propertyData.propertyImages, newUrls);
                    setPropertyData((prev) => ({ ...prev, propertyImages: serializePropertyImages(merged) }));
                    setSelectedImages([]);
                    setImagePreviews([]);
                }
                try { localStorage.removeItem(STORAGE_KEY); } catch { }
            }

            if (isStandalone) {
                router.push("/dashboard");
            } else {
                onSuccess?.();
            }
        } catch (e: any) {
            setError(getErrorMessage(e, "Request failed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Close / Discard ────────────────────────────────────────────────
    const handleClose = () => {
        const hasPropertyChanges = propertyData.address1.trim() !== "" ||
            propertyData.cityOrSuburb.trim() !== "" ||
            propertyData.postcode.trim() !== "";
        const hasLandlordChanges = landlord.name.trim() !== "" ||
            landlord.email.trim() !== "";
        const hasTenancyChanges = tenancy.fullName.trim() !== "" ||
            tenancy.email.trim() !== "";

        if (hasPropertyChanges || hasLandlordChanges || hasTenancyChanges || tenants.length > 0) {
            setShowCloseConfirm(true);
        } else {
            performClose();
        }
    };

    const performClose = () => {
        try {
            if (typeof window !== "undefined" && !isEdit) {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch { }

        if (isStandalone) {
            router.push("/dashboard");
        } else {
            onClose?.() || onSuccess?.();
        }
    };

    // ─── Helper for layout ID resolution ────────────────────────────────
    const getLayoutOptionId = (l: any): string => String(l.id ?? l.layoutId ?? l.LayoutId ?? "");
    const getLayoutOptionLabel = (l: any): string =>
        (l.name || l.layoutName || l.LayoutName || `Layout ${getLayoutOptionId(l)}`).toString();

    // ─── Helper for manager display ─────────────────────────────────────
    const getManagerLabel = (m: any): string => {
        const full = `${(m.firstName || m.FirstName || "").toString().trim()} ${(m.lastName || m.LastName || "").toString().trim()}`.trim();
        return full || m.username || m.Username || m.email || String(m.userId ?? m.UserId ?? m.id ?? "");
    };

    const getManagerId = (m: any): string => String(m.userId ?? m.UserId ?? m.id ?? "");

    // ─── Profile avatar helpers ─────────────────────────────────────────
    const getUserFromStorage = () => {
        try {
            if (typeof window !== "undefined") return JSON.parse(localStorage.getItem("user") || "{}");
        } catch { }
        return {};
    };

    // ─── Loading state ──────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium">
                    {isEdit ? "Fetching property data..." : "Loading..."}
                </p>
            </div>
        );
    }


    return (
        <div className={isStandalone ? "min-h-screen bg-[var(--background)]" : ""}>
            {/* ─── Standalone Header ─────────────────────────────────────── */}
            {isStandalone && (
                <header className="bg-card border-b border-[var(--border)] sticky top-0 z-10">
                    <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-foreground">PropertyInspect</p>
                                <p className="text-xs text-muted-foreground">Create a new property</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" aria-label="Notifications"><Bell className="w-5 h-5" /></Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="relative h-10 w-10 rounded-full focus:outline-none" aria-label="Open profile menu">
                                        <Avatar className="h-10 w-10">
                                            {(() => {
                                                try {
                                                    const u = getUserFromStorage();
                                                    const src = u.profileImage || u.ProfileImage || undefined;
                                                    return <AvatarImage src={src} alt="Profile" />;
                                                } catch { return <AvatarImage src={undefined} alt="Profile" />; }
                                            })()}
                                            <AvatarFallback>
                                                {(() => {
                                                    const u = getUserFromStorage();
                                                    const first = (u.firstName || u.FirstName || "").toString().trim();
                                                    const last = (u.lastName || u.LastName || "").toString().trim();
                                                    const initials = `${first.charAt(0) || ""}${last.charAt(0) || ""}`.toUpperCase();
                                                    if (initials) return initials;
                                                    const email = (u.email || "").toString();
                                                    return email ? email.slice(0, 2).toUpperCase() : "U";
                                                })()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end">
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {getUserFromStorage()?.email || "User"}
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground">Create Property</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleClose}><LogOut className="mr-2 h-4 w-4" />Exit</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="h-8 w-px bg-[var(--border)] mx-1" />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </header>
            )}

            <div className={isStandalone ? "w-full" : "space-y-6"}>
                {/* ─── Embedded Header ─────────────────────────────────────── */}
                {!isStandalone && (
                    <div className="flex justify-between items-center bg-card border border-[var(--border)] p-4 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    {isEdit ? "Edit Property" : "Create Property"}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                    {isEdit ? "Update property details below" : "Fill in all sections to create a new property"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ─── Error Banner ────────────────────────────────────────── */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError("")} className="ml-auto flex-shrink-0 hover:text-red-900">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ─── Single-Page Form Layout ─────────────────────────────── */}
                {isStandalone ? (
                    <Card className="rounded-none border-0">
                        <CardHeader>
                            <CardTitle>Create Property</CardTitle>
                            <CardDescription>Complete all sections below to set up the property</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Left column */}
                                <div className="space-y-8">
                                    <SectionCard icon={Home} title="Basic Information">
                                        {renderBasicInfo()}
                                    </SectionCard>
                                    <SectionCard icon={Landmark} title="Landlord">
                                        {renderLandlord()}
                                    </SectionCard>
                                </div>
                                {/* Right column */}
                                <div className="space-y-8">
                                    <SectionCard icon={MapPin} title="Location & Media">
                                        {renderLocationAndMedia()}
                                    </SectionCard>
                                    <SectionCard icon={Users} title="Tenancy & Tenants">
                                        {renderTenancy()}
                                    </SectionCard>
                                    <SectionCard icon={LayoutGrid} title="Layout">
                                        {renderLayout()}
                                    </SectionCard>
                                </div>
                            </div>
                            {renderSubmitButton()}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Left column */}
                            <div className="space-y-8">
                                <SectionCard icon={Home} title="Basic Information">
                                    {renderBasicInfo()}
                                </SectionCard>
                                <SectionCard icon={Landmark} title="Landlord">
                                    {renderLandlord()}
                                </SectionCard>
                            </div>
                            {/* Right column */}
                            <div className="space-y-8">
                                <SectionCard icon={MapPin} title="Location & Media">
                                    {renderLocationAndMedia()}
                                </SectionCard>
                                <SectionCard icon={Users} title="Tenancy & Tenants">
                                    {renderTenancy()}
                                </SectionCard>
                                <SectionCard icon={LayoutGrid} title="Layout">
                                    {renderLayout()}
                                </SectionCard>
                            </div>
                        </div>
                        {renderSubmitButton()}
                    </div>
                )}
            </div>

            {/* ─── Map Picker Modal ──────────────────────────────────────── */}
            {showMapPicker && (
                <MapPickerModal
                    onClose={() => setShowMapPicker(false)}
                    onSelect={(lat, lng) => {
                        setPropertyData({ ...propertyData, latitude: lat, longitude: lng });
                        setShowMapPicker(false);
                    }}
                    initialLat={propertyData.latitude || -37.8368}
                    initialLng={propertyData.longitude || 144.928}
                />
            )}

            {/* ─── Close Confirmation Modal ──────────────────────────────── */}
            <Modal
                isOpen={showCloseConfirm}
                onClose={() => setShowCloseConfirm(false)}
                title="Unsaved Changes"
                widthClassName="max-w-md"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-destructive">
                        <Info className="w-6 h-6" />
                        <p className="font-semibold text-lg">Confirm Exit</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Are you sure you want to close? All unsaved changes will be lost and the form will be reset.
                    </p>
                    <div className="flex gap-3 justify-end mt-6">
                        <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
                            Stay and Edit
                        </Button>
                        <Button variant="destructive" onClick={performClose}>
                            Discard Changes
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );

    // ─── Render: Basic Information Section ────────────────────────────
    function renderBasicInfo() {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Address *</Label>
                    <Input value={propertyData.address1} onChange={(e) => setPropertyData({ ...propertyData, address1: e.target.value })} placeholder="Enter address" />
                </div>
                <div>
                    <Label>Address 2</Label>
                    <Input value={propertyData.address2 || ""} onChange={(e) => setPropertyData({ ...propertyData, address2: e.target.value || null })} placeholder="Enter address line 2" />
                </div>
                <div>
                    <Label>City/Suburb *</Label>
                    <Input value={propertyData.cityOrSuburb} onChange={(e) => setPropertyData({ ...propertyData, cityOrSuburb: e.target.value })} placeholder="Enter city or suburb" />
                </div>
                <div>
                    <Label>Postcode *</Label>
                    <Input value={propertyData.postcode} onChange={(e) => setPropertyData({ ...propertyData, postcode: e.target.value })} placeholder="Enter postcode" />
                </div>
                <div>
                    <Label>State *</Label>
                    <select className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm" value={propertyData.stateLookupId} onChange={(e) => setPropertyData({ ...propertyData, stateLookupId: e.target.value })}>
                        <option value="" disabled>{states.length ? "Select state" : "No states available"}</option>
                        {states.map((s: any) => (
                            <option key={String(s.id)} value={String(s.id)}>{s.name || s.stateName || s.StateName}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label>Property Type *</Label>
                    <select className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm" value={propertyData.type} onChange={(e) => setPropertyData({ ...propertyData, type: parseInt(e.target.value) as any })}>
                        <option value={0} disabled>{propertyTypes.length ? "Select property type" : "No property types available"}</option>
                        {propertyTypes.map((t) => (
                            <option key={String(t.propertyTypeId)} value={t.propertyTypeId}>{(t.name || t.typeName || t.TypeName || "").toString()}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label>Property Manager *</Label>
                    <select className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm" value={propertyData.propertyManagerId} onChange={(e) => setPropertyData({ ...propertyData, propertyManagerId: String(e.target.value) })}>
                        <option value="" disabled>{managers.length ? "Select manager" : "No managers available"}</option>
                        {managers.map((m) => {
                            const id = getManagerId(m);
                            return <option key={id} value={id}>{getManagerLabel(m)}</option>;
                        })}
                    </select>
                </div>
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Label>Inspection Frequency *</Label>
                        <Input type="number" min={1} value={propertyData.inspectionFrequencyNumber ?? ""} onChange={(e) => setPropertyData({ ...propertyData, inspectionFrequencyNumber: parseInt(e.target.value) || 1 })} placeholder="Frequency number" />
                    </div>
                    <div>
                        <Label>&nbsp;</Label>
                        <select className="h-11 w-40 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm" value={propertyData.inspectionFrequencyType} onChange={(e) => setPropertyData({ ...propertyData, inspectionFrequencyType: parseInt(e.target.value) as any })}>
                            <option value={InspectionFrequencyType.Day}>Days</option>
                            <option value={InspectionFrequencyType.Week}>Weeks</option>
                            <option value={InspectionFrequencyType.Month}>Months</option>
                            <option value={InspectionFrequencyType.Year}>Years</option>
                        </select>
                    </div>
                </div>
                <div>
                    <Label>Key Number</Label>
                    <Input value={propertyData.keyNo || ""} onChange={(e) => setPropertyData({ ...propertyData, keyNo: e.target.value || null })} placeholder="Enter key number" />
                </div>
                <div>
                    <Label>Alarm Code</Label>
                    <Input value={propertyData.alarmCode || ""} onChange={(e) => setPropertyData({ ...propertyData, alarmCode: e.target.value || null })} placeholder="Enter alarm code" />
                </div>
                <div className="md:col-span-2">
                    <Label>Property Notes</Label>
                    <textarea
                        className="h-20 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                        value={propertyData.propertyNotes || ""}
                        onChange={(e) => setPropertyData({ ...propertyData, propertyNotes: e.target.value || null })}
                        placeholder="Enter property notes"
                    />
                </div>
            </div>
        );
    }

    // ─── Render: Location & Media Section ─────────────────────────────
    function renderLocationAndMedia() {
        return (
            <div className="space-y-6">
                {/* Map picker & coordinates */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Location Coordinates</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => setShowMapPicker(true)}
                        >
                            <MapPin className="w-4 h-4" />
                            {propertyData.latitude ? "Change on Map" : "Select on Map"}
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs text-muted-foreground">Latitude</Label>
                            <Input
                                type="number"
                                step="any"
                                value={propertyData.latitude || ""}
                                onChange={(e) => setPropertyData({ ...propertyData, latitude: parseFloat(e.target.value) || null })}
                                placeholder="-37.8368"
                                className="text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Longitude</Label>
                            <Input
                                type="number"
                                step="any"
                                value={propertyData.longitude || ""}
                                onChange={(e) => setPropertyData({ ...propertyData, longitude: parseFloat(e.target.value) || null })}
                                placeholder="144.928"
                                className="text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Property Images</Label>
                    </div>
                    <Input type="file" accept="image/*" multiple onChange={handleImageSelection} />
                    <p className="mt-1 text-xs text-muted-foreground">Upload image files (JPG, PNG, WebP). You can upload multiple images.</p>

                    {existingImages.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {existingImages.map((url) => (
                                <div key={url} className="relative rounded-lg border border-[var(--border)] overflow-hidden group">
                                    <img src={url} alt="Property" className="h-24 w-full object-cover" />
                                    <button
                                        type="button"
                                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeExistingImage(url)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {imagePreviews.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {imagePreviews.map((preview, index) => (
                                <div key={preview} className="relative rounded-lg border border-[var(--border)] overflow-hidden group">
                                    <img src={preview} alt="Preview" className="h-24 w-full object-cover" />
                                    <button
                                        type="button"
                                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeSelectedImage(index)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Render: Landlord Section ──────────────────────────────────────
    function renderLandlord() {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label>Name *</Label>
                    <Input value={landlord.name} onChange={(e) => setLandlord({ ...landlord, name: e.target.value })} placeholder="Enter landlord name" />
                </div>
                <div>
                    <Label>Email *</Label>
                    <Input
                        type="email"
                        value={landlord.email}
                        onChange={(e) => setLandlord({ ...landlord, email: e.target.value })}
                        placeholder="Enter email address"
                        className={landlord.email && !validateEmail(landlord.email) ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {landlord.email && !validateEmail(landlord.email) && (
                        <p className="text-[10px] text-destructive mt-1 font-medium italic">Please enter a valid email address</p>
                    )}
                </div>
                <div>
                    <Label>Phone</Label>
                    <Input value={landlord.phone} onChange={(e) => setLandlord({ ...landlord, phone: e.target.value })} placeholder="Enter phone number" />
                </div>
            </div>
        );
    }

    // ─── Render: Tenancy & Tenants Section ─────────────────────────────
    function renderTenancy() {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Full Name *</Label>
                        <Input value={tenancy.fullName} onChange={(e) => setTenancy({ ...tenancy, fullName: e.target.value })} placeholder="Enter tenant full name" />
                    </div>
                    <div>
                        <Label>Email *</Label>
                        <Input
                            type="email"
                            value={tenancy.email}
                            onChange={(e) => setTenancy({ ...tenancy, email: e.target.value })}
                            placeholder="Enter email address"
                            className={tenancy.email && !validateEmail(tenancy.email) ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {tenancy.email && !validateEmail(tenancy.email) && (
                            <p className="text-[10px] text-destructive mt-1 font-medium italic">Please enter a valid email address</p>
                        )}
                    </div>
                    <div>
                        <Label>Mobile</Label>
                        <Input value={tenancy.mobile} onChange={(e) => setTenancy({ ...tenancy, mobile: e.target.value })} placeholder="Enter mobile number" />
                    </div>
                    <div>
                        <Label>Lease Start Date *</Label>
                        <Input type="datetime-local" value={tenancy.leaseStartDate} onChange={(e) => setTenancy({ ...tenancy, leaseStartDate: e.target.value })} />
                    </div>
                    <div>
                        <Label>Lease End Date *</Label>
                        <Input type="datetime-local" value={tenancy.leaseEndDate} onChange={(e) => setTenancy({ ...tenancy, leaseEndDate: e.target.value })} />
                    </div>
                    <div>
                        <Label>Current Rent Amount *</Label>
                        <Input type="number" min={0} step="0.01" value={tenancy.currentRentAmount ?? ""} onChange={(e) => setTenancy({ ...tenancy, currentRentAmount: parseFloat(e.target.value) || undefined })} placeholder="Enter rent amount" />
                    </div>
                    <div>
                        <Label>Rent Frequency</Label>
                        <select
                            className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                            value={tenancy.rentFrequency}
                            onChange={(e) => setTenancy({ ...tenancy, rentFrequency: parseInt(e.target.value) as RentFrequency })}
                        >
                            <option value={RentFrequency.Day}>Day</option>
                            <option value={RentFrequency.Week}>Week</option>
                            <option value={RentFrequency.Fortnight}>Fortnight</option>
                            <option value={RentFrequency.Month}>Month</option>
                            <option value={RentFrequency.Quarter}>Quarter</option>
                            <option value={RentFrequency.Year}>Year</option>
                        </select>
                    </div>
                    <div>
                        <Label>Original Lease Date</Label>
                        <Input type="datetime-local" value={tenancy.originalLeaseDate} onChange={(e) => setTenancy({ ...tenancy, originalLeaseDate: e.target.value })} />
                    </div>
                    <div>
                        <Label>Next Inspection Date</Label>
                        <Input type="datetime-local" value={tenancy.newInspectionDate} onChange={(e) => setTenancy({ ...tenancy, newInspectionDate: e.target.value })} />
                    </div>
                </div>

                {/* Additional Tenants */}
                <div className="border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-foreground">Additional Tenants</h4>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddTenantForm(!showAddTenantForm)}
                        >
                            {showAddTenantForm ? "Cancel" : "Add Tenant"}
                        </Button>
                    </div>

                    {tenants.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {tenants.map((tenant, index) => (
                                <div key={index} className="bg-muted/50 border border-[var(--border)] p-3 rounded-lg flex items-center justify-between">
                                    <div>
                                        <span className="font-medium">{tenant.firstName} {tenant.lastName}</span>
                                        <span className="text-muted-foreground ml-2">• {tenant.email}</span>
                                        {tenant.phone && <span className="text-muted-foreground ml-2">• {tenant.phone}</span>}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveTenant(index)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {showAddTenantForm && (
                        <div className="bg-muted/30 border border-[var(--border)] p-4 rounded-lg">
                            <h5 className="text-sm font-medium text-foreground mb-3">Add New Tenant</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>First Name *</Label>
                                    <Input value={newTenant.firstName} onChange={(e) => setNewTenant({ ...newTenant, firstName: e.target.value })} placeholder="Enter first name" />
                                </div>
                                <div>
                                    <Label>Last Name *</Label>
                                    <Input value={newTenant.lastName} onChange={(e) => setNewTenant({ ...newTenant, lastName: e.target.value })} placeholder="Enter last name" />
                                </div>
                                <div>
                                    <Label>Email *</Label>
                                    <Input
                                        type="email"
                                        value={newTenant.email}
                                        onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                                        placeholder="Enter email"
                                        className={newTenant.email && !validateEmail(newTenant.email) ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {newTenant.email && !validateEmail(newTenant.email) && (
                                        <p className="text-[10px] text-destructive mt-1 font-medium italic">Please enter a valid email address</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} placeholder="Enter phone number" />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Button type="button" size="sm" onClick={handleAddTenant} disabled={!newTenant.firstName.trim() || !newTenant.lastName.trim() || !newTenant.email.trim()}>
                                    Add Tenant
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddTenantForm(false); setNewTenant({ firstName: "", lastName: "", email: "", phone: "" }); }}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {tenants.length === 0 && !showAddTenantForm && (
                        <div className="text-center py-6 text-muted-foreground">
                            <p>No additional tenants added yet.</p>
                            <p className="text-sm">Click "Add Tenant" to add more tenants to this tenancy.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Render: Layout Section ────────────────────────────────────────
    function renderLayout() {
        return (
            <div className="space-y-4">
                <div>
                    <Label>Layout *</Label>
                    <select
                        className="h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                        value={propertyData.propertyLayoutId || ""}
                        onChange={(e) => {
                            setPropertyData({ ...propertyData, propertyLayoutId: e.target.value || "" });
                        }}
                    >
                        <option value="">Select layout</option>
                        {layouts.map((l) => {
                            const id = getLayoutOptionId(l);
                            if (!id) return null;
                            return (
                                <option key={id} value={id}>
                                    {getLayoutOptionLabel(l)}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="bg-muted/30 border border-[var(--border)] rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                        Choose a predefined layout. Areas and items come from your layout management and will be used during inspections and reports.
                    </p>
                </div>

                {selectedLayoutDetails && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-primary" />
                            <h4 className="font-semibold text-sm">Layout Details: {selectedLayoutDetails.layoutName || selectedLayoutDetails.name}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedLayoutDetails.areas?.map((area: any) => (
                                <div key={area.id} className="bg-card border border-[var(--border)] p-3 rounded-md shadow-sm">
                                    <p className="text-sm font-bold text-primary mb-1">{area.name}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {area.items?.map((item: any) => (
                                            <span key={item.id} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm border border-[var(--border)]/50">
                                                {item.name}
                                            </span>
                                        ))}
                                        {(!area.items || area.items.length === 0) && (
                                            <span className="text-[10px] text-muted-foreground italic">No items</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(!selectedLayoutDetails.areas || selectedLayoutDetails.areas.length === 0) && (
                            <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-md text-center border border-dashed mt-3">
                                This layout has no predefined areas or items.
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ─── Render: Submit Button ─────────────────────────────────────────
    function renderSubmitButton() {
        return (
            <div className="flex items-center justify-end pt-6 border-t border-[var(--border)]">
                <Button
                    onClick={handleSubmit}
                    disabled={!formIsValid || isSubmitting}
                    size="lg"
                    className="gap-2 px-8"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {isEdit ? "Updating Property..." : "Creating Property..."}
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {isEdit ? "Update Property" : "Create Property"}
                        </>
                    )}
                </Button>
            </div>
        );
    }
}

// ─── Map Picker Modal ────────────────────────────────────────────────
function MapPickerModal({ onClose, onSelect, initialLat, initialLng }: { onClose: () => void; onSelect: (lat: number, lng: number) => void; initialLat: number; initialLng: number }) {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
        if (!document.getElementById("leaflet-css")) {
            const link = document.createElement("link");
            link.id = "leaflet-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);
        }

        if (!document.getElementById("leaflet-js")) {
            const script = document.createElement("script");
            script.id = "leaflet-js";
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => setIsLoaded(true);
            document.head.appendChild(script);
        } else {
            setIsLoaded(true);
        }
    }, []);

    React.useEffect(() => {
        if (!isLoaded || !mapRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        let marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

        map.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
        });

        const handleConfirm = () => {
            const pos = marker.getLatLng();
            onSelect(pos.lat, pos.lng);
        };

        (window as any).confirmMapSelection = handleConfirm;

        return () => {
            map.remove();
        };
    }, [isLoaded, initialLat, initialLng]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-muted/30">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">Select Property Location</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 relative min-h-[400px]">
                    {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-muted-foreground font-medium">Loading Map...</p>
                            </div>
                        </div>
                    )}
                    <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />
                </div>

                <div className="p-4 border-t border-[var(--border)] bg-muted/30 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Click on map or drag marker to select coordinates
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={() => (window as any).confirmMapSelection()}>Confirm Location</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
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
import { Building2, Bell, User, LogOut } from "lucide-react";
// StructureEditor removed: areas & items are captured in layout step

type WizardStep = "property" | "landlord" | "tenancy" | "layout" | "review";

export default function CreatePropertyWizard() {
  const router = useRouter();

  const [activeStep, setActiveStep] = useState<WizardStep>("property");
  const [states, setStates] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accumulated data across steps
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
  const [tenancy, setTenancy] = useState<{ fullName: string; email: string; mobile?: string; leaseStartDate: string; leaseEndDate: string; currentRentAmount?: number; rentFrequency: RentFrequency; originalLeaseDate?: string; newInspectionDate?: string; }>({
    fullName: "",
    email: "",
    mobile: "",
    leaseStartDate: "",
    leaseEndDate: "",
    currentRentAmount: undefined,
    rentFrequency: RentFrequency.Month,
    originalLeaseDate: "",
    newInspectionDate: "",
  });
  const [tenants, setTenants] = useState<{ firstName: string; lastName: string; email: string; phone?: string; }[]>([]);
  const [showAddTenantForm, setShowAddTenantForm] = useState(false);
  const [newTenant, setNewTenant] = useState<{ firstName: string; lastName: string; email: string; phone?: string; }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  // Removed separate structure step

  const STORAGE_KEY = "pc360:create-property-wizard";

  const { effectiveAgencyId } = useAuth();

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
    console.error("CreatePropertyWizard error", err?.response?.data ?? err);
    if (typeof err?.message === "string") return err.message;
    return fallback;
  };

  useEffect(() => {
    setPropertyData((prev) => ({
      ...prev,
      agencyId: effectiveAgencyId ? String(effectiveAgencyId) : null,
    }));
  }, [effectiveAgencyId]);

  useEffect(() => {
    // Restore from storage if available
    try {
      if (typeof window !== "undefined") {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved.activeStep) setActiveStep(saved.activeStep);
          if (saved.propertyData) setPropertyData(saved.propertyData);
          if (saved.createdPropertyId) setCreatedPropertyId(saved.createdPropertyId);
          if (saved.tenants) setTenants(saved.tenants);
        }
      }
    } catch {}

    const load = async () => {
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
            const roles = await roleApi.getByAgency(effectiveAgencyId);
            const pmRole = roles.find((r) => r.name.toLowerCase() === "propertymanager");
            if (pmRole) {
              const { data: usersPage } = await userApi.getByRole(effectiveAgencyId, pmRole.id, 1, 200);
              mgrs = usersPage || [];
            }
          } catch {
            mgrs = [];
          }
        }
        setManagers(mgrs);
        setPropertyData((prev) => ({
          ...prev,
          type: (typesData?.[0]?.propertyTypeId as number | undefined) ? (typesData?.[0]?.propertyTypeId as PropertyType) : prev.type,
          stateLookupId: (statesData?.[0]?.id ?? prev.stateLookupId) as any,
          propertyManagerId: String(mgrs?.[0]?.id ?? prev.propertyManagerId ?? ''),
        }));
      } catch (e: any) {
        setError(getErrorMessage(e, "Failed to load reference data"));
      }
    };
    load();
  }, []);

  // Persist to storage on meaningful state changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const payload = {
          activeStep,
          propertyData,
          createdPropertyId,
          tenants,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }, [activeStep, propertyData, createdPropertyId, tenants]);

  const steps: { id: WizardStep; title: string; description: string }[] = [
    { id: "property", title: "Property Information", description: "Basic property details" },
    { id: "landlord", title: "Landlord", description: "Add property owner" },
    { id: "tenancy", title: "Tenancy & Tenant", description: "Occupancy details" },
    { id: "layout", title: "Select Layout", description: "Choose a layout for this property" },
    { id: "review", title: "Review", description: "Confirm & save" },
  ];

  const canProceed = useMemo(() => {
    if (activeStep === "property") {
      // Property step validation
      return (
        propertyData.address1.trim() &&
        propertyData.cityOrSuburb.trim() &&
        propertyData.postcode.trim() &&
        Number(propertyData.type) > 0 &&
        String(propertyData.propertyManagerId).trim() !== "" &&
        String(propertyData.stateLookupId).trim() !== "" &&
        propertyData.inspectionFrequencyNumber > 0
      );
    }
    // No separate structure step; areas & items are part of layout
    if (activeStep === "landlord") {
      return landlord.name.trim() && landlord.email.trim();
    }
    if (activeStep === "tenancy") {
      return (
        tenancy.fullName.trim() &&
        tenancy.email.trim() &&
        tenancy.leaseStartDate &&
        tenancy.leaseEndDate &&
        typeof tenancy.currentRentAmount === "number"
      );
    }
    if (activeStep === "layout") {
      return !!String(propertyData.propertyLayoutId).trim();
    }
    return true;
  }, [activeStep, propertyData, landlord, tenancy]);

  const mapFrequencyToId = (freq: string): number => {
    const map: Record<string, number> = { Day: 0, Week: 1, Fortnight: 2, Month: 3, Quarter: 4, Year: 5 };
    return map[freq] ?? 0;
  };

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

  const goNext = async () => {
    setError("");
    try {
      if (activeStep === "property") {
        setActiveStep("landlord");
      } else if (activeStep === "landlord") {
        setActiveStep("tenancy");
      } else if (activeStep === "tenancy") {
        setActiveStep("layout");
      } else if (activeStep === "layout") {
        setActiveStep("review");
      } else if (activeStep === "review") {
        // Build single payload matching backend CreatePropertyRequest (PropertyRequestBase)
        setIsSubmitting(true);
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
          propertyImages: propertyData.propertyImages || null,
          propertyLayoutId: propertyData.propertyLayoutId || "",
          latitude: null,
          longitude: null,
          landlords: [
            {
              name: landlord.name,
              email: landlord.email,
              phone: landlord.phone || "",
            },
          ],
          tenancies: [
            {
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
              tenants: tenants.map(tenant => ({
                firstName: tenant.firstName ?? "",
                lastName: tenant.lastName,
                email: tenant.email,
                phone: tenant.phone || "",
                rentReviewDate: null,
                rentReviewNotes: null,
              })),
            },
          ],
        };

        await propertyApi.create(payload as any);
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        router.push("/dashboard");
      }
    } catch (e: any) {
      setError(getErrorMessage(e, "Request failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setError("");
    const order: WizardStep[] = ["property", "landlord", "tenancy", "review"];
    const idx = order.indexOf(activeStep);
    if (idx > 0) setActiveStep(order[idx - 1]);
  };

  const StepIndicator = () => {
    const currentIdx = steps.findIndex((x) => x.id === activeStep);
    const progressPercent = ((currentIdx + 1) / steps.length) * 100;
    return (
      <div className="mb-6">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
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
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              aria-label="Back to properties"
            >
              Back
            </Button>
            <Button variant="ghost" aria-label="Notifications"><Bell className="w-5 h-5" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-10 w-10 rounded-full focus:outline-none" aria-label="Open profile menu">
                  <Avatar className="h-10 w-10">
                    {(() => {
                      try {
                        const u = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
                        const src = u.profileImage || u.ProfileImage || undefined;
                        return <AvatarImage src={src} alt="Profile" />;
                      } catch {
                        return <AvatarImage src={undefined} alt="Profile" />;
                      }
                    })()}
                    <AvatarFallback>
                      {(() => {
                        if (typeof window === 'undefined') return 'U';
                        const u = JSON.parse(localStorage.getItem('user') || '{}');
                        const first = (u.firstName || u.FirstName || '').toString().trim();
                        const last = (u.lastName || u.LastName || '').toString().trim();
                        const initials = `${first.charAt(0) || ''}${last.charAt(0) || ''}`.toUpperCase();
                        if (initials) return initials;
                        const email = (u.email || '').toString();
                        return email ? email.slice(0, 2).toUpperCase() : 'U';
                      })()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}')?.email || 'User') : 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">Wizard: Create Property</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem><LogOut className="mr-2 h-4 w-4" />Exit Wizard</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <div className="w-full">
        <Card className="rounded-none border-0">
          <CardHeader>
            <CardTitle>Create Property</CardTitle>
            <CardDescription>Complete all steps to finish property setup</CardDescription>
          </CardHeader>
          <CardContent>
            <StepIndicator />
            {error && <div className="mb-4 text-sm text-destructive-600">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[70vh]">
              <aside className="md:col-span-4">
                <div className="bg-card border border-border rounded-lg p-4 pl-6 sticky top-[64px]">
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                  <ol className="space-y-6">
                    {steps.map((s, i) => {
                      const currentIdx = steps.findIndex((x) => x.id === activeStep);
                      const isActive = s.id === activeStep;
                      const isCompleted = i < currentIdx;
                      return (
                        <li key={s.id} className="relative flex items-start gap-3">
                          <button
                            type="button"
                            className={`absolute -left-6 top-0 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border shadow-sm ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : isCompleted
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                            onClick={() => {
                              if (i <= currentIdx) setActiveStep(s.id);
                            }}
                            aria-current={isActive ? "step" : undefined}
                          >
                            {i + 1}
                          </button>
                          <div className="min-w-0 ml-4">
                            <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </aside>

              <section className="md:col-span-8">

              {activeStep === "property" && (
                <div className="space-y-6">
                  {/* Property Basic Information */}
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Property Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                        <Label>Address *</Label>
                        <Input value={propertyData.address1} onChange={(e) => setPropertyData({ ...propertyData, address1: e.target.value })} placeholder="Enter address" />
                </div>
                <div>
                  <Label>Address 2</Label>
                        <Input value={propertyData.address2 || ''} onChange={(e) => setPropertyData({ ...propertyData, address2: e.target.value || null })} placeholder="Enter address line 2" />
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
                  <select className="h-11 w-full rounded-md border border-border bg-white px-3 py-2" value={propertyData.stateLookupId} onChange={(e) => setPropertyData({ ...propertyData, stateLookupId: e.target.value })}>
                    {states.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name || s.stateName || s.StateName}</option>
                    ))}
                  </select>
                </div>
                <div>
                        <Label>Property Type *</Label>
                  <select
                    className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
                    value={propertyData.type}
                    onChange={(e) => setPropertyData({ ...propertyData, type: parseInt(e.target.value) as any })}
                  >
                    {propertyTypes.map((t) => (
                      <option key={t.propertyTypeId} value={t.propertyTypeId}>
                        {(t.name || t.typeName || t.TypeName || "").toString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                        <Label>Property Manager *</Label>
                  <select className="h-11 w-full rounded-md border border-border bg-white px-3 py-2" value={propertyData.propertyManagerId} onChange={(e) => setPropertyData({ ...propertyData, propertyManagerId: e.target.value })}>
                    {managers.map((m) => (
                      <option key={m.userId || m.UserId} value={m.userId || m.UserId}>
                        {`${(m.firstName || m.FirstName || '').toString().trim()} ${(m.lastName || m.LastName || '').toString().trim()}`.trim() || m.username || m.Username}
                      </option>
                    ))}
                  </select>
                </div>
              
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                          <Label>Inspection Frequency *</Label>
                          <Input type="number" min={1} value={propertyData.inspectionFrequencyNumber} onChange={(e) => setPropertyData({ ...propertyData, inspectionFrequencyNumber: parseInt(e.target.value) || 1 })} placeholder="Frequency number" />
                  </div>
                  <div>
                    <Label>&nbsp;</Label>
                    <select className="h-11 w-40 rounded-md border border-border bg-white px-3 py-2" value={propertyData.inspectionFrequencyType} onChange={(e) => setPropertyData({ ...propertyData, inspectionFrequencyType: parseInt(e.target.value) as any })}>
                      <option value={InspectionFrequencyType.Day}>Days</option>
                      <option value={InspectionFrequencyType.Week}>Weeks</option>
                      <option value={InspectionFrequencyType.Month}>Months</option>
                      <option value={InspectionFrequencyType.Year}>Years</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Key Number</Label>
                  <Input value={propertyData.keyNo || ''} onChange={(e) => setPropertyData({ ...propertyData, keyNo: e.target.value || null })} placeholder="Enter key number" />
                </div>
                <div>
                  <Label>Alarm Code</Label>
                  <Input value={propertyData.alarmCode || ''} onChange={(e) => setPropertyData({ ...propertyData, alarmCode: e.target.value || null })} placeholder="Enter alarm code" />
                </div>
                <div>
                  <Label>Property Images URL</Label>
                  <Input value={propertyData.propertyImages || ''} onChange={(e) => setPropertyData({ ...propertyData, propertyImages: e.target.value || null })} placeholder="Enter property images URL" />
                </div>
                <div className="md:col-span-2">
                  <Label>Property Notes</Label>
                  <textarea 
                    className="h-20 w-full rounded-md border border-border bg-white px-3 py-2" 
                    value={propertyData.propertyNotes || ''} 
                    onChange={(e) => setPropertyData({ ...propertyData, propertyNotes: e.target.value || null })} 
                    placeholder="Enter property notes"
                  />
                </div>
                    </div>
                  </div>
              </div>
            )}


            {/* Structure step removed; handled in layout */}

            {activeStep === "landlord" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={landlord.name} onChange={(e) => setLandlord({ ...landlord, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={landlord.email} onChange={(e) => setLandlord({ ...landlord, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={landlord.phone} onChange={(e) => setLandlord({ ...landlord, phone: e.target.value })} />
                </div>
              </div>
            )}

            {activeStep === "tenancy" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={tenancy.fullName} onChange={(e) => setTenancy({ ...tenancy, fullName: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={tenancy.email} onChange={(e) => setTenancy({ ...tenancy, email: e.target.value })} />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input value={tenancy.mobile} onChange={(e) => setTenancy({ ...tenancy, mobile: e.target.value })} />
                </div>
                <div>
                  <Label>Lease Start</Label>
                  <Input type="datetime-local" value={tenancy.leaseStartDate} onChange={(e) => setTenancy({ ...tenancy, leaseStartDate: e.target.value })} />
                </div>
                <div>
                  <Label>Lease End</Label>
                  <Input type="datetime-local" value={tenancy.leaseEndDate} onChange={(e) => setTenancy({ ...tenancy, leaseEndDate: e.target.value })} />
                </div>
                <div>
                  <Label>Current Rent Amount</Label>
                  <Input type="number" min={0} step="0.01" value={tenancy.currentRentAmount as any} onChange={(e) => setTenancy({ ...tenancy, currentRentAmount: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <Label>Rent Frequency</Label>
                  <select
                    className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
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
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-foreground">Tenants</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddTenantForm(!showAddTenantForm)}
                    >
                      {showAddTenantForm ? "Cancel" : "Add Tenant"}
                    </Button>
                  </div>

                  {/* Display existing tenants */}
                  {tenants.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {tenants.map((tenant, index) => (
                        <div key={index} className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
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
                            className="text-destructive-600 hover:text-destructive-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add tenant form */}
                  {showAddTenantForm && (
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <h5 className="text-sm font-medium text-foreground mb-3">Add New Tenant</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>First Name *</Label>
                          <Input 
                            value={newTenant.firstName} 
                            onChange={(e) => setNewTenant({ ...newTenant, firstName: e.target.value })} 
                            placeholder="Enter first name"
                          />
                        </div>
                        <div>
                          <Label>Last Name *</Label>
                          <Input 
                            value={newTenant.lastName} 
                            onChange={(e) => setNewTenant({ ...newTenant, lastName: e.target.value })} 
                            placeholder="Enter last name"
                          />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input 
                            type="email" 
                            value={newTenant.email} 
                            onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} 
                            placeholder="Enter email"
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input 
                            value={newTenant.phone} 
                            onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} 
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          type="button" 
                          size="sm"
                          onClick={handleAddTenant}
                          disabled={!newTenant.firstName.trim() || !newTenant.lastName.trim() || !newTenant.email.trim()}
                        >
                          Add Tenant
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowAddTenantForm(false);
                            setNewTenant({ firstName: "", lastName: "", email: "", phone: "" });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {tenants.length === 0 && !showAddTenantForm && (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No tenants added yet.</p>
                      <p className="text-sm">Click "Add Tenant" to add tenants to this tenancy.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeStep === "layout" && (
              <div className="space-y-6">
                <div className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Select Layout</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Layout *</Label>
                      <select
                        className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
                        value={Number(propertyData.propertyLayoutId || 0)}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          console.log('Layout selection changed:', value, 'Type:', typeof value);
                          setPropertyData({ ...propertyData, propertyLayoutId: value ? String(value) : '' });
                        }}
                      >
                        <option value={0}>Select layout</option>
                        {layouts.map((l) => (
                          <option key={l.layoutId} value={l.layoutId}>{l.layoutName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Choose a predefined layout. Areas and items come from your layout management and will be used during inspections and reports.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "review" && (
              <div className="space-y-6">
                {/* Layout Information */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Layout Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Selected Layout:</strong> {(() => {
                      if (!propertyData.propertyLayoutId) {
                        return "No layout selected";
                      }
                      
                      const layoutId = Number(propertyData.propertyLayoutId);
                      const foundLayout = layouts.find(l => l.layoutId === layoutId);
                      
                      if (foundLayout) {
                        return foundLayout.layoutName;
                      }
                      
                      // Fallback: try to find by string comparison
                      const foundLayoutByString = layouts.find(l => String(l.layoutId) === String(propertyData.propertyLayoutId));
                      if (foundLayoutByString) {
                        return foundLayoutByString.layoutName;
                      }
                      
                      return `Layout not found (ID: ${propertyData.propertyLayoutId})`;
                    })()}</div>
                  </div>
                </div>

                {/* Property Information */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Property Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Address:</strong> {propertyData.address1}</div>
                    {propertyData.address2 && <div><strong>Address 2:</strong> {propertyData.address2}</div>}
                    <div><strong>City/Suburb:</strong> {propertyData.cityOrSuburb}</div>
                    <div><strong>Postcode:</strong> {propertyData.postcode}</div>
                    <div><strong>State:</strong> {states.find(s => String(s.id) === String(propertyData.stateLookupId))?.name || states.find(s => String(s.id) === String(propertyData.stateLookupId))?.stateName || states.find(s => String(s.id) === String(propertyData.stateLookupId))?.StateName}</div>
                    <div><strong>Property Type:</strong> {propertyTypes.find(t => t.propertyTypeId === Number(propertyData.type))?.name || propertyTypes.find(t => t.propertyTypeId === Number(propertyData.type))?.typeName || propertyTypes.find(t => t.propertyTypeId === Number(propertyData.type))?.TypeName}</div>
                    <div><strong>Property Manager:</strong> {(() => {
                      const m = managers.find(m => (m.userId || m.UserId) === propertyData.propertyManagerId);
                      if (!m) return '';
                      const full = `${(m.firstName || m.FirstName || '').toString().trim()} ${(m.lastName || m.LastName || '').toString().trim()}`.trim();
                      return full || m.username || m.Username;
                    })()}</div>
                    <div><strong>Inspection Frequency:</strong> {propertyData.inspectionFrequencyNumber} {propertyData.inspectionFrequencyType}</div>
                    <div><strong>Key Number:</strong> {propertyData.keyNo || "N/A"}</div>
                    <div><strong>Alarm Code:</strong> {propertyData.alarmCode || "N/A"}</div>
                    <div><strong>Property Images URL:</strong> {propertyData.propertyImages || "N/A"}</div>
                    <div><strong>Property Notes:</strong> {propertyData.propertyNotes || "N/A"}</div>
                    <div><strong>Status:</strong> Active (Default)</div>
                  </div>
                </div>

                {/* Landlord and Tenancy Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="font-medium text-foreground mb-2">Landlord</p>
                  <p className="text-muted-foreground">{landlord.name} • {landlord.email}{landlord.phone ? ` • ${landlord.phone}` : ''}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="font-medium text-foreground mb-2">Tenancy</p>
                  <p className="text-muted-foreground">{tenancy.fullName} • {tenancy.email}</p>
                  <p className="text-muted-foreground">{tenancy.leaseStartDate ? new Date(tenancy.leaseStartDate).toLocaleString() : ''} → {tenancy.leaseEndDate ? new Date(tenancy.leaseEndDate).toLocaleString() : ''}</p>
                  {tenants.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-foreground">Tenants ({tenants.length}):</p>
                      <div className="text-sm text-muted-foreground">
                        {tenants.map((tenant, index) => (
                          <div key={index}>
                            {tenant.firstName} {tenant.lastName} • {tenant.email}
                            {tenant.phone && ` • ${tenant.phone}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={goBack} disabled={activeStep === "property"}>Back</Button>
              <Button onClick={goNext} disabled={!canProceed || isSubmitting}>
                {activeStep === "review" ? (isSubmitting ? "Finishing..." : "Finish") : "Next"}
              </Button>
            </div>
            </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



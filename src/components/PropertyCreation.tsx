'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { propertyApi } from "@/lib/api/property";
import { agencyApi } from "@/lib/api/agency";
import { referenceApi } from "@/lib/api/reference";
import { layoutApi } from "@/lib/api/propertyLayout";
import { userApi } from "@/lib/api/user";
import { useAuth } from "@/contexts/AuthContext";
import { InspectionFrequencyType, PropertyType, type CreatePropertyRequest, RentFrequency } from "@/types/api";
import { MapPin, Info, X, Building2, Bell, User, LogOut } from "lucide-react";
import Modal from "@/components/ui/Modal";

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

type WizardStep = "property" | "landlord" | "tenancy" | "layout" | "review";

interface PropertyCreationProps {
  onPropertyCreated?: () => void;
  propertyId?: string;
  onClose?: () => void;
}

const PropertyCreation: React.FC<PropertyCreationProps> = ({ onPropertyCreated, propertyId, onClose }) => {
  const [activeStep, setActiveStep] = useState<WizardStep>("property");
  const [states, setStates] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!propertyId;

  // Accumulated data across steps (canonical DTO shape)
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

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [selectedLayoutDetails, setSelectedLayoutDetails] = useState<any>(null);

  const STORAGE_KEY = "pc360:create-property-wizard";
  const { effectiveAgencyId } = useAuth();

  useEffect(() => {
    setPropertyData((prev) => ({
      ...prev,
      agencyId: effectiveAgencyId ? String(effectiveAgencyId) : null,
    }));
  }, [effectiveAgencyId]);

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
    console.error("PropertyCreation error", err?.response?.data ?? err);
    if (typeof err?.message === "string") return err.message;
    return fallback;
  };

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
    } catch { }

    const load = async () => {
      setIsLoading(true);
      try {
        const [agency, typesData, layoutsData, usersPage] = await Promise.all([
          effectiveAgencyId ? agencyApi.getById(String(effectiveAgencyId)) : Promise.resolve(null as any),
          referenceApi.getPropertyTypes(),
          layoutApi.getAll(),
          effectiveAgencyId ? userApi.list({ agencyId: String(effectiveAgencyId), page: 1, pageSize: 500 }) : userApi.list({ page: 1, pageSize: 500 }),
        ]);

        const countryId = agency?.countryId ?? null;
        const statesData = countryId ? await referenceApi.getStatesByCountry(countryId) : await referenceApi.getStates();
        setStates(statesData);
        setPropertyTypes(typesData || []);
        setLayouts(layoutsData);
        const mgrs = usersPage?.data || [];
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
            stateLookupId: String(statesData?.[0]?.id ?? prev.stateLookupId ?? ''),
            propertyManagerId: String(mgrs?.[0]?.id ?? (mgrs?.[0] as any)?.userId ?? (mgrs?.[0] as any)?.UserId ?? prev.propertyManagerId ?? ''),
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

  // Persist to storage on meaningful state changes
  useEffect(() => {
    if (isEdit) return; // Don't persist to storage in edit mode
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
    } catch { }
  }, [activeStep, propertyData, createdPropertyId, tenants, isEdit]);

  const steps: { id: WizardStep; title: string; description: string }[] = [
    { id: "property", title: "Property Information", description: "Basic property details" },
    { id: "landlord", title: "Landlord", description: "Add property owner" },
    { id: "tenancy", title: "Tenancy & Tenant", description: "Occupancy details" },
    { id: "layout", title: "Select Layout", description: "Choose a layout for this property" },
    { id: "review", title: "Review", description: "Confirm & save" },
  ];

  const canProceed = useMemo(() => {
    if (activeStep === "property") {
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
    if (activeStep === "landlord") {
      return landlord.name.trim() && validateEmail(landlord.email);
    }
    if (activeStep === "tenancy") {
      const allTenantsValid = tenants.every(t => validateEmail(t.email));
      return (
        tenancy.fullName.trim() &&
        validateEmail(tenancy.email) &&
        allTenantsValid &&
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
          latitude: propertyData.latitude ?? null,
          longitude: propertyData.longitude ?? null,
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
              tenants: tenants.map((tenant) => ({
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

        if (isEdit && propertyId) {
          await propertyApi.update(propertyId, payload as any);
        } else {
          await propertyApi.create(payload as any);
          try { localStorage.removeItem(STORAGE_KEY); } catch { }
        }
        onPropertyCreated?.();
      }
    } catch (e: any) {
      setError(getErrorMessage(e, "Request failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setError("");
    const order: WizardStep[] = ["property", "landlord", "tenancy", "layout", "review"];
    const idx = order.indexOf(activeStep);
    if (idx > 0) setActiveStep(order[idx - 1]);
  };

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
    
    if (onClose) {
      onClose();
    } else if (onPropertyCreated) {
      onPropertyCreated();
    } else {
      window.history.back();
    }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{isEdit ? "Edit Property" : "Create Property"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{isEdit ? "Update logical sections of the property data" : "Complete all steps to finish property setup"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
             <Bell className="w-5 h-5" />
          </Button> */}
          {/* <div className="h-6 w-px bg-border mx-1" /> */}
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

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Property Edit Wizard" : "Property Creation Wizard"}</CardTitle>
          <CardDescription>Step {steps.findIndex(s => s.id === activeStep) + 1} of {steps.length}: {steps.find(s => s.id === activeStep)?.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <StepIndicator />
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground font-medium">Fetching property data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[60vh]">
            <aside className="lg:col-span-4">
              <div className="bg-card border border-border rounded-lg p-4 pl-6 sticky top-4">
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
                          className={`absolute -left-6 top-0 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border shadow-sm ${isActive
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

            <section className="lg:col-span-8">
              {activeStep === "property" && (
                <div className="space-y-6">
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
                        <select
                          className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
                          value={propertyData.stateLookupId}
                          onChange={(e) => setPropertyData({ ...propertyData, stateLookupId: e.target.value })}
                        >
                          <option value="" disabled>
                            {states.length ? "Select state" : "No states available"}
                          </option>
                          {states.map((s: any) => (
                            <option key={String(s.id)} value={String(s.id)}>
                              {s.name || s.stateName || s.StateName}
                            </option>
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
                          <option value={0} disabled>
                            {propertyTypes.length ? "Select property type" : "No property types available"}
                          </option>
                          {propertyTypes.map((t) => (
                            <option key={String(t.propertyTypeId)} value={t.propertyTypeId}>
                              {(t.name || t.typeName || t.TypeName || "").toString()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Property Manager *</Label>
                        <select
                          className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
                          value={propertyData.propertyManagerId}
                          onChange={(e) => setPropertyData({ ...propertyData, propertyManagerId: String(e.target.value) })}
                        >
                          <option value="" disabled>
                            {managers.length ? "Select manager" : "No managers available"}
                          </option>
                          {managers.map((m) => {
                            const id = String(m.userId ?? m.UserId ?? m.id ?? "");
                            const label =
                              `${(m.firstName || m.FirstName || "").toString().trim()} ${(m.lastName || m.LastName || "").toString().trim()}`.trim() ||
                              m.username ||
                              m.Username ||
                              m.email ||
                              id;
                            return (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            );
                          })}
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
                        <div className="flex items-center justify-between mb-2">
                          <Label>Location Coordinates</Label>
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
                              value={propertyData.latitude || ''}
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
                              value={propertyData.longitude || ''}
                              onChange={(e) => setPropertyData({ ...propertyData, longitude: parseFloat(e.target.value) || null })}
                              placeholder="144.928"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                        <Label>Property Notes</Label>
                        <textarea
                          className="h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                          value={propertyData.propertyNotes || ''}
                          onChange={(e) => setPropertyData({ ...propertyData, propertyNotes: e.target.value || null })}
                          placeholder="Enter property notes"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === "landlord" && (
                <div className="space-y-6">
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Landlord Information</h3>
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
                  </div>
                </div>
              )}

              {activeStep === "tenancy" && (
                <div className="space-y-6">
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Tenancy Information</h3>
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
                        <Input type="number" min={0} step="0.01" value={tenancy.currentRentAmount as any} onChange={(e) => setTenancy({ ...tenancy, currentRentAmount: parseFloat(e.target.value) })} placeholder="Enter rent amount" />
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
                    </div>
                  </div>

                  <div className="bg-muted/50 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-foreground">Additional Tenants</h4>
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
                          <div key={index} className="bg-card border border-border p-3 rounded-lg flex items-center justify-between">
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
                      <div className="bg-card border border-border p-4 rounded-lg">
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
                              className={newTenant.email && !validateEmail(newTenant.email) ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {newTenant.email && !validateEmail(newTenant.email) && (
                              <p className="text-[10px] text-destructive mt-1 font-medium italic">Please enter a valid email address</p>
                            )}
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
                        <p>No additional tenants added yet.</p>
                        <p className="text-sm">Click "Add Tenant" to add more tenants to this tenancy.</p>
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
                          value={propertyData.propertyLayoutId || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPropertyData({ ...propertyData, propertyLayoutId: value || '' });
                          }}
                        >
                          <option value="">Select layout</option>

                          {layouts.map((l) => {
                            debugger;
                            const id = String(l.id ?? l.layoutId ?? l.LayoutId ?? '');
                            const label =
                              (l.name || l.layoutName || l.LayoutName || `Layout ${id}`).toString();
                            if (!id) return null;
                            return (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">
                          Choose a predefined layout. Areas and items come from your layout management and will be used during inspections and reports.
                        </p>
                      </div>
                    </div>

                    {selectedLayoutDetails && (
                      <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <Info className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Layout Details: {selectedLayoutDetails.layoutName}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedLayoutDetails.areas?.map((area: any) => (
                            <div key={area.id} className="bg-card border border-border p-3 rounded-md shadow-sm">
                              <p className="text-sm font-bold text-primary mb-1">{area.name}</p>
                              <div className="flex flex-wrap gap-1">
                                {area.items?.map((item: any) => (
                                  <span key={item.id} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm border border-border/50">
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
                          <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-md text-center border border-dashed">
                            This layout has no predefined areas or items.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeStep === "review" && (
                <div className="space-y-6">
                  <div className="bg-muted/50 p-6 rounded-lg">
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
                      <div><strong>Inspection Frequency:</strong> {propertyData.inspectionFrequencyNumber} {InspectionFrequencyType[propertyData.inspectionFrequencyType]}</div>
                      <div><strong>Key Number:</strong> {propertyData.keyNo || "N/A"}</div>
                      <div><strong>Alarm Code:</strong> {propertyData.alarmCode || "N/A"}</div>
                      <div><strong>Property Images URL:</strong> {propertyData.propertyImages || "N/A"}</div>
                      <div><strong>Property Notes:</strong> {propertyData.propertyNotes || "N/A"}</div>
                      <div><strong>Latitude:</strong> {propertyData.latitude || "-"}</div>
                      <div><strong>Longitude:</strong> {propertyData.longitude || "-"}</div>
                      <div><strong>Status:</strong> Active (Default)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Landlord</h4>
                      <p className="text-muted-foreground">{landlord.name} • {landlord.email}{landlord.phone ? ` • ${landlord.phone}` : ''}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Tenancy</h4>
                      <p className="text-muted-foreground">{tenancy.fullName} • {tenancy.email}</p>
                      <p className="text-muted-foreground">{tenancy.leaseStartDate ? new Date(tenancy.leaseStartDate).toLocaleString() : ''} → {tenancy.leaseEndDate ? new Date(tenancy.leaseEndDate).toLocaleString() : ''}</p>
                      {tenants.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-foreground">Additional Tenants ({tenants.length}):</p>
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

                  <div className="bg-muted/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Layout Details</h3>
                    <div className="text-sm">
                      <div><strong>Selected Layout:</strong> {(() => {
                        if (!propertyData.propertyLayoutId) {
                          return "No layout selected";
                        }

                        const layoutId = Number(propertyData.propertyLayoutId);
                        const foundLayout = layouts.find(l => l.layoutId === layoutId);

                        if (foundLayout) {
                          return foundLayout.layoutName;
                        }

                        const foundLayoutByString = layouts.find(l => String(l.layoutId) === String(propertyData.propertyLayoutId));
                        if (foundLayoutByString) {
                          return foundLayoutByString.layoutName;
                        }

                        return `Layout not found (ID: ${propertyData.propertyLayoutId})`;
                      })()}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <Button variant="outline" onClick={goBack} disabled={activeStep === "property"}>
                  Back
                </Button>
                <Button onClick={goNext} disabled={!canProceed || isSubmitting}>
                  {activeStep === "review"
                    ? (isSubmitting
                      ? (isEdit ? "Updating Property..." : "Creating Property...")
                      : (isEdit ? "Update Property" : "Create Property"))
                    : "Next"}
                </Button>
              </div>
            </section>
          </div>
        )}
      </CardContent>
      </Card>

      {/* Map Picker Modal */}
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

      {/* Close Confirmation Modal */}
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
};

// Map Picker Component using Leaflet CDN
function MapPickerModal({ onClose, onSelect, initialLat, initialLng }: { onClose: () => void, onSelect: (lat: number, lng: number) => void, initialLat: number, initialLng: number }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
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

    // Fix default icon issue with Leaflet and webpack/next
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

    map.on('click', (e: any) => {
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
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
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
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground font-medium">Loading Map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />
        </div>

        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
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

export default PropertyCreation;

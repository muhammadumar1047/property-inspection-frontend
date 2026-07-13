"use client";

import React, { useEffect, useState } from "react";
import { propertyApi } from "@/lib/api/property";
import { layoutApi } from "@/lib/api/propertyLayout";
import inspectionApi from "@/lib/api/inspection";
import type { PropertyResponse, LandlordDto, TenancyDto, TenantDto, LookupDto, UserResponse } from "@/types/api";
import { InspectionStatus, InspectionType } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, ArrowLeft, Bell, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";

export default function PropertyDetail({ id }: { id: string }) {
  const [data, setData] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [layoutName, setLayoutName] = useState<string>("");
  const [inspectionTypes, setInspectionTypes] = useState<LookupDto[]>([]);
  const [inspectionStatuses, setInspectionStatuses] = useState<LookupDto[]>([]);
  const [inspectors, setInspectors] = useState<UserResponse[]>([]);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    inspectionType: InspectionType.Entry,
    inspectorId: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    inspectionTime: "09:00",
  });
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const router = useRouter();

  const load = async () => {
    setLoading(true); setError("");
    try {
      const p = await propertyApi.getById(id);
      setData(p);
      setForm({
        address1: p.address1,
        address2: p.address2 || "",
        cityOrSuburb: p.cityOrSuburb,
        postcode: p.postcode,
        keyNo: p.keyNo || "",
        alarmCode: p.alarmCode || "",
        propertyNotes: p.propertyNotes || "",
      });
      if (p.propertyLayoutId) {
        try {
          const layout = await layoutApi.getById(p.propertyLayoutId);
          setLayoutName(layout.name || `Layout #${p.propertyLayoutId}`);
        } catch {
          setLayoutName(`Layout #${p.propertyLayoutId}`);
        }
      } else {
        setLayoutName("");
      }
    } catch (e: any) {
      const errorData = e?.response?.data;
      const errorMessage = typeof errorData === 'object'
        ? (errorData.title || errorData.message || JSON.stringify(errorData))
        : (errorData || e?.message || "Failed to load property");
      setError(errorMessage);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  useEffect(() => {
    const loadInspectionLookup = async () => {
      try {
        const [types, statuses, inspectorsList] = await Promise.all([
          inspectionApi.getInspectionTypes(),
          inspectionApi.getInspectionStatuses(),
          inspectionApi.getAvailableInspectors(),
        ]);
        setInspectionTypes(types || []);
        setInspectionStatuses(statuses || []);
        setInspectors(inspectorsList || []);
      } catch {
        // Keep silent; creation modal will still render with empty lookups.
      }
    };
    loadInspectionLookup();
  }, []);

  const getInspectorDisplayName = (inspector: any): string => {
    const first = (inspector.firstName || inspector.FirstName || '').toString().trim();
    const last = (inspector.lastName || inspector.LastName || '').toString().trim();
    if (first || last) return `${first} ${last}`.trim();
    if (inspector.username) return inspector.username;
    if (inspector.email) return inspector.email;
    return 'User';
  };

  const save = async () => {
    if (!data) return;
    setLoading(true); setError("");
    try {
      await propertyApi.update(data.id, {
        address1: form.address1,
        address2: form.address2 || undefined,
        cityOrSuburb: form.cityOrSuburb,
        stateLookupId: data.stateLookupId,
        postcode: form.postcode,
        type: data.type,
        propertyManagerId: data.propertyManagerId,
        inspectionFrequencyType: data.inspectionFrequencyType,
        inspectionFrequencyNumber: data.inspectionFrequencyNumber,
        keyNo: form.keyNo || undefined,
        alarmCode: form.alarmCode || undefined,
        propertyNotes: form.propertyNotes || undefined,
        propertyLayoutId: data.propertyLayoutId || undefined,
      } as any);
      setEditing(false);
      await load();
    } catch (e: any) {
      const errorData = e?.response?.data;
      const errorMessage = typeof errorData === 'object'
        ? (errorData.title || errorData.message || JSON.stringify(errorData))
        : (errorData || e?.message || "Failed to save");
      setError(errorMessage);
      setLoading(false);
    }
  };

  const createInspection = async () => {
    if (!data) return;
    if (!inspectionForm.inspectorId) {
      setError("Please select an inspector.");
      return;
    }
    setInspectionLoading(true);
    setError("");
    try {
      await inspectionApi.create({
        propertyId: data.id,
        inspectionType: Number(inspectionForm.inspectionType),
        inspectionStatus: InspectionStatus.Pending,
        inspectorId: String(inspectionForm.inspectorId),
        inspectionDate: inspectionForm.inspectionDate,
        inspectionTime: inspectionForm.inspectionTime,
      } as any);
      setShowCreateInspection(false);
      setInspectionForm((prev) => ({
        ...prev,
        inspectionType: InspectionType.Entry,
        inspectorId: "",
        inspectionDate: new Date().toISOString().split("T")[0],
        inspectionTime: "09:00",
      }));
    } catch (e: any) {
      const errorData = e?.response?.data;
      const errorMessage = typeof errorData === 'object'
        ? (errorData.title || errorData.message || JSON.stringify(errorData))
        : (errorData || e?.message || "Failed to create inspection");
      setError(errorMessage);
    } finally {
      setInspectionLoading(false);
    }
  };

  if (loading && !data) return <div className="p-6">Loading...</div>;
  if (error && !data) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center" onClick={() => router.push('/dashboard')} aria-label="Back to properties">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">PropertyInspect</p>
              <p className="text-xs text-muted-foreground">Property details</p>
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
                    <p className="text-xs leading-none text-muted-foreground">Viewing Property #{data.id}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Property #{data.id}</h1>
          {!editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowCreateInspection(true)}>New Inspection</Button>
              <Button onClick={() => setEditing(true)}>Edit</Button>
            </div>
          ) : (
            <div className="space-x-2">
              <Button onClick={save} disabled={loading}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          )}
        </div>

        {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Quick Actions</CardTitle>
            <CardDescription>Create inspections directly from this property</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setShowCreateInspection(true)}>Create New Inspection</Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Basic Information</CardTitle>
            <CardDescription>Core details of the property</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Address</Label>
              <Input disabled={!editing} value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} />
            </div>
            <div>
              <Label>Address 2</Label>
              <Input disabled={!editing} value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} />
            </div>
            <div>
              <Label>City/Suburb</Label>
              <Input disabled={!editing} value={form.cityOrSuburb} onChange={(e) => setForm({ ...form, cityOrSuburb: e.target.value })} />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input disabled={!editing} value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
            </div>
            <div>
              <Label>Key No</Label>
              <Input disabled={!editing} value={form.keyNo} onChange={(e) => setForm({ ...form, keyNo: e.target.value })} />
            </div>
            <div>
              <Label>Alarm Code</Label>
              <Input disabled={!editing} value={form.alarmCode} onChange={(e) => setForm({ ...form, alarmCode: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Input disabled={!editing} value={form.propertyNotes} onChange={(e) => setForm({ ...form, propertyNotes: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Layout</CardTitle>
            <CardDescription>{data.propertyLayoutId ? layoutName : "No layout linked"}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.propertyLayoutId ? (
              <div className="text-sm text-muted-foreground">Layout ID: {data.propertyLayoutId}</div>
            ) : (
              <div className="text-sm text-muted-foreground">You can link a layout from the creation wizard.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Landlords ({data.landlords.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.landlords.map((l: LandlordDto) => (
              <div key={l.id} className="text-sm">{l.name} • {l.email}{l.phone ? ` • ${l.phone}` : ''}</div>
            ))}
            {data.landlords.length === 0 && <div className="text-sm text-muted-foreground">No landlords.</div>}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Tenancies ({data.tenancies.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tenancies.map((t: TenancyDto) => (
              <div key={t.id} className="text-sm">
                <div className="font-medium">{t.fullName} • {t.email}</div>
                <div className="text-muted-foreground">{new Date(t.leaseStartDate).toLocaleString()} → {new Date(t.leaseEndDate).toLocaleString()}</div>
                <div className="text-muted-foreground">Rent: <span>${t.currentRentAmount}</span> {t.rentFrequency}</div>
                <div className="mt-2 ml-4 space-y-1">
                  {(t.tenants || []).map((tn: TenantDto) => (
                    <div key={tn.id} className="text-xs">- {tn.firstName} {tn.lastName} • {tn.email}{tn.phone ? ` • ${tn.phone}` : ''}</div>
                  ))}
                  {(!t.tenants || t.tenants.length === 0) && <div className="text-xs text-muted-foreground">No tenants.</div>}
                </div>
              </div>
            ))}
            {data.tenancies.length === 0 && <div className="text-sm text-muted-foreground">No tenancies.</div>}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showCreateInspection} onClose={() => setShowCreateInspection(false)} title="Create Inspection">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Creating inspection for: <span className="font-semibold text-foreground">{data.address1}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Inspector</Label>
              <select
                className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
                value={inspectionForm.inspectorId}
                onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorId: e.target.value })}
              >
                <option value="">Select inspector</option>
                {inspectors.map((inspector) => (
                  <option
                    key={String(inspector.id ?? inspector.identityUserId ?? '')}
                    value={String(inspector.id ?? inspector.identityUserId ?? '')}
                  >
                    {getInspectorDisplayName(inspector)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Inspection Type</Label>
              <select
                className="h-11 w-full rounded-md border border-border bg-white px-3 py-2"
                value={inspectionForm.inspectionType}
                onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionType: parseInt(e.target.value) as any })}
              >
                {inspectionTypes.map((t) => (
                  <option key={String(t.id)} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Inspection Date</Label>
              <Input
                type="date"
                value={inspectionForm.inspectionDate}
                onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Inspection Time</Label>
              <Input
                type="time"
                value={inspectionForm.inspectionTime}
                onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionTime: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateInspection(false)}>Cancel</Button>
            <Button onClick={createInspection} disabled={inspectionLoading}>
              {inspectionLoading ? "Creating..." : "Create Inspection"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

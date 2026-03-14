"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Palette, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  Upload,
  Eye,
  EyeOff
} from "lucide-react";
import { agencyApi } from "@/lib/api/agency";
import { AgencyResponse, AgencyWhitelabelResponse } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { referenceApi } from "@/lib/api/reference";

const AgencySettings: React.FC = () => {
  const { effectiveAgencyId } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'whitelabel'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Agency Details State
  const [agencyDetails, setAgencyDetails] = useState<AgencyResponse | null>(null);
  const [detailsForm, setDetailsForm] = useState<Partial<AgencyResponse>>({});
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [timezones, setTimezones] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState<{ countries: boolean; states: boolean; timezones: boolean }>({ countries: false, states: false, timezones: false });
  
  // Whitelabel State
  const [whitelabelSettings, setWhitelabelSettings] = useState<Partial<AgencyWhitelabelResponse & {
    agencyNameColor?: string;
    addressColor?: string;
    accentFontFamily?: string;
  }>>({
    agencyNameColor: "#003B73",
    addressColor: "#003B73",
    accentColor: "#10B981",
    accentFontFamily: "Arial, sans-serif",
    logoUrl: "/assets/default-logo.png",
    primaryColor: "#003B73",
    secondaryColor: "#EF4444",
    fontFamily: "Arial, sans-serif",
  });
  const [whitelabelId, setWhitelabelId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Load agency details on component mount
  useEffect(() => {
    if (effectiveAgencyId) {
      loadAgencyDetails();
      loadWhitelabelSettings();
    }
  }, [effectiveAgencyId]);

  // Load countries on details tab mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLookupLoading((p) => ({ ...p, countries: true }));
        const list = await referenceApi.getCountries();
        setCountries(list);
      } catch {}
      finally {
        setLookupLoading((p) => ({ ...p, countries: false }));
      }
    };
    loadCountries();
  }, []);

  // Load states/timezones when country changes
  useEffect(() => {
    const cid = (detailsForm as any).countryId as number | undefined;
    const loadByCountry = async () => {
      if (!cid) {
        setStates([]);
        setTimezones([]);
        return;
      }
      try {
        setLookupLoading((p) => ({ ...p, states: true, timezones: true }));
        const [s, tz] = await Promise.all([
          referenceApi.getStatesByCountry(cid),
          referenceApi.getTimezonesByCountry(cid),
        ]);
        setStates(s);
        setTimezones(tz);
      } catch {
        setStates([]);
        setTimezones([]);
      } finally {
        setLookupLoading((p) => ({ ...p, states: false, timezones: false }));
      }
    };
    loadByCountry();
  }, [(detailsForm as any).countryId]);

  const loadAgencyDetails = async () => {
    const agencyId = effectiveAgencyId;
    if (!agencyId) return;
    
    try {
      setLoading(true);
      setError(null);
      const details = await agencyApi.getById(agencyId);
      setAgencyDetails(details);
      setDetailsForm({
        ...details,
        countryId: (details as any).countryId,
        stateId: (details as any).stateId,
        timeZoneId: (details as any).timeZoneId,
      });
    } catch (err) {
      setError("Failed to load agency details. Please try again.");
      console.error("Error loading agency details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadWhitelabelSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await agencyApi.getWhitelabel();
      setWhitelabelSettings(settings as any);
      const wid = (settings as any)?.whitelabelId ?? (settings as any)?.WhitelabelId ?? null;
      if (wid != null) setWhitelabelId(Number(wid));
    } catch (err) {
      setError("Failed to load whitelabel settings. Please try again.");
      console.error("Error loading whitelabel settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const agencyId = effectiveAgencyId;
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);
      await agencyApi.update(agencyId, detailsForm as any);
      setSuccess("Agency details updated successfully!");
      await loadAgencyDetails();
    } catch (err) {
      setError("Failed to update agency details. Please try again.");
      console.error("Error updating agency details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWhitelabel = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      const id = whitelabelId ?? 1; // default to 1 if not provided
      const updated = await agencyApi.updateWhitelabel(id, whitelabelSettings as any);
      setWhitelabelSettings(updated as any);
      const newId = (updated as any)?.whitelabelId ?? (updated as any)?.WhitelabelId ?? id;
      setWhitelabelId(Number(newId));
      setSuccess("Whitelabel settings updated successfully!");
    } catch (err) {
      setError("Failed to update whitelabel settings. Please try again.");
      console.error("Error updating whitelabel settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (field: 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'textColor', color: string) => {
    setWhitelabelSettings(prev => ({
      ...prev,
      [field]: color
    }));
  };

  const tabs = [
    { id: 'details', label: 'Agency Details', icon: Building2 },
    { id: 'whitelabel', label: 'Whitelabel Settings', icon: Palette }
  ];

  if (loading && !agencyDetails) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading agency settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-visible">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Agency Settings</h2>
          <p className="text-gray-600">Manage your agency details and branding</p>
        </div>
        {success && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-md">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">{success}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'details' | 'whitelabel')}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Agency Details Tab */}
      {activeTab === 'details' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Agency Details
                </CardTitle>
                <CardDescription>
                  Manage your agency's complete information and contact details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {agencyDetails && (
              <form onSubmit={handleUpdateDetails} className="space-y-8">
                {/* Basic Details (mirrors create form) */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label>Agency Name *</Label>
                      <Input value={detailsForm.legalBusinessName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, legalBusinessName: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Legal Business Name</Label>
                      <Input value={(detailsForm as any).legalBusinessName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, legalBusinessName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Primary Address *</Label>
                      <Input value={detailsForm.address || ''} onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Postcode</Label>
                      <Input value={detailsForm.postcode || ''} onChange={(e) => setDetailsForm({ ...detailsForm, postcode: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={detailsForm.phoneNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, phoneNumber: e.target.value })} />
                    </div>
                    <div>
                      <Label>Fax Number</Label>
                      <Input value={(detailsForm as any).faxNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, faxNumber: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Company Website</Label>
                      <Input value={(detailsForm as any).companyWebsite || ''} onChange={(e) => setDetailsForm({ ...detailsForm, companyWebsite: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <select className="h-11 w-full rounded-md border border-border bg-white px-3 py-2" value={(detailsForm as any).countryId || ''}
                        onChange={(e) => {
                          const val = e.target.value || undefined;
                          setDetailsForm({ ...detailsForm, countryId: val, stateId: undefined, timeZoneId: undefined } as any);
                        }}>
                        <option value="" disabled>{lookupLoading.countries ? 'Loading countries…' : 'Select country'}</option>
                        {countries.map((c) => (<option key={c.countryId} value={c.countryId}>{c.name}</option>))}
                      </select>
                  </div>
                    <div>
                      <Label>State</Label>
                      <select className="h-11 w-full rounded-md border border-border bg-white px-3 py-2" value={(detailsForm as any).stateId || ''}
                        onChange={(e) => setDetailsForm({ ...detailsForm, stateId: e.target.value || undefined } as any)}
                        disabled={!((detailsForm as any).countryId) || lookupLoading.states}>
                        <option value="" disabled>{!((detailsForm as any).countryId) ? 'Select country first' : (lookupLoading.states ? 'Loading states…' : 'Select state')}</option>
                        {states.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                      </select>
                </div>
                    <div>
                      <Label>Suburb</Label>
                      <Input value={detailsForm.suburb || ''} onChange={(e) => setDetailsForm({ ...detailsForm, suburb: e.target.value })} />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input value={detailsForm.city || ''} onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })} />
                    </div>
                    <div>
                      <Label>Time Zone</Label>
                      <select className="h-11 w-full rounded-md border border-border bg-white px-3 py-2" value={(detailsForm as any).timeZoneId || ''}
                        onChange={(e) => setDetailsForm({ ...detailsForm, timeZoneId: e.target.value || undefined } as any)}
                        disabled={!((detailsForm as any).countryId) || lookupLoading.timezones}>
                        <option value="" disabled>{!((detailsForm as any).countryId) ? 'Select country first' : (lookupLoading.timezones ? 'Loading timezones…' : 'Select timezone')}</option>
                        {timezones.map((t) => (<option key={t.id} value={t.id}>{t.displayName}</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Main contact */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Main contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label>Contact Person First Name</Label>
                      <Input value={(detailsForm as any).contactPersonFirstName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, contactPersonFirstName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Contact Person Last Name</Label>
                      <Input value={(detailsForm as any).contactPersonLastName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, contactPersonLastName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Contact Person Phone</Label>
                      <Input value={detailsForm.contactPersonPhone || ''} onChange={(e) => setDetailsForm({ ...detailsForm, contactPersonPhone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Contact Person Job Title</Label>
                      <Input value={(detailsForm as any).contactPersonJobTitle || ''} onChange={(e) => setDetailsForm({ ...detailsForm, contactPersonJobTitle: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Contact Person Fax Number</Label>
                      <Input value={(detailsForm as any).contactPersonFaxNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, contactPersonFaxNumber: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Contact Person Email</Label>
                      <Input type="email" value={detailsForm.contactPersonEmail || ''} onChange={(e) => setDetailsForm({ ...detailsForm, contactPersonEmail: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Billing Details */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label>Billing Contact First Name</Label>
                      <Input value={(detailsForm as any).billingContactFirstName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, billingContactFirstName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Billing Contact Last Name</Label>
                      <Input value={(detailsForm as any).billingContactLastName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, billingContactLastName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Billing Phone Number</Label>
                      <Input value={(detailsForm as any).billingPhoneNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, billingPhoneNumber: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Billing Contact Job Title</Label>
                      <Input value={(detailsForm as any).billingContactJobTitle || ''} onChange={(e) => setDetailsForm({ ...detailsForm, billingContactJobTitle: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Billing Fax Number</Label>
                      <Input value={(detailsForm as any).billingFaxNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, billingFaxNumber: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Billing Contact Email</Label>
                      <Input type="email" value={(detailsForm as any).billingContactEmail || ''} onChange={(e) => setDetailsForm({ ...detailsForm, billingContactEmail: e.target.value as any })} />
                    </div>
                  </div>
                </div>

                {/* Technical Contact */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Technical Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label>Technical Contact First Name</Label>
                      <Input value={(detailsForm as any).technicalContactFirstName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, technicalContactFirstName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Technical Contact Last Name</Label>
                      <Input value={(detailsForm as any).technicalContactLastName || ''} onChange={(e) => setDetailsForm({ ...detailsForm, technicalContactLastName: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Technical Phone Number</Label>
                      <Input value={(detailsForm as any).technicalPhoneNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, technicalPhoneNumber: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Technical Contact Job Title</Label>
                      <Input value={(detailsForm as any).technicalContactJobTitle || ''} onChange={(e) => setDetailsForm({ ...detailsForm, technicalContactJobTitle: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Technical Contact Fax Number</Label>
                      <Input value={(detailsForm as any).technicalContactFaxNumber || ''} onChange={(e) => setDetailsForm({ ...detailsForm, technicalContactFaxNumber: e.target.value as any })} />
                    </div>
                    <div>
                      <Label>Technical Contact Email</Label>
                      <Input type="email" value={(detailsForm as any).technicalContactEmail || ''} onChange={(e) => setDetailsForm({ ...detailsForm, technicalContactEmail: e.target.value as any })} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Whitelabel Settings Tab */}
      {activeTab === 'whitelabel' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Whitelabel Settings
                  </CardTitle>
                  <CardDescription>
                    Configure branding for your agency
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateWhitelabel} className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Branding</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label>Logo URL</Label>
                      <Input value={whitelabelSettings.logoUrl || ''} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, logoUrl: e.target.value })} />
                    </div>
                    <div>
                      <Label>Primary Color</Label>
                      <Input type="color" value={whitelabelSettings.primaryColor || '#003B73'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, primaryColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Secondary Color</Label>
                      <Input type="color" value={whitelabelSettings.secondaryColor || '#EF4444'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, secondaryColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Accent Color</Label>
                      <Input type="color" value={whitelabelSettings.accentColor || '#10B981'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, accentColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Agency Name Color</Label>
                      <Input type="color" value={(whitelabelSettings as any).agencyNameColor || '#003B73'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, agencyNameColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Address Color</Label>
                      <Input type="color" value={(whitelabelSettings as any).addressColor || '#003B73'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, addressColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Font Family</Label>
                      <Input value={whitelabelSettings.fontFamily || 'Arial, sans-serif'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, fontFamily: e.target.value })} />
                    </div>
                    <div>
                      <Label>Accent Font Family</Label>
                      <Input value={(whitelabelSettings as any).accentFontFamily || 'Arial, sans-serif'} onChange={(e) => setWhitelabelSettings({ ...whitelabelSettings, accentFontFamily: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Whitelabel Settings'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AgencySettings;


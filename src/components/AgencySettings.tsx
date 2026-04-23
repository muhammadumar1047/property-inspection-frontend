"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
const RTFEditor = dynamic(() => import('./RTFEditor'), { ssr: false });
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
  EyeOff,
  Mail,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft
} from "lucide-react";
import { agencyApi } from "@/lib/api/agency";
import { AgencyResponse, AgencyWhitelabelResponse } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { referenceApi } from "@/lib/api/reference";
import EmailTemplatePreview from "./EmailTemplatePreview";

const EMAIL_BODY_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image', 'clean']
  ]
};

const SIGNATURE_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }],
    ['link', 'image', 'clean']
  ]
};

interface EmailTemplate {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  content: string;
  logoUrl?: string;
  signature?: string;
}

type AgencySettingsTab = 'details' | 'whitelabel' | 'email-templates';

interface AgencySettingsProps {
  view?: 'agency' | 'email-templates';
}

const AgencySettings: React.FC<AgencySettingsProps> = ({ view = 'agency' }) => {
  const { effectiveAgencyId } = useAuth();
  const [activeTab, setActiveTab] = useState<AgencySettingsTab>(
    view === 'email-templates' ? 'email-templates' : 'details'
  );
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

  // Email Template State
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: '1',
      name: 'Default Inspection Report',
      primaryColor: "#003B73",
      secondaryColor: "#EF4444",
      fontFamily: "Arial, sans-serif",
      logoUrl: "",
      signature: `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          Best regards,<br>
          <strong>Property Inspection Agency</strong>
        </div>
      `,
      content: `
        <h1 style="color: #003B73; margin-top: 0;">Property Inspection Report</h1>
        <p>Dear {{LandlordName}},</p>
        <p>An inspection has been completed for your property at {{PropertyAddress}}.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ReportLink}}" style="background-color: #EF4444; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Full Inspection Report</a>
        </div>
      `,
    }
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<EmailTemplate>>({});
  const quillRef = useRef<any>(null);
  const signatureQuillRef = useRef<any>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [emailPreviewData] = useState({
    reportLink: "https://example.com/report/123",
    landlordName: "John Doe",
    propertyAddress: "123 Main St, Sydney NSW 2000",
    tenantName: "Jane Smith",
    propertyDetails: "3 Bed, 2 Bath, 1 Parking",
    landlordDetails: "john.doe@example.com | 0412 345 678",
    tenantDetails: "jane.smith@example.com | 0498 765 432",
    inspectionDetails: "Routine Inspection conducted on 24 Mar 2026 at 10:00 AM. Overall property is well maintained."
  });

  // Load agency details on component mount
  useEffect(() => {
    if (effectiveAgencyId) {
      loadAgencyDetails();
      loadWhitelabelSettings();
    }
  }, [effectiveAgencyId]);

  useEffect(() => {
    setActiveTab(view === 'email-templates' ? 'email-templates' : 'details');
  }, [view]);

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
      
      // Seed default template from whitelabel if available
      if (settings) {
        setTemplates(prev => prev.map(t => t.id === '1' ? {
          ...t,
          primaryColor: (settings as any).primaryColor || "#003B73",
          secondaryColor: (settings as any).secondaryColor || "#EF4444",
          fontFamily: (settings as any).fontFamily || "Arial, sans-serif",
        } : t));
      }
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
      const updated = await agencyApi.updateWhitelabel(String(id), whitelabelSettings as any);
      setWhitelabelSettings(updated as any);
      const newId = (updated as any)?.whitelabelId ?? (updated as any)?.WhitelabelId ?? id;
      setWhitelabelId(Number(newId));
      
      // Update default template as well as they share colors
      if (updated) {
        setTemplates(prev => prev.map(t => t.id === '1' ? {
          ...t,
          primaryColor: (updated as any).primaryColor || (updated as any).PrimaryColor || "#003B73",
          secondaryColor: (updated as any).secondaryColor || (updated as any).SecondaryColor || "#EF4444",
          fontFamily: (updated as any).fontFamily || (updated as any).FontFamily || "Arial, sans-serif",
        } : t));
      }
      
      setSuccess("Whitelabel settings updated successfully!");
    } catch (err) {
      setError("Failed to update whitelabel settings. Please try again.");
      console.error("Error updating whitelabel settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name) {
      setError("Template name is required.");
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      if (selectedTemplateId) {
        // Update existing
        setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, ...templateForm } as EmailTemplate : t));
      } else {
        // Create new
        const newTemplate: EmailTemplate = {
          id: Date.now().toString(),
          name: templateForm.name || 'New Template',
          primaryColor: templateForm.primaryColor || '#003B73',
          secondaryColor: templateForm.secondaryColor || '#EF4444',
          fontFamily: templateForm.fontFamily || 'Arial, sans-serif',
          content: templateForm.content || '',
          logoUrl: templateForm.logoUrl || '',
          signature: templateForm.signature || '',
        };
        setTemplates(prev => [...prev, newTemplate]);
      }
      setSuccess("Email template saved successfully!");
      setIsEditingTemplate(false);
      setSelectedTemplateId(null);
      setLoading(false);
    }, 500);
  };

  const handleCreateNewTemplate = () => {
    setTemplateForm({
      name: '',
      primaryColor: whitelabelSettings.primaryColor || "#003B73",
      secondaryColor: whitelabelSettings.secondaryColor || "#EF4444",
      fontFamily: whitelabelSettings.fontFamily || "Arial, sans-serif",
      logoUrl: whitelabelSettings.logoUrl || "",
      signature: "",
      content: "",
    });
    setSelectedTemplateId(null);
    setIsEditingTemplate(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setTemplateForm(template);
    setSelectedTemplateId(template.id);
    setIsEditingTemplate(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      setSuccess("Template deleted successfully!");
    }
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    let focusRef = quillRef;
    if (signatureQuillRef.current && signatureQuillRef.current.getEditor().hasFocus()) {
      focusRef = signatureQuillRef;
    }
    
    if (focusRef.current) {
      const editor = focusRef.current.getEditor();
      const range = editor.getSelection();
      const index = range ? range.index : editor.getLength();
      
      editor.insertText(index, placeholder);
      
      // Make placeholder visually distinguishable
      editor.formatText(index, placeholder.length, {
        color: '#1e40af', 
        background: '#dbeafe',
        bold: true
      });
      
      // Reset format for subsequent typing and move cursor
      editor.setSelection(index + placeholder.length, 0);
      editor.format('color', false);
      editor.format('background', false);
      editor.format('bold', false);
    }
  };

  const handleColorChange = (field: 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'textColor', color: string) => {
    setWhitelabelSettings(prev => ({
      ...prev,
      [field]: color
    }));
  };

  const tabs: Array<{ id: AgencySettingsTab; label: string; icon: any }> = [
    { id: 'details', label: 'Agency Details', icon: Building2 },
    { id: 'whitelabel', label: 'Whitelabel Settings', icon: Palette },
    { id: 'email-templates', label: 'Email Templates', icon: Mail }
  ];
  const visibleTabs = view === 'email-templates'
    ? tabs.filter((tab) => tab.id === 'email-templates')
    : tabs.filter((tab) => tab.id !== 'email-templates');

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
          <h2 className="text-2xl font-bold">{view === 'email-templates' ? 'Email Templates' : 'Agency Settings'}</h2>
          <p className="text-gray-600">
            {view === 'email-templates'
              ? 'Create and manage inspection email templates'
              : 'Manage your agency details and branding'}
          </p>
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
      {visibleTabs.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
      )}

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
      {/* Email Templates Tab */}
      {activeTab === 'email-templates' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {isEditingTemplate ? (selectedTemplateId ? 'Edit Template' : 'Create New Template') : 'Email Templates'}
                  </CardTitle>
                  <CardDescription>
                    {isEditingTemplate 
                      ? 'Customize the appearance of your inspection report email' 
                      : 'Manage multiple email templates for your property inspections'}
                  </CardDescription>
                </div>
                {!isEditingTemplate && (
                  <Button onClick={handleCreateNewTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                )}
                {isEditingTemplate && (
                  <Button variant="ghost" onClick={() => setIsEditingTemplate(false)}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to List
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isEditingTemplate ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map(template => (
                    <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg">{template.name}</h4>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditTemplate(template)} className="p-1 hover:bg-gray-100 rounded text-blue-600">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteTemplate(template.id)} className="p-1 hover:bg-gray-100 rounded text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: template.primaryColor }} title="Primary Color" />
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: template.secondaryColor }} title="Secondary Color" />
                          <span className="text-xs text-gray-400 self-center">{template.fontFamily}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleEditTemplate(template)}>
                        Preview & Edit
                      </Button>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed rounded-lg">
                      No templates found. Create your first template to get started.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Customization Controls */}
                  <div className="lg:col-span-2">
                    <form onSubmit={handleUpdateEmailSettings} className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                      <div>
                        <Label>Template Name *</Label>
                        <Input 
                          placeholder="e.g. Standard Routine Inspection"
                          value={templateForm.name || ''} 
                          onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} 
                          required
                        />
                      </div>
                      
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider pt-2">Appearance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Header Color (Primary)</Label>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              type="color" 
                              className="w-12 h-10 p-1"
                              value={templateForm.primaryColor} 
                              onChange={(e) => setTemplateForm({ ...templateForm, primaryColor: e.target.value })} 
                            />
                            <Input 
                              type="text" 
                              value={templateForm.primaryColor} 
                              onChange={(e) => setTemplateForm({ ...templateForm, primaryColor: e.target.value })} 
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Button Color (Secondary)</Label>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              type="color" 
                              className="w-12 h-10 p-1"
                              value={templateForm.secondaryColor} 
                              onChange={(e) => setTemplateForm({ ...templateForm, secondaryColor: e.target.value })} 
                            />
                            <Input 
                              type="text" 
                              value={templateForm.secondaryColor} 
                              onChange={(e) => setTemplateForm({ ...templateForm, secondaryColor: e.target.value })} 
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Font Family</Label>
                          <select 
                            className="h-11 w-full rounded-md border border-border bg-white px-3 py-2 mt-1"
                            value={templateForm.fontFamily}
                            onChange={(e) => setTemplateForm({ ...templateForm, fontFamily: e.target.value })}
                          >
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                            <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman</option>
                            <option value="Georgia, serif">Georgia</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Logo URL</Label>
                          <Input 
                            placeholder="https://example.com/logo.png"
                            value={templateForm.logoUrl || ''} 
                            onChange={(e) => setTemplateForm({ ...templateForm, logoUrl: e.target.value })} 
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider pt-4">Email Body Content</h4>
                      <p className="text-xs text-gray-500 mb-2 italic">Customize the entire email body below. Font family choice will only be applied to this content.</p>
                      
                      <div>
                        <div className="bg-white rounded-md border min-h-[400px]">
                          <RTFEditor 
                            ref={quillRef}
                            theme="snow"
                            value={templateForm.content || ''} 
                            onChange={(val: string) => setTemplateForm(prev => ({ ...prev, content: val }))} 
                            style={{ minHeight: '350px', marginBottom: '45px' }}
                            modules={EMAIL_BODY_MODULES}
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider pt-4">Email Signature</h4>
                      <p className="text-xs text-gray-500 mb-2 italic">Customize the signature appended to the bottom of the email.</p>
                      
                      <div>
                        <div className="bg-white rounded-md border min-h-[250px]">
                          <RTFEditor 
                            ref={signatureQuillRef}
                            theme="snow"
                            value={templateForm.signature || ''} 
                            onChange={(val: string) => setTemplateForm(prev => ({ ...prev, signature: val }))} 
                            style={{ minHeight: '200px', marginBottom: '45px' }}
                            modules={SIGNATURE_MODULES}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setPreviewModalOpen(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Template
                      </Button>
                      <Button type="submit" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Template'}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Placeholders side col */}
                <div className="space-y-6">
                  <div className="sticky top-6">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wider">Dynamic Content Placeholders</h4>
                      <p className="text-xs text-blue-800 mb-4">Click a tag below to insert it at the cursor's location in either editor:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { tag: '{{ReportLink}}', label: 'Report Link' },
                          { tag: '{{LandlordName}}', label: 'Landlord Name' },
                          { tag: '{{PropertyAddress}}', label: 'Property Address' },
                          { tag: '{{TenantName}}', label: 'Tenant Name' },
                          { tag: '{{PropertyDetails}}', label: 'Property Details' },
                          { tag: '{{LandlordDetails}}', label: 'Landlord Details' },
                          { tag: '{{TenantDetails}}', label: 'Tenant Details' },
                          { tag: '{{InspectionDetails}}', label: 'Inspection Details' }
                        ].map(item => (
                          <button 
                            key={item.tag} 
                            type="button"
                            onClick={() => handleInsertPlaceholder(item.tag)}
                            className="bg-white px-3 py-1.5 rounded-full border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-white border-b">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5 text-gray-500" />
                Template Preview
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewModalOpen(false)}>
                ✕
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 h-full relative relative">
              <EmailTemplatePreview 
                styles={{
                  primaryColor: templateForm.primaryColor || '#003B73',
                  secondaryColor: templateForm.secondaryColor || '#EF4444',
                  fontFamily: templateForm.fontFamily || 'Arial, sans-serif'
                }} 
                content={templateForm.content}
                logoUrl={templateForm.logoUrl}
                signature={templateForm.signature}
                data={emailPreviewData} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencySettings;


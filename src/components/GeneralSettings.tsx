"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Save, Shield, Bell, Globe, UserCircle2, Building2, KeyRound } from "lucide-react";

type NotificationState = {
  emailReports: boolean;
  systemAlerts: boolean;
  billingUpdates: boolean;
  marketingTips: boolean;
};

const GeneralSettings: React.FC = () => {
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@easeinspect.com",
    phone: "+61 412 345 678",
    jobTitle: "Operations Manager",
  });

  const [company, setCompany] = useState({
    companyName: "EaseInspect",
    website: "https://easeinspect.com",
    supportEmail: "support@easeinspect.com",
    address: "Level 8, 100 Market Street, Sydney NSW 2000",
    abn: "12 345 678 901",
  });

  const [preferences, setPreferences] = useState({
    timezone: "Australia/Sydney",
    language: "en-AU",
    dateFormat: "DD/MM/YYYY",
    theme: "System",
    startOfWeek: "Monday",
  });

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: true,
    forcePasswordRotation: false,
  });

  const [notifications, setNotifications] = useState<NotificationState>({
    emailReports: true,
    systemAlerts: true,
    billingUpdates: true,
    marketingTips: false,
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const initials = useMemo(() => {
    const first = profile.firstName?.[0] ?? "";
    const last = profile.lastName?.[0] ?? "";
    return `${first}${last}`.toUpperCase() || "U";
  }, [profile.firstName, profile.lastName]);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage(null);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSaving(false);
    setSaveMessage("General settings saved successfully.");
  };

  const handlePasswordUpdate = async () => {
    if (!security.newPassword || security.newPassword !== security.confirmPassword) {
      setSaveMessage("Password confirmation does not match.");
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSaving(false);
    setSecurity((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
    setSaveMessage("Password updated successfully.");
  };

  const updateNotification = (key: keyof NotificationState, checked: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
          <p className="text-gray-600">Manage your account profile, preferences, notifications, and security.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {saveMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {saveMessage}
        </div>
      )}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle2 className="h-5 w-5 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Personal profile and organization details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src="" alt="Profile avatar" />
              <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
            <Button variant="outline" size="sm">Change Avatar</Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Profile Information</h3>
            <div className="responsive-grid-3">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" value={profile.jobTitle} onChange={(e) => setProfile((p) => ({ ...p, jobTitle: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              <Building2 className="h-4 w-4" />
              Company Details
            </h3>
            <div className="responsive-grid-3">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={company.companyName} onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={company.website} onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" type="email" value={company.supportEmail} onChange={(e) => setCompany((c) => ({ ...c, supportEmail: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Business Address</Label>
                <Input id="address" value={company.address} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="abn">ABN / Registration Number</Label>
                <Input id="abn" value={company.abn} onChange={(e) => setCompany((c) => ({ ...c, abn: e.target.value }))} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="responsive-grid-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription>Locale and interface defaults.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={preferences.timezone}
                onChange={(e) => setPreferences((p) => ({ ...p, timezone: e.target.value }))}
              >
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Australia/Melbourne">Australia/Melbourne</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New York</option>
              </select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={preferences.language}
                onChange={(e) => setPreferences((p) => ({ ...p, language: e.target.value }))}
              >
                <option value="en-AU">English (Australia)</option>
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="dateFormat">Date Format</Label>
              <select
                id="dateFormat"
                className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={preferences.dateFormat}
                onChange={(e) => setPreferences((p) => ({ ...p, dateFormat: e.target.value }))}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <Label htmlFor="startOfWeek">Start of Week</Label>
              <select
                id="startOfWeek"
                className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={preferences.startOfWeek}
                onChange={(e) => setPreferences((p) => ({ ...p, startOfWeek: e.target.value }))}
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="theme">Theme Preference</Label>
              <select
                id="theme"
                className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={preferences.theme}
                onChange={(e) => setPreferences((p) => ({ ...p, theme: e.target.value }))}
              >
                <option value="System">System Default</option>
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Choose which updates you receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "emailReports", title: "Inspection Report Emails", description: "Receive outgoing report delivery and failure notifications." },
              { key: "systemAlerts", title: "System Alerts", description: "Important platform incidents, outages, and maintenance windows." },
              { key: "billingUpdates", title: "Billing Updates", description: "Invoices, payment failures, and subscription changes." },
              { key: "marketingTips", title: "Product Tips", description: "Feature tips, release highlights, and onboarding recommendations." },
            ].map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50"
              >
                <Checkbox
                  checked={notifications[item.key as keyof NotificationState]}
                  onCheckedChange={(checked) => updateNotification(item.key as keyof NotificationState, Boolean(checked))}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                  <span className="block text-xs text-gray-500">{item.description}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Security
          </CardTitle>
          <CardDescription>Password controls and account protection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={security.currentPassword}
                onChange={(e) => setSecurity((s) => ({ ...s, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={security.newPassword}
                onChange={(e) => setSecurity((s) => ({ ...s, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={security.confirmPassword}
                onChange={(e) => setSecurity((s) => ({ ...s, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50">
              <Checkbox
                checked={security.twoFactorEnabled}
                onCheckedChange={(checked) => setSecurity((s) => ({ ...s, twoFactorEnabled: Boolean(checked) }))}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-gray-900">Enable Two-Factor Authentication</span>
                <span className="block text-xs text-gray-500">Require a second verification step at login.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50">
              <Checkbox
                checked={security.forcePasswordRotation}
                onCheckedChange={(checked) => setSecurity((s) => ({ ...s, forcePasswordRotation: Boolean(checked) }))}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-gray-900">Force Password Rotation Every 90 Days</span>
                <span className="block text-xs text-gray-500">Prompts users to regularly update account passwords.</span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={handlePasswordUpdate} disabled={saving}>
              <KeyRound className="h-4 w-4 mr-2" />
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;


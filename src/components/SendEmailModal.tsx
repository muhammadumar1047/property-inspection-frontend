"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2, Mail, Search, ChevronDown, Copy, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { emailTemplateApi, EmailTemplateResponse } from "@/lib/api/emailTemplate";
import { userApi } from "@/lib/api/user";
import { agencyApi } from "@/lib/api/agency";
import { inspectionApi } from "@/lib/api/inspection";
import type { UserResponse, InspectionType } from "@/types/api";
import axios from "axios";

const RTFEditor = dynamic(() => import("@/components/RTFEditor"), { ssr: false });

// ── Mail merge tag definitions ──────────────────────────────────────────────
interface MergeTag {
    tag: string;
    label: string;
    category: string;
}

const MAIL_MERGE_TAGS: MergeTag[] = [
    { tag: "{{ReportLink}}", label: "Report Link", category: "Inspection Details" },
    { tag: "{{LandlordName}}", label: "Landlord Name", category: "Landlord Details" },
    { tag: "{{PropertyAddress}}", label: "Property Address", category: "Property Details" },
    { tag: "{{TenantName}}", label: "Tenant Name", category: "Tenant Details" },
    { tag: "{{PropertyDetails}}", label: "Property Details", category: "Property Details" },
    { tag: "{{LandlordDetails}}", label: "Landlord Details", category: "Landlord Details" },
    { tag: "{{TenantDetails}}", label: "Tenant Details", category: "Tenant Details" },
    { tag: "{{InspectionDetails}}", label: "Inspection Details", category: "Inspection Details" },
];

// ── Props ───────────────────────────────────────────────────────────────────
interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    inspectionId: string;
    inspectionType: InspectionType;
    /** Optional: pre-fill the recipient (e.g. property manager email) */
    recipientEmail?: string;
    /** Optional: recipient display name */
    recipientName?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const mapInspectionTypeToFilter = (type: InspectionType): number => {
    // InspectionType enum: Entry=1, Exit=2, Routine=3
    return type as number;
};

const getInspectionTypeLabel = (type: InspectionType): string => {
    switch (type) {
        case 1: return "Entry Inspection";
        case 2: return "Exit Inspection";
        case 3: return "Routine Inspection";
        default: return "Inspection";
    }
};

// ── Component ───────────────────────────────────────────────────────────────
const SendEmailModal: React.FC<SendEmailModalProps> = ({
    isOpen,
    onClose,
    inspectionId,
    inspectionType,
    recipientEmail: initialRecipientEmail,
    recipientName: initialRecipientName,
}) => {
    const { user, effectiveAgencyId } = useAuth();

    // ── Form state ──────────────────────────────────────────────────────────
    /** Send From: selected email */
    const [sendFromEmail, setSendFromEmail] = useState("");
    /** Send From: selected display name */
    const [sendFromName, setSendFromName] = useState("");
    /** Send From: selection type — "pm" | "office" | "user-{id}" */
    const [sendFromSelection, setSendFromSelection] = useState<string>("pm");

    const [selectedUserEmail, setSelectedUserEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // ── Data state ───────────────────────────────────────────────────────────
    const [templates, setTemplates] = useState<EmailTemplateResponse[]>([]);
    const [agencyUsers, setAgencyUsers] = useState<UserResponse[]>([]);
    const [propertyManager, setPropertyManager] = useState<UserResponse | null>(null);
    const [officeEmail, setOfficeEmail] = useState<string>("");
    const [officeName, setOfficeName] = useState<string>("");

    // ── UI state ─────────────────────────────────────────────────────────────
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSendFromDropdown, setShowSendFromDropdown] = useState(false);
    const [sendFromSearch, setSendFromSearch] = useState("");
    const [tagCopied, setTagCopied] = useState<string | null>(null);

    // ── Load templates filtered by inspection type ──────────────────────────
    const loadTemplates = useCallback(async () => {
        if (!isOpen) return;
        try {
            setLoadingTemplates(true);
            const filterEnum = mapInspectionTypeToFilter(inspectionType);
            const result = await emailTemplateApi.getTemplates(undefined, filterEnum, 1, 100);
            setTemplates(result.data || []);
        } catch (err) {
            console.error("Failed to load email templates:", err);
        } finally {
            setLoadingTemplates(false);
        }
    }, [isOpen, inspectionType]);

    // ── Load agency users ───────────────────────────────────────────────────
    const loadUsers = useCallback(async () => {
        if (!isOpen || !effectiveAgencyId) return;
        try {
            setLoadingUsers(true);
            // Fetch all users from the agency (large page size to get everyone)
            const result = await userApi.list({ agencyId: effectiveAgencyId, page: 1, pageSize: 200 });
            setAgencyUsers(result.data || []);
        } catch (err) {
            console.error("Failed to load agency users:", err);
        } finally {
            setLoadingUsers(false);
        }
    }, [isOpen, effectiveAgencyId]);

    // ── Load agency info (for office email) ─────────────────────────────────
    const loadAgencyInfo = useCallback(async () => {
        if (!isOpen || !effectiveAgencyId) return;
        try {
            const agency = await agencyApi.getById(effectiveAgencyId);
            setOfficeEmail(agency.contactPersonEmail ?? "");
            setOfficeName(agency.legalBusinessName ?? "Office");
        } catch (err) {
            console.error("Failed to load agency info:", err);
        }
    }, [isOpen, effectiveAgencyId]);

    // ── On open: set initial values & load data ─────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        // Reset "Send From" to default — will be set to PM once users load
        setSendFromSelection("pm");
        setSendFromEmail("");
        setSendFromName("");
        setSendFromSearch("");

        // Set initial recipient if provided
        if (initialRecipientEmail) {
            setSelectedUserEmail(initialRecipientEmail);
        }

        // Reset form
        setSubject("");
        setBody("");
        setSelectedTemplateId("");
        setError(null);

        loadTemplates();
        loadUsers();
        loadAgencyInfo();
    }, [isOpen, user, initialRecipientEmail, loadTemplates, loadUsers, loadAgencyInfo]);

    // ── Find property manager, auto-set Send From, and auto-set recipient ──
    useEffect(() => {
        if (agencyUsers.length === 0) return;
        // Look for a user with "Property Manager" role
        const pm = agencyUsers.find(
            (u) =>
                u.userRoles?.some(
                    (r) => r.roleName?.toLowerCase().includes("property manager")
                )
        ) ?? null;
        setPropertyManager(pm);

        // Auto-set Send From to Property Manager if still on default "pm"
        if (pm && sendFromSelection === "pm") {
            setSendFromEmail(pm.email);
            setSendFromName(`${pm.firstName} ${pm.lastName}`);
        }

        // Auto-set recipient to Property Manager's email
        if (pm && !selectedUserEmail) {
            setSelectedUserEmail(pm.email);
        }
    }, [agencyUsers]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handle template selection ───────────────────────────────────────────
    const handleTemplateChange = useCallback(
        (templateId: string) => {
            setSelectedTemplateId(templateId);
            if (!templateId) {
                // Clear: keep subject & body as-is (user may have edited)
                return;
            }
            const template = templates.find((t) => t.id === templateId);
            if (template) {
                setSubject(template.subject || "");
                setBody(template.body || "");
            }
        },
        [templates]
    );

    // ── Handle Send From selection ──────────────────────────────────────────
    const handleSendFromSelect = (
        selection: string,
        email: string,
        name: string,
    ) => {
        setSendFromSelection(selection);
        setSendFromEmail(email);
        setSendFromName(name);
        setSendFromSearch("");
        setShowSendFromDropdown(false);
    };

    // ── Insert mail merge tag into body ─────────────────────────────────────
    const insertMergeTag = (tag: string) => {
        setBody((prev) => prev + " " + tag);
        setTagCopied(tag);
        setTimeout(() => setTagCopied(null), 1500);
    };

    // ── Filtered users for Send From search ─────────────────────────────────
    const sendFromFilteredUsers = useMemo(() => {
        if (!sendFromSearch.trim()) return agencyUsers;
        const q = sendFromSearch.toLowerCase();
        return agencyUsers.filter(
            (u) =>
                u.firstName?.toLowerCase().includes(q) ||
                u.lastName?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
        );
    }, [agencyUsers, sendFromSearch]);

    // ── Display text for the Send From dropdown ─────────────────────────────
    const sendFromDisplayText = useMemo(() => {
        if (!sendFromEmail) return "Select sender...";
        if (sendFromSelection === "pm") return `${sendFromName} (Property Manager)`;
        if (sendFromSelection === "office") return `Office — ${sendFromName}`;
        return `${sendFromName} <${sendFromEmail}>`;
    }, [sendFromEmail, sendFromName, sendFromSelection]);

    // ── Send email ──────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!selectedUserEmail) {
            setError("Please select a recipient.");
            return;
        }

        try {
            setSending(true);
            setError(null);

            await inspectionApi.sendReportEmailWithDetails(inspectionId, {
                recipientEmail: selectedUserEmail,
                subject: subject || undefined,
                body: body || undefined,
                templateId: selectedTemplateId || undefined,
                sendFromEmail: sendFromEmail || undefined,
                sendFromName: sendFromName || undefined,
            });

            onClose();
        } catch (err: any) {
            console.error("Send email failed:", err);
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.message || err.response?.data?.Message || err.message
                : err?.message || "Failed to send email.";
            setError(msg);
        } finally {
            setSending(false);
        }
    };

    // ── Grouped merge tags by category ──────────────────────────────────────
    const groupedTags = useMemo(() => {
        const map = new Map<string, MergeTag[]>();
        MAIL_MERGE_TAGS.forEach((t) => {
            const list = map.get(t.category) || [];
            list.push(t);
            map.set(t.category, list);
        });
        return Array.from(map.entries());
    }, []);

    // ── Quill editor modules ────────────────────────────────────────────────
    const quillModules = useMemo(
        () => ({
            toolbar: [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ color: [] }, { background: [] }],
                [{ list: "ordered" }, { list: "bullet" }],
                [{ align: [] }],
                ["link", "image"],
                ["blockquote", "code-block"],
                ["clean"],
            ],
        }),
        []
    );

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Send Report Email"
            widthClassName="max-w-5xl"
        >
            <div className="flex flex-col gap-6">
                {/* ── Row 1: Send From ──────────────────────────────────────── */}
                <div>
                    {/* Send From — dropdown with Property Manager, Office Email, and all agency users */}
                    <div className="space-y-1.5 relative">
                        <Label className="text-slate-700 font-semibold text-sm">
                            Send From
                        </Label>

                        {/* Dropdown trigger */}
                        <button
                            type="button"
                            onClick={() => setShowSendFromDropdown(!showSendFromDropdown)}
                            className={`w-full h-11 px-4 border rounded-xl flex items-center justify-between gap-2 transition-all text-sm bg-white hover:border-blue-300 ${showSendFromDropdown ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-200"
                                }`}
                        >
                            <span className={`truncate text-left flex-1 ${sendFromEmail ? "text-slate-800" : "text-slate-400"}`}>
                                {sendFromDisplayText}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showSendFromDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown list */}
                        {showSendFromDropdown && (
                            <>
                                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                    {/* Search input inside dropdown */}
                                    <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <Input
                                                value={sendFromSearch}
                                                onChange={(e) => setSendFromSearch(e.target.value)}
                                                placeholder="Filter senders..."
                                                className="h-8 pl-8 pr-3 border-slate-200 rounded-lg text-xs focus:ring-blue-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Property Manager option */}
                                    {propertyManager && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSendFromSelect(
                                                    "pm",
                                                    propertyManager.email,
                                                    `${propertyManager.firstName} ${propertyManager.lastName}`,
                                                )
                                            }
                                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-sm border-b border-slate-50 ${sendFromSelection === "pm" ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                PM
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 truncate">
                                                    {propertyManager.firstName} {propertyManager.lastName}
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {propertyManager.email} &middot; Property Manager
                                                </p>
                                            </div>
                                            {sendFromSelection === "pm" && (
                                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                            )}
                                        </button>
                                    )}

                                    {/* Office Email option */}
                                    {officeEmail && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSendFromSelect(
                                                    "office",
                                                    officeEmail,
                                                    officeName,
                                                )
                                            }
                                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-sm border-b border-slate-50 ${sendFromSelection === "office" ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                <Building2 className="w-3.5 h-3.5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 truncate">
                                                    Office Email
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {officeEmail} &middot; {officeName}
                                                </p>
                                            </div>
                                            {sendFromSelection === "office" && (
                                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                            )}
                                        </button>
                                    )}

                                    {/* Agency users */}
                                    {loadingUsers ? (
                                        <div className="p-4 text-center">
                                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto" />
                                            <p className="text-xs text-slate-400 mt-1">Loading users...</p>
                                        </div>
                                    ) : sendFromFilteredUsers.length === 0 ? (
                                        <p className="p-4 text-xs text-slate-400 text-center">
                                            No users found
                                        </p>
                                    ) : (
                                        sendFromFilteredUsers.map((u) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() =>
                                                    handleSendFromSelect(
                                                        `user-${u.id}`,
                                                        u.email,
                                                        `${u.firstName} ${u.lastName}`,
                                                    )
                                                }
                                                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-sm ${sendFromSelection === `user-${u.id}` ? "bg-blue-50" : ""
                                                    }`}
                                            >
                                                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {u.firstName?.[0]}{u.lastName?.[0]}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">
                                                        {u.firstName} {u.lastName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {u.email}
                                                    </p>
                                                </div>
                                                {sendFromSelection === `user-${u.id}` && (
                                                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Backdrop click to close */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => {
                                        setShowSendFromDropdown(false);
                                        setSendFromSearch("");
                                    }}
                                />
                            </>
                        )}

                        <p className="text-[11px] text-slate-400">
                            Defaults to Property Manager — you can change this
                        </p>
                    </div>
                </div>

                {/* ── Recipient (auto: Property Manager) ─────────────────────── */}
                {selectedUserEmail && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            PM
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-blue-800">Email will be sent to</p>
                            <p className="text-sm text-blue-700 truncate">{selectedUserEmail}</p>
                        </div>
                        <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                    </div>
                )}

                {/* ── Row 2: Subject ─────────────────────────────────────────── */}
                <div className="space-y-1.5">
                    <Label htmlFor="send-email-subject" className="text-slate-700 font-semibold text-sm">
                        Subject
                    </Label>
                    <Input
                        id="send-email-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter email subject..."
                        className="h-11 border-slate-200 rounded-xl text-sm focus:ring-blue-400"
                    />
                </div>

                {/* ── Row 3: Email Template Dropdown ─────────────────────────── */}
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                        Email Template
                        <span className="text-[11px] font-normal text-slate-400">
                            (filtered by {getInspectionTypeLabel(inspectionType)})
                        </span>
                    </Label>
                    {loadingTemplates ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading templates...
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- Select a template (optional) --</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} {t.isDefault ? "(Default)" : ""} — {t.subject}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            {templates.length === 0 && (
                                <p className="text-[11px] text-amber-600 mt-1">
                                    No templates found for this inspection type. You can write the email manually.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Row 4: Rich Text Editor (Body) ─────────────────────────── */}
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-sm">
                        Email Body
                    </Label>
                    <div className="min-h-[250px] border border-slate-200 rounded-xl overflow-hidden">
                        <RTFEditor
                            value={body}
                            onChange={setBody}
                            modules={quillModules}
                            theme="snow"
                            style={{ height: "240px" }}
                        />
                    </div>
                </div>

                {/* ── Row 5: Mail Merge Tags ─────────────────────────────────── */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Copy className="w-4 h-4" />
                        Mail Merge Fields
                        <span className="text-[11px] font-normal text-slate-400">
                            (click to insert into the email body)
                        </span>
                    </h4>
                    <div className="space-y-3">
                        {groupedTags.map(([category, tags]) => (
                            <div key={category} className="space-y-1.5">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {category}
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((t) => (
                                        <button
                                            key={t.tag}
                                            type="button"
                                            onClick={() => insertMergeTag(t.tag)}
                                            className="text-[11px] bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 hover:border-blue-300 rounded-lg px-2.5 py-1 font-semibold transition-all shadow-sm"
                                            title={`Insert ${t.tag}`}
                                        >
                                            {t.label}
                                            {tagCopied === t.tag && (
                                                <Check className="w-3 h-3 inline ml-1 text-emerald-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Error message ──────────────────────────────────────────── */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm">
                        {error}
                    </div>
                )}

                {/* ── Action buttons ─────────────────────────────────────────── */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-10 rounded-xl border-slate-200 text-slate-600 font-semibold"
                        disabled={sending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={sending || !selectedUserEmail || !sendFromEmail}
                        className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-200 gap-2"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Mail className="w-4 h-4" />
                                Send Email
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SendEmailModal;
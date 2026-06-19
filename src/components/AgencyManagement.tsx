'use client';

import React, { useState, useEffect } from 'react';
import { AgencyResponse, CreateAgencyRequest, AgencyWhitelabelResponse, CountryDto, StateDto, TimeZoneDto, UpdateAgencyRequest, BillingPlan } from '../types/api';
import { agencyApi } from '@/lib/api/agency';
import { agencyManagementApi } from '@/lib/api/agencyManagement';
import { referenceApi } from '@/lib/api/reference';
import { billingApi } from '@/lib/api/billing';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Modal from './ui/Modal';
import { notificationApi } from '@/lib/api/notification';
import { useAuth } from '@/contexts/AuthContext';
import {
  Send,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Eye,
  Filter,
  X
} from 'lucide-react';

const AgencyManagement: React.FC = () => {
  const [agencies, setAgencies] = useState<AgencyResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<{ countryId?: string; stateId?: string; name?: string; suburb?: string; city?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<AgencyResponse | null>(null);
  const [whitelabelSettings, setWhitelabelSettings] = useState<AgencyWhitelabelResponse | null>(null);
  const [whitelabelLoading, setWhitelabelLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [editAgency, setEditAgency] = useState<Partial<UpdateAgencyRequest & AgencyResponse>>({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'PropertyManager' });
  const { user, isSuperAdmin, impersonateAgency } = useAuth();
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [states, setStates] = useState<StateDto[]>([]);
  const [timezones, setTimezones] = useState<TimeZoneDto[]>([]);
  const [lookupLoading, setLookupLoading] = useState<{ countries: boolean; states: boolean; timezones: boolean }>({ countries: false, states: false, timezones: false });
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [billingPlansLoading, setBillingPlansLoading] = useState(false);
  const [newAgency, setNewAgency] = useState<CreateAgencyRequest>({
    legalBusinessName: '',
    companyWebsite: null,
    address: '',
    suburb: null,
    city: null,
    countryId: undefined,
    stateId: undefined,
    postcode: null,
    phoneNumber: null,
    faxNumber: null,
    timeZoneId: undefined,
    adminUsername: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    contactPersonFirstName: null,
    contactPersonLastName: null,
    contactPersonPhone: null,
    contactPersonJobTitle: null,
    contactPersonFaxNumber: null,
    contactPersonEmail: null,
    billingContactFirstName: null,
    billingContactLastName: null,
    billingPhoneNumber: null,
    billingContactJobTitle: null,
    billingFaxNumber: null,
    billingContactEmail: null,
    technicalContactFirstName: null,
    technicalContactLastName: null,
    technicalPhoneNumber: null,
    technicalContactJobTitle: null,
    technicalContactFaxNumber: null,
    technicalContactEmail: null,
    billingPlanId: '',
  });

  // Notification composer state (superadmin)
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<(string | number)[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [recipientGroups, setRecipientGroups] = useState<Array<{ agencyId: string | number; agencyName: string; users: Array<{ userId: string | number; fullname: string }> }>>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [selectAllAgencies, setSelectAllAgencies] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgencyResponse | null>(null);

  const getApiErrorMessage = (err: any, fallback: string) => {
    const api = err?.response?.data ?? err?.response?.Data;
    const code = api?.errorCode ?? api?.ErrorCode;
    const message = api?.message ?? api?.Message ?? fallback;
    switch (code) {
      case 'InvalidRequest':
        return message || 'There are validation errors. Please check the form.';
      case 'NotFound':
        return message || 'Record not found.';
      case 'Conflict':
        return message || 'A record with the same details already exists.';
      case 'ServerError':
        return message || 'A server error occurred. Please try again.';
      default:
        return message || fallback;
    }
  };

  useEffect(() => {
    if (!showNotificationModal) return;
    (async () => {
      try {
        setIsUsersLoading(true);
        // Prefer the recipients endpoint which returns agencies with their users
        const groups = await notificationApi.getRecipients();
        setRecipientGroups(Array.isArray(groups) ? groups : []);
        // Also flatten for quick lookup/counts
        const flattened = (Array.isArray(groups) ? groups : []).flatMap((g) =>
          (g.users || []).map((u) => ({
            userId: u.userId,
            agencyId: g.agencyId,
            username: u.fullname,
            email: undefined,
            role: undefined,
          }))
        );
        setAllUsers(flattened);
      } catch {
        try {
          // Fallback to users list if recipients is unavailable
          const users = await agencyManagementApi.getUsers();
          setAllUsers(Array.isArray(users) ? users : []);
          setRecipientGroups([]);
        } catch {
          setAllUsers([]);
          setRecipientGroups([]);
        }
      } finally {
        setIsUsersLoading(false);
      }
    })();
  }, [showNotificationModal]);

  useEffect(() => {
    const loadBillingPlans = async () => {
      try {
        setBillingPlansLoading(true);
        const plans = await billingApi.getActive();
        setBillingPlans(Array.isArray(plans) ? plans : []);
      } catch (err) {
        console.error('Failed to load billing plans', err);
        setBillingPlans([]);
      } finally {
        setBillingPlansLoading(false);
      }
    };
    loadBillingPlans();
  }, []);

  const openNotificationModal = () => {
    setNotifyTitle('');
    setNotifyMessage('');
    setSelectedAgencyIds([]);
    setSelectedUserIds([]);
    setShowNotificationModal(true);
    setSelectAllAgencies(false);
  };

  const normalizeId = (id: string | number | null | undefined) => (id == null ? null : String(id));
  const hasId = (list: Array<string | number>, id: string | number | null | undefined) => {
    const key = normalizeId(id);
    if (!key) return false;
    return list.some((item) => normalizeId(item) === key);
  };

  const derivedRecipients = (() => {
    const agencyIdSet = new Set(
      selectedAgencyIds.map(normalizeId).filter((id): id is string => !!id)
    );
    const agencyUsers = allUsers
      .filter((u) => {
        const aId = normalizeId(u.agencyId ?? u.AgencyId);
        return aId && agencyIdSet.has(aId);
      })
      .map((u) => u.userId ?? u.UserId)
      .filter((id) => id != null);
    const unionMap = new Map<string, string | number>();
    [...agencyUsers, ...selectedUserIds].forEach((id) => {
      const key = normalizeId(id);
      if (key) unionMap.set(key, id);
    });
    return Array.from(unionMap.values());
  })();

  const toggleUserSelection = (userId: string | number) => {
    setSelectedUserIds((prev) => (hasId(prev, userId) ? prev.filter((id) => normalizeId(id) !== normalizeId(userId)) : [...prev, userId]));
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      alert('Please enter title and message');
      return;
    }
    const userIds = Array.from(new Set(derivedRecipients)).filter((id) => id != null && normalizeId(id));
    if (userIds.length === 0) {
      alert('Select at least one recipient');
      return;
    }
    try {
      setSendingNotification(true);
      await notificationApi.send({ title: notifyTitle.trim(), message: notifyMessage.trim(), userIds });
      alert(`Notification sent to ${userIds.length} user(s).`);
      setShowNotificationModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const loadAgencies = async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const resp = await agencyApi.getPaged(page, pageSize, filters);
        setAgencies(resp.data || []);
        setTotalCount(resp.totalCount || (resp.data?.length ?? 0));
      } else if (user?.agencyId) {
        const agency = await agencyApi.getById(user.agencyId);
        setAgencies([agency]);
        setTotalCount(1);
      } else {
        // For non-admin roles, fallback to agency list scoped by backend (if any) or empty
        try {
          const scoped = await agencyApi.getAll();
          setAgencies(scoped);
          setTotalCount(scoped?.length || 0);
        } catch {
          setAgencies([]);
          setTotalCount(0);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetch = async () => {
      if (ignore) return;
      await loadAgencies();
    };
    fetch();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, page, pageSize, filters.countryId, filters.stateId, filters.name, filters.suburb, filters.city]);

  // Load countries when opening create form
  useEffect(() => {
    const loadCountries = async () => {
      if (!showCreateForm) return;
      try {
        setLookupLoading((p) => ({ ...p, countries: true }));
        const list = await referenceApi.getCountries();
        setCountries(list);
      } catch { }
      finally {
        setLookupLoading((p) => ({ ...p, countries: false }));
      }
    };
    loadCountries();
  }, [showCreateForm]);

  // Load countries on mount for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        setLookupLoading((p) => ({ ...p, countries: true }));
        const list = await referenceApi.getCountries();
        setCountries(list);
      } catch { }
      finally {
        setLookupLoading((p) => ({ ...p, countries: false }));
      }
    })();
  }, []);

  // When country changes on create form, fetch states and timezones
  useEffect(() => {
    const cid = (newAgency as any).countryId as number | undefined;
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
  }, [(newAgency as any).countryId]);

  // When filter country changes, fetch states for filter dropdown
  useEffect(() => {
    const cid = filters.countryId;
    const loadByCountry = async () => {
      if (!cid) {
        setStates([]);
        return;
      }
      try {
        setLookupLoading((p) => ({ ...p, states: true }));
        const s = await referenceApi.getStatesByCountry(cid);
        setStates(s);
      } catch {
        setStates([]);
      } finally {
        setLookupLoading((p) => ({ ...p, states: false }));
      }
    };
    loadByCountry();
  }, [filters.countryId]);

  // Load whitelabel settings when details modal opens
  useEffect(() => {
    const loadWhitelabel = async () => {
      if (!selectedAgency) {
        setWhitelabelSettings(null);
        return;
      }
      try {
        setWhitelabelLoading(true);
        const settings = await agencyApi.getWhitelabel();
        setWhitelabelSettings(settings);
      } catch (err) {
        setWhitelabelSettings(null);
      } finally {
        setWhitelabelLoading(false);
      }
    };
    loadWhitelabel();
  }, [selectedAgency]);

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!newAgency.billingPlanId) {
        const msg = 'Billing Plan is required';
        setError(msg);
        alert(msg);
        return;
      }
      await agencyApi.create(newAgency);
      alert('Agency created successfully');
      setNewAgency({
        legalBusinessName: '',
        companyWebsite: null,
        address: '',
        suburb: null,
        city: null,
        countryId: undefined,
        stateId: undefined,
        postcode: null,
        phoneNumber: null,
        faxNumber: null,
        timeZoneId: undefined,
        adminUsername: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
        contactPersonFirstName: null,
        contactPersonLastName: null,
        contactPersonPhone: null,
        contactPersonJobTitle: null,
        contactPersonFaxNumber: null,
        contactPersonEmail: null,
        billingContactFirstName: null,
        billingContactLastName: null,
        billingPhoneNumber: null,
        billingContactJobTitle: null,
        billingFaxNumber: null,
        billingContactEmail: null,
        technicalContactFirstName: null,
        technicalContactLastName: null,
        technicalPhoneNumber: null,
        technicalContactJobTitle: null,
        technicalContactFaxNumber: null,
        technicalContactEmail: null,
        billingPlanId: '',
      });
      setShowCreateForm(false);
      await loadAgencies();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to create agency');
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteAgency = async () => {
    if (!deleteTarget?.id) return;
    setLoading(true);
    setError('');
    try {
      await agencyApi.delete(deleteTarget.id);
      await loadAgencies();
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to delete agency');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await agencyApi.getById(id);
      // Pre-fill edit form. Username/password are not returned typically; keep blank for password
      setEditAgency({
        // Basic
        legalBusinessName: data.legalBusinessName || '',
        address: data.address,
        suburb: (data as any).suburb || '',
        city: (data as any).city || '',
        postcode: (data as any).postcode || '',
        phoneNumber: (data as any).phoneNumber || '',
        faxNumber: (data as any).faxNumber || '',
        companyWebsite: (data as any).companyWebsite || '',
        countryId: (data as any).countryId,
        stateId: (data as any).stateId,
        timeZoneId: (data as any).timeZoneId,
        // Main contact
        contactPersonFirstName: (data as any).contactPersonFirstName || '',
        contactPersonLastName: (data as any).contactPersonLastName || '',
        contactPersonPhone: (data as any).contactPersonPhone || '',
        contactPersonJobTitle: (data as any).contactPersonJobTitle || '',
        contactPersonFaxNumber: (data as any).contactPersonFaxNumber || '',
        contactPersonEmail: (data as any).contactPersonEmail || '',
        // Billing
        billingContactFirstName: (data as any).billingContactFirstName || '',
        billingContactLastName: (data as any).billingContactLastName || '',
        billingPhoneNumber: (data as any).billingPhoneNumber || '',
        billingContactJobTitle: (data as any).billingContactJobTitle || '',
        billingFaxNumber: (data as any).billingFaxNumber || '',
        billingContactEmail: (data as any).billingContactEmail || '',
        // Technical
        technicalContactFirstName: (data as any).technicalContactFirstName || '',
        technicalContactLastName: (data as any).technicalContactLastName || '',
        technicalPhoneNumber: (data as any).technicalPhoneNumber || '',
        technicalContactJobTitle: (data as any).technicalContactJobTitle || '',
        technicalContactFaxNumber: (data as any).technicalContactFaxNumber || '',
        technicalContactEmail: (data as any).technicalContactEmail || '',
        billingPlanId: (data as any).billingPlanId || '',
      });
      setEditingAgencyId(id);
      setShowEditForm(true);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to load agency');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Load countries when opening edit form
  useEffect(() => {
    const loadCountries = async () => {
      if (!showEditForm) return;
      try {
        setLookupLoading((p) => ({ ...p, countries: true }));
        const list = await referenceApi.getCountries();
        setCountries(list);
      } catch { }
      finally {
        setLookupLoading((p) => ({ ...p, countries: false }));
      }
    };
    loadCountries();
  }, [showEditForm]);

  // When country changes on edit form, fetch states and timezones
  useEffect(() => {
    const cid = (editAgency as any).countryId as number | undefined;
    const loadByCountry = async () => {
      if (!cid || !showEditForm) {
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
      } finally {
        setLookupLoading((p) => ({ ...p, states: false, timezones: false }));
      }
    };
    loadByCountry();
  }, [(editAgency as any).countryId, showEditForm]);

  const handleUpdateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgencyId) return;
    setLoading(true);
    setError('');
    try {
      if (!(editAgency as any).billingPlanId) {
        const msg = 'Billing Plan is required';
        setError(msg);
        alert(msg);
        return;
      }
      const payload: UpdateAgencyRequest = {
        name: editAgency.legalBusinessName || '',
        legalBusinessName: editAgency.legalBusinessName || '',
        companyWebsite: (editAgency as any).companyWebsite ?? null,
        address: editAgency.address || '',
        suburb: editAgency.suburb ?? null,
        city: editAgency.city ?? null,
        countryId: (editAgency as any).countryId ?? null,
        stateId: (editAgency as any).stateId ?? null,
        postcode: editAgency.postcode ?? null,
        phoneNumber: editAgency.phoneNumber ?? null,
        faxNumber: (editAgency as any).faxNumber ?? null,
        timeZoneId: (editAgency as any).timeZoneId ?? null,
        contactPersonFirstName: (editAgency as any).contactPersonFirstName ?? null,
        contactPersonLastName: (editAgency as any).contactPersonLastName ?? null,
        contactPersonPhone: (editAgency as any).contactPersonPhone ?? null,
        contactPersonJobTitle: (editAgency as any).contactPersonJobTitle ?? null,
        contactPersonFaxNumber: (editAgency as any).contactPersonFaxNumber ?? null,
        contactPersonEmail: (editAgency as any).contactPersonEmail ?? null,
        billingContactFirstName: (editAgency as any).billingContactFirstName ?? null,
        billingContactLastName: (editAgency as any).billingContactLastName ?? null,
        billingPhoneNumber: (editAgency as any).billingPhoneNumber ?? null,
        billingContactJobTitle: (editAgency as any).billingContactJobTitle ?? null,
        billingFaxNumber: (editAgency as any).billingFaxNumber ?? null,
        billingContactEmail: (editAgency as any).billingContactEmail ?? null,
        technicalContactFirstName: (editAgency as any).technicalContactFirstName ?? null,
        technicalContactLastName: (editAgency as any).technicalContactLastName ?? null,
        technicalPhoneNumber: (editAgency as any).technicalPhoneNumber ?? null,
        technicalContactJobTitle: (editAgency as any).technicalContactJobTitle ?? null,
        technicalContactFaxNumber: (editAgency as any).technicalContactFaxNumber ?? null,
        technicalContactEmail: (editAgency as any).technicalContactEmail ?? null,
        billingPlanId: (editAgency as any).billingPlanId ?? null,
      };
      await agencyApi.update(editingAgencyId, payload);
      alert('Agency updated successfully');
      setShowEditForm(false);
      setEditingAgencyId(null);
      setEditAgency({});
      await loadAgencies();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to update agency');
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Agency Management</h2>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={openNotificationModal}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none transition-all flex items-center gap-2 shadow-sm"
            >
              <Send className="w-4 h-4" />
              Send Notification
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none transition-all flex items-center gap-2 shadow-sm"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Cancel' : 'New Agency'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">Filters</h3>
          </div>
          <button
            onClick={() => { setFilters({}); setPage(1); }}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Clear All
          </button>
        </div>
        <div className="responsive-filters">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={filters.countryId || ''}
              onChange={(e) => { const val = e.target.value || undefined; setFilters((p) => ({ ...p, countryId: val, stateId: undefined })); setPage(1); }}
            >
              <option value="">All</option>
              {countries.map((c) => {
                const id = (c as any).countryId ?? c.id;
                return (
                  <option key={id} value={id}>{c.name}</option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={filters.stateId || ''}
              onChange={(e) => { const val = e.target.value || undefined; setFilters((p) => ({ ...p, stateId: val })); setPage(1); }}
              disabled={!filters.countryId || lookupLoading.states}
            >
              <option value="">{!filters.countryId ? 'Select country first' : (lookupLoading.states ? 'Loading states...' : 'All')}</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
            <input
              type="text"
              placeholder="Search by name..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={filters.name || ''}
              onChange={(e) => { const v = e.target.value; setFilters((p) => ({ ...p, name: v || undefined })); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suburb</label>
            <input
              type="text"
              placeholder="Search by suburb..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={filters.suburb || ''}
              onChange={(e) => { const v = e.target.value; setFilters((p) => ({ ...p, suburb: v || undefined })); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              placeholder="Search by city..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={filters.city || ''}
              onChange={(e) => { const v = e.target.value; setFilters((p) => ({ ...p, city: v || undefined })); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditForm} onClose={() => setShowEditForm(false)} title="Edit Agency" widthClassName="max-w-6xl">
        <form onSubmit={handleUpdateAgency} className="space-y-8">
          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
              Basic Details
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal Business Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={editAgency.legalBusinessName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, legalBusinessName: e.target.value })}
                  placeholder="Enter legal business name"
                />
              </div>
              <div className="hidden">
                <label className="block text-sm font-medium text-foreground mb-2">Legal Business Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).legalBusinessName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, legalBusinessName: e.target.value as any })}
                  placeholder="Enter legal business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Primary Address *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={editAgency.address || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, address: e.target.value })}
                  placeholder="Enter primary address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Postcode</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={editAgency.postcode || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, postcode: e.target.value })}
                  placeholder="Enter postcode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={editAgency.phoneNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).faxNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, faxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company Website</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).companyWebsite || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, companyWebsite: e.target.value as any })}
                  placeholder="Enter company website"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).countryId || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setEditAgency({ ...editAgency, countryId: val, stateId: undefined, timeZoneId: undefined });
                  }}
                >
                  <option value="" disabled>{lookupLoading.countries ? 'Loading countries...' : 'Select country'}</option>
                  {countries.map((c) => {
                    const id = (c as any).countryId ?? c.id;
                    return (
                      <option key={id} value={id}>{c.name}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">State</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).stateId || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setEditAgency({ ...editAgency, stateId: val });
                  }}
                  disabled={!((editAgency as any).countryId) || lookupLoading.states}
                >
                  <option value="" disabled>
                    {!((editAgency as any).countryId) ? 'Select country first' : (lookupLoading.states ? 'Loading states...' : 'Select state')}
                  </option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Suburb</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={editAgency.suburb || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, suburb: e.target.value })}
                  placeholder="Enter suburb"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">City</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={editAgency.city || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Zone</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).timeZoneId || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setEditAgency({ ...editAgency, timeZoneId: val });
                  }}
                  disabled={!((editAgency as any).countryId) || lookupLoading.timezones}
                >
                  <option value="" disabled>
                    {!((editAgency as any).countryId) ? 'Select country first' : (lookupLoading.timezones ? 'Loading timezones...' : 'Select timezone')}
                  </option>
                  {timezones.map((t) => (
                    <option key={t.id} value={t.id}>{t.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Plan *</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).billingPlanId || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingPlanId: e.target.value })}
                >
                  <option value="" disabled>
                    {billingPlansLoading ? 'Loading billing plans...' : 'Select billing plan'}
                  </option>
                  {billingPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
              Main contact
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).contactPersonFirstName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, contactPersonFirstName: e.target.value as any })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).contactPersonLastName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, contactPersonLastName: e.target.value as any })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Phone</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).contactPersonPhone || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, contactPersonPhone: e.target.value as any })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Job Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).contactPersonJobTitle || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, contactPersonJobTitle: e.target.value as any })}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).contactPersonFaxNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, contactPersonFaxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).contactPersonEmail || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, contactPersonEmail: e.target.value as any })}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>


          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-chart-4 rounded-full mr-3"></span>
              Billing Details
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).billingContactFirstName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingContactFirstName: e.target.value as any })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).billingContactLastName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingContactLastName: e.target.value as any })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Phone Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).billingPhoneNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingPhoneNumber: e.target.value as any })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact Job Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).billingContactJobTitle || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingContactJobTitle: e.target.value as any })}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).billingFaxNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingFaxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(editAgency as any).billingContactEmail || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, billingContactEmail: e.target.value as any })}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-chart-2 rounded-full mr-3"></span>
              Technical Contact
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).technicalContactFirstName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, technicalContactFirstName: e.target.value as any })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).technicalContactLastName || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, technicalContactLastName: e.target.value as any })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Phone Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).technicalPhoneNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, technicalPhoneNumber: e.target.value as any })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Job Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).technicalContactJobTitle || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, technicalContactJobTitle: e.target.value as any })}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).technicalContactFaxNumber || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, technicalContactFaxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(editAgency as any).technicalContactEmail || ''}
                  onChange={(e) => setEditAgency({ ...editAgency, technicalContactEmail: e.target.value as any })}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="px-6 py-3 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="Create New Agency" widthClassName="max-w-6xl">
        <form onSubmit={handleCreateAgency} className="space-y-8">
          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
              Basic Details
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal Business Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.legalBusinessName}
                  onChange={(e) => setNewAgency({ ...newAgency, legalBusinessName: e.target.value })}
                  placeholder="Enter legal business name"
                />
              </div>
              <div className="hidden">
                <label className="block text-sm font-medium text-foreground mb-2">Legal Business Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).legalBusinessName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, legalBusinessName: e.target.value as any })}
                  placeholder="Enter legal business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Primary Address *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.address}
                  onChange={(e) => setNewAgency({ ...newAgency, address: e.target.value })}
                  placeholder="Enter primary address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Postcode</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.postcode || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, postcode: e.target.value })}
                  placeholder="Enter postcode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.phoneNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).faxNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, faxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company Website</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.companyWebsite || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, companyWebsite: e.target.value || null })}
                  placeholder="Enter company website"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.countryId || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setNewAgency({ ...newAgency, countryId: val, stateId: undefined, timeZoneId: undefined });
                  }}
                >
                  <option value="" disabled>{lookupLoading.countries ? 'Loading countries...' : 'Select country'}</option>
                  {countries.map((c) => (
                    <option key={(c as any).countryId ?? c.id} value={(c as any).countryId ?? c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">State</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.stateId || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setNewAgency({ ...newAgency, stateId: val });
                  }}
                  disabled={!newAgency.countryId || lookupLoading.states}
                >
                  <option value="" disabled>
                    {!newAgency.countryId ? 'Select country first' : (lookupLoading.states ? 'Loading states...' : 'Select state')}
                  </option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Suburb</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.suburb || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, suburb: e.target.value || null })}
                  placeholder="Enter suburb"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">City</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.city || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, city: e.target.value || null })}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Zone</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.timeZoneId || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setNewAgency({ ...newAgency, timeZoneId: val });
                  }}
                  disabled={!newAgency.countryId || lookupLoading.timezones}
                >
                  <option value="" disabled>
                    {!newAgency.countryId ? 'Select country first' : (lookupLoading.timezones ? 'Loading timezones...' : 'Select timezone')}
                  </option>
                  {timezones.map((t) => (
                    <option key={t.id} value={t.id}>{t.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Plan *</label>
                <select
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.billingPlanId || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingPlanId: e.target.value })}
                >
                  <option value="" disabled>
                    {billingPlansLoading ? 'Loading billing plans...' : 'Select billing plan'}
                  </option>
                  {billingPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>


            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
              Agency Admin
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Admin Username *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.adminUsername}
                  onChange={(e) => setNewAgency({ ...newAgency, adminUsername: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Admin First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.adminFirstName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, adminFirstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Admin Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.adminLastName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, adminLastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Admin Email *</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.adminEmail}
                  onChange={(e) => setNewAgency({ ...newAgency, adminEmail: e.target.value })}
                  placeholder="Enter admin email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Admin Password *</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={newAgency.adminPassword}
                  onChange={(e) => setNewAgency({ ...newAgency, adminPassword: e.target.value })}
                  placeholder="Enter admin password"
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
              Main contact
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).contactPersonFirstName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, contactPersonFirstName: e.target.value as any })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).contactPersonLastName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, contactPersonLastName: e.target.value as any })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Phone</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.contactPersonPhone || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, contactPersonPhone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Job Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).contactPersonJobTitle || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, contactPersonJobTitle: e.target.value as any })}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).contactPersonFaxNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, contactPersonFaxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Person Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={newAgency.contactPersonEmail || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, contactPersonEmail: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>


          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-chart-4 rounded-full mr-3"></span>
              Billing Details
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).billingContactFirstName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingContactFirstName: e.target.value as any })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).billingContactLastName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingContactLastName: e.target.value as any })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Phone Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).billingPhoneNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingPhoneNumber: e.target.value as any })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact Job Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).billingContactJobTitle || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingContactJobTitle: e.target.value as any })}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).billingFaxNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingFaxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Billing Contact Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                  value={(newAgency as any).billingContactEmail || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, billingContactEmail: e.target.value as any })}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-chart-2 rounded-full mr-3"></span>
              Technical Contact
            </h4>
            <div className="responsive-grid-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact First Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).technicalContactFirstName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, technicalContactFirstName: e.target.value as any })}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Last Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).technicalContactLastName || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, technicalContactLastName: e.target.value as any })}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Phone Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).technicalPhoneNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, technicalPhoneNumber: e.target.value as any })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Job Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).technicalContactJobTitle || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, technicalContactJobTitle: e.target.value as any })}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Fax Number</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).technicalContactFaxNumber || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, technicalContactFaxNumber: e.target.value as any })}
                  placeholder="Enter fax number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Technical Contact Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus-border-primary px-3 py-2 border"
                  value={(newAgency as any).technicalContactEmail || ''}
                  onChange={(e) => setNewAgency({ ...newAgency, technicalContactEmail: e.target.value as any })}
                  placeholder="Enter email"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-3 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Agency...' : 'Create Agency'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Superadmin: Send Notification Modal */}
      <Modal isOpen={showNotificationModal} onClose={() => setShowNotificationModal(false)} title="Send Notification" widthClassName="max-w-4xl">
        <form onSubmit={handleSendNotification} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="System Update"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Message</label>
              <textarea
                required
                rows={4}
                className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="New inspection report available for review."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Agencies selection (multi) */}
            <div className="bg-muted/40 p-4 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Select Agencies</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectAllAgencies}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        setSelectAllAgencies(checked);
                        if (checked) {
                          const allIds = agencies.map((a) => a.id);
                          setSelectedAgencyIds(allIds);
                          // Add all users from all agencies
                          const allUserIds = (recipientGroups.length ? recipientGroups.flatMap((g) => (g.users || []).map((u) => u.userId)) : allUsers.map((u) => (u.userId ?? u.UserId))).filter((id) => id != null);
                          setSelectedUserIds(Array.from(new Set(allUserIds)));
                        } else {
                          setSelectedAgencyIds([]);
                          setSelectedUserIds([]);
                        }
                      }}
                    />
                    <span>Select All</span>
                  </label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
              </div>
              <div className="max-h-64 overflow-auto border border-border rounded-md divide-y">
                {agencies.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No agencies</div>
                ) : (
                  agencies.map((a) => {
                    const count = allUsers.filter((u) => normalizeId(u.agencyId ?? u.AgencyId) === normalizeId(a.id)).length;
                    const checked = hasId(selectedAgencyIds, a.id);
                    return (
                      <label key={a.id} className="flex items-center gap-3 p-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={() => {
                            setSelectedAgencyIds((prev) => {
                              const next = checked ? prev.filter((id) => normalizeId(id) !== normalizeId(a.id)) : [...prev, a.id];
                              const agencyUserIds = recipientGroups.length
                                ? (recipientGroups.find((g) => normalizeId(g.agencyId) === normalizeId(a.id))?.users || []).map((u) => u.userId)
                                : allUsers.filter((u) => normalizeId(u.agencyId ?? u.AgencyId) === normalizeId(a.id)).map((u) => u.userId ?? u.UserId);
                              if (!checked) {
                                setSelectedUserIds((prevUsers) => Array.from(new Set([...prevUsers, ...agencyUserIds])));
                              } else {
                                setSelectedUserIds((prevUsers) => prevUsers.filter((id) => !agencyUserIds.some((uId) => normalizeId(uId) === normalizeId(id))));
                              }
                              setSelectAllAgencies(next.length === agencies.length);
                              return next;
                            });
                          }}
                        />
                        <span className="flex-1 truncate">{a.legalBusinessName}</span>
                        <span className="text-xs text-muted-foreground">{count} users</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Users selection (multi) */}
            <div className="bg-muted/40 p-4 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Select Users</label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <div className="max-h-64 overflow-auto border border-border rounded-md divide-y">
                {isUsersLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Loading users...</div>
                ) : allUsers.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No users available</div>
                ) : (
                  allUsers.map((u) => {
                    const id = (u.userId ?? u.UserId) as string | number;
                    const label = (u.username || u.Username || u.email || u.Email || (u.fullname as any) || `User ${id}`) as string;
                    const checked = hasId(selectedUserIds, id);
                    return (
                      <label key={id} className="flex items-center gap-3 p-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={() => {
                            // toggling a user should also ensure its agency is selected if not already
                            toggleUserSelection(id);
                            const aId = u.agencyId ?? u.AgencyId;
                            if (aId && !hasId(selectedAgencyIds, aId)) {
                              setSelectedAgencyIds((prev) => Array.from(new Set([...prev, aId])));
                            }
                          }}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        <span className="text-xs text-muted-foreground">{u.role || u.Role || ''}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">{selectedUserIds.length} selected</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Will send to {derivedRecipients.length} user(s)</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingNotification}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {sendingNotification ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedAgency}
        onClose={() => setSelectedAgency(null)}
        title={selectedAgency ? `Agency Details — ${selectedAgency.legalBusinessName}` : 'Agency Details'}
        widthClassName="max-w-5xl"
      >
        {selectedAgency && (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded-lg p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-foreground">{selectedAgency.legalBusinessName}</div>
                  <div className="text-sm text-muted-foreground">{selectedAgency.address}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="mr-3">Created: {selectedAgency.createdAt ? new Date(selectedAgency.createdAt).toLocaleDateString() : '-'}</span>
                  <span>Updated: {selectedAgency.updatedAt ? new Date(selectedAgency.updatedAt).toLocaleDateString() : '-'}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-background border border-border rounded-md p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Phone</div>
                  <div className="text-foreground">{selectedAgency.phoneNumber || 'N/A'}</div>
                </div>
                <div className="bg-background border border-border rounded-md p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Website</div>
                  <div className="text-foreground">{(selectedAgency as any).companyWebsite || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg">
                <div className="px-5 py-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">Main Contact</h4>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">First Name</div>
                    <div className="text-foreground">{(selectedAgency as any).contactPersonFirstName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Last Name</div>
                    <div className="text-foreground">{(selectedAgency as any).contactPersonLastName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-foreground">{selectedAgency.contactPersonEmail || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="text-foreground">{selectedAgency.contactPersonPhone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Job Title</div>
                    <div className="text-foreground">{(selectedAgency as any).contactPersonJobTitle || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fax</div>
                    <div className="text-foreground">{(selectedAgency as any).contactPersonFaxNumber || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg">
                <div className="px-5 py-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">Basic Details</h4>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Legal Business Name</div>
                    <div className="text-foreground">{(selectedAgency as any).legalBusinessName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="text-foreground">{selectedAgency.address || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Suburb</div>
                    <div className="text-foreground">{(selectedAgency as any).suburb || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">City</div>
                    <div className="text-foreground">{(selectedAgency as any).city || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">CountryId</div>
                    <div className="text-foreground">{(selectedAgency as any).countryId ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">StateId</div>
                    <div className="text-foreground">{(selectedAgency as any).stateId ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Postcode</div>
                    <div className="text-foreground">{selectedAgency.postcode || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="text-foreground">{selectedAgency.phoneNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fax</div>
                    <div className="text-foreground">{(selectedAgency as any).faxNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Time Zone Id</div>
                    <div className="text-foreground">{(selectedAgency as any).timeZoneId ?? 'N/A'}</div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="text-xs text-muted-foreground">Company Website</div>
                    <div className="text-foreground break-all">{(selectedAgency as any).companyWebsite || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-4 border-b border-border">
                <h4 className="text-sm font-semibold text-foreground">Billing Details</h4>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">First Name</div>
                  <div className="text-foreground">{(selectedAgency as any).billingContactFirstName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Name</div>
                  <div className="text-foreground">{(selectedAgency as any).billingContactLastName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-foreground">{(selectedAgency as any).billingContactEmail || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone Number</div>
                  <div className="text-foreground">{(selectedAgency as any).billingPhoneNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Job Title</div>
                  <div className="text-foreground">{(selectedAgency as any).billingContactJobTitle || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fax Number</div>
                  <div className="text-foreground">{(selectedAgency as any).billingFaxNumber || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-4 border-b border-border">
                <h4 className="text-sm font-semibold text-foreground">Technical Contact</h4>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">First Name</div>
                  <div className="text-foreground">{(selectedAgency as any).technicalContactFirstName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Name</div>
                  <div className="text-foreground">{(selectedAgency as any).technicalContactLastName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-foreground">{(selectedAgency as any).technicalContactEmail || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone Number</div>
                  <div className="text-foreground">{(selectedAgency as any).technicalPhoneNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Job Title</div>
                  <div className="text-foreground">{(selectedAgency as any).technicalContactJobTitle || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fax Number</div>
                  <div className="text-foreground">{(selectedAgency as any).technicalContactFaxNumber || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Whitelabel Settings</h4>
                {whitelabelLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
              </div>
              <div className="p-5 space-y-5">
                {whitelabelSettings ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Logo URL</div>
                        <div className="truncate text-foreground" title={whitelabelSettings.logoUrl || ''}>{whitelabelSettings.logoUrl || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Custom Domain</div>
                        {/*<div className="text-foreground">{whitelabelSettings.customDomain || 'N/A'}</div>*/}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Active</div>
                        {/*<div className="text-foreground">{whitelabelSettings.isActive ? 'Yes' : 'No'}</div>*/}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Primary Color</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: whitelabelSettings.primaryColor || '#1E3A8A' }}></span>
                          <span className="text-foreground">{whitelabelSettings.primaryColor || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Secondary Color</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: whitelabelSettings.secondaryColor || '#059669' }}></span>
                          <span className="text-foreground">{whitelabelSettings.secondaryColor || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Accent Color</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: whitelabelSettings.accentColor || '#FACC15' }}></span>
                          <span className="text-foreground">{whitelabelSettings.accentColor || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="bg-background border border-border rounded-md p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Header Text</div>
                        {/* <div className="text-foreground">{whitelabelSettings.reportHeaderText || 'N/A'}</div> */}
                      </div>
                      <div className="bg-background border border-border rounded-md p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Footer Text</div>
                        {/*<div className="text-foreground">{whitelabelSettings.reportFooterText || 'N/A'}</div>*/}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="bg-background border border-border rounded-md p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Contact Details</div>
                        {/*<div className="text-foreground whitespace-pre-wrap break-words">{whitelabelSettings.contactDetails || 'N/A'}</div>*/}
                      </div>
                      <div className="bg-background border border-border rounded-md p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Terms & Conditions</div>
                        {/*<div className="text-foreground line-clamp-4 whitespace-pre-wrap break-words">{whitelabelSettings.termsAndConditions || 'N/A'}</div>*/}
                      </div>
                    </div>

                    {(whitelabelSettings.logoUrl /*|| whitelabelSettings.reportHeaderText*/) && (
                      <div className="border border-border rounded-md p-5">
                        <div className="text-xs text-muted-foreground mb-3">Preview</div>
                        <div
                          className="rounded-md p-5 text-center"
                          style={{
                            fontFamily: whitelabelSettings.fontFamily || 'Arial, sans-serif',
                            // backgroundColor: whitelabelSettings.backgroundColor || '#FFFFFF',
                            //color: whitelabelSettings.textColor || '#0F172A',
                          }}
                        >
                          {whitelabelSettings.logoUrl && (
                            <img
                              src={whitelabelSettings.logoUrl}
                              alt="Agency Logo"
                              className="h-12 mx-auto mb-3"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="text-lg font-bold" style={{ color: whitelabelSettings.primaryColor || '#1E3A8A' }}>
                            {/* {whitelabelSettings.reportHeaderText || 'Property Inspection Report'} */}
                          </div>
                          <div className="text-xs mt-1" style={{ color: whitelabelSettings.secondaryColor || '#059669' }}>
                            {/* {whitelabelSettings.contactDetails || 'Contact details will appear here'} */}
                          </div>
                          <div className="border-t mt-3 pt-2 text-xs" style={{ borderColor: whitelabelSettings.accentColor || '#FACC15', color: whitelabelSettings.accentColor || '#FACC15' }}>
                            {/* {whitelabelSettings.reportFooterText || 'This report is generated by EaseInspect'} */}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No whitelabel settings found for this agency.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal (Admin only) */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Add User to Agency">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await agencyManagementApi.addUser(newUser);
              alert('User added successfully');
              setNewUser({ username: '', email: '', password: '', role: 'PropertyManager' });
              setShowAddUser(false);
            } catch (err: any) {
              alert(err?.response?.data || 'Failed to add user');
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Username</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Role</label>
              <select
                className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-2 border"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="Admin">Admin</option>
                <option value="PropertyManager">PropertyManager</option>
                <option value="Inspector">Inspector</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding User...' : 'Add User'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-card shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-foreground">Agencies</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage property management agencies
          </p>
        </div>
        {loading ? (
          <div className="px-4 py-5 sm:px-6 text-center">Loading...</div>
        ) : (
          <div className="px-4 pb-6 sm:px-6 responsive-table-wrapper">
            <Table className="responsive-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Legal Business Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Suburb</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency, idx) => (
                  <TableRow key={agency.id ?? idx}>
                    <TableCell className="font-medium">{agency.legalBusinessName}</TableCell>
                    <TableCell>{agency.address}</TableCell>
                    <TableCell>{agency.suburb || '—'}</TableCell>
                    <TableCell>{agency.city || '—'}</TableCell>
                    <TableCell>{agency.country?.name || '—'}</TableCell>
                    <TableCell>{agency.state?.name || '—'}</TableCell>
                    <TableCell>{agency.phoneNumber || '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2 text-right">
                        <button
                          onClick={() => {
                            const agencyId = agency.id || (agency as any).agencyId;
                            const agencyName = agency.legalBusinessName || (agency as any).name || 'Agency';
                            if (!agencyId) { alert('Agency ID not found'); return; }
                            impersonateAgency(agencyId, agencyName);
                            window.location.href = '/dashboard';
                          }}
                          className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all border border-green-200"
                          title="Enter Agency"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(agency.id)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all border border-blue-200"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(agency)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all border border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedAgency(agency)}
                          className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all border border-gray-200"
                          title="Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {agencies.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-6">No agencies found. Create one to get started.</div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalCount > 0 && (
        <div className="px-4 py-4 sm:px-6 flex items-center justify-between border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-border bg-white px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-border disabled:opacity-50 hover:bg-gray-50"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(totalCount / pageSize)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-border disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Agency"
        widthClassName="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">
              {deleteTarget?.legalBusinessName || 'this agency'}
            </span>
            ? This action cannot be undone.
          </p>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteAgency}
              disabled={loading}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AgencyManagement;

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const roleLower = String(role || '').toLowerCase();
  const style =
    roleLower === 'admin'
      ? 'bg-primary/20 text-primary'
      : roleLower === 'propertymanager'
        ? 'bg-secondary/20 text-secondary'
        : roleLower === 'inspector'
          ? 'bg-accent/20 text-accent-foreground'
          : 'bg-muted text-muted-foreground';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>{role}</span>;
};

const UsersTable: React.FC<{ agencyId: string | number }> = ({ agencyId }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await agencyManagementApi.getUsers();
      setUsers(Array.isArray(data) ? data.filter((u: any) => !agencyId || u.agencyId === agencyId) : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading users...</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (!users.length) return <div className="text-sm text-muted-foreground">No users found.</div>;

  return (
    <div className="bg-card border rounded-md responsive-table-wrapper">
      <Table className="responsive-table">
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u: any, idx: number) => (
            <TableRow key={u.userId ?? u.domainUserId ?? idx}>
              <TableCell className="font-medium">{u.username}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><RoleBadge role={u.role} /></TableCell>
              <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

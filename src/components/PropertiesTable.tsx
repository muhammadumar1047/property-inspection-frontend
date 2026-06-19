"use client";

import React, { useEffect, useMemo, useState } from "react";
import { propertyApi } from "@/lib/api/property";
import { referenceApi } from "@/lib/api/reference";
import { agencyManagementApi } from "@/lib/api/agencyManagement";
import inspectionApi from "@/lib/api/inspection";
import type { PropertyResponse, InspectionResponse } from "@/types/api";
import { InspectionStatus, InspectionType } from "@/types/api";
import { getInspectionActions, getInspectionReportUrl } from "@/lib/inspection-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { layoutApi } from "@/lib/api/propertyLayout";
import { userApi } from "@/lib/api/user";
import { agencyApi } from "@/lib/api/agency";
import { Trash2, Eye, ChevronDown, ChevronUp, Edit, X, User, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/ui/Modal";
import { mergePropertyImages, parsePropertyImages, serializePropertyImages } from "@/lib/propertyImages";

interface PropertiesTableProps {
  onCreateProperty?: () => void;
  searchResults?: PropertyResponse[];
  searchQuery?: string;
  onClearSearch?: () => void;
  onEditProperty?: (id: string) => void;
}

export default function PropertiesTable({ onCreateProperty, onEditProperty, searchResults, searchQuery, onClearSearch }: PropertiesTableProps = {}) {
  const [data, setData] = useState<PropertyResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [layoutNamesById, setLayoutNamesById] = useState<Record<number, string>>({});
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [propertyManagers, setPropertyManagers] = useState<any[]>([]);
  const [propertyLayouts, setPropertyLayouts] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [inspectionTypes, setInspectionTypes] = useState<any[]>([]);
  const [inspectionStatuses, setInspectionStatuses] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const getInspectorDisplayName = (inspector: any): string => {
    const first = (inspector.firstName || inspector.FirstName || '').trim();
    const last = (inspector.lastName || inspector.LastName || '').trim();
    if (first || last) return `${first} ${last}`.trim();
    if (inspector.inspectorName) return inspector.inspectorName;
    if (inspector.username) return inspector.username;
    if (inspector.email) return inspector.email;
    return 'User';
  };

  // Filter state
  const [filters, setFilters] = useState<{
    isActive?: boolean;
    propertyType?: number;
    propertyManagerId?: string;
    tenant?: string;
    owner?: string;
    suburb?: string;
  }>({});

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inspection panel state
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [propertyInspections, setPropertyInspections] = useState<Record<string, InspectionResponse[]>>({});
  const [loadingInspections, setLoadingInspections] = useState<Record<string, boolean>>({});

  // Edit inspection modal state
  const [showEditInspectionModal, setShowEditInspectionModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [showCreateInspectionModal, setShowCreateInspectionModal] = useState(false);
  const [createInspectionProperty, setCreateInspectionProperty] = useState<{
    id: string;
    address: string;
    suburb?: string;
  } | null>(null);
  const [createInspection, setCreateInspection] = useState<{
    propertyId: string;
    inspectorId: string;
    inspectionType: number;
    inspectionDate: string;
    inspectionTime: string;
  }>({
    propertyId: '',
    inspectorId: '',
    inspectionType: InspectionType.Entry,
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionTime: '09:00',
  });
  const [editInspection, setEditInspection] = useState<{
    inspectionId: string;
    propertyId: string;
    inspectorId: number;
    inspectionTypeId: number;
    inspectionDate: string;
    inspectionTime: string;
    address: string;
  }>({
    inspectionId: '',
    propertyId: '',
    inspectorId: 0,
    inspectionTypeId: 0,
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionTime: '09:00',
    address: '',
  });
  const [editPropertySearchTerm, setEditPropertySearchTerm] = useState('');
  const [editPropertySearchResults, setEditPropertySearchResults] = useState<any[]>([]);
  const [showEditPropertyResults, setShowEditPropertyResults] = useState(false);
  const [selectedEditProperty, setSelectedEditProperty] = useState<any>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyResponse | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);

  // Tenancy edit modal state
  const [showTenancyEditModal, setShowTenancyEditModal] = useState(false);
  const [editingTenancy, setEditingTenancy] = useState<any>(null);
  const [tenancyFormData, setTenancyFormData] = useState<any>({});
  const [tenancyEditLoading, setTenancyEditLoading] = useState(false);

  // Landlord edit modal state
  const [showLandlordEditModal, setShowLandlordEditModal] = useState(false);
  const [editingLandlord, setEditingLandlord] = useState<any>(null);
  const [landlordFormData, setLandlordFormData] = useState<any>({});
  const [landlordEditLoading, setLandlordEditLoading] = useState(false);

  // Tenant management state
  const [tenantFormData, setTenantFormData] = useState<any>({});
  const [tenantEditLoading, setTenantEditLoading] = useState(false);
  const [showAddTenantForm, setShowAddTenantForm] = useState(false);
  const [newTenantFormData, setNewTenantFormData] = useState<any>({});
  const [addTenantLoading, setAddTenantLoading] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  // Add landlord state
  const [showAddLandlordForm, setShowAddLandlordForm] = useState(false);
  const [newLandlordFormData, setNewLandlordFormData] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [addLandlordLoading, setAddLandlordLoading] = useState(false);

  // New tenancy state
  const [showAddTenancyModal, setShowAddTenancyModal] = useState(false);
  const [newTenancyFormData, setNewTenancyFormData] = useState<any>({});
  const [addTenancyLoading, setAddTenancyLoading] = useState(false);

  // Landlord and tenancy detail modals
  const [showLandlordDetailModal, setShowLandlordDetailModal] = useState(false);
  const [showTenancyDetailModal, setShowTenancyDetailModal] = useState(false);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<any>(null);

  const router = useRouter();
  const { effectiveAgencyId } = useAuth();

  // Load initial data (property types, managers, layouts)
  useEffect(() => {
    let ignore = false;
    const loadInitialData = async () => {
      if (ignore) return;
      try {
        const [agency, propertyTypesData, layoutsData, typesData, statusesData, inspectorsData, usersPage] = await Promise.all([
          effectiveAgencyId ? agencyApi.getById(String(effectiveAgencyId)) : Promise.resolve(null as any),
          referenceApi.getPropertyTypes(),
          layoutApi.getAll(),
          inspectionApi.getInspectionTypes(),
          inspectionApi.getInspectionStatuses(),
          inspectionApi.getAvailableInspectors(),
          userApi.list({ agencyId: effectiveAgencyId ? String(effectiveAgencyId) : null, page: 1, pageSize: 500 }),
        ]);

        const countryId = agency?.countryId ?? null;
        const statesData = countryId ? await referenceApi.getStatesByCountry(countryId) : await referenceApi.getStates();

        setPropertyTypes(propertyTypesData || []);
        setPropertyLayouts(layoutsData || []);
        setStates(statesData || []);
        setPropertyManagers(usersPage?.data || []);

        // Normalize types and statuses to stable shape (id and name)
        const normalizedTypes = (typesData || []).map((t: any) => ({
          inspectionTypeId: t.id ?? t.inspectionTypeId ?? t.InspectionTypeId,
          name: t.name ?? t.inspectionTypeName ?? t.typeName ?? t.TypeName,
        })).filter((t: any) => t.inspectionTypeId != null);
        const normalizedStatuses = (statusesData || []).map((s: any) => ({
          inspectionStatusId: s.id ?? s.inspectionStatusId ?? s.InspectionStatusId,
          name: s.name ?? s.inspectionStatusName ?? s.statusName ?? s.StatusName,
        })).filter((s: any) => s.inspectionStatusId != null);
        setInspectionTypes(normalizedTypes);
        setInspectionStatuses(normalizedStatuses);
        setInspectors(inspectorsData || []);
      } catch (err: any) {
        console.error('Failed to load initial data:', err);
      }
    };

    loadInitialData();
    return () => { ignore = true; };
  }, [effectiveAgencyId]);

  // Load properties data when page, pageSize, or filters change
  useEffect(() => {
    let ignore = false;
    const loadProperties = async () => {
      if (ignore) return;
      setLoading(true);
      setError("");
      try {
        let response: { data: PropertyResponse[]; totalCount: number };

        const hasFilters =
          filters.isActive !== undefined ||
          filters.propertyType !== undefined ||
          (filters.propertyManagerId != null && String(filters.propertyManagerId).trim() !== "") ||
          (filters.tenant != null && String(filters.tenant).trim() !== "") ||
          (filters.owner != null && String(filters.owner).trim() !== "") ||
          (filters.suburb != null && String(filters.suburb).trim() !== "");

        if (searchResults && searchResults.length > 0 && !hasFilters) {
          // When in search mode and no additional filters, just use search results
          response = { data: searchResults, totalCount: searchResults.length };
        } else {
          // Always call backend when any filter is applied
          try {
            const apiResp = await propertyApi.getAllFiltered(page, pageSize, {
              isActive: filters.isActive,
              propertyType: filters.propertyType,
              propertyManagerId: filters.propertyManagerId,
              tenant: filters.tenant,
              owner: filters.owner,
              suburb: filters.suburb,
            } as any);
            response = { data: apiResp.data || [], totalCount: apiResp.totalCount || 0 };
          } catch (err: any) {
            // Check if it's the new ApiResponse format with Success=false
            if (err.response?.data?.Success === false) {
              setError(err.response.data.Message || "Failed to load properties");
              setData([]);
              setTotalCount(0);
              return;
            }
            throw err;
          }
        }

        setData(response.data);
        setTotalCount(response.totalCount);

        // fetch layout names for visible rows
        const uniqueLayoutIds = Array.from(
          new Set(
            (response?.data || [])
              .map((p: any) => p.propertyLayoutId as string | undefined)
              .filter((x): x is string => typeof x === 'string' && x.length > 0),
          ),
        );

        if (uniqueLayoutIds.length > 0) {
          const pairs = await Promise.all(
            uniqueLayoutIds.map(async (id) => {
              try {
                const layout = await layoutApi.getById(id);
                return [id, layout.name || `Layout #${id}`] as const;
              } catch {
                return [id, `Layout #${id}`] as const;
              }
            }),
          );
          const map: Record<string, string> = {};
          pairs.forEach(([id, name]) => {
            map[id] = name;
          });
          setLayoutNamesById(map as any);
        } else {
          setLayoutNamesById({});
        }
      } catch (e: any) {
        setError(e?.response?.data || e?.message || "Failed to load properties");
        setData([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
    return () => { ignore = true; };
  }, [page, pageSize, filters.isActive, filters.propertyType, filters.propertyManagerId, filters.tenant, filters.owner, filters.suburb, searchResults]);

  useEffect(() => {
    return () => {
      editImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editImagePreviews]);

  const [deleteTarget, setDeleteTarget] = useState<PropertyResponse | null>(null);

  const onDelete = (id: string) => {
    const target = data.find((p) => (p as any).id === id) || null;
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");
    try {
      await propertyApi.delete((deleteTarget as any).id);
      const apiResp = await propertyApi.getAllFiltered(page, pageSize, {
        isActive: filters.isActive,
        propertyType: filters.propertyType,
        propertyManagerId: filters.propertyManagerId,
        tenant: filters.tenant,
        owner: filters.owner,
        suburb: filters.suburb,
      });
      setData(apiResp.data || []);
      setTotalCount(apiResp.totalCount || 0);
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e?.response?.data || e?.message || "Failed to delete property");
    } finally {
      setLoading(false);
    }
  };

  const prettyInspection = (p: PropertyResponse) =>
    `Every ${p.inspectionFrequencyNumber} ${String(p.inspectionFrequencyType).toLowerCase()}(s)`;

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: (value === '' || value === null || value === undefined || Number.isNaN(value)) ? undefined : value
    }));
    setPage(1); // Reset to first page when filters change
  };

  const toggleInspectionPanel = async (propertyId: string) => {
    debugger;
    if (expandedPropertyId === propertyId) {
      // Close the panel
      setExpandedPropertyId(null);
    } else {
      // Open the panel and load inspections if not already loaded
      setExpandedPropertyId(propertyId);

      if (!propertyInspections[propertyId]) {
        setLoadingInspections(prev => ({ ...prev, [propertyId]: true }));
        try {
          const inspections = await inspectionApi.getByProperty(propertyId);
          setPropertyInspections(prev => ({ ...prev, [propertyId]: inspections || [] }));
        } catch (error) {
          console.error('Failed to load inspections:', error);
          setPropertyInspections(prev => ({ ...prev, [propertyId]: [] }));
        } finally {
          setLoadingInspections(prev => ({ ...prev, [propertyId]: false }));
        }
      }
    }
  };


  const handleShowLandlordDetails = (property: any) => {
    setSelectedPropertyForDetails(property);
    setShowLandlordDetailModal(true);
  };

  const handleShowTenancyDetails = (property: any) => {
    setSelectedPropertyForDetails(property);
    setShowTenancyDetailModal(true);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleEditProperty = (property: PropertyResponse) => {
    if (onEditProperty) {
      onEditProperty(property.id);
    } else {
      setEditingProperty(property);
      setEditFormData({
        propertyTypeId: (property as any).propertyTypeId ?? property.type,
        propertyManagerId: property.propertyManagerId,
        address1: property.address1,
        address2: property.address2 || '',
        cityOrSuburb: property.cityOrSuburb,
        stateId: (property as any).stateId ?? property.stateLookupId,
        postcode: property.postcode,
        isActive: property.isActive !== undefined ? property.isActive : true,
        inspectionFrequencyType: property.inspectionFrequencyType,
        inspectionFrequencyNumber: property.inspectionFrequencyNumber,
        keyNo: property.keyNo || '',
        alarmCode: property.alarmCode || '',
        propertyNotes: property.propertyNotes || '',
        propertyImages: serializePropertyImages(property.propertyImages) || '',
        propertyLayoutId: (() => {
          const raw = (property as any).PropertyLayoutId ?? (property as any).propertyLayoutId ?? null;
          const num = raw != null ? Number(raw) : null;
          return num && !Number.isNaN(num) ? num : null;
        })(),
      });
      setEditSelectedImages([]);
      setEditImagePreviews([]);
      setShowEditModal(true);
    }
  };

  const handleEditImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setEditSelectedImages([]);
      setEditImagePreviews([]);
      return;
    }

    const validImages = files.filter((file) => file.type.startsWith('image/'));
    if (validImages.length !== files.length) {
      setError("Only image files are allowed.");
    }

    editImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setEditSelectedImages(validImages);
    setEditImagePreviews(validImages.map((file) => URL.createObjectURL(file)));
  };

  const removeEditExistingImage = (url: string) => {
    const next = parsePropertyImages(editFormData.propertyImages).filter((img) => img !== url);
    setEditFormData({ ...editFormData, propertyImages: serializePropertyImages(next) });
  };

  const removeEditSelectedImage = (index: number) => {
    const nextFiles = editSelectedImages.filter((_, i) => i !== index);
    const nextPreviews = editImagePreviews.filter((_, i) => i !== index);
    editImagePreviews.forEach((url, i) => {
      if (i === index) URL.revokeObjectURL(url);
    });
    setEditSelectedImages(nextFiles);
    setEditImagePreviews(nextPreviews);
  };

  const handleUpdateProperty = async () => {
    if (!editingProperty) return;

    setEditLoading(true);
    try {
      // Map frequency to numeric ID
      const mapFrequencyToId = (freq: string): number => {
        const map: Record<string, number> = { Day: 0, Week: 1, Fortnight: 2, Month: 3, Quarter: 4, Year: 5 };
        return map[freq] ?? 3;
      };

      // Build Landlords payload
      const landlordsPayload = (editingProperty.landlords || []).map((l: any) => ({
        LandlordId: l.landlordId || 0,
        Name: l.name,
        Email: l.email,
        Phone: l.phone || ""
      }));

      // Build Tenancies payload (keep as-is; tenancy editing handled separately)
      const tenanciesPayload = (editingProperty.tenancies || []).map((t: any) => ({
        TenancyId: t.tenancyId || 0,
        FullName: t.fullName,
        Email: t.email,
        Mobile: t.mobile || "",
        LeaseStartDate: t.leaseStartDate ? new Date(t.leaseStartDate).toISOString() : null,
        LeaseEndDate: t.leaseEndDate ? new Date(t.leaseEndDate).toISOString() : null,
        CurrentRentAmount: t.currentRentAmount ?? 0,
        RentFrequencyId: mapFrequencyToId(t.rentFrequency || 'Month'),
        Active: !!t.active,
        Tenants: (t.tenants || []).map((tn: any) => ({
          TenantId: tn.tenantId || 0,
          FirstName: tn.firstName,
          LastName: tn.lastName,
          Email: tn.email,
          Phone: tn.phone || "",
        }))
      }));

      // Enforce only one active tenancy in payload
      const hasActive = tenanciesPayload.some(t => t.Active);
      if (hasActive) {
        let firstActiveSeen = false;
        for (const t of tenanciesPayload) {
          if (t.Active) {
            if (!firstActiveSeen) {
              firstActiveSeen = true;
            } else {
              t.Active = false;
            }
          }
        }
      }

      // Complete update payload (API expects PascalCase keys)
      const payload = {
        PropertyId: editingProperty.id,
        PropertyTypeLookupId: editFormData.propertyTypeId,
        PropertyManagerId: editFormData.propertyManagerId,
        Address1: editFormData.address1,
        Address2: editFormData.address2 || undefined,
        CityOrSuburb: editFormData.cityOrSuburb,
        StateLookupId: editFormData.stateId,
        Postcode: editFormData.postcode,
        InspectionFrequencyType: mapFrequencyToId(editFormData.inspectionFrequencyType),
        InspectionFrequencyNumber: editFormData.inspectionFrequencyNumber,
        KeyNo: editFormData.keyNo || undefined,
        AlarmCode: editFormData.alarmCode || undefined,
        PropertyNotes: editFormData.propertyNotes || undefined,
        PropertyImages: serializePropertyImages(editFormData.propertyImages),
        PropertyLayoutId: editFormData.propertyLayoutId ?? editingProperty.propertyLayoutId ?? null,
        Landlords: landlordsPayload,
        Tenancies: tenanciesPayload,
      } as any;

      await propertyApi.update(editingProperty.id, payload);

      if (editSelectedImages.length > 0) {
        const uploads = await propertyApi.uploadImages(
          editingProperty.id,
          editSelectedImages,
          effectiveAgencyId ? String(effectiveAgencyId) : undefined,
        );
        const newUrls = uploads.map((u) => u.fileUrl);
        const merged = mergePropertyImages(editFormData.propertyImages, newUrls);
        setEditFormData((prev: any) => ({ ...prev, propertyImages: serializePropertyImages(merged) }));
        setEditSelectedImages([]);
        setEditImagePreviews([]);
      }
      // Reload properties
      const allProperties = await propertyApi.getAll();

      // Apply client-side filtering
      let filteredProperties = Array.isArray(allProperties) ? allProperties : [];

      if (filters.isActive !== undefined) {
        filteredProperties = filteredProperties.filter(p => p.isActive === filters.isActive);
      }
      if (filters.propertyType) {
        filteredProperties = filteredProperties.filter(p => p.type === filters.propertyType);
      }
      if (filters.propertyManagerId) {
        filteredProperties = filteredProperties.filter(p => p.propertyManagerId === filters.propertyManagerId);
      }
      if (filters.tenant) {
        filteredProperties = filteredProperties.filter(p =>
          (p.tenancies || []).some(t =>
            t.fullName?.toLowerCase().includes(filters.tenant!.toLowerCase()) ||
            (t.tenants || []).some(tenant =>
              `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(filters.tenant!.toLowerCase())
            )
          )
        );
      }
      if (filters.owner) {
        filteredProperties = filteredProperties.filter(p =>
          (p.landlords || []).some(l =>
            l.name?.toLowerCase().includes(filters.owner!.toLowerCase())
          )
        );
      }
      if (filters.suburb) {
        filteredProperties = filteredProperties.filter(p =>
          p.cityOrSuburb?.toLowerCase().includes(filters.suburb!.toLowerCase())
        );
      }

      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

      setData(paginatedProperties);
      setTotalCount(filteredProperties.length);

      setShowEditModal(false);
      setEditingProperty(null);
      alert('Property updated successfully!');
    } catch (error: any) {
      const data = error?.response?.data;
      let msg = error?.message || 'Unknown error';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (typeof data === 'object') {
          if (data.errors) {
            const all = Object.values<any>(data.errors).flat().filter((x) => typeof x === 'string') as string[];
            if (all.length) msg = all.join(' | ');
          } else if (typeof data.message === 'string') msg = data.message;
          else if (typeof data.title === 'string') msg = data.title;
        }
      }
      alert('Failed to update property: ' + msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditTenancy = (tenancy: any) => {
    setEditingTenancy(tenancy);
    setTenancyFormData({
      fullName: tenancy.fullName,
      email: tenancy.email,
      mobile: tenancy.mobile || '',
      leaseStartDate: tenancy.leaseStartDate ? new Date(tenancy.leaseStartDate).toISOString().split('T')[0] : '',
      leaseEndDate: tenancy.leaseEndDate ? new Date(tenancy.leaseEndDate).toISOString().split('T')[0] : '',
      currentRentAmount: tenancy.currentRentAmount,
      rentFrequency: tenancy.rentFrequency || 'Month', // Default to Month if not provided
      active: tenancy.active,
    });
    setShowTenancyEditModal(true);
  };

  const handleUpdateTenancy = async () => {
    if (!editingTenancy || !editingProperty) return;

    setTenancyEditLoading(true);
    try {
      // Map rent frequency to ID
      const mapFrequencyToId = (freq: string): number => {
        const map: Record<string, number> = { Day: 0, Week: 1, Fortnight: 2, Month: 3, Quarter: 4, Year: 5 };
        return map[freq] ?? 3; // Default to Month
      };
      // Update local state (UI shape) and enforce single active tenancy
      const editedActive = !!tenancyFormData.active;
      const updatedLocalTenancies = (editingProperty.tenancies || []).map((tenancy: any) => {
        const isEdited = tenancy.tenancyId === editingTenancy.tenancyId;
        if (isEdited) {
          return {
            ...tenancy,
            fullName: tenancyFormData.fullName,
            email: tenancyFormData.email,
            mobile: tenancyFormData.mobile || '',
            leaseStartDate: tenancyFormData.leaseStartDate ? new Date(tenancyFormData.leaseStartDate).toISOString() : '',
            leaseEndDate: tenancyFormData.leaseEndDate ? new Date(tenancyFormData.leaseEndDate).toISOString() : '',
            currentRentAmount: tenancyFormData.currentRentAmount,
            rentFrequency: tenancyFormData.rentFrequency,
            active: editedActive,
          };
        }
        return { ...tenancy, active: editedActive ? false : !!tenancy.active };
      });

      setEditingProperty({
        ...editingProperty,
        tenancies: updatedLocalTenancies,
      });

      // Keep tenancy modal in sync and open
      const updatedForModal = updatedLocalTenancies.find((t: any) => t.tenancyId === editingTenancy.tenancyId);
      if (updatedForModal) setEditingTenancy(updatedForModal);

      // Close the modal after successful local update
      setShowTenancyEditModal(false);
      setEditingTenancy(null);
    } catch (error: any) {
      console.error('Tenancy update error:', error);
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        JSON.stringify(error) ||
        'Unknown error';
      alert('Failed to update tenancy: ' + errorMessage);
    } finally {
      setTenancyEditLoading(false);
    }
  };

  const handleAddNewTenancy = () => {
    setNewTenancyFormData({
      fullName: '',
      email: '',
      mobile: '',
      leaseStartDate: '',
      leaseEndDate: '',
      currentRentAmount: 0,
      rentFrequency: 'Month',
      active: false, // New tenancies are inactive by default
    });
    setShowAddTenancyModal(true);
  };

  const handleSaveNewTenancy = () => {
    if (!editingProperty) return;
    if (!newTenancyFormData.fullName || !newTenancyFormData.email || !newTenancyFormData.leaseStartDate || !newTenancyFormData.leaseEndDate) return;

    const newTenancy = {
      tenancyId: 0,
      propertyId: editingProperty.id,
      fullName: newTenancyFormData.fullName,
      email: newTenancyFormData.email,
      mobile: newTenancyFormData.mobile || '',
      leaseStartDate: newTenancyFormData.leaseStartDate ? new Date(newTenancyFormData.leaseStartDate).toISOString() : '',
      leaseEndDate: newTenancyFormData.leaseEndDate ? new Date(newTenancyFormData.leaseEndDate).toISOString() : '',
      currentRentAmount: newTenancyFormData.currentRentAmount ?? 0,
      rentFrequency: newTenancyFormData.rentFrequency || 'Month',
      active: !!newTenancyFormData.active,
      tenants: [] as any[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    // If new tenancy is set active, deactivate others
    const shouldActivate = !!newTenancy.active;
    const existing = (editingProperty.tenancies || []).map((t: any) => ({
      ...t,
      active: shouldActivate ? false : !!t.active,
    }));

    setEditingProperty({
      ...editingProperty,
      tenancies: [...existing, newTenancy],
    });

    // Optionally sync the modal if it is showing a new empty state

    setNewTenancyFormData({});
    setShowAddTenancyModal(false);
  };

  const handleEditLandlord = (landlord: any) => {
    setEditingLandlord(landlord);
    setLandlordFormData({
      name: landlord.name,
      email: landlord.email,
      phone: landlord.phone || '',
    });
    setShowLandlordEditModal(true);
  };

  const handleUpdateLandlord = () => {
    if (!editingLandlord || !editingProperty) return;

    setLandlordEditLoading(true);
    try {
      const updatedLocalLandlords = (editingProperty.landlords || []).map((landlord: any) =>
        landlord.landlordId === editingLandlord.landlordId
          ? { ...landlord, name: landlordFormData.name, email: landlordFormData.email, phone: landlordFormData.phone || '' }
          : landlord
      );

      setEditingProperty({
        ...editingProperty,
        landlords: updatedLocalLandlords,
      });

      setShowLandlordEditModal(false);
      setEditingLandlord(null);
    } finally {
      setLandlordEditLoading(false);
    }
  };


  const handleEditTenant = (tenant: any) => {
    setEditingTenantId(tenant.tenantId);
    setTenantFormData({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone || '',
    });
  };

  const handleUpdateTenant = () => {
    debugger;
    if (!editingTenantId || !editingProperty) return;

    setTenantEditLoading(true);
    try {
      const updatedLocalTenancies = (editingProperty.tenancies || []).map((tenancy: any) => ({
        ...tenancy,
        tenants: (tenancy.tenants || []).map((tenant: any) =>
          tenant.tenantId === editingTenantId
            ? { ...tenant, firstName: tenantFormData.firstName, lastName: tenantFormData.lastName, email: tenantFormData.email, phone: tenantFormData.phone || '' }
            : tenant
        ),
      }));

      setEditingProperty({
        ...editingProperty,
        tenancies: updatedLocalTenancies,
      });

      // Sync tenancy modal with updated tenants
      const parent = updatedLocalTenancies.find((t: any) => t.tenancyId === (editingTenancy && editingTenancy.tenancyId));
      if (parent) setEditingTenancy(parent);

      // Close inline edit on success
      setEditingTenantId(null);
      setTenantFormData({});
    } finally {
      setTenantEditLoading(false);
    }
  };

  const handleDeleteTenant = (tenantId: number) => {
    if (!confirm('Are you sure you want to delete this tenant?') || !editingProperty) return;

    const updatedLocalTenancies = (editingProperty.tenancies || []).map((tenancy: any) => ({
      ...tenancy,
      tenants: (tenancy.tenants || []).filter((t: any) => t.tenantId !== tenantId),
    }));

    setEditingProperty({
      ...editingProperty,
      tenancies: updatedLocalTenancies,
    });
    // Sync tenancy modal view
    const parent = updatedLocalTenancies.find((t: any) => t.tenancyId === (editingTenancy && editingTenancy.tenancyId));
    if (parent) setEditingTenancy(parent);
  };

  const handleAddTenant = () => {
    if (!editingTenancy || !editingProperty) return;

    const newTenant = {
      tenantId: 0,
      tenancyId: editingTenancy.tenancyId,
      firstName: newTenantFormData.firstName,
      lastName: newTenantFormData.lastName,
      email: newTenantFormData.email,
      phone: newTenantFormData.phone || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    const updatedLocalTenancies = (editingProperty.tenancies || []).map((tenancy: any) =>
      tenancy.tenancyId === editingTenancy.tenancyId
        ? { ...tenancy, tenants: [...(tenancy.tenants || []), newTenant] }
        : tenancy
    );

    setEditingProperty({
      ...editingProperty,
      tenancies: updatedLocalTenancies,
    });
    // Sync tenancy modal view
    const parent = updatedLocalTenancies.find((t: any) => t.tenancyId === (editingTenancy && editingTenancy.tenancyId));
    if (parent) setEditingTenancy(parent);

    setNewTenantFormData({});
    setShowAddTenantForm(false);
  };

  // Inspection edit handlers
  const handleEditInspection = (inspection: any) => {
    setEditingInspection(inspection);

    // Populate the edit form with existing inspection data
    const inspectionDate = new Date(inspection.inspectionDate).toISOString().split('T')[0];
    const inspectionTime = inspection.inspectionTime || '09:00';

    setEditInspection({
      inspectionId: inspection.id,
      propertyId: inspection.propertyId,
      inspectorId: inspection.inspectorId,
      inspectionTypeId: inspection.inspectionTypeId || inspection.inspectionType,
      inspectionDate: inspectionDate,
      inspectionTime: inspectionTime,
      address: inspection.propertyAddress || '',
    });

    // Set the property search term and selected property for edit form
    setEditPropertySearchTerm(inspection.propertyAddress || '');
    setSelectedEditProperty({
      id: inspection.propertyId,
      address: inspection.propertyAddress || '',
    });

    setShowEditInspectionModal(true);
  };

  const handleOpenCreateInspection = (property: PropertyResponse) => {
    setCreateInspectionProperty({
      id: property.id,
      address: property.address1 || (property as any).Address1 || `Property #${property.id}`,
      suburb: property.cityOrSuburb || (property as any).PropertySuburb,
    });
    setCreateInspection({
      propertyId: property.id,
      inspectorId: '',
      inspectionType: InspectionType.Entry,
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectionTime: '09:00',
    });
    setShowCreateInspectionModal(true);
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createInspection.propertyId) return;
    if (!createInspection.inspectorId) {
      setError('Please select an inspector.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const ensureSeconds = (t: string) => t.length === 5 ? `${t}:00` : t;
      const payload = {
        propertyId: createInspection.propertyId,
        agencyId: effectiveAgencyId ? String(effectiveAgencyId) : null,
        inspectionType: Number(createInspection.inspectionType),
        inspectionStatus: InspectionStatus.Pending,
        inspectorId: createInspection.inspectorId,
        inspectionDate: new Date(createInspection.inspectionDate).toISOString(),
        inspectionTime: ensureSeconds(createInspection.inspectionTime),
      };

      const createdInspection = await inspectionApi.create(payload as any);
      const enriched = {
        ...createdInspection,
        propertyAddress: createdInspection.propertyAddress || createInspectionProperty?.address,
        propertySubhurb: createdInspection.propertySubhurb || createInspectionProperty?.suburb,
      };

      const propertyId = createInspection.propertyId;
      setPropertyInspections(prev => ({
        ...prev,
        [propertyId]: [enriched, ...(prev[propertyId] || [])],
      }));

      setShowCreateInspectionModal(false);
      setCreateInspectionProperty(null);
      setCreateInspection({
        propertyId: '',
        inspectorId: '',
        inspectionType: InspectionType.Entry,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectionTime: '09:00',
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.Message || 'Failed to create inspection';
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (inspectionId: string) => {
    const url = getInspectionReportUrl(inspectionId);
    try {
      window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
  };

  const handleEditReport = (inspectionId: string, propertyId?: string) => {
    const targetPropertyId = propertyId || '';
    const url = `/properties/${targetPropertyId}?viewReportForInspectionId=${inspectionId}&mode=edit`;
    try { window.open(url, '_blank'); } catch { window.location.href = url; }
  };

  const handleCloseReport = async (inspectionId: string, propertyId: string) => {
    try {
      setLoading(true);
      const inspection = await inspectionApi.getById(inspectionId);
      const ok = await inspectionApi.update(inspectionId, {
        ...inspection,
        inspectionStatus: InspectionStatus.Closed,
      } as any);

      if (!ok) throw new Error('Failed to close report');

      const updated = await inspectionApi.getById(inspectionId);
      setPropertyInspections(prev => ({
        ...prev,
        [propertyId]: (prev[propertyId] || []).map(x => x.id === inspectionId ? updated : x),
      }));
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to close report');
    } finally { setLoading(false); }
  };

  const handleReopenReport = async (inspectionId: string, propertyId: string) => {
    try {
      setLoading(true);
      const inspection = await inspectionApi.getById(inspectionId);
      const ok = await inspectionApi.update(inspectionId, {
        ...inspection,
        inspectionStatus: InspectionStatus.Completed,
      } as any);

      if (!ok) throw new Error('Failed to reopen report');

      const updated = await inspectionApi.getById(inspectionId);
      setPropertyInspections(prev => ({
        ...prev,
        [propertyId]: (prev[propertyId] || []).map(x => x.id === inspectionId ? updated : x),
      }));
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to reopen report');
    } finally { setLoading(false); }
  };

  const handleDeleteInspection = async (inspectionId: string, propertyId: string) => {
    if (!confirm('Are you sure you want to delete this inspection?')) return;
    try {
      setLoading(true);
      await inspectionApi.delete(inspectionId as any);
      setPropertyInspections(prev => ({
        ...prev,
        [propertyId]: (prev[propertyId] || []).filter(x => x.id !== inspectionId),
      }));
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to delete inspection');
    } finally { setLoading(false); }
  };

  const handleUpdateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const ensureSeconds = (t: string) => t.length === 5 ? `${t}:00` : t;
      const payload = {
        InspectionId: editInspection.inspectionId.toString(),
        PropertyId: editInspection.propertyId,
        InspectionTypeId: editInspection.inspectionTypeId,
        InspectionStatusId: editingInspection?.statusId || 1,
        InspectorId: editInspection.inspectorId,
        Address: editInspection.address,
        InspectionDate: editInspection.inspectionDate,
        InspectionTime: ensureSeconds(editInspection.inspectionTime),
      };

      const updatedInspection = await inspectionApi.update(editInspection.inspectionId as any, {
        id: editInspection.inspectionId,
        propertyId: editInspection.propertyId,
        inspectionType: Number(editInspection.inspectionTypeId),
        inspectionStatus: editingInspection?.inspectionStatus ?? editingInspection?.statusId ?? 1,
        inspectorId: String(editInspection.inspectorId),
        address: editInspection.address,
        inspectionDate: new Date(editInspection.inspectionDate).toISOString(),
        inspectionTime: ensureSeconds(editInspection.inspectionTime),
      } as any);
      alert('Inspection updated successfully');

      // Update the inspection in the property inspections list
      setPropertyInspections(prev => ({
        ...prev,
        [editInspection.propertyId]: prev[editInspection.propertyId]?.map(inspection =>
          inspection.id === editInspection.inspectionId.toString() ? updatedInspection : inspection
        ) || []
      }));

      // Reset form and close modal
      setEditInspection({
        inspectionId: '',
        propertyId: '',
        inspectorId: 0,
        inspectionTypeId: 0,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectionTime: '09:00',
        address: '',
      });
      setSelectedEditProperty(null);
      setEditPropertySearchTerm('');
      setShowEditPropertyResults(false);
      setShowEditInspectionModal(false);
      setEditingInspection(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update inspection');
      alert(err.response?.data?.message || 'Failed to update inspection');
    } finally {
      setLoading(false);
    }
  };

  const searchEditProperties = async (query: string) => {
    if (query.length < 2) {
      setEditPropertySearchResults([]);
      setShowEditPropertyResults(false);
      return;
    }

    try {
      const results = await inspectionApi.searchProperties(query);
      setEditPropertySearchResults(results || []);
      setShowEditPropertyResults(true);
    } catch (error) {
      console.error('Property search failed:', error);
      setEditPropertySearchResults([]);
    }
  };

  const selectEditProperty = (property: any) => {
    setSelectedEditProperty(property);
    setEditInspection(prev => ({ ...prev, propertyId: property.id, address: property.address }));
    setEditPropertySearchTerm(property.address);
    setShowEditPropertyResults(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Properties</h2>
          {searchQuery && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Search: "{searchQuery}"
              </span>
              <span className="text-sm text-muted-foreground">
                Showing {data.length} of {totalCount} results
              </span>
              {onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="text-xs text-primary-600 hover:text-primary-800 underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
        <div className="space-x-2">
          <button
            onClick={() => onCreateProperty ? onCreateProperty() : router.push('/properties/create')}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Create Property
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive-600">{error}</div>}

      {/* Fancy Filter Section */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Advanced Filters</h3>
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-card border border-muted-300 rounded-lg text-sm font-medium text-muted-700 hover:bg-muted-50 transition-colors shadow-sm"
          >
            Clear All
          </button>
        </div>

        <div className="responsive-filters">
          {/* Active/Inactive Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-700 mb-2">Status</label>
            <select
              className="block w-full px-3 py-2 border border-muted-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
              value={filters.isActive === undefined ? '' : filters.isActive.toString()}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('isActive', value === '' ? undefined : value === 'true');
              }}
            >
              <option value="">All Properties</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Property Type Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-700 mb-2">Property Type</label>
            <select
              className="block w-full px-3 py-2 border border-muted-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
              value={filters.propertyType?.toString() || ''}
              onChange={(e) => handleFilterChange('propertyType', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">All Types</option>
              {propertyTypes.map((type) => (
                <option key={String(type.propertyTypeId)} value={String(type.propertyTypeId)}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Property Manager Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-700 mb-2">Manager</label>
            <select
              className="block w-full px-3 py-2 border border-muted-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
              value={filters.propertyManagerId?.toString() || ''}
              onChange={(e) => handleFilterChange('propertyManagerId', e.target.value || undefined)}
            >
              <option value="">All Managers</option>
              {propertyManagers.map((manager) => (
                <option
                  key={String(manager.id ?? manager.userId ?? manager.UserId ?? manager.identityUserId ?? manager.email ?? manager.username ?? '')}
                  value={String(manager.id ?? manager.userId ?? manager.UserId ?? '')}
                >
                  {`${(manager.firstName || manager.FirstName || '').trim()} ${(manager.lastName || manager.LastName || '').trim()}`.trim() || manager.username || manager.Username}
                </option>
              ))}
            </select>
          </div>

          {/* Tenant Search */}
          <div>
            <label className="block text-sm font-medium text-muted-700 mb-2">Tenant</label>
            <input
              type="text"
              placeholder="Search by tenant name..."
              className="block w-full px-3 py-2 border border-muted-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
              value={filters.tenant || ''}
              onChange={(e) => handleFilterChange('tenant', e.target.value)}
            />
          </div>

          {/* Landlord Search */}
          <div>
            <label className="block text-sm font-medium text-muted-700 mb-2">Landlord</label>
            <input
              type="text"
              placeholder="Search by landlord name..."
              className="block w-full px-3 py-2 border border-muted-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
              value={filters.owner || ''}
              onChange={(e) => handleFilterChange('owner', e.target.value)}
            />
          </div>

          {/* Suburb Search */}
          <div>
            <label className="block text-sm font-medium text-muted-700 mb-2">Suburb</label>
            <input
              type="text"
              placeholder="Search by suburb..."
              className="block w-full px-3 py-2 border border-muted-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
              value={filters.suburb || ''}
              onChange={(e) => handleFilterChange('suburb', e.target.value)}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.isActive !== undefined || filters.propertyType || filters.propertyManagerId || filters.tenant || filters.owner || filters.suburb) && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-700">Active filters:</span>
              {filters.isActive !== undefined && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Status: {filters.isActive ? 'Active' : 'Inactive'}
                  <button
                    onClick={() => handleFilterChange('isActive', undefined)}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.propertyType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                  Type: {propertyTypes.find(t => t.propertyTypeId === filters.propertyType)?.name}
                  <button
                    onClick={() => handleFilterChange('propertyType', undefined)}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.propertyManagerId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Manager: {(() => {
                    const m = propertyManagers.find(m => (m.userId || m.UserId) === filters.propertyManagerId);
                    if (!m) return '';
                    const first = (m.firstName || m.FirstName || '').trim();
                    const last = (m.lastName || m.LastName || '').trim();
                    return `${first} ${last}`.trim() || m.username || m.Username;
                  })()}
                  <button
                    onClick={() => handleFilterChange('propertyManagerId', undefined)}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.tenant && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                  Tenant: {filters.tenant}
                  <button
                    onClick={() => handleFilterChange('tenant', undefined)}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-yellow-400 hover:bg-yellow-200 hover:text-yellow-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.owner && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Landlord: {filters.owner}
                  <button
                    onClick={() => handleFilterChange('owner', undefined)}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-orange-400 hover:bg-orange-200 hover:text-orange-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.suburb && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                  Suburb: {filters.suburb}
                  <button
                    onClick={() => handleFilterChange('suburb', undefined)}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-pink-400 hover:bg-pink-200 hover:text-pink-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-md responsive-table-wrapper">
        <Table className="responsive-table">
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Suburb</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Postcode</TableHead>
              <TableHead>Inspection Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
              <TableHead className="w-32 text-right">Inspections</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-6">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">No properties found.</TableCell></TableRow>
            ) : (
              data.map((p) => (
                <React.Fragment key={p.id}>
                  <TableRow className="hover:bg-primary/5">
                    <TableCell className="font-medium min-w-[100px]">
                      <div className="flex items-center">
                        <div className="w-20 h-14 rounded-md overflow-hidden bg-muted-100 flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                          {parsePropertyImages(p.propertyImages)[0] ? (
                            <img
                              src={parsePropertyImages(p.propertyImages)[0]}
                              alt={`Property ${p.id}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                  nextElement.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex items-center justify-center text-muted-400 ${parsePropertyImages(p.propertyImages)[0] ? 'hidden' : 'flex'}`}
                            style={{ display: parsePropertyImages(p.propertyImages)[0] ? 'none' : 'flex' }}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </div>
                        {/* <span className="text-sm font-semibold max-w-[150px] leading-tight break-words">{p.name || (p as any).Name || `#${p.id}`}</span> */}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const typeId = (p as any).type ?? (p as any).PropertyTypeLookupId ?? (p as any).propertyTypeId;
                        const t = propertyTypes.find((pt: any) => pt.propertyTypeId === typeId);
                        return (t?.name || t?.typeName || t?.TypeName || 'Unknown').toString();
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const explicit = (p as any).propertyManagerName || (p as any).PropertyManagerName;
                        if (explicit) return explicit;
                        const pid = (p as any).propertyManagerId ?? (p as any).PropertyManagerId;
                        if (!pid) return 'N/A';
                        const m = propertyManagers.find((mm: any) => (mm.userId || mm.UserId) === pid);
                        if (!m) return 'N/A';
                        const first = (m.firstName || m.FirstName || '').toString().trim();
                        const last = (m.lastName || m.LastName || '').toString().trim();
                        const full = `${first} ${last}`.trim();
                        return full || m.username || m.Username || 'N/A';
                      })()}
                    </TableCell>
                    <TableCell>
                      {p.address1 || (p as any).Address1 || (p as any).address || (p as any).Address || '-'}
                    </TableCell>
                    <TableCell>{p.cityOrSuburb}</TableCell>
                    <TableCell>
                      {(() => {
                        const sid = (p as any).stateLookupId ?? (p as any).stateId ?? (p as any).StateLookupId;
                        const s = states.find((st: any) => st.id === sid);
                        return (s?.name || s?.stateName || s?.StateName || '-').toString();
                      })()}
                    </TableCell>
                    <TableCell>{p.postcode}</TableCell>
                    <TableCell>{prettyInspection(p)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(p as any).isActive || (p as any).IsActive
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                      >
                        {(p as any).isActive || (p as any).IsActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditProperty(p)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-primary-50 transition-colors"
                          title="Edit property"
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4 text-black" />
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-destructive-50 transition-colors"
                          title="Delete property"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 text-destructive-600" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => toggleInspectionPanel(p.id)}
                        className="inline-flex items-center justify-center px-3 py-1 rounded-md border text-xs font-medium hover:bg-muted-100"
                        disabled={loading}
                      >
                        {expandedPropertyId === p.id ? 'Hide Inspections' : 'Show Inspections'}
                      </button>
                    </TableCell>
                  </TableRow>

                  {/* Inspection Panel */}
                  <TableRow>
                    <TableCell colSpan={11} className="p-0">
                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out transform ${expandedPropertyId === p.id
                          ? 'max-h-screen opacity-100 translate-y-0'
                          : 'max-h-0 opacity-0 -translate-y-2'
                          }`}
                      >
                        <div className="bg-muted-50 border-t border-muted-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-foreground">Property Inspections</h4>
                              <span className="text-xs text-muted-500">
                                {propertyInspections[p.id]?.length || 0} inspection(s)
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCreateInspection(p)}
                            >
                              Create New Inspection
                            </Button>
                          </div>

                          {loadingInspections[p.id] ? (
                            <div className="text-center py-4">
                              <div className="inline-flex items-center text-sm text-muted-500">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-muted-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading inspections...
                              </div>
                            </div>
                          ) : propertyInspections[p.id]?.length > 0 ? (
                            <div className="responsive-table-wrapper">
                              <Table className="responsive-table">
                                <TableHeader>
                                  <TableRow className="bg-primary/5">
                                    <TableHead className="text-foreground">Inspection ID</TableHead>
                                    <TableHead className="text-foreground">Property Address</TableHead>
                                    <TableHead className="text-foreground">Suburb</TableHead>
                                    <TableHead className="text-foreground">Inspector Name</TableHead>
                                    <TableHead className="text-foreground">Inspection Type</TableHead>
                                    <TableHead className="text-foreground">Date & Time</TableHead>
                                    <TableHead className="text-foreground">Status</TableHead>
                                    <TableHead className="text-right text-foreground">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {propertyInspections[p.id].map((inspection) => (
                                    <TableRow key={inspection.id}>
                                      <TableCell>
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                                          {inspection.id}
                                        </span>
                                      </TableCell>
                                      <TableCell className="font-medium text-foreground">
                                        {(inspection as any).propertyAddress || p.address1}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {(inspection as any).propertySubhurb || p.cityOrSuburb || '-'}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">{(inspection as any).inspectorName}</TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {
                                          inspectionTypes.find(t => t.inspectionTypeId === ((inspection as any).inspectionType || (inspection as any).inspectionTypeId))?.name
                                          ||
                                          ({
                                            [InspectionType.Entry]: 'Entry',
                                            [InspectionType.Exit]: 'Exit',
                                            [InspectionType.Routine]: 'Routine'
                                          } as Record<number, string>)[Number((inspection as any).inspectionType || (inspection as any).inspectionTypeId)]
                                          || (inspection as any).inspectionTypeName
                                          || 'Unknown'
                                        }
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {new Date((inspection as any).inspectionDate).toISOString().split('T')[0]} {(inspection as any).inspectionTime}
                                      </TableCell>
                                      <TableCell>
                                        {(() => {
                                          const statusId = Number((inspection as any).inspectionStatusId || (inspection as any).inspectionStatus || 0);
                                          const statusName = inspectionStatuses.find(s => s.inspectionStatusId === statusId)?.name ||
                                            (inspection as any).inspectionStatusName ||
                                            (inspection as any).statusName ||
                                            ({
                                              1: 'Pending',
                                              2: 'InProgress',
                                              3: 'InSync',
                                              4: 'Completed',
                                              5: 'Closed'
                                            } as Record<number, string>)[statusId] ||
                                            'Unknown';

                                          const colorClass = ([3, 4, 5].includes(statusId))
                                            ? 'bg-success-100 text-success-800'
                                            : 'bg-warning-100 text-warning-800';

                                          return (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-medium rounded-full ${colorClass}`}>
                                              {statusName}
                                            </span>
                                          );
                                        })()}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {(() => {
                                          const statusId = Number((inspection as any).inspectionStatusId || (inspection as any).inspectionStatus || 0);
                                          const actions = getInspectionActions({
                                            statusId,
                                            onEditInspection: () => handleEditInspection(inspection),
                                            onDeleteInspection: () => handleDeleteInspection(inspection.id, p.id),
                                            onViewReport: () => handleViewReport(inspection.id),
                                            onCloseReport: () => handleCloseReport(inspection.id, p.id),
                                            onReopenReport: () => handleReopenReport(inspection.id, p.id),
                                          });

                                          if (actions.emptyLabel) {
                                            return <span className="text-xs text-muted-foreground italic">{actions.emptyLabel}</span>;
                                          }

                                          const hasPrimary = !!actions.primary;
                                          const menuItems = actions.menu ?? [];

                                          return (
                                            <div className="inline-flex items-center gap-2">
                                              {actions.primary && (
                                                <button
                                                  onClick={actions.primary.onClick}
                                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                                                >
                                                  {actions.primary.label}
                                                </button>
                                              )}
                                              {menuItems.length > 0 && (
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger
                                                    className={
                                                      hasPrimary
                                                        ? "px-2 py-1 border rounded-md text-xs hover:bg-muted-100 flex items-center justify-center"
                                                        : "px-3 py-1 border rounded-md text-xs hover:bg-muted-100"
                                                    }
                                                    aria-label="More actions"
                                                  >
                                                    {hasPrimary ? <SlidersHorizontal className="w-4 h-4" /> : "Actions"}
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                    {menuItems.map(item => (
                                                      <DropdownMenuItem key={item.key} onClick={item.onClick}>
                                                        {item.label}
                                                      </DropdownMenuItem>
                                                    ))}
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-500 text-sm">
                              No inspections found for this property.
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Property"
        widthClassName="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {(deleteTarget as any)?.name || (deleteTarget as any)?.Name || `property #${deleteTarget?.id}`}
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
              onClick={confirmDelete}
              disabled={loading}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-muted-foreground">Page {page} of {totalPages} • {totalCount} results</div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-border bg-card px-2 text-sm" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border border-border disabled:opacity-50">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border border-border disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Edit Property Modal */}
      {showEditModal && editingProperty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Edit Property</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted-400 hover:text-muted-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address 1 */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Address *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.address1}
                  onChange={(e) => setEditFormData({ ...editFormData, address1: e.target.value })}
                />
              </div>

              {/* Address 2 */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Address 2</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.address2}
                  onChange={(e) => setEditFormData({ ...editFormData, address2: e.target.value })}
                />
              </div>

              {/* City/Suburb */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">City/Suburb *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.cityOrSuburb}
                  onChange={(e) => setEditFormData({ ...editFormData, cityOrSuburb: e.target.value })}
                />
              </div>

              {/* Postcode */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Postcode *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.postcode}
                  onChange={(e) => setEditFormData({ ...editFormData, postcode: e.target.value })}
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">State *</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.stateId}
                  onChange={(e) => setEditFormData({ ...editFormData, stateId: e.target.value })}
                >
                  {states.map((s: any) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.name || s.stateName || s.StateName}</option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Property Type *</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.propertyTypeId}
                  onChange={(e) => setEditFormData({ ...editFormData, propertyTypeId: parseInt(e.target.value) })}
                >
                  {propertyTypes.map((type) => (
                    <option key={type.propertyTypeId} value={type.propertyTypeId}>
                      {(type.name || type.typeName || type.TypeName || '').toString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Manager */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Property Manager *</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.propertyManagerId}
                  onChange={(e) => setEditFormData({ ...editFormData, propertyManagerId: e.target.value })}
                >
                  {propertyManagers.map((manager) => (
                    <option
                      key={String(manager.id ?? manager.userId ?? manager.UserId ?? manager.identityUserId ?? manager.email ?? manager.username ?? '')}
                      value={String(manager.id ?? manager.userId ?? manager.UserId ?? '')}
                    >
                      {`${(manager.firstName || manager.FirstName || '').toString().trim()} ${(manager.lastName || manager.LastName || '').toString().trim()}`.trim() || manager.username || manager.Username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inspection Frequency */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-700 mb-2">Inspection Frequency *</label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={editFormData.inspectionFrequencyNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, inspectionFrequencyNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <select
                      className="h-11 w-40 rounded-md border border-muted-300 bg-white px-3 py-2"
                      value={editFormData.inspectionFrequencyType}
                      onChange={(e) => setEditFormData({ ...editFormData, inspectionFrequencyType: e.target.value })}
                    >
                      <option value="Day">Days</option>
                      <option value="Week">Weeks</option>
                      <option value="Month">Months</option>
                      <option value="Year">Years</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Property Layout */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Property Layout</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.propertyLayoutId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, propertyLayoutId: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">No Layout Selected</option>
                  {propertyLayouts.map((layout) => (
                    <option key={layout.layoutId} value={layout.layoutId}>
                      {layout.layoutName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Key Number */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Key Number</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.keyNo}
                  onChange={(e) => setEditFormData({ ...editFormData, keyNo: e.target.value })}
                />
              </div>

              {/* Alarm Code */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Alarm Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.alarmCode}
                  onChange={(e) => setEditFormData({ ...editFormData, alarmCode: e.target.value })}
                />
              </div>

              {/* Property Images */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-700 mb-2">Property Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  onChange={handleEditImageSelection}
                />
                <p className="mt-1 text-xs text-muted-500">Upload image files (JPG, PNG, WebP). You can upload multiple images.</p>

                {parsePropertyImages(editFormData.propertyImages).length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {parsePropertyImages(editFormData.propertyImages).map((url: string) => (
                      <div key={url} className="relative rounded-lg border border-muted-200 overflow-hidden">
                        <img src={url} alt="Property" className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
                          onClick={() => removeEditExistingImage(url)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editImagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {editImagePreviews.map((preview, index) => (
                      <div key={preview} className="relative rounded-lg border border-muted-200 overflow-hidden">
                        <img src={preview} alt="Preview" className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
                          onClick={() => removeEditSelectedImage(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-700 mb-2">Property Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={editFormData.propertyNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, propertyNotes: e.target.value })}
                />
              </div>
            </div>

            {/* Tenancy Management Section */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Tenancy Management</h3>

              {/* Current Tenancies */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-muted-700 mb-3">Current Tenancies</h4>
                {editingProperty.tenancies && editingProperty.tenancies.length > 0 ? (
                  <div className="space-y-3">
                    {editingProperty.tenancies.map((tenancy) => (
                      <div key={tenancy.id} className="bg-muted-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">{tenancy.fullName}</div>
                            <div className="text-sm text-muted-foreground">
                              {tenancy.email} • {tenancy.mobile}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Lease: {new Date(tenancy.leaseStartDate).toISOString().split('T')[0]} - {new Date(tenancy.leaseEndDate).toISOString().split('T')[0]}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rent: ${tenancy.currentRentAmount} {tenancy.rentFrequency}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tenancy.isActive ? 'bg-success-100 text-success-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {tenancy.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => handleEditTenancy(tenancy)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-md transition-colors"
                              title="Edit tenancy"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            {tenancy.isActive && (
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to deactivate this tenancy?')) {
                                    // TODO: Implement deactivate tenancy functionality
                                    alert('Deactivate tenancy functionality needs to be implemented');
                                  }
                                }}
                                className="px-3 py-1 bg-destructive-600 hover:bg-destructive-700 text-white text-xs rounded-md transition-colors"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-500 text-sm">No tenancies found for this property.</div>
                )}
              </div>

              {/* Add New Tenancy Button */}
              <div>
                <button
                  onClick={handleAddNewTenancy}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                >
                  Add New Tenancy
                </button>
              </div>
            </div>

            {/* Landlord Management Section */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Landlord Management</h3>

              {/* Current Landlords */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-muted-700 mb-3">Current Landlords</h4>
                {editingProperty.landlords && editingProperty.landlords.length > 0 ? (
                  <div className="space-y-3">
                    {editingProperty.landlords.map((landlord) => (
                      <div key={landlord.id} className="bg-muted-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">{landlord.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {landlord.email} • {landlord.phone || 'No phone'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditLandlord(landlord)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-md transition-colors"
                              title="Edit landlord"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this landlord?')) {
                                  // TODO: Implement delete landlord functionality
                                  alert('Delete landlord functionality needs to be implemented');
                                }
                              }}
                              className="px-2 py-1 bg-destructive-600 hover:bg-destructive-700 text-white text-xs rounded-md transition-colors"
                              title="Delete landlord"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-500 text-sm">No landlords found for this property.</div>
                )}
              </div>

              {/* Add New Landlord */}
              <div className="bg-muted/50 p-4 rounded-lg">
                {!showAddLandlordForm ? (
                  <button
                    onClick={() => setShowAddLandlordForm(true)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                  >
                    Add New Landlord
                  </button>
                ) : (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-muted-700 mb-2">Name *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={newLandlordFormData.name || ''}
                          onChange={(e) => setNewLandlordFormData({ ...newLandlordFormData, name: e.target.value })}
                          placeholder="Enter landlord name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-700 mb-2">Email *</label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={newLandlordFormData.email || ''}
                          onChange={(e) => setNewLandlordFormData({ ...newLandlordFormData, email: e.target.value })}
                          placeholder="Enter email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-700 mb-2">Phone</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={newLandlordFormData.phone || ''}
                          onChange={(e) => setNewLandlordFormData({ ...newLandlordFormData, phone: e.target.value })}
                          placeholder="Enter phone"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          if (!editingProperty) return;
                          if (!newLandlordFormData.name?.trim() || !newLandlordFormData.email?.trim()) return;
                          const newEntry = {
                            landlordId: 0,
                            propertyId: editingProperty.id,
                            name: newLandlordFormData.name!,
                            email: newLandlordFormData.email!,
                            phone: newLandlordFormData.phone || '',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          } as any;
                          setEditingProperty({
                            ...editingProperty,
                            landlords: [...(editingProperty.landlords || []), newEntry],
                          });
                          setNewLandlordFormData({});
                          setShowAddLandlordForm(false);
                        }}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
                        disabled={!newLandlordFormData.name?.trim() || !newLandlordFormData.email?.trim()}
                      >
                        Add Landlord
                      </button>
                      <button
                        onClick={() => { setShowAddLandlordForm(false); setNewLandlordFormData({}); }}
                        className="px-4 py-2 border border-border rounded-md"
                        disabled={addLandlordLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-muted-700 bg-muted-200 hover:bg-gray-300 rounded-md transition-colors"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProperty}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                disabled={editLoading}
              >
                {editLoading ? 'Updating...' : 'Update Property'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenancy Edit Modal */}
      {showTenancyEditModal && editingTenancy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Edit Tenancy</h2>
              <button
                onClick={() => {
                  setShowTenancyEditModal(false);
                  setShowAddTenantForm(false);
                  setNewTenantFormData({});
                  setEditingTenantId(null);
                  setTenantFormData({});
                }}
                className="text-muted-400 hover:text-muted-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.fullName}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, fullName: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.email}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, email: e.target.value })}
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Mobile</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.mobile}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, mobile: e.target.value })}
                />
              </div>

              {/* Lease Start Date */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Lease Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.leaseStartDate}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, leaseStartDate: e.target.value })}
                />
              </div>

              {/* Lease End Date */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Lease End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.leaseEndDate}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, leaseEndDate: e.target.value })}
                />
              </div>

              {/* Rent Amount */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Rent Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.currentRentAmount}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, currentRentAmount: parseFloat(e.target.value) })}
                />
              </div>

              {/* Rent Frequency */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Rent Frequency</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.rentFrequency}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, rentFrequency: e.target.value })}
                >
                  <option value="Day">Day</option>
                  <option value="Week">Week</option>
                  <option value="Fortnight">Fortnight</option>
                  <option value="Month">Month</option>
                  <option value="Quarter">Quarter</option>
                  <option value="Year">Year</option>
                </select>
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Status</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={tenancyFormData.active ? 'true' : 'false'}
                  onChange={(e) => setTenancyFormData({ ...tenancyFormData, active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* Tenant Management Section */}
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Tenants</h3>
                <button
                  onClick={() => setShowAddTenantForm(true)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                >
                  + Add Tenant
                </button>
              </div>

              {/* Current Tenants */}
              {editingTenancy.tenants && editingTenancy.tenants.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {editingTenancy.tenants.map((tenant: any) => (
                    <div key={tenant.tenantId} className="bg-muted-50 p-3 rounded-lg border">
                      {editingTenantId === tenant.tenantId ? (
                        // Inline Edit Form
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground">Edit Tenant</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* First Name */}
                            <div>
                              <label className="block text-xs font-medium text-muted-700 mb-1">First Name</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-muted-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                value={tenantFormData.firstName}
                                onChange={(e) => setTenantFormData({ ...tenantFormData, firstName: e.target.value })}
                              />
                            </div>

                            {/* Last Name */}
                            <div>
                              <label className="block text-xs font-medium text-muted-700 mb-1">Last Name</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-muted-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                value={tenantFormData.lastName}
                                onChange={(e) => setTenantFormData({ ...tenantFormData, lastName: e.target.value })}
                              />
                            </div>

                            {/* Email */}
                            <div>
                              <label className="block text-xs font-medium text-muted-700 mb-1">Email</label>
                              <input
                                type="email"
                                className="w-full px-2 py-1 border border-muted-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                value={tenantFormData.email}
                                onChange={(e) => setTenantFormData({ ...tenantFormData, email: e.target.value })}
                              />
                            </div>

                            {/* Phone */}
                            <div>
                              <label className="block text-xs font-medium text-muted-700 mb-1">Phone</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-muted-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                value={tenantFormData.phone}
                                onChange={(e) => setTenantFormData({ ...tenantFormData, phone: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Edit Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTenantId(null);
                                setTenantFormData({});
                              }}
                              className="px-3 py-1 text-muted-700 bg-muted-200 hover:bg-gray-300 rounded text-xs transition-colors"
                              disabled={tenantEditLoading}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateTenant}
                              className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs transition-colors"
                              disabled={tenantEditLoading}
                            >
                              {tenantEditLoading ? 'Updating...' : 'Update'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">
                              {tenant.firstName} {tenant.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {tenant.email} • {tenant.phone || 'No phone'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleEditTenant(tenant)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-md transition-colors"
                              title="Edit tenant"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(tenant.tenantId)}
                              className="px-2 py-1 bg-destructive-600 hover:bg-destructive-700 text-white text-xs rounded-md transition-colors"
                              title="Delete tenant"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-500 mb-4">No tenants found for this tenancy.</div>
              )}

              {/* Add Tenant Form */}
              {showAddTenantForm && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-md font-medium text-foreground mb-4">Add New Tenant</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-muted-700 mb-1">First Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={newTenantFormData.firstName || ''}
                        onChange={(e) => setNewTenantFormData({ ...newTenantFormData, firstName: e.target.value })}
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-muted-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={newTenantFormData.lastName || ''}
                        onChange={(e) => setNewTenantFormData({ ...newTenantFormData, lastName: e.target.value })}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-muted-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={newTenantFormData.email || ''}
                        onChange={(e) => setNewTenantFormData({ ...newTenantFormData, email: e.target.value })}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-muted-700 mb-1">Phone</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={newTenantFormData.phone || ''}
                        onChange={(e) => setNewTenantFormData({ ...newTenantFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Add Tenant Form Actions */}
                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-blue-200">
                    <button
                      onClick={() => {
                        setShowAddTenantForm(false);
                        setNewTenantFormData({});
                      }}
                      className="px-3 py-1 text-muted-700 bg-muted-200 hover:bg-gray-300 rounded-md transition-colors"
                      disabled={addTenantLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTenant}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                      disabled={addTenantLoading}
                    >
                      {addTenantLoading ? 'Adding...' : 'Add Tenant'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
              <button
                onClick={() => {
                  setShowTenancyEditModal(false);
                  setShowAddTenantForm(false);
                  setNewTenantFormData({});
                  setEditingTenantId(null);
                  setTenantFormData({});
                }}
                className="px-4 py-2 text-muted-700 bg-muted-200 hover:bg-gray-300 rounded-md transition-colors"
                disabled={tenancyEditLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTenancy}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                disabled={tenancyEditLoading}
              >
                {tenancyEditLoading ? 'Updating...' : 'Update Tenancy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landlord Edit Modal */}
      {showLandlordEditModal && editingLandlord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Edit Landlord</h2>
              <button
                onClick={() => setShowLandlordEditModal(false)}
                className="text-muted-400 hover:text-muted-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={landlordFormData.name}
                  onChange={(e) => setLandlordFormData({ ...landlordFormData, name: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={landlordFormData.email}
                  onChange={(e) => setLandlordFormData({ ...landlordFormData, email: e.target.value })}
                />
              </div>

              {/* Phone */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-700 mb-2">Phone</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={landlordFormData.phone}
                  onChange={(e) => setLandlordFormData({ ...landlordFormData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
              <button
                onClick={() => setShowLandlordEditModal(false)}
                className="px-4 py-2 text-muted-700 bg-muted-200 hover:bg-gray-300 rounded-md transition-colors"
                disabled={landlordEditLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLandlord}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                disabled={landlordEditLoading}
              >
                {landlordEditLoading ? 'Updating...' : 'Update Landlord'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Tenancy Modal */}
      {showAddTenancyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Add New Tenancy</h2>
              <button
                onClick={() => {
                  setShowAddTenancyModal(false);
                  setNewTenancyFormData({});
                }}
                className="text-muted-400 hover:text-muted-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.fullName}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, fullName: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Email *</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.email}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Mobile</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.mobile}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, mobile: e.target.value })}
                  placeholder="Enter mobile number"
                />
              </div>

              {/* Lease Start Date */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Lease Start Date *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.leaseStartDate}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, leaseStartDate: e.target.value })}
                />
              </div>

              {/* Lease End Date */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Lease End Date *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.leaseEndDate}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, leaseEndDate: e.target.value })}
                />
              </div>

              {/* Current Rent Amount */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Current Rent Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.currentRentAmount}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, currentRentAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter rent amount"
                />
              </div>

              {/* Rent Frequency */}
              <div>
                <label className="block text-sm font-medium text-muted-700 mb-2">Rent Frequency *</label>
                <select
                  className="w-full px-3 py-2 border border-muted-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newTenancyFormData.rentFrequency}
                  onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, rentFrequency: e.target.value })}
                >
                  <option value="Day">Day</option>
                  <option value="Week">Week</option>
                  <option value="Fortnight">Fortnight</option>
                  <option value="Month">Month</option>
                  <option value="Quarter">Quarter</option>
                  <option value="Year">Year</option>
                </select>
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newTenancyActive"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-muted-300 rounded"
                    checked={newTenancyFormData.active}
                    onChange={(e) => setNewTenancyFormData({ ...newTenancyFormData, active: e.target.checked })}
                  />
                  <label htmlFor="newTenancyActive" className="ml-2 block text-sm text-muted-700">
                    Active Tenancy
                  </label>
                </div>
                <p className="text-xs text-muted-500 mt-1">Check this if this tenancy should be active (only one tenancy can be active at a time)</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
              <button
                onClick={() => {
                  setShowAddTenancyModal(false);
                  setNewTenancyFormData({});
                }}
                className="px-4 py-2 text-muted-700 bg-muted-200 hover:bg-gray-300 rounded-md transition-colors"
                disabled={addTenancyLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewTenancy}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                disabled={addTenancyLoading || !newTenancyFormData.fullName || !newTenancyFormData.email || !newTenancyFormData.leaseStartDate || !newTenancyFormData.leaseEndDate}
              >
                {addTenancyLoading ? 'Adding...' : 'Add Tenancy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landlord Detail Modal */}
      <Modal
        isOpen={showLandlordDetailModal && !!selectedPropertyForDetails}
        onClose={() => {
          setShowLandlordDetailModal(false);
          setSelectedPropertyForDetails(null);
        }}
        title={`Landlords - ${selectedPropertyForDetails?.address1 || ''}`}
        widthClassName="max-w-4xl"
      >
        <div className="space-y-4">
          {selectedPropertyForDetails?.landlords && selectedPropertyForDetails.landlords.length > 0 ? (
            selectedPropertyForDetails.landlords.map((landlord: any, index: number) => (
              <div key={landlord.landlordId || index} className="bg-muted-50 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Name</label>
                    <p className="text-sm text-foreground">{landlord.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Email</label>
                    <p className="text-sm text-foreground">{landlord.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Phone</label>
                    <p className="text-sm text-foreground">{landlord.phone || 'N/A'}</p>
                  </div>
                </div>
                {/* Created date intentionally removed per requirements */}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-500">
              <p>No landlords found for this property.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Tenancy Detail Modal */}
      <Modal
        isOpen={showTenancyDetailModal && !!selectedPropertyForDetails}
        onClose={() => {
          setShowTenancyDetailModal(false);
          setSelectedPropertyForDetails(null);
        }}
        title={`Tenancies - ${selectedPropertyForDetails?.address1 || ''}`}
        widthClassName="max-w-6xl"
      >
        <div className="space-y-6">
          {selectedPropertyForDetails?.tenancies && selectedPropertyForDetails.tenancies.length > 0 ? (
            selectedPropertyForDetails.tenancies.map((tenancy: any, index: number) => (
              <div key={tenancy.tenancyId || index} className="bg-muted-50 p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {tenancy.fullName || 'Unnamed Tenancy'}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${tenancy.active
                    ? 'bg-success-100 text-success-800'
                    : 'bg-muted-100 text-foreground'
                    }`}>
                    {tenancy.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="responsive-grid-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Email</label>
                    <p className="text-sm text-foreground">{tenancy.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Mobile</label>
                    <p className="text-sm text-foreground">{tenancy.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Rent Amount</label>
                    <p className="text-sm text-foreground">
                      ${tenancy.currentRentAmount || 0} {tenancy.rentFrequency || 'per month'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Lease Start</label>
                    <p className="text-sm text-foreground">
                      {tenancy.leaseStartDate ? new Date(tenancy.leaseStartDate).toISOString().split('T')[0] : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-700 mb-1">Lease End</label>
                    <p className="text-sm text-foreground">
                      {tenancy.leaseEndDate ? new Date(tenancy.leaseEndDate).toISOString().split('T')[0] : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Tenants */}
                {tenancy.tenants && tenancy.tenants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-muted-200">
                    <h4 className="text-md font-medium text-muted-700 mb-3">Tenants ({tenancy.tenants.length})</h4>
                    <div className="space-y-2">
                      {tenancy.tenants.map((tenant: any, tenantIndex: number) => (
                        <div key={tenant.tenantId || tenantIndex} className="bg-card p-3 rounded border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                              <p className="text-sm text-foreground">
                                {tenant.firstName} {tenant.lastName}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                              <p className="text-sm text-foreground">{tenant.email || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                              <p className="text-sm text-foreground">{tenant.phone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-500">
              <p>No tenancies found for this property.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Inspection Modal */}
      <Modal
        isOpen={showCreateInspectionModal}
        onClose={() => setShowCreateInspectionModal(false)}
        title="Create New Inspection"
      >
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-lg border border-blue-100/50 shadow-inner">
          <form onSubmit={handleCreateInspection} className="space-y-6">
            <div className="text-sm text-muted-600">
              Property: <span className="font-semibold text-foreground">{createInspectionProperty?.address || 'Selected property'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Inspector</label>
                <select
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={createInspection.inspectorId}
                  onChange={(e) => setCreateInspection({ ...createInspection, inspectorId: e.target.value })}
                >
                  <option value="">Select Inspector</option>
                  {inspectors.map((inspector) => (
                    <option
                      key={String(inspector.id ?? inspector.userId ?? inspector.inspectorId ?? inspector.identityUserId ?? '')}
                      value={String(inspector.id ?? inspector.userId ?? inspector.inspectorId ?? inspector.identityUserId ?? '')}
                    >
                      {getInspectorDisplayName(inspector)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Inspection Type</label>
                <select
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={createInspection.inspectionType}
                  onChange={(e) => setCreateInspection({ ...createInspection, inspectionType: parseInt(e.target.value) })}
                >
                  {inspectionTypes.map((type) => (
                    <option key={type.inspectionTypeId} value={type.inspectionTypeId}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Inspection Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={createInspection.inspectionDate}
                  onChange={(e) => setCreateInspection({ ...createInspection, inspectionDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Inspection Time</label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={createInspection.inspectionTime}
                  onChange={(e) => setCreateInspection({ ...createInspection, inspectionTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateInspectionModal(false)}
                className="px-4 py-2 text-muted-700 bg-card border border-muted-300 rounded-md shadow-sm hover:bg-muted-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90"
              >
                {loading ? 'Creating...' : 'Create Inspection'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Inspection Modal */}
      <Modal isOpen={showEditInspectionModal} onClose={() => setShowEditInspectionModal(false)} title="Edit Inspection">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-lg border border-blue-100/50 shadow-inner">
          <form onSubmit={handleUpdateInspection} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Property
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm placeholder-gray-500"
                    placeholder="Search for property (e.g., Main Street, Sydney)..."
                    value={editPropertySearchTerm}
                    onChange={(e) => {
                      setEditPropertySearchTerm(e.target.value);
                      searchEditProperties(e.target.value);
                    }}
                    onFocus={() => {
                      if (editPropertySearchResults.length > 0) setShowEditPropertyResults(true);
                    }}
                  />
                  {showEditPropertyResults && editPropertySearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-muted-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {editPropertySearchResults.map((property) => (
                        <div
                          key={String(property.id)}
                          className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectEditProperty(property)}
                        >
                          <div className="font-medium text-foreground">{property.address}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedEditProperty && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">Selected: {selectedEditProperty.address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Inspector
                  </span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={editInspection.inspectorId}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectorId: parseInt(e.target.value) })}
                >
                  <option value={0}>Select Inspector</option>
                  {inspectors.map((inspector) => (
                    <option
                      key={String(inspector.id ?? inspector.userId ?? inspector.UserId ?? inspector.inspectorId ?? inspector.identityUserId ?? '')}
                      value={String(inspector.id ?? inspector.userId ?? inspector.UserId ?? inspector.inspectorId ?? '')}
                    >
                      {getInspectorDisplayName(inspector)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inspection Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Inspection Type
                  </span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={editInspection.inspectionTypeId}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectionTypeId: parseInt(e.target.value) })}
                >
                  <option value={0}>Select Type</option>
                  {inspectionTypes.map((type) => (
                    <option key={type.inspectionTypeId} value={type.inspectionTypeId}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inspection Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Inspection Date
                  </span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={editInspection.inspectionDate}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectionDate: e.target.value })}
                />
              </div>

              {/* Inspection Time */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Inspection Time
                  </span>
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 border border-muted-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-card text-sm"
                  value={editInspection.inspectionTime}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectionTime: e.target.value })}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-muted-200">
              <button
                type="button"
                onClick={() => {
                  setShowEditInspectionModal(false);
                  setSelectedEditProperty(null);
                  setEditPropertySearchTerm('');
                  setEditingInspection(null);
                }}
                className="px-6 py-3 text-sm font-medium text-muted-700 bg-card border border-muted-300 rounded-lg shadow-sm hover:bg-muted-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedEditProperty}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update Inspection
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { InspectionResponse, InspectionType, InspectionStatus } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import inspectionApi from '@/lib/api/inspection';
import propertyApi from '@/lib/api/property';
import referenceApi from '@/lib/api/reference';
import { getInspectionActions, getInspectionReportUrl } from '@/lib/inspection-actions';
import Modal from './ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Edit, Trash2, SlidersHorizontal } from 'lucide-react';

interface InspectionManagementProps {
  onInspectionChange?: () => void;
  selectedPropertyId?: string | null;
  onClearPropertyFilter?: () => void;
  searchResults?: InspectionResponse[];
  searchQuery?: string;
  onClearSearch?: () => void;
}

const InspectionManagement: React.FC<InspectionManagementProps> = ({ onInspectionChange, selectedPropertyId, onClearPropertyFilter, searchResults, searchQuery, onClearSearch }) => {
  const { effectiveAgencyId } = useAuth();
  const [inspections, setInspections] = useState<InspectionResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [properties, setProperties] = useState<any[]>([]);
  const [inspectionTypes, setInspectionTypes] = useState<any[]>([]);
  const [inspectionStatuses, setInspectionStatuses] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [states, setStates] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [filters, setFilters] = useState<{
    typeId?: number;
    statusId?: number;
    inspectorId?: string | number;
    searchProperty?: string;
    dateFrom?: string;
    dateTo?: string;
    inspectionDate?: string;
    suburb?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [newInspection, setNewInspection] = useState<{ propertyId: string; inspectorId: string; inspectionType: number; inspectionStatus: number; inspectionDate: string; inspectionTime: string; address: string }>({
    propertyId: '',
    inspectorId: '',
    inspectionType: InspectionType.Entry,
    inspectionStatus: InspectionStatus.Pending,
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionTime: '09:00',
    address: '',
  });
  const [editInspection, setEditInspection] = useState<{
    inspectionId: string;
    propertyId: string;
    inspectorId: string;
    inspectionType: number;
    inspectionStatus: number;
    inspectionDate: string;
    inspectionTime: string;
    address: string;
  }>({
    inspectionId: '',
    propertyId: '',
    inspectorId: '',
    inspectionType: InspectionType.Entry,
    inspectionStatus: InspectionStatus.Pending,
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionTime: '09:00',
    address: '',
  });
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState<any[]>([]);
  const [showPropertyResults, setShowPropertyResults] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [editPropertySearchTerm, setEditPropertySearchTerm] = useState('');
  const [editPropertySearchResults, setEditPropertySearchResults] = useState<any[]>([]);
  const [showEditPropertyResults, setShowEditPropertyResults] = useState(false);
  const [selectedEditProperty, setSelectedEditProperty] = useState<any>(null);


  const getInspectorDisplayName = (inspector: any): string => {
    const first = (inspector.firstName || inspector.FirstName || '').trim();
    const last = (inspector.lastName || inspector.LastName || '').trim();
    if (first || last) return `${first} ${last}`.trim();
    if (inspector.inspectorName) return inspector.inspectorName;
    if (inspector.username) return inspector.username;
    if (inspector.email) return inspector.email;
    return 'User';
  };

  const enrichInspectionDisplayFields = (inspection: any) => {
    const inspectorId = inspection.inspectorId;
    const inspector = inspectors.find((i: any) => (i.id || i.userId || i.identityUserId || i.inspectorId) === inspectorId);
    const inspectionType = inspectionTypes.find((t: any) => t.id === inspection.inspectionType);
    const status = inspectionStatuses.find((s: any) => s.id === inspection.inspectionStatus);

    return {
      ...inspection,
      inspectorName: inspector ? getInspectorDisplayName(inspector) : inspection.inspectorName,
      inspectionTypeName: inspectionType ? inspectionType.name : String(inspection.inspectionType),
      inspectionStatusName: status ? status.name : String(inspection.inspectionStatus),
    };
  };

  const isPendingStatus = (inspection: any): boolean => {
    return Number(inspection.inspectionStatus) === InspectionStatus.Pending;
  };

  // Load initial data (types, statuses, inspectors) only once
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [propertiesData, typesData, statusesData, inspectorsData, statesData] = await Promise.all([
          propertyApi.getAll(),
          inspectionApi.getInspectionTypes(),
          inspectionApi.getInspectionStatuses(),
          inspectionApi.getAvailableInspectors(),
          referenceApi.getStates(),
        ]);
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
        setInspectionTypes(typesData || []);
        setInspectionStatuses(statusesData || []);
        setInspectors(inspectorsData);
        setStates(statesData as any);

      } catch (err: any) {
        console.error('Failed to load initial data:', err);
      }
    };

    loadInitialData();
  }, []); // Only run once on mount

  // Load inspections whenever filters or pagination change.
  useEffect(() => {
    const loadInspections = async () => {
      setLoading(true);
      setError('');
      try {
        const apiFilters = {
          ...(filters.typeId && { inspectionType: filters.typeId }),
          ...(filters.statusId && { inspectionStatus: filters.statusId }),
          ...(filters.inspectorId && { inspectorId: String(filters.inspectorId) }),
          ...(filters.suburb && { suburb: filters.suburb }),
          ...(filters.inspectionDate && { inspectionDate: filters.inspectionDate }),
          ...(filters.dateFrom && { startDate: filters.dateFrom }),
          ...(filters.dateTo && { endDate: filters.dateTo }),
          ...(filters.searchProperty && { searchProperty: filters.searchProperty }),
        };
        const resp = await inspectionApi.getPaged(page, pageSize, apiFilters as any);
        setInspections(Array.isArray(resp.data) ? resp.data : []);
        setTotalCount(resp.totalCount || 0);
      } catch (err: any) {
        setError(err.response?.data?.Message || err.response?.data?.message || 'Failed to load inspections');
        setInspections([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadInspections();
  }, [page, pageSize, filters]);

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const ensureSeconds = (t: string) => t.length === 5 ? `${t}:00` : t;
      const payload = {
        propertyId: newInspection.propertyId,
        agencyId: effectiveAgencyId ? String(effectiveAgencyId) : null,
        inspectionType: Number(newInspection.inspectionType),
        inspectionStatus: Number(newInspection.inspectionStatus),
        inspectorId: newInspection.inspectorId,
        //address: newInspection.address,
        inspectionDate: new Date(newInspection.inspectionDate).toISOString(),
        inspectionTime: ensureSeconds(newInspection.inspectionTime),
      };
      const createdInspection = await inspectionApi.create(payload as any);
      
      // Ensure property details are populated immediately for the UI
      const enriched = {
        ...enrichInspectionDisplayFields(createdInspection),
        propertyAddress: createdInspection.propertyAddress || selectedProperty?.address,
        propertySubhurb: createdInspection.propertySubhurb || selectedProperty?.suburb
      };
      
      alert('Inspection created successfully');

      // Add the new inspection to the current list with display fields populated
      setInspections(prev => [enriched, ...prev]);
      setTotalCount(prev => prev + 1);

      setNewInspection({
        propertyId: '',
        inspectorId: '',
        inspectionType: InspectionType.Entry,
        inspectionStatus: InspectionStatus.Pending,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectionTime: '09:00',
        address: '',
      });
      setSelectedProperty(null);
      setPropertySearchTerm('');
      setShowPropertyResults(false);
      setShowCreateForm(false);

      // Notify parent component to refresh inspection count
      onInspectionChange?.();
    } catch (err: any) {
      setError(err.response?.data?.Message || err.response?.data?.message || 'Failed to create inspection');
      alert(err.response?.data?.Message || err.response?.data?.message || 'Failed to create inspection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInspection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inspection?')) return;

    setLoading(true);
    setError('');
    try {
      await inspectionApi.delete(id as any); // temporary cast until API lib updated
      // Remove the deleted inspection from the current list
      setInspections(prev => prev.filter(inspection => inspection.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
      // Notify parent component to refresh inspection count
      onInspectionChange?.();
    } catch (err: any) {
      setError(err.response?.data?.Message || err.response?.data?.message || 'Failed to delete inspection');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, statusId: number) => {
    setLoading(true);
    setError('');
    try {
      const inspection = await inspectionApi.getById(id);
      const ok = await inspectionApi.update(id, {
        id,
        propertyId: inspection.propertyId,
        agencyId: inspection.agencyId ?? null,
        inspectionType: Number(inspection.inspectionType),
        inspectionStatus: Number(statusId),
        inspectorId: inspection.inspectorId,
        address: inspection.propertyAddress || '',
        inspectionDate: inspection.inspectionDate,
        inspectionTime: inspection.inspectionTime,
      } as any);
      if (!ok) throw new Error('Failed to update status');
      const updatedInspection = await inspectionApi.getById(id);
      const enriched = enrichInspectionDisplayFields(updatedInspection as any);
      // Update the inspection in the current list
      setInspections(prev => prev.map(inspection =>
        inspection.id === id ? enriched : inspection
      ));
      // Notify parent component to refresh inspection count
      onInspectionChange?.();
    } catch (err: any) {
      setError(err.response?.data?.Message || err.response?.data?.message || 'Failed to update status');
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
    try {
      window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
  };

  const handleCloseReport = async (inspectionId: string) => {
    try {
      setLoading(true);
      const inspection = await inspectionApi.getById(inspectionId);
      const ok = await inspectionApi.update(inspectionId, {
        id: inspectionId,
        propertyId: inspection.propertyId,
        agencyId: inspection.agencyId ?? null,
        inspectionType: Number(inspection.inspectionType),
        inspectionStatus: InspectionStatus.Closed,
        inspectorId: inspection.inspectorId,
        address: inspection.propertyAddress || '',
        inspectionDate: inspection.inspectionDate,
        inspectionTime: inspection.inspectionTime,
      } as any);
      if (!ok) throw new Error('Failed to close report');
      const updated = await inspectionApi.getById(inspectionId);
      const enriched = enrichInspectionDisplayFields(updated as any);
      setInspections(prev => prev.map(i => i.id === inspectionId ? enriched : i));
      onInspectionChange?.();
    } catch (e: any) {
      alert(e?.response?.data?.Message || e?.response?.data?.message || e?.message || 'Failed to close report');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenReport = async (inspectionId: string) => {
    try {
      setLoading(true);
      const inspection = await inspectionApi.getById(inspectionId);
      const ok = await inspectionApi.update(inspectionId, {
        id: inspectionId,
        propertyId: inspection.propertyId,
        agencyId: inspection.agencyId ?? null,
        inspectionType: Number(inspection.inspectionType),
        inspectionStatus: InspectionStatus.Completed,
        inspectorId: inspection.inspectorId,
        address: inspection.propertyAddress || '',
        inspectionDate: inspection.inspectionDate,
        inspectionTime: inspection.inspectionTime,
      } as any);
      if (!ok) throw new Error('Failed to reopen report');
      const updated = await inspectionApi.getById(inspectionId);
      const enriched = enrichInspectionDisplayFields(updated as any);
      setInspections(prev => prev.map(i => i.id === inspectionId ? enriched : i));
      onInspectionChange?.();
    } catch (e: any) {
      alert(e?.response?.data?.Message || e?.response?.data?.message || e?.message || 'Failed to reopen report');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInspection = (inspection: any) => {
    setEditingInspection(inspection);

    // Populate the edit form with existing inspection data
    const inspectionDate = new Date(inspection.inspectionDate).toISOString().split('T')[0];
    const inspectionTime = inspection.inspectionTime || '09:00';

    setEditInspection({
      inspectionId: inspection.id,
      propertyId: inspection.propertyId,
      inspectorId: inspection.inspectorId,
      inspectionType: Number(inspection.inspectionType),
      inspectionStatus: Number(inspection.inspectionStatus),
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

    setShowEditForm(true);
  };

  const handleUpdateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const ensureSeconds = (t: string) => t.length === 5 ? `${t}:00` : t;
      const payload = {
        id: editInspection.inspectionId,
        propertyId: editInspection.propertyId,
        agencyId: (editingInspection as any)?.agencyId ?? null,
        inspectionType: Number(editInspection.inspectionType),
        inspectionStatus: Number(editInspection.inspectionStatus),
        inspectorId: editInspection.inspectorId,
        address: editInspection.address,
        inspectionDate: new Date(editInspection.inspectionDate).toISOString(),
        inspectionTime: ensureSeconds(editInspection.inspectionTime),
      };

      const ok = await inspectionApi.update(editInspection.inspectionId, payload as any);
      if (!ok) throw new Error('Failed to update inspection');
      const updatedInspection = await inspectionApi.getById(editInspection.inspectionId);
      const enriched = enrichInspectionDisplayFields(updatedInspection as any);
      alert('Inspection updated successfully');

      // Update the inspection in the current list with display fields populated
      setInspections(prev => prev.map(inspection =>
        inspection.id === editInspection.inspectionId.toString() ? enriched : inspection
      ));

      // Reset form and close modal
      setEditInspection({
        inspectionId: '',
        propertyId: '',
        inspectorId: '',
        inspectionType: InspectionType.Entry,
        inspectionStatus: InspectionStatus.Pending,
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectionTime: '09:00',
        address: '',
      });
      setSelectedEditProperty(null);
      setEditPropertySearchTerm('');
      setShowEditPropertyResults(false);
      setShowEditForm(false);
      setEditingInspection(null);

      // Notify parent component to refresh inspection count
      onInspectionChange?.();
    } catch (err: any) {
      setError(err.response?.data?.Message || err.response?.data?.message || 'Failed to update inspection');
      alert(err.response?.data?.Message || err.response?.data?.message || 'Failed to update inspection');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    debugger;
    console.log('Filter change:', key, 'value:', value);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: (value === '' || value === null || value === undefined || Number.isNaN(value)) ? undefined : value
      };
      console.log('New filters:', newFilters);
      return newFilters;
    });
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const searchProperties = async (query: string) => {
    if (query.length < 2) {
      setPropertySearchResults([]);
      setShowPropertyResults(false);
      return;
    }

    try {
      const results = await inspectionApi.searchProperties(query, effectiveAgencyId ? String(effectiveAgencyId) : undefined);
      setPropertySearchResults(results || []);
      setShowPropertyResults(true);
    } catch (error) {
      console.error('Property search failed:', error);
      setPropertySearchResults([]);
    }
  };

  const selectProperty = (property: any) => {
    setSelectedProperty({
      id: property.id,
      address: property.address,
      suburb: property.suburb
    });
    setNewInspection(prev => ({ ...prev, propertyId: property.id }));
    setPropertySearchTerm(property.address);
    setShowPropertyResults(false);
  };

  const searchEditProperties = async (query: string) => {
    if (query.length < 2) {
      setEditPropertySearchResults([]);
      setShowEditPropertyResults(false);
      return;
    }

    try {
      const results = await inspectionApi.searchProperties(query, effectiveAgencyId ? String(effectiveAgencyId) : undefined);
      setEditPropertySearchResults(results || []);
      setShowEditPropertyResults(true);
    } catch (error) {
      console.error('Property search failed:', error);
      setEditPropertySearchResults([]);
    }
  };

  const selectEditProperty = (property: any) => {
    setSelectedEditProperty({
      id: property.id,
      address: property.address,
      suburb: property.suburb
    });
    setEditInspection(prev => ({ ...prev, propertyId: property.id, address: property.address }));
    setEditPropertySearchTerm(property.address);
    setShowEditPropertyResults(false);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inspection Management</h2>
          {searchQuery && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchQuery}"
              </span>
              <span className="text-sm text-gray-600">
                Showing {inspections.length} of {totalCount} results
              </span>
              {onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
          {selectedPropertyId && !searchQuery && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Property ID: {selectedPropertyId}
              </span>
              <span className="text-sm text-gray-600">
                {loading ? 'Loading inspections for this property...' : 'Showing inspections for this property only'}
              </span>
              <button
                onClick={() => {
                  onClearPropertyFilter?.();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
        >
          {showCreateForm ? 'Cancel' : 'Create Inspection'}
        </button>
      </div>

      {/* Fancy Filter Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Advanced Filters</h3>
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Search Input - Property Address Only */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by property address..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                value={filters.searchProperty || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters(prev => ({ ...prev, searchProperty: value }));
                  // Debounce the search to avoid too many API calls
                  clearTimeout((window as any).searchTimeout);
                  (window as any).searchTimeout = setTimeout(() => {
                    setPage(1); // Reset to first page when searching
                  }, 500);
                }}
              />
            </div>
          </div>


          {/* Inspection Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.typeId?.toString() || ''}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                console.log('Type dropdown changed:', raw);
                if (raw === '') {
                  handleFilterChange('typeId', undefined);
                } else {
                  const parsed = Number(raw);
                  handleFilterChange('typeId', Number.isFinite(parsed) ? parsed : undefined);
                }
              }}
            >
              <option value="">All Types</option>
              {inspectionTypes
                .map((type: any) => {
                  const id =
                    type?.inspectionTypeId ??
                    type?.id ??
                    type?.InspectionTypeId ??
                    type?.InspectionTypeID ??
                    type?.typeId ??
                    null;
                  const label = (type?.name ?? type?.Name ?? '').toString().trim();
                  return { id, label };
                })
                .filter((t) => t.id !== null && t.id !== undefined && String(t.id).trim() !== '')
                .map((t) => (
                  <option key={String(t.id)} value={String(t.id)}>
                    {t.label || String(t.id)}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.statusId?.toString() || ''}
              onChange={(e) => handleFilterChange('statusId', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">All Statuses</option>
              {inspectionStatuses
                .map((status: any) => {
                  const id =
                    status?.inspectionStatusId ??
                    status?.id ??
                    status?.InspectionStatusId ??
                    status?.InspectionStatusID ??
                    status?.statusId ??
                    null;
                  const label = (status?.name ?? status?.Name ?? "").toString().trim();
                  return { id, label };
                })
                .filter((s) => s.id !== null && s.id !== undefined && String(s.id).trim() !== "")
                .map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.label || String(s.id)}
                  </option>
                ))}
            </select>
          </div>

          {/* Inspector Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inspector</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.inspectorId?.toString() || ''}
              onChange={(e) => handleFilterChange('inspectorId', e.target.value || undefined)}
            >
              <option value="">All Inspectors</option>
              {inspectors.map((inspector) => (
                <option key={inspector.id || inspector.userId || inspector.inspectorId} value={inspector.id || inspector.userId || inspector.inspectorId}>
                  {getInspectorDisplayName(inspector)}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Exact Inspection Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exact Inspection Date</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.inspectionDate || ''}
              onChange={(e) => handleFilterChange('inspectionDate', e.target.value)}
            />
          </div>

          {/* Suburb Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suburb</label>
            <input
              type="text"
              placeholder="Enter suburb..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              value={filters.suburb || ''}
              onChange={(e) => handleFilterChange('suburb', e.target.value)}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.typeId || filters.statusId || filters.inspectorId || filters.searchProperty || filters.dateFrom || filters.dateTo || filters.suburb || filters.inspectionDate) && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {filters.searchProperty && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: {filters.searchProperty}
                  <button
                    onClick={() => handleFilterChange('searchProperty', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.typeId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Type: {inspectionTypes.find(t => t.inspectionTypeId === filters.typeId)?.name}
                  <button
                    onClick={() => handleFilterChange('typeId', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.statusId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Status: {inspectionStatuses.find(s => s.inspectionStatusId === filters.statusId)?.name}
                  <button
                    onClick={() => handleFilterChange('statusId', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-yellow-400 hover:bg-yellow-200 hover:text-yellow-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.inspectorId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Inspector: {(() => {
                    const i = inspectors.find(i => (i.id || i.inspectorId || i.userId) === filters.inspectorId);
                    return i ? getInspectorDisplayName(i) : '';
                  })()}
                  <button
                    onClick={() => handleFilterChange('inspectorId', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.dateFrom && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200/50">
                  From: {filters.dateFrom}
                  <button
                    onClick={() => handleFilterChange('dateFrom', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200/50">
                  To: {filters.dateTo}
                  <button
                    onClick={() => handleFilterChange('dateTo', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.inspectionDate && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                  Date: {filters.inspectionDate}
                  <button
                    onClick={() => handleFilterChange('inspectionDate', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-sky-400 hover:bg-sky-200 hover:text-sky-500"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                      <path d="m0 0 2 2 2-2 1 1-2 2 2 2-1 1-2-2-2 2-1-1 2-2-2-2z" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.suburb && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                  Suburb: {filters.suburb}
                  <button
                    onClick={() => handleFilterChange('suburb', '')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-teal-400 hover:bg-teal-200 hover:text-teal-500"
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

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Modal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="Create New Inspection">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-lg border border-blue-100/50 shadow-inner">
          <form onSubmit={handleCreateInspection} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm placeholder-gray-500"
                    placeholder="Search for property (e.g., Main Street, Sydney)..."
                    value={propertySearchTerm}
                    onChange={(e) => {
                      setPropertySearchTerm(e.target.value);
                      searchProperties(e.target.value);
                    }}
                    onFocus={() => {
                      if (propertySearchResults.length > 0) setShowPropertyResults(true);
                    }}
                  />
                  {showPropertyResults && propertySearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {propertySearchResults.map((property) => (
                        <div
                          key={String(property.id)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectProperty(property)}
                        >
                          <div className="font-medium text-gray-900">{property.address}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProperty && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">Selected: {selectedProperty.address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Inspector
                  </span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={newInspection.inspectorId}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectorId: e.target.value || 0 as any })}
                >
                  <option value={0}>Select Inspector</option>
                  {inspectors.map((inspector) => (
                    <option key={inspector.id || inspector.userId || inspector.inspectorId} value={inspector.id || inspector.userId || inspector.inspectorId}>
                      {getInspectorDisplayName(inspector)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inspection Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Inspection Type
                  </span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={newInspection.inspectionType}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectionType: parseInt(e.target.value) })}
                >
                  <option value={0}>Select Type</option>
                  {inspectionTypes
                    .map((type: any) => {
                      const id =
                        type?.inspectionTypeId ??
                        type?.id ??
                        type?.InspectionTypeId ??
                        type?.InspectionTypeID ??
                        type?.typeId ??
                        null;
                      const label = (type?.name ?? type?.Name ?? "").toString().trim();
                      return { id, label };
                    })
                    .filter((t) => t.id !== null && t.id !== undefined && String(t.id).trim() !== "")
                    .map((t) => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {t.label || String(t.id)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Inspection Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={newInspection.inspectionDate}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectionDate: e.target.value })}
                />
              </div>

              {/* Inspection Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={newInspection.inspectionTime}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectionTime: e.target.value })}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedProperty(null);
                  setPropertySearchTerm('');
                }}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedProperty}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Inspection
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Inspection Modal */}
      <Modal isOpen={showEditForm} onClose={() => setShowEditForm(false)} title="Edit Inspection">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-lg border border-blue-100/50 shadow-inner">
          <form onSubmit={handleUpdateInspection} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm placeholder-gray-500"
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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {editPropertySearchResults.map((property) => (
                        <div
                          key={String(property.id)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectEditProperty(property)}
                        >
                          <div className="font-medium text-gray-900">{property.address}</div>
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
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Inspector
                  </span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={editInspection.inspectorId}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectorId: e.target.value || 0 as any })}
                >
                  <option value={0}>Select Inspector</option>
                  {inspectors.map((inspector) => (
                    <option key={inspector.id || inspector.userId || inspector.inspectorId} value={inspector.id || inspector.userId || inspector.inspectorId}>
                      {getInspectorDisplayName(inspector)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inspection Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Inspection Type
                  </span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={editInspection.inspectionType}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectionType: parseInt(e.target.value) })}
                >
                  <option value={0}>Select Type</option>
                  {inspectionTypes
                    .map((type: any) => {
                      const id =
                        type?.inspectionTypeId ??
                        type?.id ??
                        type?.InspectionTypeId ??
                        type?.InspectionTypeID ??
                        type?.typeId ??
                        null;
                      const label = (type?.name ?? type?.Name ?? "").toString().trim();
                      return { id, label };
                    })
                    .filter((t) => t.id !== null && t.id !== undefined && String(t.id).trim() !== "")
                    .map((t) => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {t.label || String(t.id)}
                      </option>
                    ))}
                </select>
              </div>


              {/* Inspection Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={editInspection.inspectionDate}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectionDate: e.target.value })}
                />
              </div>

              {/* Inspection Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  value={editInspection.inspectionTime}
                  onChange={(e) => setEditInspection({ ...editInspection, inspectionTime: e.target.value })}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedEditProperty(null);
                  setEditPropertySearchTerm('');
                  setEditingInspection(null);
                }}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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

      <div className="bg-card border border-border overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-foreground">Inspections</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage property inspections</p>
        </div>
        {loading ? (
          <div className="px-4 py-5 sm:px-6 text-center">Loading...</div>
        ) : (
          <div className="px-4 pb-4 sm:px-6 overflow-x-auto">
            <Table className="min-w-[900px]">
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
                {inspections.map((inspection) => {
                  const property = properties.find((p) => String(p.id) === inspection.propertyId);
                  const state = states.find((s) => s.id === property?.stateLookupId);
                  return (
                    <TableRow key={inspection.id}>
                      <TableCell>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                          {inspection.id}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {inspection.propertyAddress || property?.address1}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inspection.propertySubhurb || property?.cityOrSuburb || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inspection.inspectorName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {
                          inspectionTypes.find((t) => t.inspectionTypeId === ((inspection as any).inspectionType || (inspection as any).inspectionTypeId))?.name
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
                        {new Date(inspection.inspectionDate).toLocaleDateString()} {inspection.inspectionTime}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const statusId = Number((inspection as any).inspectionStatus || (inspection as any).inspectionStatusId || (inspection as any).status || 0);
                          const statusName = inspectionStatuses.find(s => s.inspectionStatusId === statusId)?.name ||
                            ({
                              1: 'Pending',
                              2: 'InProgress',
                              3: 'InSync',
                              4: 'Completed',
                              5: 'Closed'
                            } as Record<number, string>)[statusId] || 
                            (inspection as any).inspectionStatusName || 
                            (inspection as any).statusName || 
                            'Unknown';
                          
                          const colorClass = ([3, 4, 5].includes(statusId))
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800';

                          return (
                            <span className={`px-2 inline-flex text-xs leading-5 font-medium rounded-full ${colorClass}`}>
                              {statusName}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const statusId = Number((inspection as any).inspectionStatus || (inspection as any).inspectionStatusId || (inspection as any).status || 0);
                          const actions = getInspectionActions({
                            statusId,
                            onEditInspection: () => handleEditInspection(inspection),
                            onDeleteInspection: () => handleDeleteInspection(inspection.id),
                            onViewReport: () => handleViewReport(inspection.id),
                            onCloseReport: () => handleCloseReport(inspection.id),
                            onReopenReport: () => handleReopenReport(inspection.id),
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
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                                >
                                  {actions.primary.label}
                                </button>
                              )}
                              {menuItems.length > 0 && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    className={
                                      hasPrimary
                                        ? "px-2 py-1 border rounded-md text-sm hover:bg-muted-100 flex items-center justify-center"
                                        : "px-3 py-1 border rounded-md text-sm hover:bg-muted-100"
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
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
        {inspections.length === 0 && !loading && (
          <div className="px-4 py-5 sm:px-6 text-center text-muted-foreground">No inspections found. Create one to get started.</div>
        )}
      </div>
    </div>
  );
};

export default InspectionManagement;



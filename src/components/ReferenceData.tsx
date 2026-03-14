'use client';

import React, { useState, useEffect } from 'react';
import { StateDto, PropertyTypeDto, InspectionTypeDto, InspectionStatusDto } from '@/types/api';
import { referenceApi } from '@/lib/api';
import { 
  RefreshCw, 
  Map, 
  Building2, 
  ClipboardCheck, 
  CheckCircle2, 
  Settings2, 
  Search,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ReferenceData: React.FC = () => {
  const [states, setStates] = useState<StateDto[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeDto[]>([]);
  const [inspectionTypes, setInspectionTypes] = useState<InspectionTypeDto[]>([]);
  const [inspectionStatuses, setInspectionStatuses] = useState<InspectionStatusDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('states');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statesData, propertyTypesData, inspectionTypesData, inspectionStatusesData] = await Promise.all([
        referenceApi.getStates(),
        referenceApi.getPropertyTypes(),
        referenceApi.getInspectionTypes(),
        referenceApi.getInspectionStatuses(),
      ]);
      setStates(statesData);
      setPropertyTypes(propertyTypesData);
      setInspectionTypes(inspectionTypesData);
      setInspectionStatuses(inspectionStatusesData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reference data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: 'states', label: 'States', data: states },
    { id: 'property-types', label: 'Property Types', data: propertyTypes },
    { id: 'inspection-types', label: 'Inspection Types', data: inspectionTypes },
    { id: 'inspection-statuses', label: 'Inspection Statuses', data: inspectionStatuses },
  ];

  const renderDataTable = (data: any[], type: string) => {
    if (loading) {
      return <div className="px-4 py-5 sm:px-6 text-center">Loading...</div>;
    }

    if (data.length === 0) {
      return (
        <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
          No {type.toLowerCase()} found.
        </div>
      );
    }

    return (
      <ul className="divide-y divide-gray-200">
        {data.map((item) => (
          <li key={item.id || item[`${type.toLowerCase().replace(' ', '')}Id`]} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-800 font-bold truncate">
                    {item.name}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      ID: {item.id || item[`${type.toLowerCase().replace(' ', '')}Id`]}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-sm text-gray-500">
                    {item.description && <p>Description: {item.description}</p>}
                    {item.abbreviation && <p>Abbreviation: {item.abbreviation}</p>}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reference Data</h2>
          <p className="text-gray-600 text-sm">System configuration and lookup data</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-800 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.data.length})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Reference data used throughout the application
          </p>
        </div>
        {renderDataTable(tabs.find(tab => tab.id === activeTab)?.data || [], tabs.find(tab => tab.id === activeTab)?.label || '')}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Map className="w-5 h-5 text-blue-700" />
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">States</p>
                <p className="text-2xl font-bold text-gray-900">{states.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">Property Types</p>
                <p className="text-2xl font-bold text-gray-900">{propertyTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-blue-800" />
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">Inspection Types</p>
                <p className="text-2xl font-bold text-gray-900">{inspectionTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-secondary-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-secondary-700" />
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">Inspection Statuses</p>
                <p className="text-2xl font-bold text-gray-900">{inspectionStatuses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferenceData;





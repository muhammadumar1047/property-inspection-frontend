'use client';

import React, { useState, useEffect } from 'react';
import { PropertyLayoutResponse, PropertyType } from '@/types/api';
import layoutApi from '@/lib/api/propertyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Trash2, Edit, Eye, EyeOff, X, Search, Building2, Save, ArrowLeft, ArrowRight, GripVertical, Sparkles, Layers, LayoutDashboard, Zap, Wand2, Lightbulb, Check } from 'lucide-react';

interface CreateLayoutData {
  LayoutName: string;
  LayoutTypeId: number;
  DisplayOrder: number;
  Areas: Array<{
    AreaName: string;
    DisplayOrder: number;
    Items: Array<{
      ItemName: string;
      DisplayOrder: number;
    }>;
  }>;
}

interface UpdateLayoutData {
  LayoutId: number;
  LayoutName: string;
  LayoutTypeId: number;
  DisplayOrder: number;
  Areas: Array<{
    AreaName: string;
    DisplayOrder: number;
    Items: Array<{
      ItemName: string;
      DisplayOrder: number;
    }>;
  }>;
}

const LayoutManagement: React.FC = () => {
  const [layouts, setLayouts] = useState<PropertyLayoutResponse[]>([]);
  const [filteredLayouts, setFilteredLayouts] = useState<PropertyLayoutResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLayout, setSelectedLayout] = useState<PropertyLayoutResponse | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLayoutType, setSelectedLayoutType] = useState('');
  const [selectedBathrooms, setSelectedBathrooms] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PropertyLayoutResponse | null>(null);
  
  // AI suggestion states
  const [aiSuggestions, setAiSuggestions] = useState<{[key: string]: string[]}>({});
  const [showSuggestions, setShowSuggestions] = useState<{[key: string]: boolean}>({});
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  // Create form state
  const [createFormData, setCreateFormData] = useState<CreateLayoutData>({
    LayoutName: '',
    LayoutTypeId: 1, // Default to Residential
    DisplayOrder: 1,
    Areas: []
  });
  
  // Edit form state
  const [editFormData, setEditFormData] = useState<UpdateLayoutData>({
    LayoutId: 0,
    LayoutName: '',
    LayoutTypeId: 1, // Default to Residential
    DisplayOrder: 1,
    Areas: []
  });

  const layoutTypes = [
    { id: PropertyType.Residential, name: 'Residential' },
    { id: PropertyType.Office, name: 'Office' },
    { id: PropertyType.RetailShop, name: 'Retail Shop' },
    { id: PropertyType.Factory, name: 'Factory' },
    { id: PropertyType.Building, name: 'Building' },
    { id: PropertyType.Commercial, name: 'Commercial' },
    { id: PropertyType.Industrial, name: 'Industrial' },
  ];

  // Drag & Drop state
  const [dragging, setDragging] = useState<
    | { type: 'area'; mode: 'create' | 'edit'; areaIndex: number }
    | { type: 'item'; mode: 'create' | 'edit'; areaIndex: number; itemIndex: number }
    | null
  >(null);

  // Collapsed state per area index for create/edit forms
  const [collapsedCreateAreas, setCollapsedCreateAreas] = useState<{ [index: number]: boolean }>({});
  const [collapsedEditAreas, setCollapsedEditAreas] = useState<{ [index: number]: boolean }>({});

  const isAreaCollapsed = (mode: 'create' | 'edit', index: number) =>
    mode === 'create' ? !!collapsedCreateAreas[index] : !!collapsedEditAreas[index];

  const toggleAreaCollapse = (mode: 'create' | 'edit', index: number) => {
    if (mode === 'create') {
      setCollapsedCreateAreas(prev => ({ ...prev, [index]: !prev[index] }));
    } else {
      setCollapsedEditAreas(prev => ({ ...prev, [index]: !prev[index] }));
    }
  };

  // Helpers
  const moveArrayElement = <T,>(arr: T[], fromIndex: number, toIndex: number): T[] => {
    const copy = arr.slice();
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    return copy;
  };

  const renumberDisplayOrders = (data: CreateLayoutData | UpdateLayoutData): CreateLayoutData | UpdateLayoutData => {
    return {
      ...data,
      Areas: data.Areas.map((area, areaIndex) => ({
        ...area,
        DisplayOrder: areaIndex + 1,
        Items: area.Items.map((item, itemIndex) => ({
          ...item,
          DisplayOrder: itemIndex + 1,
        })),
      })),
    };
  };

  // Persisting reorders is deferred to the Save/Update buttons

  // Area DnD
  const onAreaDragStart = (e: React.DragEvent, mode: 'create' | 'edit', areaIndex: number) => {
    e.stopPropagation();
    try { e.dataTransfer.setData('text/plain', 'area'); e.dataTransfer.effectAllowed = 'move'; } catch {}
    setDragging({ type: 'area', mode, areaIndex });
  };
  const onAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onAreaDrop = (mode: 'create' | 'edit', toIndex: number) => {
    if (!dragging || dragging.type !== 'area' || dragging.mode !== mode) return;
    const fromIndex = dragging.areaIndex;
    if (fromIndex === toIndex) return;
    if (mode === 'create') {
      setCreateFormData(prev => {
        const Areas = moveArrayElement(prev.Areas, fromIndex, toIndex);
        const updated = renumberDisplayOrders({ ...prev, Areas }) as CreateLayoutData;
        return updated;
      });
      setCollapsedCreateAreas({});
    } else {
      setEditFormData(prev => {
        const Areas = moveArrayElement(prev.Areas, fromIndex, toIndex);
        const updated = renumberDisplayOrders({ ...prev, Areas }) as UpdateLayoutData;
        return updated;
      });
      setCollapsedEditAreas({});
    }
    setDragging(null);
  };

  // Item DnD
  const onItemDragStart = (e: React.DragEvent, mode: 'create' | 'edit', areaIndex: number, itemIndex: number) => {
    e.stopPropagation();
    try { e.dataTransfer.setData('text/plain', 'item'); e.dataTransfer.effectAllowed = 'move'; } catch {}
    setDragging({ type: 'item', mode, areaIndex, itemIndex });
  };
  const onItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onItemDrop = (e: React.DragEvent, mode: 'create' | 'edit', areaIndex: number, toItemIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging || dragging.type !== 'item' || dragging.mode !== mode) return;
    if (dragging.areaIndex !== areaIndex) return; // intra-area only for now
    const fromItemIndex = dragging.itemIndex;
    if (fromItemIndex === toItemIndex) return;
    if (mode === 'create') {
      setCreateFormData(prev => {
        const areasCopy = prev.Areas.slice();
        const items = moveArrayElement(areasCopy[areaIndex].Items, fromItemIndex, toItemIndex);
        areasCopy[areaIndex] = { ...areasCopy[areaIndex], Items: items };
        const updated = renumberDisplayOrders({ ...prev, Areas: areasCopy }) as CreateLayoutData;
        return updated;
      });
    } else {
      setEditFormData(prev => {
        const areasCopy = prev.Areas.slice();
        const items = moveArrayElement(areasCopy[areaIndex].Items, fromItemIndex, toItemIndex);
        areasCopy[areaIndex] = { ...areasCopy[areaIndex], Items: items };
        const updated = renumberDisplayOrders({ ...prev, Areas: areasCopy }) as UpdateLayoutData;
        return updated;
      });
    }
    setDragging(null);
  };

  // AI-powered item suggestions based on area name and property type
  const generateItemSuggestions = (areaName: string, propertyTypeId: number): string[] => {
    const area = areaName.toLowerCase().trim();
    const propertyType = layoutTypes.find(t => t.id === propertyTypeId)?.name.toLowerCase() || '';
    
    // Define comprehensive item suggestions for different areas and property types
    const suggestions: {[key: string]: {[key: string]: string[]}} = {
      // Residential property suggestions
      'residential': {
        'living room': ['Sofa', 'Coffee Table', 'TV Stand', 'Bookshelf', 'Floor Lamp', 'Rug', 'Curtains', 'Wall Art'],
        'lounge': ['Sofa', 'Coffee Table', 'TV Stand', 'Bookshelf', 'Floor Lamp', 'Rug', 'Curtains', 'Wall Art'],
        'kitchen': ['Refrigerator', 'Stove', 'Microwave', 'Dishwasher', 'Kitchen Island', 'Cabinets', 'Countertop', 'Sink'],
        'bedroom': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
        'bedrom': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'], // Common typo
        'bed': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
        'bathroom': ['Toilet', 'Sink', 'Shower', 'Bathtub', 'Mirror', 'Towel Rack', 'Medicine Cabinet', 'Vanity'],
        'bath': ['Toilet', 'Sink', 'Shower', 'Bathtub', 'Mirror', 'Towel Rack', 'Medicine Cabinet', 'Vanity'],
        'ensuite': ['Toilet', 'Sink', 'Shower', 'Bathtub', 'Mirror', 'Towel Rack', 'Medicine Cabinet', 'Vanity'],
        'laundry': ['Washing Machine', 'Dryer', 'Laundry Sink', 'Storage Shelves', 'Ironing Board', 'Clothes Rack'],
        'garage': ['Garage Door', 'Storage Shelves', 'Workbench', 'Tool Storage', 'Car Parking Space', 'Utility Sink'],
        'balcony': ['Outdoor Furniture', 'Planters', 'Outdoor Lighting', 'Privacy Screen', 'Storage Box'],
        'garden': ['Garden Beds', 'Outdoor Furniture', 'Garden Shed', 'Water Feature', 'Pathway Lighting'],
        'pool': ['Pool Equipment', 'Pool Furniture', 'Pool Safety Equipment', 'Outdoor Shower', 'Pool House'],
        'entrance': ['Front Door', 'Welcome Mat', 'Coat Rack', 'Console Table', 'Mirror', 'Lighting'],
        'dining room': ['Dining Table', 'Dining Chairs', 'Sideboard', 'Chandelier', 'Curtains', 'Rug'],
        'dining': ['Dining Table', 'Dining Chairs', 'Sideboard', 'Chandelier', 'Curtains', 'Rug'],
        'study': ['Desk', 'Office Chair', 'Bookshelf', 'Desk Lamp', 'Filing Cabinet', 'Computer Setup'],
        'toilet': ['Toilet', 'Sink', 'Mirror', 'Towel Rack', 'Toilet Paper Holder', 'Hand Dryer']
      },
      // Office property suggestions
      'office': {
        'reception': ['Reception Desk', 'Waiting Chairs', 'Coffee Table', 'Magazine Rack', 'Reception Sign', 'Security System'],
        'conference room': ['Conference Table', 'Office Chairs', 'Projector', 'Whiteboard', 'Video Conferencing', 'Presentation Screen'],
        'conference': ['Conference Table', 'Office Chairs', 'Projector', 'Whiteboard', 'Video Conferencing', 'Presentation Screen'],
        'open office': ['Desks', 'Office Chairs', 'Filing Cabinets', 'Storage Units', 'Partition Screens', 'Task Lighting'],
        'meeting room': ['Meeting Table', 'Chairs', 'Whiteboard', 'Projector', 'Video Conferencing', 'Presentation Equipment'],
        'meeting': ['Meeting Table', 'Chairs', 'Whiteboard', 'Projector', 'Video Conferencing', 'Presentation Equipment'],
        'break room': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Dining Table', 'Chairs', 'Storage Cabinets'],
        'break': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Dining Table', 'Chairs', 'Storage Cabinets'],
        'kitchen': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Sink', 'Storage Cabinets', 'Dishwasher'],
        'bedroom': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
        'bedrom': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
        'bed': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'storage': ['Storage Shelves', 'Filing Cabinets', 'Storage Boxes', 'Labeling System', 'Security Locks'],
        'server room': ['Server Racks', 'UPS System', 'Cooling System', 'Cable Management', 'Fire Suppression', 'Security System'],
        'server': ['Server Racks', 'UPS System', 'Cooling System', 'Cable Management', 'Fire Suppression', 'Security System']
      },
      // Retail shop suggestions
      'retail shop': {
        'showroom': ['Display Cases', 'Product Shelves', 'Lighting', 'Cash Register', 'Shopping Baskets', 'Security Cameras'],
        'storage': ['Storage Shelves', 'Inventory Racks', 'Stock Room', 'Labeling System', 'Security Locks'],
        'fitting room': ['Mirrors', 'Hooks', 'Bench', 'Lighting', 'Privacy Curtains', 'Security System'],
        'fitting': ['Mirrors', 'Hooks', 'Bench', 'Lighting', 'Privacy Curtains', 'Security System'],
        'cashier': ['Cash Register', 'POS System', 'Receipt Printer', 'Card Reader', 'Security Cameras', 'Counter'],
        'entrance': ['Security System', 'Welcome Mat', 'Store Signage', 'Shopping Carts', 'Security Gates'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser']
      },
      // Factory suggestions
      'factory': {
        'production floor': ['Production Equipment', 'Work Benches', 'Safety Equipment', 'Quality Control Station', 'Material Storage'],
        'production': ['Production Equipment', 'Work Benches', 'Safety Equipment', 'Quality Control Station', 'Material Storage'],
        'warehouse': ['Storage Racks', 'Forklift', 'Loading Dock', 'Inventory System', 'Security System'],
        'office': ['Desks', 'Office Chairs', 'Computers', 'Filing Cabinets', 'Meeting Table', 'Whiteboard'],
        'break room': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Dining Table', 'Chairs', 'Storage'],
        'break': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Dining Table', 'Chairs', 'Storage'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'maintenance': ['Tool Storage', 'Workbench', 'Equipment Storage', 'Safety Equipment', 'Maintenance Logs']
      },
      // Building suggestions
      'building': {
        'lobby': ['Reception Desk', 'Seating Area', 'Information Board', 'Security System', 'Elevator', 'Directory'],
        'corridor': ['Lighting', 'Emergency Exit Signs', 'Fire Extinguisher', 'Security Cameras', 'Flooring'],
        'elevator': ['Elevator Car', 'Control Panel', 'Emergency Phone', 'Security Camera', 'Floor Indicators'],
        'stairwell': ['Stair Railings', 'Emergency Lighting', 'Fire Extinguisher', 'Emergency Exit Signs'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'utility room': ['Electrical Panel', 'HVAC System', 'Water Heater', 'Security System', 'Maintenance Tools'],
        'utility': ['Electrical Panel', 'HVAC System', 'Water Heater', 'Security System', 'Maintenance Tools']
      }
    };

    // Get suggestions based on property type and area
    const propertySuggestions = suggestions[propertyType] || suggestions['residential'];
    
    // Debug logging (remove in production)
    console.log('Area:', area, 'Property Type:', propertyType);
    console.log('Available keys:', Object.keys(propertySuggestions));
    
    // First try exact match
    let areaSuggestions = propertySuggestions[area] || [];
    
    // If no exact match, try fuzzy matching with common typos and partial matches
    if (areaSuggestions.length === 0) {
      // Try partial matches with more flexible logic
      for (const [key, items] of Object.entries(propertySuggestions)) {
        // Check if the area name contains the key or vice versa
        if (area.includes(key) || key.includes(area)) {
          // More flexible matching - allow shorter matches for common words
          if (area.length >= 2 && key.length >= 2) {
            areaSuggestions = items;
            console.log('Matched with key:', key, 'Items:', items);
            break;
          }
        }
      }
    } else {
      console.log('Exact match found:', areaSuggestions);
    }
    
    return areaSuggestions;
  };

  const bathroomOptions = ['1', '2', '3', '4', '5+'];
  const roomOptions = ['1', '2', '3', '4', '5+'];

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
        return message || 'A layout with these details already exists.';
      case 'ServerError':
        return message || 'A server error occurred. Please try again.';
      default:
        return message || fallback;
    }
  };

  useEffect(() => {
    loadLayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    filterLayouts();
  }, [layouts, searchTerm, selectedLayoutType, selectedBathrooms, selectedRooms]);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await layoutApi.getPaged(page, pageSize);
      setLayouts(result.data as any);
      setTotalCount(result.totalCount || (result.data?.length ?? 0));
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to load layouts');
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('Error loading layouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterLayouts = () => {
    let filtered = layouts;

    // Search by layout name
    if (searchTerm) {
      filtered = filtered.filter((layout: any) => 
        (layout.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by layout type
    if (selectedLayoutType) {
      filtered = filtered.filter((layout: any) => 
        String(layout.layoutType) === selectedLayoutType
      );
    }

    // Filter by bathrooms (count items with "bath" in name)
    if (selectedBathrooms.length > 0) {
      filtered = filtered.filter((layout: any) => {
        const bathCount = (layout.layoutArea || []).reduce((count: number, area: any) => {
          return count + ((area.layoutItem || []).filter((item: any) => 
            String(item.itemName || '').toLowerCase().includes('bath')
          ).length || 0);
        }, 0) || 0;
        
        return selectedBathrooms.includes(bathCount.toString()) || 
               (bathCount >= 5 && selectedBathrooms.includes('5+'));
      });
    }

    // Filter by rooms (count items with "bed" in name)
    if (selectedRooms.length > 0) {
      filtered = filtered.filter((layout: any) => {
        const roomCount = (layout.layoutArea || []).reduce((count: number, area: any) => {
          return count + ((area.layoutItem || []).filter((item: any) => 
            String(item.itemName || '').toLowerCase().includes('bed')
          ).length || 0);
        }, 0) || 0;
        
        return selectedRooms.includes(roomCount.toString()) || 
               (roomCount >= 5 && selectedRooms.includes('5+'));
      });
    }

    setFilteredLayouts(filtered);
  };

  const getNextDisplayOrder = () => {
    if (layouts.length === 0) return 1;
    const maxDisplayOrder = Math.max(...layouts.map(layout => layout.displayOrder || 0));
    return maxDisplayOrder + 1;
  };

  const normalizeDisplayOrders = (data: CreateLayoutData | UpdateLayoutData) => {
    return {
      ...data,
      Areas: data.Areas.map((area, areaIndex) => ({
        ...area,
        DisplayOrder: areaIndex + 1,
        Items: area.Items.map((item, itemIndex) => ({
          ...item,
          DisplayOrder: itemIndex + 1
        }))
      }))
    };
  };

  const validateLayoutData = (data: CreateLayoutData | UpdateLayoutData): string | null => {
    if (!data.LayoutName.trim()) return 'Layout name is required.';
    if (!data.LayoutTypeId) return 'Layout type is required.';
    for (let i = 0; i < data.Areas.length; i += 1) {
      const area = data.Areas[i];
      if (!area.AreaName.trim()) return `Area ${i + 1}: area name is required.`;
      for (let j = 0; j < area.Items.length; j += 1) {
        const item = area.Items[j];
        if (!item.ItemName.trim()) {
          return `Area ${i + 1}, item ${j + 1}: item name is required.`;
        }
      }
    }
    return null;
  };

  const handleCreateLayout = async () => {
    const validationError = validateLayoutData(createFormData);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const nextDisplayOrder = getNextDisplayOrder();
      const dataWithDisplayOrder = {
        ...createFormData,
        DisplayOrder: nextDisplayOrder,
      };
      const normalizedData = normalizeDisplayOrders(dataWithDisplayOrder);
      const payload = {
        layoutType: normalizedData.LayoutTypeId as any,
        name: normalizedData.LayoutName,
        displayOrder: normalizedData.DisplayOrder,
        layoutArea: normalizedData.Areas.map((area) => ({
          areaName: area.AreaName,
          displayOrder: area.DisplayOrder,
          layoutItem: area.Items.map((item) => ({
            itemName: item.ItemName,
            displayOrder: item.DisplayOrder,
          })),
        })),
      };
      await layoutApi.create(payload as any);
      // eslint-disable-next-line no-alert
      alert('Layout created successfully');
      setShowCreateModal(false);
      setCreateFormData({
        LayoutName: '',
        LayoutTypeId: PropertyType.Residential,
        DisplayOrder: getNextDisplayOrder() + 1,
        Areas: [],
      });
      await loadLayouts();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to create layout');
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('Error creating layout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLayout = async () => {
    const validationError = validateLayoutData(editFormData);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const normalizedData = normalizeDisplayOrders(editFormData);
      const payload = {
        id: editFormData.LayoutId as any,
        layoutType: normalizedData.LayoutTypeId as any,
        name: normalizedData.LayoutName,
        displayOrder: normalizedData.DisplayOrder,
        layoutArea: normalizedData.Areas.map((area, index) => ({
          id: ((selectedLayout as any)?.layoutArea?.[index]?.id) as any,
          areaName: area.AreaName,
          displayOrder: area.DisplayOrder,
          layoutItem: area.Items.map((item, itemIndex) => ({
            id: ((selectedLayout as any)?.layoutArea?.[index]?.layoutItem?.[itemIndex]?.id) as any,
            itemName: item.ItemName,
            displayOrder: item.DisplayOrder,
          })),
        })),
      };
      await layoutApi.update(String(editFormData.LayoutId), payload as any);
      // eslint-disable-next-line no-alert
      alert('Layout updated successfully');
      setShowEditModal(false);
      await loadLayouts();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to update layout');
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('Error updating layout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteLayout = async () => {
    if (!deleteTarget?.id) return;
    try {
      setLoading(true);
      setError('');
      await layoutApi.delete(String((deleteTarget as any).id));
      // eslint-disable-next-line no-alert
      alert('Layout deleted successfully');
      setDeleteTarget(null);
      await loadLayouts();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to delete layout');
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('Error deleting layout:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = async (layout: PropertyLayoutResponse) => {
    try {
      const fullLayout = await layoutApi.getById(String((layout as any).id));
      setEditFormData({
        LayoutId: (fullLayout as any).id,
        LayoutName: fullLayout.name,
        LayoutTypeId: fullLayout.layoutType as any,
        DisplayOrder: fullLayout.displayOrder,
        Areas: (fullLayout.layoutArea || []).map((area: any) => ({
          AreaName: area.areaName,
          DisplayOrder: area.displayOrder,
          Items: (area.layoutItem || []).map((item: any) => ({
            ItemName: item.itemName,
            DisplayOrder: item.displayOrder,
          })),
        })),
      });
      setSelectedLayout(fullLayout as any);
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load layout details');
      console.error('Error loading layout:', err);
    }
  };

  const openViewModal = async (layout: PropertyLayoutResponse) => {
    try {
      const fullLayout = await layoutApi.getById(String((layout as any).id));
      setSelectedLayout(fullLayout as any);
      setShowViewModal(true);
    } catch (err) {
      setError('Failed to load layout details');
      console.error('Error loading layout:', err);
    }
  };

  const addArea = (isEdit = false) => {
    const newArea = {
      AreaName: '',
      DisplayOrder: (isEdit ? editFormData.Areas : createFormData.Areas).length + 1,
      Items: []
    };
    
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: [...prev.Areas, newArea]
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: [...prev.Areas, newArea]
      }));
    }
  };

  const removeArea = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: prev.Areas.filter((_, i) => i !== index).map((area, i) => ({
          ...area,
          DisplayOrder: i + 1
        }))
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: prev.Areas.filter((_, i) => i !== index).map((area, i) => ({
          ...area,
          DisplayOrder: i + 1
        }))
      }));
    }
  };

  const updateArea = (index: number, field: string, value: string, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === index ? { ...area, [field]: value } : area
        )
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === index ? { ...area, [field]: value } : area
        )
      }));
    }
  };

  const addItem = (areaIndex: number, isEdit = false) => {
    const newItem = {
      ItemName: '',
      DisplayOrder: (isEdit ? editFormData.Areas[areaIndex].Items : createFormData.Areas[areaIndex].Items).length + 1
    };
    
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? { ...area, Items: [...area.Items, newItem] }
            : area
        )
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? { ...area, Items: [...area.Items, newItem] }
            : area
        )
      }));
    }
  };

  const removeItem = (areaIndex: number, itemIndex: number, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? { 
                ...area, 
                Items: area.Items.filter((_, j) => j !== itemIndex).map((item, j) => ({
                  ...item,
                  DisplayOrder: j + 1
                }))
              }
            : area
        )
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? { 
                ...area, 
                Items: area.Items.filter((_, j) => j !== itemIndex).map((item, j) => ({
                  ...item,
                  DisplayOrder: j + 1
                }))
              }
            : area
        )
      }));
    }
  };

  const updateItem = (areaIndex: number, itemIndex: number, field: string, value: string, isEdit = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? {
                ...area,
                Items: area.Items.map((item, j) => 
                  j === itemIndex ? { ...item, [field]: value } : item
                )
              }
            : area
        )
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? {
                ...area,
                Items: area.Items.map((item, j) => 
                  j === itemIndex ? { ...item, [field]: value } : item
                )
              }
            : area
        )
      }));
    }
  };

  const toggleBathroomFilter = (value: string) => {
    setSelectedBathrooms(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleRoomFilter = (value: string) => {
    setSelectedRooms(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  // AI suggestion functions
  const handleAreaNameChange = (areaIndex: number, value: string, isEdit = false) => {
    updateArea(areaIndex, 'AreaName', value, isEdit);
    
    const suggestionKey = `${isEdit ? 'edit' : 'create'}-${areaIndex}`;
    
    // Clear old suggestions when area name changes
    setAiSuggestions(prev => ({
      ...prev,
      [suggestionKey]: []
    }));
    setShowSuggestions(prev => ({
      ...prev,
      [suggestionKey]: false
    }));
    
    // Generate new AI suggestions when area name is entered (minimum 2 characters)
    if (value.trim().length >= 2) {
      const propertyTypeId = isEdit ? editFormData.LayoutTypeId : createFormData.LayoutTypeId;
      const suggestions = generateItemSuggestions(value, propertyTypeId);
      
      console.log('Generated suggestions for:', value, 'Property Type ID:', propertyTypeId, 'Suggestions:', suggestions);
      
      // Only show suggestions if we have meaningful matches
      if (suggestions.length > 0) {
        setAiSuggestions(prev => ({
          ...prev,
          [suggestionKey]: suggestions
        }));
        setShowSuggestions(prev => ({
          ...prev,
          [suggestionKey]: true
        }));
        console.log('Showing suggestions for:', suggestionKey);
      } else {
        console.log('No suggestions found for:', value);
      }
    }
  };

  const applyAISuggestions = (areaIndex: number, isEdit = false) => {
    const suggestionKey = `${isEdit ? 'edit' : 'create'}-${areaIndex}`;
    const suggestions = aiSuggestions[suggestionKey] || [];
    
    if (suggestions.length > 0) {
      const newItems = suggestions.map((item, index) => ({
        ItemName: item,
        DisplayOrder: index + 1
      }));
      
      if (isEdit) {
        setEditFormData(prev => ({
          ...prev,
          Areas: prev.Areas.map((area, i) => 
            i === areaIndex 
              ? { ...area, Items: [...area.Items, ...newItems] }
              : area
          )
        }));
      } else {
        setCreateFormData(prev => ({
          ...prev,
          Areas: prev.Areas.map((area, i) => 
            i === areaIndex 
              ? { ...area, Items: [...area.Items, ...newItems] }
              : area
          )
        }));
      }
      
      // Hide suggestions after applying
      setShowSuggestions(prev => ({
        ...prev,
        [suggestionKey]: false
      }));
    }
  };

  const addSingleSuggestion = (areaIndex: number, itemName: string, isEdit = false) => {
    const newItem = {
      ItemName: itemName,
      DisplayOrder: 1
    };
    
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? { ...area, Items: [...area.Items, newItem] }
            : area
        )
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        Areas: prev.Areas.map((area, i) => 
          i === areaIndex 
            ? { ...area, Items: [...area.Items, newItem] }
            : area
        )
      }));
    }
  };

  const dismissSuggestions = (areaIndex: number, isEdit = false) => {
    const suggestionKey = `${isEdit ? 'edit' : 'create'}-${areaIndex}`;
    setShowSuggestions(prev => ({
      ...prev,
      [suggestionKey]: false
    }));
  };

  const renderLayoutComponents = (layout: PropertyLayoutResponse) => {
    const components: Array<{text: string, color: string}> = [];
    
    layout.layoutArea?.forEach((area: any) => {
      area.layoutItem?.forEach((item: any) => {
        const itemName = (item.itemName || '').toLowerCase();
        if (itemName.includes('bed')) {
          const count = itemName.match(/\d+/)?.[0] || '1';
          components.push({text: `${count} Bed`, color: 'bg-primary/10 text-primary border-primary/20'});
        } else if (itemName.includes('bath')) {
          const count = itemName.match(/\d+/)?.[0] || '1';
          components.push({text: `${count} Bath`, color: 'bg-secondary/10 text-secondary border-secondary/20'});
        } else if (itemName.includes('kitchen')) {
          components.push({text: '1 Kitchen', color: 'bg-orange-100 text-orange-800 border-orange-200'});
        } else if (itemName.includes('lounge') || itemName.includes('living')) {
          components.push({text: '1 Lounge', color: 'bg-emerald-100 text-emerald-800 border-emerald-200'});
        } else if (itemName.includes('dining')) {
          components.push({text: '1 Dining Room', color: 'bg-amber-100 text-amber-800 border-amber-200'});
        } else if (itemName.includes('laundry')) {
          components.push({text: '1 Laundry', color: 'bg-gray-100 text-gray-800 border-gray-200'});
        } else if (itemName.includes('garage')) {
          components.push({text: '1 Garage', color: 'bg-slate-100 text-slate-800 border-slate-200'});
        } else if (itemName.includes('balcony')) {
          components.push({text: '1 Balcony', color: 'bg-primary/5 text-primary-hover border-primary/10'});
        } else if (itemName.includes('garden')) {
          components.push({text: '1 Garden', color: 'bg-emerald-50 text-emerald-700 border-emerald-100'});
        } else if (itemName.includes('pool')) {
          components.push({text: '1 Pool', color: 'bg-primary/10 text-primary border-primary/20'});
        } else if (itemName.includes('entrance')) {
          components.push({text: '1 Entrance', color: 'bg-primary/10 text-primary border-primary/20'});
        } else if (itemName.includes('ensuite')) {
          components.push({text: '1 Ensuite', color: 'bg-secondary/10 text-secondary border-secondary/20'});
        } else if (itemName.includes('toilet')) {
          components.push({text: '1 Toilet', color: 'bg-secondary/5 text-secondary-hover border-secondary/10'});
        } else if (itemName.includes('study')) {
          components.push({text: '1 Study', color: 'bg-amber-50 text-amber-700 border-amber-100'});
        } else if (itemName.includes('exterior')) {
          components.push({text: '1 Exterior', color: 'bg-stone-50 text-stone-700 border-stone-100'});
        } else {
          components.push({text: `1 ${item.itemName}`, color: 'bg-gray-50 text-gray-700 border-gray-100'});
        }
      });
    });

    return components;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
      <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Layout Management</h1>
              <p className="text-sm text-gray-600 mt-1">Manage property layouts and templates</p>
            </div>
        <Button 
              onClick={() => {
                const nextDisplayOrder = getNextDisplayOrder();
                setCreateFormData({
                  LayoutName: '',
                  LayoutTypeId: 1, // Default to Residential
                  DisplayOrder: nextDisplayOrder,
                  Areas: []
                });
                setShowCreateModal(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
        >
              <Plus className="w-4 h-4 mr-2" />
              Create Layout
        </Button>
        </div>
      </div>
      </div>

      <div className="p-6 space-y-6">
      {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Search & Filters</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Layout Name</Label>
                <div className="flex gap-2">
            <Input
                    placeholder="Search by layout name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 border-gray-300 focus:border-primary focus:ring-primary"
                  />
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-white px-4"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
          </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Layout Type</Label>
                <select
                  value={selectedLayoutType}
                  onChange={(e) => setSelectedLayoutType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Types</option>
                  {layoutTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Bathrooms</Label>
                <div className="flex gap-4 flex-wrap">
                  {bathroomOptions.map(option => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBathrooms.includes(option)}
                        onChange={() => toggleBathroomFilter(option)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Rooms</Label>
                <div className="flex gap-4 flex-wrap">
                  {roomOptions.map(option => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(option)}
                        onChange={() => toggleRoomFilter(option)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layouts Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Property Layouts</h3>
              <div className="text-sm text-gray-500">
                Showing {(totalCount === 0 ? 0 : (page - 1) * pageSize + 1)}-
                {Math.min(page * pageSize, totalCount)} of {totalCount} layout
                {totalCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Layout Name
                  </TableHead>
                  <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Layout Type
                  </TableHead>
                  <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Display Order
                  </TableHead>
                  <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Areas Count
                  </TableHead>
                  <TableHead className="w-32 px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-gray-500">Loading layouts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No layouts found</p>
                        <p className="text-sm">No layouts match your current search criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLayouts.map((layout: any) => {
                    const layoutType = layoutTypes.find(t => t.id === layout.layoutType);
                    return (
                      <TableRow key={layout.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {layout.name}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/20"
                          >
                            {layoutType?.name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {layout.displayOrder}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {(layout.layoutArea || layout.areas || []).length ?? 0}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openViewModal(layout)}
                              className="h-9 w-9 p-0 text-primary border-primary/20 hover:text-primary-hover hover:bg-primary/10 hover:border-primary/30 transition-all"
                              title="View Layout"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(layout)}
                              className="h-9 w-9 p-0 text-secondary border-secondary/20 hover:text-secondary-hover hover:bg-secondary/10 hover:border-secondary/30 transition-all"
                              title="Edit Layout"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteTarget(layout)}
                              className="h-9 w-9 p-0 text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all"
                              title="Delete Layout"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-gray-100 animate-in zoom-in-95 duration-300">
          {/* Header with gradient */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-primary-800 to-primary-900 rounded-t-2xl flex-shrink-0">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Create New Layout</h2>
                  <p className="text-blue-100/80 mt-1">Design a new property layout template</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-all duration-200 hover:scale-105 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto flex-1 min-h-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="space-y-8">
              {/* Basic Information Card */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Basic Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="create-layout-name" className="text-sm font-medium text-gray-700">Layout Name</Label>
                      <div className="relative">
                        <Input
                          id="create-layout-name"
                          value={createFormData.LayoutName}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, LayoutName: e.target.value }))}
                          placeholder="Enter a descriptive layout name"
                          className="pl-4 pr-4 py-3 border-gray-200 focus:border-primary focus:ring-primary rounded-xl transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-layout-type" className="text-sm font-medium text-gray-700">Layout Type</Label>
                      <div className="relative">
                        <select
                          id="create-layout-type"
                          value={createFormData.LayoutTypeId}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, LayoutTypeId: parseInt(e.target.value) }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
                        >
                          {layoutTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Areas Configuration Card */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Layers className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900">Areas & Components</CardTitle>
                    </div>
                    <Button
                      onClick={() => addArea(false)}
                      className="bg-gradient-to-r from-primary-800 to-primary-900 hover:from-primary-900 hover:to-black text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Area
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {createFormData.Areas.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Layers className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No areas added yet</h3>
                        <p className="text-gray-500 mb-4">Start by adding areas to define the layout structure</p>
                        <Button
                          onClick={() => addArea(false)}
                          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-6 py-2 rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Area
                        </Button>
                      </div>
                    ) : (
                      createFormData.Areas.map((area, areaIndex) => (
                        <Card
                          key={areaIndex}
                          className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                          onDragOver={onAreaDragOver}
                          onDrop={() => onAreaDrop('create', areaIndex)}
                        >
                          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center cursor-move"
                                  draggable
                                  onDragStart={(e) => onAreaDragStart(e, 'create', areaIndex)}
                                >
                                  <GripVertical className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Area {areaIndex + 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleAreaCollapse('create', areaIndex)}
                                  className="text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg"
                                >
                                  {isAreaCollapsed('create', areaIndex) ? (
                                    <>
                                      <Eye className="w-4 h-4 mr-1" /> Show Items
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-4 h-4 mr-1" /> Hide Items
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeArea(areaIndex, false)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="relative">
                                <Input
                                  value={area.AreaName}
                                  onChange={(e) => handleAreaNameChange(areaIndex, e.target.value, false)}
                                  placeholder="Enter area name (e.g., Living Room, Kitchen, Bedroom)"
                                  className="border-gray-200 focus:border-primary focus:ring-primary rounded-xl"
                                />
                                {area.AreaName.trim().length > 2 && (
                                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    <Wand2 className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* AI Suggestions */}
                            {showSuggestions[`create-${areaIndex}`] && aiSuggestions[`create-${areaIndex}`] && (
                              <div className="mt-3 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary/20 rounded-xl shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Lightbulb className="w-5 h-5 text-primary" />
                                    <span className="text-sm font-semibold text-primary">AI Suggestions</span>
                                    <Badge className="bg-primary/20 text-primary text-xs font-medium border border-primary/30">
                                      {aiSuggestions[`create-${areaIndex}`].length} items
                                    </Badge>
                                  </div>
                                  <button
                                    onClick={() => dismissSuggestions(areaIndex, false)}
                                    className="text-primary hover:text-primary-hover transition-colors p-1 hover:bg-primary/20 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {aiSuggestions[`create-${areaIndex}`].map((item, index) => (
                                    <Badge 
                                      key={index} 
                                      className="bg-primary text-white border-2 border-primary-hover hover:bg-primary-hover transition-colors font-semibold shadow-lg px-3 py-1 cursor-pointer hover:scale-105"
                                      onClick={() => addSingleSuggestion(areaIndex, item, false)}
                                    >
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => applyAISuggestions(areaIndex, false)}
                                  className="bg-primary text-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-all"
                                >
                                  <Wand2 className="w-3 h-3 mr-1" />
                                  Apply All Suggestions
                                </Button>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              {!isAreaCollapsed('create', areaIndex) && (
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-gray-700">Items ({area.Items.length})</Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addItem(areaIndex, false)}
                                    className="text-primary border-primary/20 hover:bg-primary/10 hover:border-primary/30 rounded-lg"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Item
                                  </Button>
                                </div>
                              )}
                              {!isAreaCollapsed('create', areaIndex) && (
                                <>
                                  {area.Items.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                                      <p className="text-gray-500 text-sm">No items added to this area yet</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {area.Items.map((item, itemIndex) => (
                                        <div
                                          key={itemIndex}
                                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                                      draggable
                                      onDragStart={(e) => onItemDragStart(e, 'create', areaIndex, itemIndex)}
                                      onDragOver={onItemDragOver}
                                      onDrop={(e) => onItemDrop(e, 'create', areaIndex, itemIndex)}
                                        >
                                          <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center">
                                            <GripVertical className="w-3 h-3 text-gray-500" />
                                          </div>
                                          <Input
                                            value={item.ItemName}
                                            onChange={(e) => updateItem(areaIndex, itemIndex, 'ItemName', e.target.value, false)}
                                            placeholder="Item name (e.g., Bed, Bathroom, Kitchen Island)"
                                            className="flex-1 border-0 bg-transparent focus:ring-0 text-sm"
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeItem(areaIndex, itemIndex, false)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg w-8 h-8 p-0"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm rounded-b-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {createFormData.Areas.length} area{createFormData.Areas.length !== 1 ? 's' : ''} • {createFormData.Areas.reduce((acc, area) => acc + area.Items.length, 0)} item{createFormData.Areas.reduce((acc, area) => acc + area.Items.length, 0) !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLayout}
                  disabled={loading || !createFormData.LayoutName.trim()}
                  className="bg-gradient-to-r from-primary-800 to-primary-900 hover:from-primary-900 hover:to-black text-white px-8 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Create Layout</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal */}
    {showEditModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-gray-100 animate-in zoom-in-95 duration-300">
          {/* Header with gradient */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-primary-800 to-primary-900 rounded-t-2xl flex-shrink-0">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Layout</h2>
                  <p className="text-blue-100/80 mt-1">Modify layout details and components</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-all duration-200 hover:scale-105 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto flex-1 min-h-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="space-y-8">
              {/* Basic Information Card */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Basic Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="edit-layout-name" className="text-sm font-medium text-gray-700">Layout Name</Label>
                      <div className="relative">
                        <Input
                          id="edit-layout-name"
                          value={editFormData.LayoutName}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, LayoutName: e.target.value }))}
                          placeholder="Enter a descriptive layout name"
                          className="pl-4 pr-4 py-3 border-gray-200 focus:border-primary focus:ring-primary rounded-xl transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-layout-type" className="text-sm font-medium text-gray-700">Layout Type</Label>
                      <div className="relative">
                        <select
                          id="edit-layout-type"
                          value={editFormData.LayoutTypeId}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, LayoutTypeId: parseInt(e.target.value) }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
                        >
                          {layoutTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Areas Configuration Card */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Layers className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900">Areas & Components</CardTitle>
                    </div>
                    <Button
                      onClick={() => addArea(true)}
                      className="bg-gradient-to-r from-primary-800 to-primary-900 hover:from-primary-900 hover:to-black text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Area
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {editFormData.Areas.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Layers className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No areas configured</h3>
                        <p className="text-gray-500 mb-4">Add areas to define the layout structure</p>
                        <Button
                          onClick={() => addArea(true)}
                          className="bg-gradient-to-r from-primary-800 to-primary-900 hover:from-primary-900 hover:to-black text-white px-6 py-2 rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Area
                        </Button>
                      </div>
                    ) : (
                      editFormData.Areas.map((area, areaIndex) => (
                        <Card
                          key={areaIndex}
                          className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                          onDragOver={onAreaDragOver}
                          onDrop={() => onAreaDrop('edit', areaIndex)}
                        >
                          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center cursor-move"
                                  draggable
                                  onDragStart={(e) => onAreaDragStart(e, 'edit', areaIndex)}
                                >
                                  <GripVertical className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Area {areaIndex + 1}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleAreaCollapse('edit', areaIndex)}
                                  className="text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg"
                                >
                                  {isAreaCollapsed('edit', areaIndex) ? (
                                    <>
                                      <Eye className="w-4 h-4 mr-1" /> Show Items
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-4 h-4 mr-1" /> Hide Items
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeArea(areaIndex, true)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="relative">
                                <Input
                                  value={area.AreaName}
                                  onChange={(e) => handleAreaNameChange(areaIndex, e.target.value, true)}
                                  placeholder="Enter area name (e.g., Living Room, Kitchen, Bedroom)"
                                  className="border-gray-200 focus:border-primary focus:ring-primary rounded-xl"
                                />
                                {area.AreaName.trim().length > 2 && (
                                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    <Wand2 className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* AI Suggestions */}
                            {showSuggestions[`edit-${areaIndex}`] && aiSuggestions[`edit-${areaIndex}`] && (
                              <div className="mt-3 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary/20 rounded-xl shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Lightbulb className="w-5 h-5 text-primary" />
                                    <span className="text-sm font-semibold text-primary">AI Suggestions</span>
                                    <Badge className="bg-primary/20 text-primary text-xs font-medium border border-primary/30">
                                      {aiSuggestions[`edit-${areaIndex}`].length} items
                                    </Badge>
                                  </div>
                                  <button
                                    onClick={() => dismissSuggestions(areaIndex, true)}
                                    className="text-primary hover:text-primary-hover transition-colors p-1 hover:bg-primary/20 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {aiSuggestions[`edit-${areaIndex}`].map((item, index) => (
                                    <Badge 
                                      key={index} 
                                      className="bg-primary text-white border-2 border-primary-hover hover:bg-primary-hover transition-colors font-semibold shadow-lg px-3 py-1 cursor-pointer hover:scale-105"
                                      onClick={() => addSingleSuggestion(areaIndex, item, true)}
                                    >
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => applyAISuggestions(areaIndex, true)}
                                  className="bg-primary text-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-all"
                                >
                                  <Wand2 className="w-3 h-3 mr-1" />
                                  Apply All Suggestions
                                </Button>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              {!isAreaCollapsed('edit', areaIndex) && (
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-gray-700">Items ({area.Items.length})</Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addItem(areaIndex, true)}
                                    className="text-primary border-primary/20 hover:bg-primary/10 hover:border-primary/30 rounded-lg"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Item
                                  </Button>
                                </div>
                              )}
                              {!isAreaCollapsed('edit', areaIndex) && (
                                <>
                                  {area.Items.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                                      <p className="text-gray-500 text-sm">No items added to this area yet</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {area.Items.map((item, itemIndex) => (
                                        <div
                                          key={itemIndex}
                                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                                      draggable
                                      onDragStart={(e) => onItemDragStart(e, 'edit', areaIndex, itemIndex)}
                                      onDragOver={onItemDragOver}
                                      onDrop={(e) => onItemDrop(e, 'edit', areaIndex, itemIndex)}
                                        >
                                          <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center">
                                            <GripVertical className="w-3 h-3 text-gray-500" />
                                          </div>
                                          <Input
                                            value={item.ItemName}
                                            onChange={(e) => updateItem(areaIndex, itemIndex, 'ItemName', e.target.value, true)}
                                            placeholder="Item name (e.g., Bed, Bathroom, Kitchen Island)"
                                            className="flex-1 border-0 bg-transparent focus:ring-0 text-sm"
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeItem(areaIndex, itemIndex, true)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-lg w-8 h-8 p-0"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm rounded-b-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {editFormData.Areas.length} area{editFormData.Areas.length !== 1 ? 's' : ''} • {editFormData.Areas.reduce((acc, area) => acc + area.Items.length, 0)} item{editFormData.Areas.reduce((acc, area) => acc + area.Items.length, 0) !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditLayout}
                  disabled={loading || !editFormData.LayoutName.trim()}
                  className="bg-gradient-to-r from-primary-800 to-primary-900 hover:from-primary-900 hover:to-black text-white px-8 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Update Layout</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* View Modal */}
    {showViewModal && selectedLayout && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-gray-100">
          {/* Header */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-primary-800 to-primary-900 rounded-t-2xl flex-shrink-0">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedLayout.name}
                  </h2>
                  <p className="text-blue-100/80 mt-1">
                    Full property layout structure and components
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-all duration-200 hover:scale-105 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto flex-1 min-h-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="space-y-8">
              {/* Summary card */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Layout Details
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Layout Type
                      </Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {layoutTypes.find(t => t.id === selectedLayout.layoutType)?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Display Order
                      </Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedLayout.displayOrder}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Created
                      </Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedLayout.createdAt
                          ? new Date(selectedLayout.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Areas & items */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Layers className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Areas & Components ({selectedLayout.layoutArea?.length || 0} areas)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(selectedLayout.layoutArea ?? []).map((area: any, areaIndex: number) => (
                      <Card key={area.id ?? areaIndex} className="bg-gray-50 border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base font-semibold text-gray-900">
                                {area.areaName}
                              </CardTitle>
                              <p className="text-xs text-gray-500 mt-1">
                                Display order: {area.displayOrder}
                              </p>
                            </div>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                              {(area.layoutItem ?? []).length} item{(area.layoutItem ?? []).length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Items
                            </Label>
                            {(area.layoutItem ?? []).length === 0 ? (
                              <div className="bg-white p-3 rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
                                No items defined for this area.
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {(area.layoutItem ?? []).map((item: any, itemIndex: number) => (
                                  <div
                                    key={item.id ?? itemIndex}
                                    className="bg-white px-3 py-2 rounded-lg border border-gray-200 flex items-center justify-between"
                                  >
                                    <span className="text-sm text-gray-900">
                                      {item.itemName}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Order: {item.displayOrder}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm rounded-b-2xl flex-shrink-0">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900">Delete Layout</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {(deleteTarget as any).name || 'this layout'}
                </span>
                ? This action cannot be undone.
              </p>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteLayout}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutManagement;
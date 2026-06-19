'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PropertyLayoutResponse, PropertyType, CreatePropertyLayoutRequest, UpdatePropertyLayoutRequest } from '@/types/api';
import layoutApi from '@/lib/api/propertyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Trash2, GripVertical, Sparkles, ArrowLeft, Save, Layers,
    ChevronRight, Building2, Wand2, Check, X, AlertCircle, Loader2
} from 'lucide-react';

/* ────────────────────────────────────────────
   Types & constants
   ──────────────────────────────────────────── */

interface AreaData {
    id?: string;
    AreaName: string;
    DisplayOrder: number;
    Items: ItemData[];
}

interface ItemData {
    id?: string;
    ItemName: string;
    DisplayOrder: number;
}

export interface LayoutFormData {
    LayoutName: string;
    LayoutTypeId: number;
    DisplayOrder: number;
    Areas: AreaData[];
}

const LAYOUT_TYPES = [
    { id: PropertyType.Residential, name: 'Residential' },
    { id: PropertyType.Office, name: 'Office' },
    { id: PropertyType.RetailShop, name: 'Retail Shop' },
    { id: PropertyType.Factory, name: 'Factory' },
    { id: PropertyType.Building, name: 'Building' },
];

/* ────────────────────────────────────────────
   AI Suggestions engine
   ──────────────────────────────────────────── */

const SUGGESTIONS: Record<string, Record<string, string[]>> = {
    'residential': {
        'living room': ['Sofa', 'Coffee Table', 'TV Stand', 'Bookshelf', 'Floor Lamp', 'Rug', 'Curtains', 'Wall Art'],
        'lounge': ['Sofa', 'Coffee Table', 'TV Stand', 'Bookshelf', 'Floor Lamp', 'Rug', 'Curtains', 'Wall Art'],
        'kitchen': ['Refrigerator', 'Stove', 'Microwave', 'Dishwasher', 'Kitchen Island', 'Cabinets', 'Countertop', 'Sink'],
        'bedroom': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
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
        'toilet': ['Toilet', 'Sink', 'Mirror', 'Towel Rack', 'Toilet Paper Holder', 'Hand Dryer'],
    },
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
        'bed': ['Bed', 'Wardrobe', 'Dresser', 'Nightstand', 'Bedside Lamp', 'Mirror', 'Curtains', 'Rug'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'storage': ['Storage Shelves', 'Filing Cabinets', 'Storage Boxes', 'Labeling System', 'Security Locks'],
        'server room': ['Server Racks', 'UPS System', 'Cooling System', 'Cable Management', 'Fire Suppression', 'Security System'],
        'server': ['Server Racks', 'UPS System', 'Cooling System', 'Cable Management', 'Fire Suppression', 'Security System'],
    },
    'retail shop': {
        'showroom': ['Display Cases', 'Product Shelves', 'Lighting', 'Cash Register', 'Shopping Baskets', 'Security Cameras'],
        'storage': ['Storage Shelves', 'Inventory Racks', 'Stock Room', 'Labeling System', 'Security Locks'],
        'fitting room': ['Mirrors', 'Hooks', 'Bench', 'Lighting', 'Privacy Curtains', 'Security System'],
        'fitting': ['Mirrors', 'Hooks', 'Bench', 'Lighting', 'Privacy Curtains', 'Security System'],
        'cashier': ['Cash Register', 'POS System', 'Receipt Printer', 'Card Reader', 'Security Cameras', 'Counter'],
        'entrance': ['Security System', 'Welcome Mat', 'Store Signage', 'Shopping Carts', 'Security Gates'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
    },
    'factory': {
        'production floor': ['Production Equipment', 'Work Benches', 'Safety Equipment', 'Quality Control Station', 'Material Storage'],
        'production': ['Production Equipment', 'Work Benches', 'Safety Equipment', 'Quality Control Station', 'Material Storage'],
        'warehouse': ['Storage Racks', 'Forklift', 'Loading Dock', 'Inventory System', 'Security System'],
        'office': ['Desks', 'Office Chairs', 'Computers', 'Filing Cabinets', 'Meeting Table', 'Whiteboard'],
        'break room': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Dining Table', 'Chairs', 'Storage'],
        'break': ['Refrigerator', 'Microwave', 'Coffee Machine', 'Dining Table', 'Chairs', 'Storage'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'maintenance': ['Tool Storage', 'Workbench', 'Equipment Storage', 'Safety Equipment', 'Maintenance Logs'],
    },
    'building': {
        'lobby': ['Reception Desk', 'Seating Area', 'Information Board', 'Security System', 'Elevator', 'Directory'],
        'corridor': ['Lighting', 'Emergency Exit Signs', 'Fire Extinguisher', 'Security Cameras', 'Flooring'],
        'elevator': ['Elevator Car', 'Control Panel', 'Emergency Phone', 'Security Camera', 'Floor Indicators'],
        'stairwell': ['Stair Railings', 'Emergency Lighting', 'Fire Extinguisher', 'Emergency Exit Signs'],
        'bathroom': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'bath': ['Toilet', 'Sink', 'Mirror', 'Hand Dryer', 'Paper Towel Dispenser', 'Soap Dispenser'],
        'utility room': ['Electrical Panel', 'HVAC System', 'Water Heater', 'Security System', 'Maintenance Tools'],
        'utility': ['Electrical Panel', 'HVAC System', 'Water Heater', 'Security System', 'Maintenance Tools'],
    },
};

function generateItemSuggestions(areaName: string, propertyTypeId: number): string[] {
    const area = areaName.toLowerCase().trim();
    const propertyType = LAYOUT_TYPES.find(t => t.id === propertyTypeId)?.name.toLowerCase() || 'residential';
    const propertySuggestions = SUGGESTIONS[propertyType] || SUGGESTIONS['residential'];
    let areaSuggestions = propertySuggestions[area] || [];
    if (areaSuggestions.length === 0) {
        for (const [key, items] of Object.entries(propertySuggestions)) {
            if (area.includes(key) || key.includes(area)) {
                if (area.length >= 2 && key.length >= 2) { areaSuggestions = items; break; }
            }
        }
    }
    return areaSuggestions;
}

/* ────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */

interface LayoutFormProps {
    mode: 'create' | 'edit';
    initialData?: {
        layoutId?: string;
        layoutName?: string;
        layoutTypeId?: number;
        displayOrder?: number;
        areas?: {
            id?: string;
            areaName: string;
            displayOrder: number;
            items: { id?: string; itemName: string; displayOrder: number }[];
        }[];
    };
    existingLayoutCount?: number;
    /** When true, hides the internal header — used inside AdminDashboard */
    embedded?: boolean;
    /** Called when user clicks Back (embedded mode) */
    onBack?: () => void;
    /** Called after successful save (embedded mode) */
    onSuccess?: () => void;
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function LayoutForm({ mode, initialData, existingLayoutCount = 0, embedded = false, onBack, onSuccess }: LayoutFormProps) {
    const router = useRouter();

    const [formData, setFormData] = useState<LayoutFormData>(() => {
        const nextDisplayOrder = existingLayoutCount + 1;
        return {
            LayoutName: initialData?.layoutName || '',
            LayoutTypeId: initialData?.layoutTypeId ?? PropertyType.Residential,
            DisplayOrder: initialData?.displayOrder ?? nextDisplayOrder,
            Areas: (initialData?.areas || []).map(a => ({
                id: a.id,
                AreaName: a.areaName,
                DisplayOrder: a.displayOrder,
                Items: (a.items || []).map(i => ({ id: i.id, ItemName: i.itemName, DisplayOrder: i.displayOrder })),
            })),
        };
    });

    const [selectedAreaIndex, setSelectedAreaIndex] = useState<number>(formData.Areas.length > 0 ? 0 : -1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>({});
    const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
    const [dragArea, setDragArea] = useState<number | null>(null);
    const [dragItem, setDragItem] = useState<{ areaIdx: number; itemIdx: number } | null>(null);

    // When selected area changes, check for AI suggestions
    useEffect(() => {
        if (selectedAreaIndex >= 0 && selectedAreaIndex < formData.Areas.length) {
            const area = formData.Areas[selectedAreaIndex];
            const key = `${selectedAreaIndex}`;
            if (!aiSuggestions[key]) {
                const suggestions = generateItemSuggestions(area.AreaName, formData.LayoutTypeId);
                setAiSuggestions(prev => ({ ...prev, [key]: suggestions }));
                setShowSuggestions(prev => ({ ...prev, [key]: suggestions.length > 0 }));
            }
        }
    }, [selectedAreaIndex, formData.Areas, formData.LayoutTypeId, aiSuggestions]);

    /* ── Validation ─────────────────────── */
    const validate = useCallback((): string | null => {
        if (!formData.LayoutName.trim()) return 'Layout name is required.';
        if (formData.Areas.length === 0) return 'At least one area is required.';
        for (let i = 0; i < formData.Areas.length; i++) {
            const area = formData.Areas[i];
            if (!area.AreaName.trim()) return `Area ${i + 1}: name is required.`;
            for (let j = 0; j < area.Items.length; j++) {
                if (!area.Items[j].ItemName.trim()) return `Area "${area.AreaName}", item ${j + 1}: name is required.`;
            }
        }
        return null;
    }, [formData]);

    /* ── Normalize display orders ──────── */
    const normalize = useCallback((data: LayoutFormData): LayoutFormData => ({
        ...data,
        Areas: data.Areas.map((area, ai) => ({
            ...area,
            DisplayOrder: ai + 1,
            Items: area.Items.map((item, ii) => ({ ...item, DisplayOrder: ii + 1 })),
        })),
    }), []);

    /* ── Save ──────────────────────────── */
    const handleSave = async () => {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }
        setError('');
        setSaving(true);
        try {
            const normalized = normalize(formData);
            if (mode === 'create') {
                const payload: CreatePropertyLayoutRequest = {
                    layoutType: normalized.LayoutTypeId as PropertyType,
                    name: normalized.LayoutName,
                    displayOrder: normalized.DisplayOrder,
                    layoutArea: normalized.Areas.map(area => ({
                        areaName: area.AreaName,
                        displayOrder: area.DisplayOrder,
                        layoutItem: area.Items.map(item => ({
                            itemName: item.ItemName,
                            displayOrder: item.DisplayOrder,
                        })),
                    })),
                };
                await layoutApi.create(payload);
            } else {
                const payload: UpdatePropertyLayoutRequest = {
                    id: initialData?.layoutId || '',
                    layoutType: normalized.LayoutTypeId as PropertyType,
                    name: normalized.LayoutName,
                    displayOrder: normalized.DisplayOrder,
                    layoutArea: normalized.Areas.map(area => ({
                        id: area.id || '',
                        areaName: area.AreaName,
                        displayOrder: area.DisplayOrder,
                        layoutItem: area.Items.map(item => ({
                            id: item.id || '',
                            itemName: item.ItemName,
                            displayOrder: item.DisplayOrder,
                        })),
                    })),
                };
                await layoutApi.update(initialData?.layoutId || '', payload);
            }
            if (embedded && onSuccess) {
                onSuccess();
            } else {
                router.push('/layouts');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to save layout';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    /* ── Area CRUD ─────────────────────── */
    const addArea = () => {
        const newId = crypto.randomUUID();
        setFormData(prev => ({
            ...prev,
            Areas: [...prev.Areas, { id: newId, AreaName: '', DisplayOrder: prev.Areas.length + 1, Items: [] }],
        }));
        setSelectedAreaIndex(formData.Areas.length);
    };

    const removeArea = (index: number) => {
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.filter((_, i) => i !== index).map((a, i) => ({ ...a, DisplayOrder: i + 1 })),
        }));
        if (selectedAreaIndex === index) setSelectedAreaIndex(-1);
        else if (selectedAreaIndex > index) setSelectedAreaIndex(selectedAreaIndex - 1);
    };

    const updateAreaName = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) => i === index ? { ...a, AreaName: value } : a),
        }));
        // Refresh AI suggestions
        const key = `${index}`;
        setAiSuggestions(prev => ({ ...prev, [key]: generateItemSuggestions(value, formData.LayoutTypeId) }));
        setShowSuggestions(prev => ({ ...prev, [key]: true }));
    };

    /* ── Item CRUD ─────────────────────── */
    const addItem = (areaIndex: number) => {
        const newId = crypto.randomUUID();
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) =>
                i === areaIndex
                    ? { ...a, Items: [...a.Items, { id: newId, ItemName: '', DisplayOrder: a.Items.length + 1 }] }
                    : a
            ),
        }));
    };

    const removeItem = (areaIndex: number, itemIndex: number) => {
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) =>
                i === areaIndex
                    ? { ...a, Items: a.Items.filter((_, j) => j !== itemIndex).map((it, j) => ({ ...it, DisplayOrder: j + 1 })) }
                    : a
            ),
        }));
    };

    const updateItemName = (areaIndex: number, itemIndex: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) =>
                i === areaIndex
                    ? { ...a, Items: a.Items.map((it, j) => j === itemIndex ? { ...it, ItemName: value } : it) }
                    : a
            ),
        }));
    };

    /* ── Drag & Drop (areas) ──────────── */
    const handleAreaDragStart = (index: number) => setDragArea(index);
    const handleAreaDrop = (toIndex: number) => {
        if (dragArea === null || dragArea === toIndex) { setDragArea(null); return; }
        setFormData(prev => {
            const areas = [...prev.Areas];
            const [moved] = areas.splice(dragArea, 1);
            areas.splice(toIndex, 0, moved);
            return { ...prev, Areas: areas.map((a, i) => ({ ...a, DisplayOrder: i + 1 })) };
        });
        if (selectedAreaIndex === dragArea) setSelectedAreaIndex(toIndex);
        setDragArea(null);
    };

    /* ── Drag & Drop (items) ──────────── */
    const handleItemDragStart = (areaIdx: number, itemIdx: number) => setDragItem({ areaIdx, itemIdx });
    const handleItemDrop = (areaIdx: number, toItemIdx: number) => {
        if (!dragItem || dragItem.areaIdx !== areaIdx || dragItem.itemIdx === toItemIdx) { setDragItem(null); return; }
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) => {
                if (i !== areaIdx) return a;
                const items = [...a.Items];
                const [moved] = items.splice(dragItem.itemIdx, 1);
                items.splice(toItemIdx, 0, moved);
                return { ...a, Items: items.map((it, j) => ({ ...it, DisplayOrder: j + 1 })) };
            }),
        }));
        setDragItem(null);
    };

    /* ── AI Suggestions ───────────────── */
    const applySuggestions = (areaIndex: number) => {
        const key = `${areaIndex}`;
        const suggestions = aiSuggestions[key] || [];
        if (suggestions.length === 0) return;
        const newItems = suggestions.map((name, idx) => ({ ItemName: name, DisplayOrder: idx + 1 }));
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) => i === areaIndex ? { ...a, Items: [...a.Items, ...newItems] } : a),
        }));
        setShowSuggestions(prev => ({ ...prev, [key]: false }));
    };

    const addSingleSuggestion = (areaIndex: number, itemName: string) => {
        setFormData(prev => ({
            ...prev,
            Areas: prev.Areas.map((a, i) =>
                i === areaIndex
                    ? { ...a, Items: [...a.Items, { ItemName: itemName, DisplayOrder: a.Items.length + 1 }] }
                    : a
            ),
        }));
    };

    const dismissSuggestions = (areaIndex: number) => {
        setShowSuggestions(prev => ({ ...prev, [`${areaIndex}`]: false }));
    };

    /* ── Selected area data ───────────── */
    const selectedArea = selectedAreaIndex >= 0 && selectedAreaIndex < formData.Areas.length
        ? formData.Areas[selectedAreaIndex]
        : null;

    const suggestionsKey = `${selectedAreaIndex}`;
    const currentSuggestions = aiSuggestions[suggestionsKey] || [];
    const showCurrentSuggestions = showSuggestions[suggestionsKey] && currentSuggestions.length > 0;

    return (
        <>
            {/* Header — only shown in standalone mode */}
            {!embedded && (
                <header className="bg-white border-b border-[var(--border)] sticky top-[61px] z-20 shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/layouts')}
                                className="text-[var(--muted-500)] hover:text-[var(--foreground)] gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-[var(--foreground)]">
                                    {mode === 'create' ? 'Create Layout' : 'Edit Layout'}
                                </h1>
                                <p className="text-sm text-[var(--muted-500)]">
                                    {mode === 'create' ? 'Define a new property layout template' : 'Modify existing layout template'}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-2 px-5"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving…' : mode === 'create' ? 'Save Layout' : 'Update Layout'}
                        </Button>
                    </div>
                </header>
            )}

            {/* Embedded toolbar */}
            {embedded && (
                <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="text-[var(--muted-500)] hover:text-[var(--foreground)] gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Layouts
                        </Button>
                        <span className="text-base font-semibold text-[var(--foreground)]">
                            {mode === 'create' ? 'Create Layout' : 'Edit Layout'}
                        </span>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-2 px-5"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving…' : mode === 'create' ? 'Save Layout' : 'Update Layout'}
                    </Button>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto p-6">
                {error && (
                    <div className="mb-6 bg-[var(--destructive-50)] border border-[var(--destructive-200)] text-[var(--destructive)] px-4 py-3 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                        <button onClick={() => setError('')} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Layout Details Card */}
                <Card className="mb-6 !shadow-none border border-[var(--border)]">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[var(--primary)]" />
                            Layout Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="responsive-grid-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--muted-700)]" htmlFor="layout-name">Layout Name</Label>
                                <Input
                                    id="layout-name"
                                    placeholder="e.g. Standard 3-Bedroom Home"
                                    value={formData.LayoutName}
                                    onChange={e => setFormData(prev => ({ ...prev, LayoutName: e.target.value }))}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--muted-700)]" htmlFor="layout-type">Property Type</Label>
                                <select
                                    id="layout-type"
                                    value={formData.LayoutTypeId}
                                    onChange={e => setFormData(prev => ({ ...prev, LayoutTypeId: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-shadow"
                                >
                                    {LAYOUT_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--muted-700)]" htmlFor="display-order">Display Order</Label>
                                <Input
                                    id="display-order"
                                    type="number"
                                    min={1}
                                    value={formData.DisplayOrder}
                                    onChange={e => setFormData(prev => ({ ...prev, DisplayOrder: parseInt(e.target.value) || 1 }))}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Side-by-side: Areas List | Items Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                    {/* LEFT: Areas List */}
                    <div>
                        <Card className="!shadow-none border border-[var(--border)] h-full">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-[var(--primary)]" />
                                        Areas ({formData.Areas.length})
                                    </CardTitle>
                                    <Button size="sm" onClick={addArea} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-1.5">
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {formData.Areas.length === 0 ? (
                                    <div className="text-center py-12 text-[var(--muted-400)]">
                                        <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No areas yet.</p>
                                        <p className="text-xs mt-1">Click "Add" to create your first area.</p>
                                    </div>
                                ) : (
                                    <ul className="space-y-1">
                                        {formData.Areas.map((area, idx) => (
                                            <li key={idx}>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    draggable
                                                    onDragStart={() => handleAreaDragStart(idx)}
                                                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-[var(--primary)]'); }}
                                                    onDragLeave={e => e.currentTarget.classList.remove('ring-2', 'ring-[var(--primary)]')}
                                                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-[var(--primary)]'); handleAreaDrop(idx); }}
                                                    onClick={() => setSelectedAreaIndex(idx)}
                                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAreaIndex(idx); } }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group cursor-pointer
                            ${selectedAreaIndex === idx
                                                            ? 'bg-[var(--primary)] text-white shadow-sm'
                                                            : 'hover:bg-[var(--muted-100)] text-[var(--foreground)]'
                                                        }`}
                                                >
                                                    <GripVertical className="w-3.5 h-3.5 opacity-40 shrink-0 cursor-grab active:cursor-grabbing" />
                                                    <span className="flex-1 text-sm font-medium truncate">
                                                        {area.AreaName || <span className="italic opacity-50">Unnamed Area</span>}
                                                    </span>
                                                    <Badge className={`text-[10px] shrink-0 ${selectedAreaIndex === idx ? 'bg-white/20 text-white border-white/30' : 'bg-[var(--muted-100)]'}`}>
                                                        {area.Items.length} items
                                                    </Badge>
                                                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${selectedAreaIndex === idx ? 'rotate-90' : ''}`} />
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); removeArea(idx); }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 hover:text-red-600"
                                                        title="Remove area"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: Items Panel */}
                    <div>
                        {!selectedArea ? (
                            <Card className="!shadow-none border border-dashed border-[var(--border)]">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-[var(--muted-400)]">
                                    <Layers className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Select an area to manage its items</p>
                                    <p className="text-xs mt-1">Click on any area in the left panel to add or edit items</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="!shadow-none border border-[var(--border)]">
                                <CardHeader className="pb-3">
                                    <div className="space-y-3">
                                        {/* Area Name Input */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs font-medium text-[var(--muted-500)] mb-1 block">Area Name</label>
                                                <Input
                                                    value={selectedArea.AreaName}
                                                    onChange={e => updateAreaName(selectedAreaIndex, e.target.value)}
                                                    placeholder="Enter area name (e.g. Kitchen, Living Room)…"
                                                    className="h-10 text-sm"
                                                    autoFocus={!selectedArea.AreaName}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeArea(selectedAreaIndex)}
                                                className="text-[var(--muted-400)] hover:text-[var(--destructive)] mt-5 shrink-0"
                                                title="Delete area"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div>
                                                <p className="text-xs text-[var(--muted-400)]">
                                                    {selectedArea.Items.length} item{selectedArea.Items.length !== 1 ? 's' : ''} defined
                                                </p>
                                            </div>
                                            <Button size="sm" onClick={() => addItem(selectedAreaIndex)} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-1.5">
                                                <Plus className="w-3.5 h-3.5" /> Add Item
                                            </Button>
                                        </div>
                                    </div>
                                    {/* AI Suggestions */}
                                    {showCurrentSuggestions && (
                                        <div className="mt-4 p-4 bg-gradient-to-r from-[var(--primary-50)] to-[var(--secondary-50)] border-2 border-[var(--primary)]/20 rounded-xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Wand2 className="w-4 h-4 text-[var(--primary)]" />
                                                    <span className="text-sm font-semibold text-[var(--primary)]">AI Suggested Items</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" onClick={() => applySuggestions(selectedAreaIndex)} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white gap-1 text-xs h-8">
                                                        <Check className="w-3 h-3" /> Apply All
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => dismissSuggestions(selectedAreaIndex)} className="text-[var(--muted-500)] h-8 text-xs">
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {currentSuggestions.map((item, i) => (
                                                    <Badge
                                                        key={i}
                                                        onClick={() => addSingleSuggestion(selectedAreaIndex, item)}
                                                        className="cursor-pointer bg-white hover:bg-[var(--primary)] hover:text-white border border-[var(--border)] text-[var(--foreground)] transition-all duration-150 px-2.5 py-1 text-xs"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> {item}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {selectedArea.Items.length === 0 ? (
                                        <div className="text-center py-10 text-[var(--muted-400)]">
                                            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No items in this area.</p>
                                            <p className="text-xs mt-1">Add items manually or use AI suggestions.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {selectedArea.Items.map((item, itemIdx) => (
                                                <div
                                                    key={itemIdx}
                                                    draggable
                                                    onDragStart={() => handleItemDragStart(selectedAreaIndex, itemIdx)}
                                                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-[var(--primary)]/30', 'bg-[var(--primary-50)]'); }}
                                                    onDragLeave={e => e.currentTarget.classList.remove('ring-2', 'ring-[var(--primary)]/30', 'bg-[var(--primary-50)]')}
                                                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-[var(--primary)]/30', 'bg-[var(--primary-50)]'); handleItemDrop(selectedAreaIndex, itemIdx); }}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all group"
                                                >
                                                    <GripVertical className="w-3.5 h-3.5 text-[var(--muted-300)] shrink-0 cursor-grab active:cursor-grabbing" />
                                                    <span className="text-xs text-[var(--muted-400)] font-mono w-6 shrink-0 select-none">{itemIdx + 1}.</span>
                                                    <Input
                                                        value={item.ItemName}
                                                        onChange={e => updateItemName(selectedAreaIndex, itemIdx, e.target.value)}
                                                        placeholder="Item name…"
                                                        className="flex-1 h-8 text-sm border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] bg-transparent"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(selectedAreaIndex, itemIdx)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 hover:text-red-500 shrink-0"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
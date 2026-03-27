"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit2, Trash2, Power, PowerOff, Filter, ChevronLeft, ChevronRight, X, AlertTriangle } from "lucide-react";

interface PlanFeature {
  id: string;
  name: string;
}

interface BillingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  status: 'active' | 'inactive';
  createdDate: string;
  features: PlanFeature[];
  userLimits: number;
  trialDays: number;
  propertiesLimit: number | 'Unlimited';
  inspectionsLimit: number | 'Unlimited';
}

const mockPlans: BillingPlan[] = [
  {
    id: "1",
    name: "Starter",
    description: "Perfect for small agencies.",
    priceMonthly: 49,
    priceYearly: 490,
    status: 'active',
    createdDate: "2024-01-15",
    features: [{ id: "f1", name: "Up to 50 Inspections" }],
    userLimits: 3,
    trialDays: 14,
    propertiesLimit: 10,
    inspectionsLimit: 50,
  },
  {
    id: "2",
    name: "Professional",
    description: "For growing agencies.",
    priceMonthly: 99,
    priceYearly: 990,
    status: 'active',
    createdDate: "2024-02-10",
    features: [{ id: "f1", name: "Unlimited Inspections" }, { id: "f2", name: "Priority Support" }],
    userLimits: 10,
    trialDays: 14,
    propertiesLimit: 'Unlimited',
    inspectionsLimit: 'Unlimited',
  },
  {
    id: "3",
    name: "Enterprise",
    description: "For large organizations.",
    priceMonthly: 299,
    priceYearly: 2990,
    status: 'inactive',
    createdDate: "2024-03-20",
    features: [{ id: "f1", name: "Custom Workflows" }, { id: "f2", name: "Dedicated Account Manager" }],
    userLimits: 50,
    trialDays: 30,
    propertiesLimit: 'Unlimited',
    inspectionsLimit: 'Unlimited',
  }
];

export default function BillingPlans() {
  const [plans, setPlans] = useState<BillingPlan[]>(mockPlans);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filters state
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{type: 'delete' | 'deactivate' | 'activate', planId: string} | null>(null);
  
  // Form State
  const [editingPlan, setEditingPlan] = useState<Partial<BillingPlan> | null>(null);

  // Computed
  const filteredPlans = plans.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesMinPrice = minPrice === "" || p.priceMonthly >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || p.priceMonthly <= Number(maxPrice);
    return matchesSearch && matchesStatus && matchesMinPrice && matchesMaxPrice;
  });

  const paginatedPlans = filteredPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);

  // Handlers
  const handleOpenCreate = () => {
    setEditingPlan({ status: 'active', features: [], propertiesLimit: 50, inspectionsLimit: 100 });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (plan: BillingPlan) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan))); // Deep copy
    setIsFormOpen(true);
  };

  const handleSaveForm = () => {
    if (!editingPlan) return;
    
    // Create new or Update existing (Mock)
    if (editingPlan.id) {
      setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...editingPlan } as BillingPlan : p));
    } else {
      const newPlan = { ...editingPlan, id: Date.now().toString(), createdDate: new Date().toISOString().split('T')[0] } as BillingPlan;
      setPlans([newPlan, ...plans]);
    }
    
    setIsFormOpen(false);
  };

  const executeConfirmAction = () => {
    if (!confirmAction) return;
    const { type, planId } = confirmAction;
    
    if (type === 'delete') {
      setPlans(plans.filter(p => p.id !== planId));
    } else if (type === 'activate' || type === 'deactivate') {
      setPlans(plans.map(p => p.id === planId ? { ...p, status: type === 'activate' ? 'active' : 'inactive' } : p));
    }
    
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const addFeature = () => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: [...(editingPlan.features || []), { id: Date.now().toString(), name: "" }]
      });
    }
  };

  const updateFeature = (id: string, name: string) => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: editingPlan.features?.map(f => f.id === id ? { ...f, name } : f)
      });
    }
  };

  const removeFeature = (id: string) => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: editingPlan.features?.filter(f => f.id !== id)
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Billing Plans</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {/* Filters Overlay */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">Filters</h3>
          </div>
          <button
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); setMinPrice(""); setMaxPrice(""); setCurrentPage(1); }}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Plans</label>
            <input
              type="text"
              placeholder="Search by name..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Plans</option>
              <option value="inactive">Inactive Plans</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Price ($)</label>
            <input
              type="number"
              placeholder="Min"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={minPrice}
              onChange={e => { setMinPrice(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Price ($)</label>
            <input
              type="number"
              placeholder="Max"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm"
              value={maxPrice}
              onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      <div className="bg-card shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-foreground">Plans</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage subscription tiers, pricing, and access scopes.
          </p>
        </div>
        <div className="px-4 pb-6 sm:px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price (Mo / Yr)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    <div>{plan.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{plan.description}</div>
                  </TableCell>
                  <TableCell>
                    ${plan.priceMonthly} / ${plan.priceYearly}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      plan.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {plan.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(plan.createdDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2 text-right">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all border border-blue-200"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmAction({ type: plan.status === 'active' ? 'deactivate' : 'activate', planId: plan.id });
                          setIsConfirmOpen(true);
                        }}
                        className={`p-2 rounded-lg transition-all border ${plan.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                        title={plan.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {plan.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmAction({ type: 'delete', planId: plan.id });
                          setIsConfirmOpen(true);
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all border border-red-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {paginatedPlans.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">No plans found. Try adjusting your filters.</div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="px-4 py-4 sm:px-6 flex items-center justify-between border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredPlans.length)} of {filteredPlans.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-border disabled:opacity-50 hover:bg-gray-50 text-sm"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-border disabled:opacity-50 hover:bg-gray-50 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Form Overlay / Right Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsFormOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 sm:rounded-l-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10 shadow-sm">
              <div>
                 <h2 className="text-xl font-bold text-gray-900">
                   {editingPlan?.id ? 'Edit Billing Plan' : 'Create New Plan'}
                 </h2>
                 <p className="text-xs text-gray-500 mt-1">Configure pricing and features for this tier.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="rounded-full hover:bg-gray-100 shrink-0">
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
            
            {/* Drawer Body Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form className="space-y-8">
                
                {/* Basic Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-px bg-blue-200"></span> Basic Details
                  </h3>
                  
                  <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <Label className="text-gray-700">Plan Name <span className="text-red-500">*</span></Label>
                      <Input 
                        value={editingPlan?.name || ''} 
                        onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} 
                        placeholder="e.g. Starter Tier"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Description</Label>
                      <textarea 
                        className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent min-h-[80px]"
                        value={editingPlan?.description || ''}
                        onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                        placeholder="What is this plan best for?"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Limits */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-px bg-blue-200"></span> Pricing & Limits
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <Label className="text-gray-700">Monthly Price ($)</Label>
                      <Input 
                        type="number" 
                        value={editingPlan?.priceMonthly || ''} 
                        onChange={e => setEditingPlan({...editingPlan, priceMonthly: Number(e.target.value)})} 
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Yearly Price ($)</Label>
                      <Input 
                        type="number" 
                        value={editingPlan?.priceYearly || ''} 
                        onChange={e => setEditingPlan({...editingPlan, priceYearly: Number(e.target.value)})} 
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">User Limits</Label>
                      <Input 
                        type="number" 
                        value={editingPlan?.userLimits || ''} 
                        onChange={e => setEditingPlan({...editingPlan, userLimits: Number(e.target.value)})} 
                        className="mt-1.5"
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Trial Days</Label>
                      <Input 
                        type="number" 
                        value={editingPlan?.trialDays || ''} 
                        onChange={e => setEditingPlan({...editingPlan, trialDays: Number(e.target.value)})} 
                        className="mt-1.5"
                        placeholder="e.g. 14"
                      />
                    </div>
                    
                    <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-gray-200/60">
                      <div>
                        <Label className="text-gray-700 flex justify-between items-center mb-1.5 h-6">
                          Properties Limit
                          <label className="flex items-center gap-2 text-xs font-normal cursor-pointer text-gray-500 hover:text-gray-900 leading-none">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer h-3.5 w-3.5"
                              checked={editingPlan?.propertiesLimit === 'Unlimited'}
                              onChange={(e) => setEditingPlan({
                                ...editingPlan, 
                                propertiesLimit: e.target.checked ? 'Unlimited' : 0
                              })}
                            />
                            Unlimited
                          </label>
                        </Label>
                        <Input 
                          type={editingPlan?.propertiesLimit === 'Unlimited' ? 'text' : 'number'}
                          disabled={editingPlan?.propertiesLimit === 'Unlimited'}
                          value={editingPlan?.propertiesLimit ?? ''}
                          onChange={e => setEditingPlan({...editingPlan, propertiesLimit: Number(e.target.value)})} 
                          className="w-full disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
                          placeholder="e.g. 50"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 flex justify-between items-center mb-1.5 h-6">
                          Inspections Limit
                          <label className="flex items-center gap-2 text-xs font-normal cursor-pointer text-gray-500 hover:text-gray-900 leading-none">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer h-3.5 w-3.5"
                              checked={editingPlan?.inspectionsLimit === 'Unlimited'}
                              onChange={(e) => setEditingPlan({
                                ...editingPlan, 
                                inspectionsLimit: e.target.checked ? 'Unlimited' : 0
                              })}
                            />
                            Unlimited
                          </label>
                        </Label>
                        <Input 
                          type={editingPlan?.inspectionsLimit === 'Unlimited' ? 'text' : 'number'}
                          disabled={editingPlan?.inspectionsLimit === 'Unlimited'}
                          value={editingPlan?.inspectionsLimit ?? ''}
                          onChange={e => setEditingPlan({...editingPlan, inspectionsLimit: Number(e.target.value)})} 
                          className="w-full disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
                          placeholder="e.g. 100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-5 h-px bg-blue-200"></span> Included Features
                    </h3>
                    <Button type="button" variant="ghost" size="sm" onClick={addFeature} className="text-blue-600 hover:bg-blue-50 h-8 px-2">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  
                  <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {editingPlan?.features?.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-2 group">
                        <div className="w-6 h-6 bg-white border rounded-full text-[10px] text-gray-500 flex items-center justify-center font-bold shadow-sm shrink-0">
                          {i+1}
                        </div>
                        <Input 
                          value={f.name} 
                          onChange={(e) => updateFeature(f.id, e.target.value)} 
                          placeholder="e.g. 24/7 Priority Support"
                          className="h-9 bg-white"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(f.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!editingPlan?.features || editingPlan.features.length === 0) && (
                      <div className="text-sm text-gray-400 italic text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                        <p>No features added yet.</p>
                        <button type="button" onClick={addFeature} className="text-blue-600 hover:underline mt-1 font-medium not-italic">Add your first feature</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-px bg-blue-200"></span> Settings
                  </h3>
                  <div className="flex flex-row items-center justify-between p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <Label className="text-base font-semibold text-gray-900">Active Status</Label>
                      <p className="text-sm text-gray-500 mt-0.5">Allow users to subscribe to this plan</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer scale-110">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={editingPlan?.status === 'active'}
                        onChange={(e) => setEditingPlan({...editingPlan, status: e.target.checked ? 'active' : 'inactive'})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
                
                {/* Spacer block to ensure scrolling reaches bottom comfortably */}
                <div className="h-4"></div>

              </form>
            </div>
            
            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 z-10">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} className="bg-white">
                 Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 px-6" onClick={handleSaveForm}>
                Save Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmOpen && confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsConfirmOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative scale-in-95 animate-in duration-200 zoom-in-95 data-[state=closed]:zoom-out-95">
            <div className="p-6 text-center space-y-5 mt-4">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${confirmAction.type === 'delete' ? 'bg-red-50 text-red-600' : (confirmAction.type === 'deactivate' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}`}>
                {confirmAction.type === 'delete' ? <Trash2 className="h-8 w-8" /> : (confirmAction.type === 'deactivate' ? <PowerOff className="h-8 w-8" /> : <Power className="h-8 w-8" />)}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {confirmAction.type === 'delete' ? 'Delete Plan?' : confirmAction.type === 'deactivate' ? 'Deactivate Plan?' : 'Activate Plan?'}
                </h3>
                <p className="text-gray-500 text-sm px-2">
                  {confirmAction.type === 'delete' 
                    ? 'Are you sure you want to completely remove this plan? This action is permanent and cannot be undone.' 
                    : `Are you sure you want to ${confirmAction.type} this subscription plan? Users ${confirmAction.type === 'deactivate' ? 'will no longer be able to' : 'will now be able to'} select it.`}
                </p>
              </div>
              <div className="flex gap-3 justify-center w-full pt-4 border-t border-gray-100">
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setIsConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className={`flex-1 rounded-xl h-11 text-white shadow-sm ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : (confirmAction.type === 'deactivate' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700')}`}
                  onClick={executeConfirmAction}
                >
                  Yes, {confirmAction.type}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

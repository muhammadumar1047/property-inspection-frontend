"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Building2, ClipboardList, X, Command, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { propertyApi } from "@/lib/api/property";
import inspectionApi from "@/lib/api/inspection";
import { useRouter } from "next/navigation";

interface GlobalSearchProps {
  setActiveSection: (section: string) => void;
  setShowingSearchResults: (results: { type: 'properties' | 'inspections' | null, query: string }) => void;
  setPropertyResults: (results: any[]) => void;
  setInspectionResults: (results: any[]) => void;
}

export default function GlobalSearch({
  setActiveSection,
  setShowingSearchResults,
  setPropertyResults,
  setInspectionResults
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ properties: any[], inspections: any[] }>({
    properties: [],
    inspections: []
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { effectiveAgencyId } = useAuth();
  const router = useRouter();

  const totalResults = results.properties.length + results.inspections.length;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  const runSearch = async (q: string) => {
    if (!q.trim()) {
      setResults({ properties: [], inspections: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await inspectionApi.search(q, effectiveAgencyId ? String(effectiveAgencyId) : undefined);
      setResults({
        properties: searchResults.properties || [],
        inspections: searchResults.inspections || []
      });
    } catch (error) {
      console.error("Search error:", error);
      setResults({ properties: [], inspections: [] });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        runSearch(query);
      } else {
        setResults({ properties: [], inspections: [] });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClose]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const handlePropertyClick = async (propertyId: string) => {
    try {
      const propertyDetails = await propertyApi.getById(propertyId);
      setActiveSection('properties');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard-active-section', 'properties');
      }
      setShowingSearchResults({ type: 'properties', query });
      setPropertyResults([propertyDetails]);
      handleClose();
      setQuery("");
    } catch (error) {
      console.error('Error fetching property details:', error);
    }
  };

  const handleInspectionClick = async (inspectionId: string | number) => {
    try {
      const inspectionDetails = await inspectionApi.getById(inspectionId.toString());
      setActiveSection('inspections');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard-active-section', 'inspections');
      }
      setShowingSearchResults({ type: 'inspections', query });
      setInspectionResults([inspectionDetails]);
      handleClose();
      setQuery("");
    } catch (error) {
      console.error('Error fetching inspection details:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < totalResults - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const allResults = [...results.properties, ...results.inspections];
      const selected = allResults[selectedIndex];
      if (selectedIndex < results.properties.length) {
        handlePropertyClick(selected.id || selected.propertyId);
      } else {
        handleInspectionClick(selected.id);
      }
    }
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-xl group">
      <div className="relative">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${isOpen ? 'text-primary' : 'text-muted-400'}`} />
        <Input
          ref={inputRef}
          placeholder="Search properties, inspections..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-14 h-11 bg-muted/40 border-border/50 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all duration-300 shadow-sm group-hover:shadow-md"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={() => { setQuery(""); setResults({ properties: [], inspections: [] }); }}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-400" />
            </button>
          )}
          <kbd className="hidden sm:flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-muted-400 opacity-100 border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Mega Dropdown */}
      {isOpen && (query.trim() || loading) && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300 origin-top">
          <div className="flex flex-col max-h-[70vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-400">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Searching our database...</span>
              </div>
            ) : totalResults === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-muted-300" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No results found</h3>
                <p className="text-xs text-muted-400 mt-1">We couldn't find anything matching "{query}"</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                {/* Properties Column */}
                <div className="flex-1 min-w-0">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-500">Properties</span>
                    </div>
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      {results.properties.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-0.5 overflow-y-auto max-h-[400px]">
                    {results.properties.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-muted-400 italic">No properties matching your search</div>
                    ) : (
                      results.properties.map((p, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <button
                            key={`prop-${p.id}`}
                            onClick={() => handlePropertyClick(p.id)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full text-left p-3 rounded-xl transition-all duration-200 group/item flex items-center justify-between ${isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
                              }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {p.address1}
                                </span>
                                {p.type && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-500 font-medium shrink-0">
                                    {p.type}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-400 mt-0.5 flex items-center gap-1.5">
                                <span className="truncate">{p.suburb || p.cityOrSuburb}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="shrink-0 font-medium">#{p.id}</span>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-all duration-200 ${isSelected ? 'text-primary translate-x-0' : 'text-muted-200 -translate-x-1 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0'
                              }`} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Inspections Column */}
                <div className="flex-1 min-w-0">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-secondary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-500">Inspections</span>
                    </div>
                    <span className="text-[10px] font-medium bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full">
                      {results.inspections.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-0.5 overflow-y-auto max-h-[400px]">
                    {results.inspections.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-muted-400 italic">No inspections matching your search</div>
                    ) : (
                      results.inspections.map((i, idx) => {
                        const localIdx = results.properties.length + idx;
                        const isSelected = selectedIndex === localIdx;
                        return (
                          <button
                            key={`insp-${i.id}`}
                            onClick={() => handleInspectionClick(i.id)}
                            onMouseEnter={() => setSelectedIndex(localIdx)}
                            className={`w-full text-left p-3 rounded-xl transition-all duration-200 group/item flex items-center justify-between ${isSelected ? 'bg-secondary/5 ring-1 ring-secondary/20' : 'hover:bg-muted/50'
                              }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {i.address1}
                                </span>
                                {/* <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${i.inspectionType?.toLowerCase() === 'entry' ? 'bg-blue-100 text-blue-700' :
                                  i.inspectionType?.toLowerCase() === 'exit' ? 'bg-orange-100 text-orange-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                  {i.inspectionType || 'Routine'}
                                </span> */}
                              </div>
                              <div className="text-[11px] text-muted-400 mt-0.5 flex items-center gap-1.5">
                                <span className="truncate">{new Date(i.inspectionDate).toLocaleDateString()}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="shrink-0 font-medium">#{i.id}</span>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-all duration-200 ${isSelected ? 'text-secondary translate-x-0' : 'text-muted-200 -translate-x-1 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0'
                              }`} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            {!loading && totalResults > 0 && (
              <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Command className="w-3 h-3" /> + K to search</span>
                  <span className="flex items-center gap-1">↑↓ to navigate</span>
                  <span className="flex items-center gap-1">↵ to select</span>
                </div>
                <div className="font-medium">
                  Showing {totalResults} matches
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

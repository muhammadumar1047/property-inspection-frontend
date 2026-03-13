"use client";

import React, { useEffect, useState } from "react";
import { layoutApi } from "@/lib/api/propertyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Area = { areaId: number; areaName: string; displayOrder: number };
type Item = { itemId: number; itemName: string; displayOrder: number };

export default function StructureEditor({ layoutId, onHasAreasChange }: { layoutId: number; onHasAreasChange?: (has: boolean) => void }) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [itemsByArea, setItemsByArea] = useState<Record<number, Item[]>>({});
  const [loading, setLoading] = useState(false);
  const [newArea, setNewArea] = useState<{ name: string }>({ name: "" });

  const load = async () => {
    setLoading(true);
    try {
      const a = await layoutApi.getAreas(layoutId);
      setAreas(a);
      onHasAreasChange?.((a || []).length > 0);
      const entries = await Promise.all(a.map(async (ar) => [ar.areaId, await layoutApi.getItems(ar.areaId)] as const));
      const map: Record<number, Item[]> = {};
      entries.forEach(([id, items]) => (map[id] = items));
      setItemsByArea(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [layoutId]);

  const addArea = async () => {
    if (!newArea.name.trim()) return;
    const created = await layoutApi.createArea({ layoutId, areaName: newArea.name, displayOrder: (areas.length + 1) });
    setNewArea({ name: "" });
    await load();
  };

  const addItem = async (areaId: number, name: string) => {
    if (!name.trim()) return;
    const next = ((itemsByArea[areaId] || []).length + 1);
    await layoutApi.createItem({ areaId, itemName: name, displayOrder: next });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-3">
          <Label>New Area Name</Label>
          <Input value={newArea.name} onChange={(e) => setNewArea({ ...newArea, name: e.target.value })} />
        </div>
      </div>
      <Button onClick={addArea} disabled={loading}>Add Area</Button>

      <div className="space-y-4">
        {areas.map((ar) => (
          <div key={ar.areaId} className="border border-border rounded-md p-3">
            <p className="font-medium">{ar.areaName} <span className="text-xs text-muted-foreground">(Order {ar.displayOrder})</span></p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              {(itemsByArea[ar.areaId] || []).map((it) => (
                <div key={it.itemId} className="text-sm text-muted-foreground">• {it.itemName} <span className="text-xs">(#{it.displayOrder})</span></div>
              ))}
            </div>
            <AddItemForm onAdd={(name) => addItem(ar.areaId, name)} />
          </div>
        ))}
        {areas.length === 0 && <div className="text-sm text-muted-foreground">No areas yet. Add one to begin.</div>}
      </div>
    </div>
  );
}

function AddItemForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
      <div className="md:col-span-3">
        <Label>Item Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="md:col-span-3">
        <Button onClick={() => { onAdd(name); setName(""); }}>Add Item</Button>
      </div>
    </div>
  );
}



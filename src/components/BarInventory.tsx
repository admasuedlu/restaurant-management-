import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, AlertTriangle, Package, TrendingDown,
  Edit3, Check, X, Wine,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  ameName?: string;
  stock: number;
  unit: string;
  cost: number;
  minAlert: number;
  category: string;
  station: string;
}

interface Props {
  tenantCode: string;
  isAmharic: boolean;
  readOnly?: boolean; // owner view — no edits
}

export default function BarInventory({ tenantCode, isAmharic, readOnly = false }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editId, setEditId]       = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [adjustNote, setAdjustNote] = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);

  // Add new item form
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: "", unit: "bottle", stock: "", cost: "", minAlert: "5" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const apiFetch = useCallback((url: string, init: RequestInit = {}) => {
    const h = new Headers(init.headers as HeadersInit);
    h.set("X-Tenant-Code", tenantCode);
    return fetch(url, { ...init, headers: h });
  }, [tenantCode]);

  const loadItems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await apiFetch("/api/inventory/bar");
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setItems(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const startEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setEditStock(String(item.stock));
    setAdjustNote(prev => ({ ...prev, [item.id]: "" }));
  };

  const saveAdjust = async (item: InventoryItem) => {
    const newStock = parseFloat(editStock);
    if (isNaN(newStock) || newStock < 0) return;
    setSaving(true);
    try {
      const delta = newStock - item.stock;
      await apiFetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, delta, note: adjustNote[item.id] || "Bar adjustment" }),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: newStock } : i));
      setEditId(null);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.unit.trim()) { setAddError(tc("Name and unit required", "ስም እና ክፍል ያስፈልጋሉ")); return; }
    setAddLoading(true); setAddError("");
    try {
      const r = await apiFetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          unit: form.unit.trim(),
          stock: parseFloat(form.stock) || 0,
          cost: parseFloat(form.cost) || 0,
          minAlert: parseFloat(form.minAlert) || 5,
          category: "Drinks",
          station: "bar",
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const newItem = await r.json();
      setItems(prev => [...prev, newItem]);
      setForm({ name: "", unit: "bottle", stock: "", cost: "", minAlert: "5" });
      setShowAdd(false);
    } catch (e: any) { setAddError(e.message); }
    finally { setAddLoading(false); }
  };

  const fmt = (n: number) => n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lowStock  = items.filter(i => i.stock <= i.minAlert && i.stock > 0);
  const outStock  = items.filter(i => i.stock <= 0);
  const totalValue = items.reduce((s, i) => s + i.stock * i.cost, 0);

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-slate-500 text-sm animate-pulse">
      {tc("Loading bar inventory...", "የባር ዕቃዎች እየተጫኑ ነው...")}
    </div>
  );

  if (error) return (
    <div className="bg-rose-900/20 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm">
      {error}
      <button onClick={loadItems} className="ml-3 underline">{tc("Retry", "እንደገና ሞክር")}</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wine className="w-5 h-5 text-purple-400" />
          <div>
            <div className="font-bold text-slate-100 text-sm">{tc("Bar Stock", "የባር ክምችት")}</div>
            <div className="text-xs text-slate-500">{items.length} {tc("items", "ዓይነቶች")} · {tc("Total value", "ጠቅላላ ዋጋ")}: <span className="text-purple-400 font-semibold">{fmt(totalValue)} ETB</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadItems} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          {!readOnly && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {tc("Add Item", "ዕቃ ጨምር")}
            </button>
          )}
        </div>
      </div>

      {/* Alert strip */}
      {(outStock.length > 0 || lowStock.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {outStock.length > 0 && (
            <div className="flex items-center gap-2 bg-rose-900/30 border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-rose-400">
              <X className="w-3.5 h-3.5" />
              <span>{outStock.length} {tc("out of stock", "ያለቀ")}: {outStock.map(i => i.name).join(", ")}</span>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStock.length} {tc("low stock", "አነስ ብቻ")}: {lowStock.map(i => i.name).join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showAdd && !readOnly && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-purple-400 mb-1">{tc("New Bar Item", "አዲስ የባር ዕቃ")}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                type="text"
                placeholder={tc("Item name (e.g. Heineken, Tej)", "ስም (ለምሳሌ ሃይኔከን)")}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <input
              type="text"
              placeholder={tc("Unit (bottle, glass, litre)", "ክፍል")}
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />
            <input
              type="number"
              placeholder={tc("Opening stock", "ክምችት")}
              value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />
            <input
              type="number"
              placeholder={tc("Cost per unit (ETB)", "ዋጋ/ክፍል")}
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />
            <input
              type="number"
              placeholder={tc("Low-stock alert at", "ማንቂያ ደረጃ")}
              value={form.minAlert}
              onChange={e => setForm(f => ({ ...f, minAlert: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          {addError && <p className="text-xs text-rose-400">{addError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={addLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {addLoading ? tc("Adding...", "እየጨመረ...") : tc("Add to Bar Stock", "ወደ ባር ክምችት ጨምር")}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm cursor-pointer transition-colors">
              {tc("Cancel", "ሰርዝ")}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-slate-500 text-sm">{tc("No bar items yet.", "ምንም የባር ዕቃ የለም።")}</div>
          {!readOnly && (
            <div className="text-xs text-slate-600 mt-1">{tc("Tap \"Add Item\" to start tracking drinks.", "\"ዕቃ ጨምር\" ይጫኑ")}</div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40">
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-semibold">{tc("Item", "ዕቃ")}</th>
                <th className="text-center px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Stock", "ክምችት")}</th>
                <th className="text-center px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Unit", "ክፍል")}</th>
                <th className="text-right px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Cost", "ዋጋ")}</th>
                <th className="text-right px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Value", "ጠቅላላ ዋጋ")}</th>
                {!readOnly && <th className="text-center px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Update", "አዘምን")}</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isLow  = item.stock > 0 && item.stock <= item.minAlert;
                const isOut  = item.stock <= 0;
                const isEdit = editId === item.id;
                return (
                  <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isOut  && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Out of stock" />}
                        {isLow  && !isOut && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Low stock" />}
                        {!isLow && !isOut && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        <span className={`font-medium ${isOut ? "text-rose-400" : isLow ? "text-amber-400" : "text-slate-200"}`}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEdit ? (
                        <input
                          type="number"
                          value={editStock}
                          onChange={e => setEditStock(e.target.value)}
                          className="w-20 bg-slate-700 border border-purple-500/50 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className={`font-bold text-sm ${isOut ? "text-rose-400" : isLow ? "text-amber-400" : "text-slate-200"}`}>
                          {item.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-500">{item.unit}</td>
                    <td className="px-3 py-3 text-right text-xs text-slate-400">{fmt(item.cost)}</td>
                    <td className="px-3 py-3 text-right text-xs text-purple-400 font-medium">
                      {fmt(item.stock * item.cost)}
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-3 text-center">
                        {isEdit ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveAdjust(item)}
                              disabled={saving}
                              className="p-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-800/50">
                <td className="px-4 py-3 font-bold text-slate-300 text-xs" colSpan={4}>{tc("Total Bar Value", "ጠቅላላ የባር ዋጋ")}</td>
                <td className="px-3 py-3 text-right font-black text-purple-400">{fmt(totalValue)} ETB</td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-600 px-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{tc("OK", "ጥሩ")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{tc("Low", "አነስ")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{tc("Out", "ያለቀ")}</span>
        <span className="flex items-center gap-1.5"><TrendingDown className="w-3 h-3" />{tc("Click pencil to update stock", "ብዕር ይጫኑ ለማዘምን")}</span>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Props { tenantCode: string; isAmharic: boolean; }

interface Supplier {
  id: string; name: string; phone: string; email: string;
  address: string; category: string; note: string;
}

const CATEGORIES = ["General","Meat","Vegetables","Grains","Beverages","Dairy","Spices","Equipment","Other"];

export default function SupplierManager({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ name:"", phone:"", email:"", address:"", category:"General", note:"" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/api/suppliers");
    if (r.ok) setSuppliers(await r.json());
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/suppliers/${editId}` : "/api/suppliers";
    const r = await apiFetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { load(); setShowForm(false); setEditId(null); setForm({ name:"", phone:"", email:"", address:"", category:"General", note:"" }); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm(tc("Delete this supplier?","ይህን አቅራቢ ይሰርዙ?"))) return;
    await apiFetch(`/api/suppliers/${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, category: s.category, note: s.note });
    setShowForm(true);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-400">{tc("Supplier Management","አቅራቢ አስተዳዳሪ")}</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name:"", phone:"", email:"", address:"", category:"General", note:"" }); }}
          className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
          + {tc("Add Supplier","አቅራቢ ጨምር")}
        </button>
      </div>

      <input type="text" placeholder={tc("Search suppliers...","አቅራቢዎችን ፈልግ...")} value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 border border-amber-500/30 space-y-3">
          <h3 className="font-semibold text-amber-400">{editId ? tc("Edit Supplier","አቅራቢ አርም") : tc("New Supplier","አዲስ አቅራቢ")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key:"name", label:tc("Name","ስም"), placeholder:tc("Supplier name","የአቅራቢ ስም"), type:"text" },
              { key:"phone", label:tc("Phone","ስልክ"), placeholder:"09...", type:"tel" },
              { key:"email", label:tc("Email","ኢሜይል"), placeholder:"supplier@example.com", type:"email" },
              { key:"address", label:tc("Address","አድራሻ"), placeholder:tc("Addis Ababa","አዲስ አበባ"), type:"text" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(fo => ({...fo, [f.key]: e.target.value}))}
                  className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Category","ምድብ")}</label>
              <select value={form.category} onChange={e => setForm(fo => ({...fo, category: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Note","ማስታወሻ")}</label>
              <input type="text" placeholder={tc("Optional notes...","አማራጭ ማስታወሻ...")} value={form.note}
                onChange={e => setForm(fo => ({...fo, note: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? tc("Saving...","በማስቀመጥ ላይ...") : tc("Save","አስቀምጥ")}
            </button>
            <button onClick={() => setShowForm(false)}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm">
              {tc("Cancel","ሰርዝ")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">{tc("Loading...","በመጫን ላይ...")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-8">{tc("No suppliers added yet.","ምንም አቅራቢ አልተጨመረም።")}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-900/40 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {s.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-100">{s.name}</div>
                    <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{s.category}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(s)} className="text-gray-400 hover:text-amber-400 text-sm">✏️</button>
                  <button onClick={() => del(s.id)} className="text-gray-400 hover:text-red-400 text-sm">🗑️</button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-400">
                {s.phone && <div>📞 {s.phone}</div>}
                {s.email && <div>📧 {s.email}</div>}
                {s.address && <div className="col-span-2">📍 {s.address}</div>}
                {s.note && <div className="col-span-2 italic text-xs text-gray-500">📝 {s.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

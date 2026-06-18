import { useState, useEffect, useCallback } from "react";
import { Building2, MapPin, Phone, Users, Pencil, Trash2, X, Check } from "lucide-react";
import { PLAN_LIMITS, SubscriptionPlan } from "../types";
import { apiFetch } from "../lib/api";

interface Props {
  tenantCode: string;
  isAmharic: boolean;
  plan?: SubscriptionPlan;
  onBranchesChange?: () => void;
}

interface BranchRow {
  id: string;
  name: string;
  ameName: string;
  location: string;
  phone: string;
  capacity: number;
}

const BLANK = { name: "", ameName: "", location: "", phone: "", capacity: "20" };

export default function BranchManager({ tenantCode, isAmharic, plan = "trial", onBranchesChange }: Props) {
  const tc = (en: string, am: string) => (isAmharic ? am : en);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [limit, setLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const headers = { "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/branches");
      if (r.ok) {
        const data = await r.json();
        setBranches(data.branches || []);
        setLimit(data.limit ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantCode]);

  useEffect(() => { load(); }, [load]);

  const canAdd = branches.length < limit;

  const openAdd = () => {
    setEditId(null);
    setForm({ ...BLANK });
    setError("");
    setShowForm(true);
  };

  const openEdit = (b: BranchRow) => {
    setEditId(b.id);
    setForm({
      name: b.name,
      ameName: b.ameName,
      location: b.location,
      phone: b.phone,
      capacity: String(b.capacity),
    });
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError(tc("Branch name is required", "የቅርንጫፍ ስም ያስፈልጋል"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        ameName: form.ameName.trim() || form.name.trim(),
        location: form.location.trim(),
        phone: form.phone.trim(),
        capacity: Number(form.capacity) || 20,
      };
      const url = editId ? `/api/branches/${editId}` : "/api/branches";
      const method = editId ? "PATCH" : "POST";
      const r = await apiFetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || tc("Failed to save branch", "ቅርንጫፍ ማስቀመጥ አልተሳካም"));
        return;
      }
      setShowForm(false);
      await load();
      onBranchesChange?.();
    } catch {
      setError(tc("Network error", "የኔትዎርክ ስህተት"));
    } finally {
      setSaving(false);
    }
  };

  const del = async (b: BranchRow) => {
    if (!confirm(tc(`Delete branch "${b.name}"?`, `ቅርንጫፍ "${b.name}" ይሰረዝ?`))) return;
    const r = await apiFetch(`/api/branches/${b.id}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || tc("Cannot delete branch", "ቅርንጫፍ መሰረዝ አይቻልም"));
      return;
    }
    await load();
    onBranchesChange?.();
  };

  const planLabel = PLAN_LIMITS[plan]?.label ?? plan;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {tc("Branch Management", "የቅርንጫፎች አስተዳደር")}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {tc(
              `${branches.length} / ${limit} branches used — ${planLabel}`,
              `${branches.length} / ${limit} ቅርንጫፎች — ${planLabel}`
            )}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={openAdd}
            className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm shrink-0"
          >
            + {tc("Add Branch", "ቅርንጫፍ ጨምር")}
          </button>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-amber-400/90">{tc("How branches work", "ቅርንጫፎች እንዴት ይሰራሉ")}</p>
        <p>{tc("1. Create a branch here (e.g. Bole, Mercato).", "1. እዚህ ቅርንጫፍ ይፍጠሩ (ለምሳሌ ቦሌ፣ መርካቶ)።")}</p>
        <p>{tc("2. Assign staff to a branch in Manager → Staff.", "2. ሰራተኞችን በማናጀር → ሰራተኞች ውስጥ ለቅርንጫፍ ይመድቡ።")}</p>
        <p>{tc("3. Switch active branch from the top bar to view that location.", "3. ንቁ ቅርንጫፍን ከላይኛው ባር ይቀይሩ።")}</p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {!canAdd && !showForm && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-300">
          {tc(
            `Branch limit reached for your plan (${limit}). Upgrade to Professional for 3 branches.`,
            `የእቅድዎ ቅርንጫፍ ገደብ (${limit}) ሞልቷል። 3 ቅርንጫፎች ለማግኘት ወደ Professional ያሻሽሉ።`
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-400">
              {editId ? tc("Edit Branch", "ቅርንጫፍ አርም") : tc("New Branch", "አዲስ ቅርንጫፍ")}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Branch name", "የቅርንጫፍ ስም")} *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={tc("Bole Branch", "ቦሌ ቅርንጫፍ")}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Amharic name", "በአማርኛ ስም")}</label>
              <input
                value={form.ameName}
                onChange={(e) => setForm((f) => ({ ...f, ameName: e.target.value }))}
                placeholder="ቦሌ ቅርንጫፍ"
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Location / address", "አድራሻ")}</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder={tc("Bole, Addis Ababa", "ቦሌ፣ አዲስ አበባ")}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Phone", "ስልክ")}</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+251911..."
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Table capacity", "የጠረጴዛ ብዛት")}</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? tc("Saving...", "በማስቀመጥ...") : tc("Save Branch", "ቅርንጫፍ አስቀምጥ")}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8 text-sm">{tc("Loading...", "በመጫን...")}</p>
      ) : (
        <div className="space-y-2">
          {branches.map((b) => (
            <div
              key={b.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-100">{isAmharic ? b.ameName : b.name}</span>
                  <span className="text-[10px] font-mono bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                    {b.id}
                  </span>
                  {b.id === "main" && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                      {tc("Main", "ዋና")}
                    </span>
                  )}
                </div>
                {b.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {b.location}
                  </p>
                )}
                {b.phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {b.phone}
                  </p>
                )}
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {tc("Capacity", "አቅም")}: {b.capacity} {tc("tables", "ጠረጴዛዎች")}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(b)}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                  title={tc("Edit", "አርም")}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {b.id !== "main" && (
                  <button
                    onClick={() => del(b)}
                    className="p-2 rounded-lg bg-rose-900/40 hover:bg-rose-800/50 text-rose-400"
                    title={tc("Delete", "ሰርዝ")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

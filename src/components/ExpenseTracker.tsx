import { useState, useEffect, useCallback } from "react";

interface Props { tenantCode: string; isAmharic: boolean; }

interface Expense {
  id: string; category: string; description: string;
  amount: number; date: string; branch: string;
}

const CATEGORIES = ["Rent","Utilities","Salaries","Supplies","Marketing","Maintenance","Food Cost","Other"];

export default function ExpenseTracker({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Supplies", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [filterCat, setFilterCat] = useState("All");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/expenses", { headers: { "X-Tenant-Code": tenantCode } });
    if (r.ok) setExpenses(await r.json());
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/expenses/${editId}` : "/api/expenses";
    const r = await fetch(url, {
      method, headers: { "Content-Type": "application/json", "X-Tenant-Code": tenantCode },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    if (r.ok) { load(); setShowForm(false); setEditId(null); setForm({ category: "Supplies", description: "", amount: "", date: new Date().toISOString().split("T")[0] }); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm(tc("Delete this expense?","ይህን ወጪ ይሰርዙ?"))) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE", headers: { "X-Tenant-Code": tenantCode } });
    load();
  };

  const filtered = filterCat === "All" ? expenses : expenses.filter(e => e.category === filterCat);
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const todayTotal = expenses.filter(e => e.date === new Date().toISOString().split("T")[0]).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-400">{tc("Expense Tracker","ወጪ መከታተያ")}</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ category: "Supplies", description: "", amount: "", date: new Date().toISOString().split("T")[0] }); }}
          className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
          + {tc("Add Expense","ወጪ ጨምር")}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-xs text-gray-400">{tc("Today's Expenses","የዛሬ ወጪ")}</div>
          <div className="text-xl font-bold text-red-400">{todayTotal.toLocaleString()} ETB</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-xs text-gray-400">{tc("Filtered Total","የተጣራ ጠቅላላ")}</div>
          <div className="text-xl font-bold text-orange-400">{total.toLocaleString()} ETB</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["All", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCat === c ? "bg-amber-500 text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}>{c}</button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 border border-amber-500/30 space-y-3">
          <h3 className="font-semibold text-amber-400">{editId ? tc("Edit Expense","ወጪ አርም") : tc("New Expense","አዲስ ወጪ")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Category","ምድብ")}</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Amount (ETB)","መጠን (ብር)")}</label>
              <input type="number" min="0" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Description","መግለጫ")}</label>
              <input type="text" placeholder={tc("e.g. Monthly rent","ለምሳሌ፡ ወርሃዊ ቤት ኪራይ")} value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Date","ቀን")}</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({...f, date: e.target.value}))}
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

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">{tc("Loading...","በመጫን ላይ...")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-8">{tc("No expenses recorded yet.","ምንም ወጪ አልተመዘገበም።")}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <div key={exp.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-red-900/40 text-red-400 text-xs px-2 py-1 rounded-full">{exp.category}</span>
                <div>
                  <div className="text-sm text-gray-200">{exp.description}</div>
                  <div className="text-xs text-gray-500">{exp.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-400 font-bold">{Number(exp.amount).toLocaleString()} ETB</span>
                <button onClick={() => { setEditId(exp.id); setForm({ category: exp.category, description: exp.description, amount: String(exp.amount), date: exp.date }); setShowForm(true); }}
                  className="text-gray-400 hover:text-amber-400 text-sm">✏️</button>
                <button onClick={() => del(exp.id)} className="text-gray-400 hover:text-red-400 text-sm">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

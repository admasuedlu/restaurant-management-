import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Props { tenantCode: string; isAmharic: boolean; }

interface Reservation {
  id: string; customer_name: string; phone: string; guests: number;
  date: string; time: string; table_id: string; status: string; note: string; branch: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-900/40 text-yellow-400",
  Confirmed: "bg-green-900/40 text-green-400",
  Seated: "bg-blue-900/40 text-blue-400",
  Cancelled: "bg-red-900/40 text-red-400",
  Completed: "bg-gray-700 text-gray-400",
};

export default function ReservationManager({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ customerName: "", phone: "", guests: "2", date: new Date().toISOString().split("T")[0], time: "12:00", note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch(`/api/reservations?date=${date}`);
    if (r.ok) setReservations(await r.json());
    setLoading(false);
  }, [tenantCode, date]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.customerName || !form.phone || !form.date || !form.time) return;
    setSaving(true);
    const r = await apiFetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, guests: Number(form.guests) }),
    });
    if (r.ok) { load(); setShowForm(false); setForm({ customerName: "", phone: "", guests: "2", date: new Date().toISOString().split("T")[0], time: "12:00", note: "" }); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm(tc("Cancel this reservation?","ይህን ቦታ ማስያዝ ይሰርዙ?"))) return;
    await apiFetch(`/api/reservations/${id}`, { method: "DELETE" });
    load();
  };

  const pending = reservations.filter(r => r.status === "Pending").length;
  const confirmed = reservations.filter(r => r.status === "Confirmed").length;
  const totalGuests = reservations.filter(r => !["Cancelled","Completed"].includes(r.status)).reduce((s, r) => s + Number(r.guests), 0);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-amber-400">{tc("Reservations","ቦታ ማስያዝ")}</h2>
        <button onClick={() => setShowForm(true)}
          className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
          + {tc("New Reservation","አዲስ ቦታ ማስያዝ")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tc("Pending","በጠበቃ"), val: pending, color: "text-yellow-400" },
          { label: tc("Confirmed","የተረጋገጠ"), val: confirmed, color: "text-green-400" },
          { label: tc("Expected Guests","የሚጠበቁ እንግዶች"), val: totalGuests, color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">{tc("Date:","ቀን:")}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
      </div>

      {/* New Reservation Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 border border-amber-500/30 space-y-3">
          <h3 className="font-semibold text-amber-400">{tc("New Reservation","አዲስ ቦታ ማስያዝ")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Customer Name","የደንበኛ ስም")}</label>
              <input type="text" placeholder={tc("Full name","ሙሉ ስም")} value={form.customerName}
                onChange={e => setForm(f => ({...f, customerName: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Phone","ስልክ")}</label>
              <input type="tel" placeholder="09..." value={form.phone}
                onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Date","ቀን")}</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Time","ሰዓት")}</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Guests","እንግዶች")}</label>
              <input type="number" min="1" max="50" value={form.guests}
                onChange={e => setForm(f => ({...f, guests: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Note (optional)","ማስታወሻ (አማራጭ)")}</label>
              <input type="text" placeholder={tc("Special requests...","ልዩ ጥያቄዎች...")} value={form.note}
                onChange={e => setForm(f => ({...f, note: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? tc("Saving...","በማስቀመጥ ላይ...") : tc("Book","ያዝ")}
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
      ) : reservations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          {tc("No reservations for this date.","ለዚህ ቀን ምንም ቦታ ያዝ የለም።")}
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map(r => (
            <div key={r.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-900/40 text-amber-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {r.customer_name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-100">{r.customer_name}</div>
                    <div className="text-sm text-gray-400">{r.phone} · {r.guests} {tc("guests","እንግዶች")}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-200">{r.time}</div>
                    <div className="text-xs text-gray-500">{r.date}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS.Pending}`}>{r.status}</span>
                </div>
              </div>
              {r.note && <div className="mt-2 text-xs text-gray-400 italic">📝 {r.note}</div>}
              <div className="mt-3 flex gap-2 flex-wrap">
                {["Pending","Confirmed","Seated","Completed"].filter(s => s !== r.status).map(s => (
                  <button key={s} onClick={() => updateStatus(r.id, s)}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">
                    → {tc(s, s)}
                  </button>
                ))}
                <button onClick={() => del(r.id)}
                  className="text-xs px-2 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg ml-auto">
                  🗑️ {tc("Cancel","ሰርዝ")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

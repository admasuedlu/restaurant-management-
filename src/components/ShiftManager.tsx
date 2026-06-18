import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Props { tenantCode: string; isAmharic: boolean; }

interface Shift {
  id: string; staff_id: string; staff_name: string; role: string;
  clock_in: string; clock_out: string | null; hours: number | null; tips: number; branch: string; note: string;
}

interface Summary {
  staff_id: string; staff_name: string; role: string;
  shift_count: number; total_hours: number; total_tips: number;
}

interface StaffMember { id: string; name: string; role: string; branch: string; }

export default function ShiftManager({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [tab, setTab] = useState<"today"|"summary">("today");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [clockInId, setClockInId] = useState("");
  const [tips, setTips] = useState("");
  const [saving, setSaving] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    const [shiftR, staffR] = await Promise.all([
      apiFetch(`/api/shifts?date=${today}`),
      apiFetch("/api/staff"),
    ]);
    if (shiftR.ok) setShifts(await shiftR.json());
    if (staffR.ok) setStaff(await staffR.json());
    setLoading(false);
  }, [tenantCode, today]);

  const loadSummary = useCallback(async () => {
    const r = await apiFetch(`/api/shifts/summary?month=${month}`);
    if (r.ok) setSummary(await r.json());
  }, [tenantCode, month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "summary") loadSummary(); }, [tab, loadSummary]);

  const clockIn = async () => {
    if (!clockInId) return;
    setSaving("in");
    const member = staff.find(s => s.id === clockInId);
    if (!member) return;
    const r = await apiFetch("/api/shifts/clock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: member.id, staffName: member.name, role: member.role, branch: member.branch }),
    });
    const data = await r.json();
    if (!r.ok) alert(data.error);
    else { load(); setClockInId(""); }
    setSaving("");
  };

  const clockOut = async (staffId: string) => {
    setSaving(staffId);
    const t = tips ? Number(tips) : 0;
    const r = await apiFetch("/api/shifts/clock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, tips: t }),
    });
    if (!r.ok) { const d = await r.json(); alert(d.error); }
    else { load(); setTips(""); }
    setSaving("");
  };

  const openShifts = shifts.filter(s => !s.clock_out);
  const closedShifts = shifts.filter(s => s.clock_out);
  const staffNotClockedIn = staff.filter(m => m.role !== "owner" && !openShifts.some(s => s.staff_id === m.id));

  const duration = (shift: Shift) => {
    if (shift.clock_out && shift.hours) return `${Number(shift.hours).toFixed(1)}h`;
    const ms = Date.now() - new Date(shift.clock_in).getTime();
    return `${(ms/3600000).toFixed(1)}h ⏱`;
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-400">{tc("Shift Manager","የፈረቃ አስተዳዳሪ")}</h2>
        <div className="flex gap-2">
          {(["today","summary"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab===t?"bg-amber-500 text-gray-900":"bg-gray-700 text-gray-300"}`}>
              {t==="today" ? tc("Today","ዛሬ") : tc("Monthly","ወርሃዊ")}
            </button>
          ))}
        </div>
      </div>

      {tab === "today" ? (
        <>
          {/* Clock In */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
            <h3 className="font-semibold text-gray-200">{tc("Clock In","ሰዓት ጀምር")}</h3>
            <div className="flex gap-2">
              <select value={clockInId} onChange={e => setClockInId(e.target.value)}
                className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="">{tc("Select staff...","ሰራተኛ ይምረጡ...")}</option>
                {staffNotClockedIn.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
              <button onClick={clockIn} disabled={!clockInId || saving==="in"}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving==="in" ? "..." : tc("Clock In","ጀምር")}
              </button>
            </div>
          </div>

          {/* Active Shifts */}
          {openShifts.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 border border-green-500/20 space-y-3">
              <h3 className="font-semibold text-green-400">🟢 {tc("Active Shifts","የሚሰሩ ፈረቃዎች")} ({openShifts.length})</h3>
              {openShifts.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                  <div>
                    <div className="font-medium text-gray-100">{s.staff_name}</div>
                    <div className="text-xs text-gray-400">{s.role} · {tc("In:","ገብቷል:")} {new Date(s.clock_in).toLocaleTimeString()} · {duration(s)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder={tc("Tips","ጣሪያ")} value={tips}
                      onChange={e => setTips(e.target.value)}
                      className="w-20 bg-gray-600 text-gray-100 rounded px-2 py-1 text-xs" />
                    <button onClick={() => clockOut(s.staff_id)} disabled={saving===s.staff_id}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {saving===s.staff_id ? "..." : tc("Clock Out","ወጣ")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Shifts */}
          {closedShifts.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-2">
              <h3 className="font-semibold text-gray-400">{tc("Completed Today","ዛሬ ያጠናቀቁ")}</h3>
              {closedShifts.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm text-gray-400 py-2 border-b border-gray-700 last:border-0">
                  <span>{s.staff_name}</span>
                  <span>{new Date(s.clock_in).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} → {s.clock_out ? new Date(s.clock_out).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</span>
                  <span className="text-blue-400">{Number(s.hours||0).toFixed(1)}h</span>
                  {Number(s.tips) > 0 && <span className="text-amber-400">+{s.tips} ETB {tc("tips","ጣሪያ")}</span>}
                </div>
              ))}
            </div>
          )}

          {loading && <div className="text-center text-gray-400 py-4">{tc("Loading...","በመጫን ላይ...")}</div>}
        </>
      ) : (
        <>
          {/* Monthly Summary */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">{tc("Month:","ወር:")}</label>
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setTimeout(loadSummary,100); }}
              className="bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
          </div>
          {summary.length === 0 ? (
            <div className="text-center text-gray-500 py-8">{tc("No shift data for this month.","ለዚህ ወር የፈረቃ ዳታ የለም።")}</div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-700/50">
                  <tr>
                    {[tc("Staff","ሰራተኛ"),tc("Role","ሚና"),tc("Shifts","ፈረቃዎች"),tc("Hours","ሰዓታት"),tc("Tips","ጣሪያ")].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-300 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map(row => (
                    <tr key={row.staff_id} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-100 font-medium">{row.staff_name}</td>
                      <td className="px-4 py-3 text-gray-400">{row.role}</td>
                      <td className="px-4 py-3 text-blue-400">{row.shift_count}</td>
                      <td className="px-4 py-3 text-green-400">{Number(row.total_hours).toFixed(1)}h</td>
                      <td className="px-4 py-3 text-amber-400">{Number(row.total_tips).toLocaleString()} ETB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

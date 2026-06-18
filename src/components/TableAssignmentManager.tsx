import React, { useState, useEffect } from "react";
import { Users, Save, RefreshCw, MapPin, Trash2, Plus } from "lucide-react";
import { apiFetch } from "../lib/api";

interface WaiterRow {
  staffId: string;
  staffName: string;
  tables: string; // comma-separated table IDs e.g. "T1,T2,T3"
}

interface Props {
  isAmharic: boolean;
  tenantCode?: string;
  staffList: { id: string; name: string; role: string }[];
}

export default function TableAssignmentManager({ isAmharic, tenantCode, staffList }: Props) {
  const waiters = staffList.filter(s => s.role.toLowerCase() === "waiter");

  // Map waiterId → comma-separated table IDs
  const [rows, setRows] = useState<WaiterRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load existing assignments on mount
  useEffect(() => {
    loadAssignments();
  }, [tenantCode]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/table-assignments", tenantCode);
      if (res.ok) {
        const existing: { tableId: string; staffId: string; staffName: string }[] = await res.json();

        // Build a map: staffId → Set<tableId>
        const map: Record<string, Set<string>> = {};
        for (const a of existing) {
          if (!map[a.staffId]) map[a.staffId] = new Set();
          map[a.staffId].add(a.tableId);
        }

        // Merge with waiter list
        setRows(
          waiters.map(w => ({
            staffId: w.id,
            staffName: w.name,
            tables: map[w.id] ? [...map[w.id]].join(", ") : "",
          }))
        );
      }
    } catch {
      // Initialise from staff list with empty tables
      setRows(waiters.map(w => ({ staffId: w.id, staffName: w.name, tables: "" })));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (staffId: string, value: string) => {
    setRows(prev => prev.map(r => r.staffId === staffId ? { ...r, tables: value } : r));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Build flat array of assignments
      const assignments: { tableId: string; staffId: string; staffName: string }[] = [];
      for (const row of rows) {
        const tableIds = row.tables
          .split(/[,،\s]+/)
          .map(t => t.trim().toUpperCase())
          .filter(t => t.length > 0);
        for (const tableId of tableIds) {
          assignments.push({ tableId, staffId: row.staffId, staffName: row.staffName });
        }
      }

      const res = await apiFetch("/api/table-assignments", tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert(isAmharic ? "ማስቀምጥ አልተቻለም" : "Failed to save. Check connection.");
    } finally {
      setSaving(false);
    }
  };

  if (waiters.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
        <p className="text-sm text-slate-500">
          {isAmharic ? "ምንም ዌይተር አልተጨመረም" : "No waiters found. Add waiter staff first."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-black text-slate-100 text-sm">
              {isAmharic ? "ጠረጴዛ ለዌይተር መድቡ" : "Assign Tables to Waiters"}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isAmharic
                ? "እያንዳንዱ ዌይተር የሚቆጣጠረውን ጠረጴዛ ቁጥር ያስገቡ"
                : "Each waiter only sees orders from their assigned tables"}
            </p>
          </div>
        </div>
        <button
          onClick={loadAssignments}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Waiter rows */}
      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {rows.map(row => (
            <div key={row.staffId} className="p-4 flex items-center gap-4">
              {/* Avatar + name */}
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-black text-blue-400">
                  {row.staffName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">{row.staffName}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {isAmharic ? "ዌይተር" : "Waiter"}
                </p>
              </div>
              {/* Table input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={row.tables}
                  onChange={e => handleTableChange(row.staffId, e.target.value)}
                  placeholder={isAmharic ? "ለምሳሌ: T1, T2, T3" : "e.g. T1, T2, T3"}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-all font-mono"
                />
              </div>
              {/* Clear button */}
              {row.tables && (
                <button
                  onClick={() => handleTableChange(row.staffId, "")}
                  className="p-2 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Clear"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer — info + save */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-4 bg-slate-900/50">
        <p className="text-[10px] text-slate-600 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          {isAmharic
            ? "ሰላፊ በኮማ ወይም ቁጥር ያስገቡ: T1,T2,T5"
            : "Separate table IDs with commas: T1, T2, T5"}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
            saved
              ? "bg-emerald-500 text-slate-950"
              : saving
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95"
          }`}
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved
            ? isAmharic ? "ተቀምጧል ✓" : "Saved ✓"
            : isAmharic ? "አስቀምጥ" : "Save Assignments"}
        </button>
      </div>
    </div>
  );
}

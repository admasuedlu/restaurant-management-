/**
 * StaffManager — Manager creates, edits, and deletes staff accounts.
 * PIN is write-only: shown only during create/edit, never fetched back.
 */
import React, { useState } from "react";
import {
  UserPlus, Pencil, Trash2, Eye, EyeOff, X, Check,
  ChefHat, Users, CreditCard, Wine, TrendingUp, Crown, ShoppingCart, Shield,
} from "lucide-react";
import { AuthUser, StaffMember } from "../types";

interface Props {
  staffList: StaffMember[];
  isAmharic: boolean;
  authUser: AuthUser;
  tenantCode?: string;
  onStaffChange: () => void;        // re-fetch staff after any mutation
}

type Role = "waiter" | "kitchen" | "bar" | "cashier" | "manager" | "owner";

const ROLES: { value: Role; label: string; amLabel: string; icon: React.ReactNode; color: string }[] = [
  { value: "waiter",   label: "Waiter",   amLabel: "አስተናጋጅ",  icon: <Users      className="w-3.5 h-3.5" />, color: "text-amber-400" },
  { value: "kitchen",  label: "Chef",     amLabel: "ሼፍ",       icon: <ChefHat    className="w-3.5 h-3.5" />, color: "text-rose-400"  },
  { value: "bar",      label: "Bar",      amLabel: "ባር",       icon: <Wine       className="w-3.5 h-3.5" />, color: "text-cyan-400"  },
  { value: "cashier",  label: "Cashier",  amLabel: "ካሺየር",     icon: <CreditCard className="w-3.5 h-3.5" />, color: "text-emerald-400"},
  { value: "manager",  label: "Manager",  amLabel: "ማናጀር",     icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-purple-400"},
  { value: "owner",    label: "Owner",    amLabel: "ባለቤት",     icon: <Crown      className="w-3.5 h-3.5" />, color: "text-rose-300"  },
];

const ROLE_ICONS: Record<string, React.ReactNode> = {
  waiter:    <Users      className="w-3.5 h-3.5" />,
  kitchen:   <ChefHat   className="w-3.5 h-3.5" />,
  bar:       <Wine      className="w-3.5 h-3.5" />,
  cashier:   <CreditCard className="w-3.5 h-3.5"/>,
  manager:   <TrendingUp className="w-3.5 h-3.5"/>,
  owner:     <Crown     className="w-3.5 h-3.5" />,
  customer:  <ShoppingCart className="w-3.5 h-3.5"/>,
  superadmin:<Shield    className="w-3.5 h-3.5" />,
};

const ROLE_COLOR: Record<string, string> = {
  waiter: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  kitchen: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  bar: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  cashier: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  manager: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  owner: "text-rose-300 bg-rose-500/10 border-rose-400/20",
  customer: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  superadmin: "text-slate-300 bg-slate-500/10 border-slate-500/20",
};

const BLANK = { name: "", role: "waiter" as Role, pin: "", pin2: "" };

export default function StaffManager({ staffList, isAmharic, authUser, tenantCode, onStaffChange }: Props) {
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState({ ...BLANK });
  const [showPin, setShowPin]         = useState(false);
  const [showPin2, setShowPin2]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const tc = tenantCode ?? authUser.tenantCode ?? "";

  const headers = (extra: Record<string, string> = {}) => ({
    "Content-Type": "application/json",
    "X-Tenant-Code": tc,
    ...extra,
  });

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(""), 4000); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...BLANK });
    setShowPin(false);
    setError("");
    setShowForm(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditId(s.id);
    setForm({ name: s.name, role: (s.role.toLowerCase() as Role), pin: "", pin2: "" });
    setShowPin(false);
    setError("");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setError(""); };

  const validate = () => {
    if (!form.name.trim()) return isAmharic ? "ስም ያስገቡ" : "Name is required";
    if (!editId) {
      if (!form.pin) return isAmharic ? "ፒን ያስገቡ" : "PIN is required";
      if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin))
        return isAmharic ? "ፒን 4 ቁጥሮች መሆን አለበት" : "PIN must be exactly 4 digits";
      if (form.pin !== form.pin2)
        return isAmharic ? "ፒን አይዛመድም" : "PINs do not match";
    } else if (form.pin) {
      if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin))
        return isAmharic ? "ፒን 4 ቁጥሮች መሆን አለበት" : "PIN must be exactly 4 digits";
      if (form.pin !== form.pin2)
        return isAmharic ? "ፒን አይዛመድም" : "PINs do not match";
    }
    return "";
  };

  const save = async () => {
    const err = validate();
    if (err) { flash(err, true); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: form.name.trim(), role: form.role };
      if (form.pin) body.pin = form.pin;

      const url    = editId ? `/api/staff/${editId}` : "/api/staff";
      const method = editId ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) { flash(data.error || "Error", true); return; }

      flash(
        editId
          ? (isAmharic ? "ሰራተኛ ተዘምኗል ✓" : "Staff updated ✓")
          : (isAmharic ? "አዲስ ሰራተኛ ተፈጠረ ✓" : "Staff account created ✓")
      );
      closeForm();
      onStaffChange();
    } catch {
      flash(isAmharic ? "የኔትዎርክ ስህተት" : "Network error", true);
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (id: string, name: string) => {
    if (!confirm(isAmharic ? `${name}ን ይሰርዙ?` : `Delete ${name}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE", headers: headers() });
      if (res.ok) {
        flash(isAmharic ? "ሰራተኛ ተሰርዟል" : "Staff member removed");
        onStaffChange();
      } else {
        const d = await res.json();
        flash(d.error || "Error", true);
      }
    } catch {
      flash(isAmharic ? "የኔትዎርክ ስህተት" : "Network error", true);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter out customer/superadmin from display
  const displayStaff = staffList.filter((s) => !["Customer", "superadmin"].includes(s.role as string));

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-100">
            {isAmharic ? "የሰራተኞች አስተዳደር" : "Staff Management"}
          </h3>
          <p className="text-xs text-slate-500">
            {isAmharic
              ? `${displayStaff.length} ሰራተኞች`
              : `${displayStaff.length} staff members`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          {isAmharic ? "አዲስ ሰራተኛ" : "Add Staff"}
        </button>
      </div>

      {/* ── Flash messages ──────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-rose-400">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-400">
          ✓ {success}
        </div>
      )}

      {/* ── Staff list ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {displayStaff.length === 0 ? (
          <div className="py-12 text-center text-slate-600 text-sm">
            {isAmharic ? "ምንም ሰራተኛ የለም" : "No staff members yet"}
          </div>
        ) : (
          displayStaff.map((s) => {
            const roleLower = s.role.toLowerCase();
            const colorCls  = ROLE_COLOR[roleLower] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
            return (
              <div
                key={s.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-black text-sm flex-shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-100 truncate">{s.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorCls}`}>
                      {ROLE_ICONS[roleLower]}
                      {isAmharic
                        ? ROLES.find((r) => r.value === roleLower)?.amLabel ?? s.role
                        : s.role}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500/15 hover:text-amber-400 text-slate-400 border border-slate-700 hover:border-amber-500/30 transition-all cursor-pointer"
                    title={isAmharic ? "አርትዕ" : "Edit"}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteStaff(s.id, s.name)}
                    disabled={deletingId === s.id}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/15 hover:text-rose-400 text-slate-500 border border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-40"
                    title={isAmharic ? "ሰርዝ" : "Delete"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODAL — Add / Edit Staff
      ════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
              <h4 className="text-sm font-black text-slate-100">
                {editId
                  ? (isAmharic ? "ሰራተኛ አርትዕ" : "Edit Staff Member")
                  : (isAmharic ? "አዲስ ሰራተኛ ፍጠር" : "Create New Staff Account")}
              </h4>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="px-6 py-5 space-y-4">

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {isAmharic ? "ሙሉ ስም" : "Full Name"} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isAmharic ? "ለምሳሌ: አልማዝ ተስፋዬ" : "e.g. Almaz Tesfaye"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {isAmharic ? "ሚና (Role)" : "Role"} *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        form.role === r.value
                          ? "bg-amber-500 border-amber-500 text-slate-950"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                      }`}
                    >
                      {r.icon}
                      <span>{isAmharic ? r.amLabel : r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {editId
                    ? (isAmharic ? "አዲስ ፒን (ባዶ ከተወሰደ አይለወጥም)" : "New PIN (leave blank to keep current)")
                    : (isAmharic ? "ፒን (4 ቁጥሮች)" : "PIN (4 digits)")} {!editId && "*"}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={4}
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    placeholder="••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 tracking-widest font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm PIN */}
              {(form.pin.length > 0 || !editId) && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    {isAmharic ? "ፒን አረጋግጥ" : "Confirm PIN"} {!editId && "*"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPin2 ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      value={form.pin2}
                      onChange={(e) => setForm({ ...form, pin2: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="••••"
                      className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none tracking-widest font-mono pr-10 ${
                        form.pin2 && form.pin !== form.pin2
                          ? "border-rose-500/60 focus:border-rose-500"
                          : form.pin2 && form.pin === form.pin2
                          ? "border-emerald-500/60"
                          : "border-slate-700 focus:border-amber-500/50"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin2((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPin2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {form.pin2.length === 4 && (
                      <div className={`absolute right-9 top-1/2 -translate-y-1/2 ${form.pin === form.pin2 ? "text-emerald-400" : "text-rose-400"}`}>
                        {form.pin === form.pin2 ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error inside modal */}
              {error && (
                <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  ⚠ {error}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer transition-all border border-slate-700"
              >
                {isAmharic ? "ሰርዝ" : "Cancel"}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="animate-pulse">{isAmharic ? "በማስቀመጥ..." : "Saving..."}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editId ? (isAmharic ? "አዘምን" : "Update") : (isAmharic ? "ፍጠር" : "Create")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

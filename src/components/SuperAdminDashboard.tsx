import React, { useEffect, useState } from "react";
import {
  Check, X, RefreshCw, Building2, Phone, Mail, Clock,
  Users, ShoppingCart, TrendingUp, Shield, AlertCircle,
  CreditCard, DollarSign, AlertTriangle
} from "lucide-react";

const ADMIN_KEY = "habesha-admin-2024";

interface TenantRow {
  id: string;
  code: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
  trialDaysLeft: number;
  orderCount: number;
  staffCount: number;
}

interface PaymentStatus {
  tenantId: string;
  tenantCode: string;
  businessName: string;
  ownerName: string;
  phone: string;
  plan: string;
  monthlyFee: number;
  subscriptionEnd: string | null;
  subscriptionStatus: string;
  daysOverdue: number;
  graceEnds: string | null;
}

interface RenewForm {
  tenantId: string;
  businessName: string;
  plan: string;
  months: number;
  note: string;
  submitting: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  pending:      "bg-amber-500/20 text-amber-400 border-amber-500/30",
  trial:        "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active:       "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expired:      "bg-rose-500/20 text-rose-400 border-rose-500/30",
  suspended:    "bg-slate-500/20 text-slate-400 border-slate-500/30",
  cancelled:    "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function SuperAdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tenants, setTenants]         = useState<TenantRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [tab, setTab]                 = useState<"pending" | "all" | "payments">("pending");
  const [paymentList, setPaymentList] = useState<PaymentStatus[]>([]);
  const [payLoading, setPayLoading]   = useState(false);
  const [renewForm, setRenewForm]     = useState<RenewForm | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      if (res.ok) setTenants(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPayLoading(true);
    try {
      const res = await fetch("/api/admin/payment-status", {
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      if (res.ok) setPaymentList(await res.json());
    } finally { setPayLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, []);
  useEffect(() => { if (tab === "payments") fetchPayments(); }, [tab]);

  const recordPayment = async () => {
    if (!renewForm) return;
    setRenewForm(f => f ? { ...f, submitting: true } : f);
    try {
      const res = await fetch("/api/subscription/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({
          tenantId: renewForm.tenantId,
          plan: renewForm.plan,
          months: renewForm.months,
          recordedBy: "admin",
          note: renewForm.note,
        }),
      });
      if (res.ok) {
        setRenewForm(null);
        fetchPayments();
        fetchTenants();
      } else {
        const err = await res.json().catch(() => ({}));
        alert("Failed: " + (err.error ?? res.statusText));
      }
    } finally {
      setRenewForm(f => f ? { ...f, submitting: false } : f);
    }
  };

  const approve = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/approve`, {
        method: "POST",
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      if (res.ok) fetchTenants();
    } finally { setActionId(null); }
  };

  const reject = async (id: string, name: string) => {
    if (!confirm(`Reject and delete "${name}"? This cannot be undone.`)) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/reject`, {
        method: "POST",
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      if (res.ok) fetchTenants();
    } finally { setActionId(null); }
  };

  const suspend = async (id: string) => {
    setActionId(id);
    try {
      await fetch(`/api/admin/tenants/${id}/suspend`, {
        method: "POST",
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      fetchTenants();
    } finally { setActionId(null); }
  };

  const activate = async (id: string) => {
    setActionId(id);
    try {
      await fetch(`/api/admin/tenants/${id}/activate`, {
        method: "POST",
        headers: { "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({}),
      });
      fetchTenants();
    } finally { setActionId(null); }
  };

  const pending = tenants.filter((t) => t.status === "pending");
  const displayed = tab === "pending" ? pending : tenants;

  const totalRevenue = tenants.filter(t => t.status === "active" || t.status === "trial").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-100">Habesha OS — Super Admin</h1>
            <p className="text-[10px] text-slate-500">Restaurant management platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTenants}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-rose-400 cursor-pointer transition-colors font-bold"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Restaurants", value: tenants.length, icon: Building2, color: "text-amber-400" },
            { label: "Pending Approval", value: pending.length, icon: AlertCircle, color: pending.length > 0 ? "text-rose-400 animate-pulse" : "text-slate-500" },
            { label: "Active / Trial", value: totalRevenue, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Total Staff", value: tenants.reduce((s, t) => s + t.staffCount, 0), icon: Users, color: "text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
              <div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pending alert banner */}
        {pending.length > 0 && tab !== "pending" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <p className="text-sm font-bold text-amber-400">
              {pending.length} restaurant{pending.length > 1 ? "s" : ""} waiting for approval
            </p>
            <button onClick={() => setTab("pending")} className="ml-auto text-xs text-amber-400 underline cursor-pointer">
              Review now →
            </button>
          </div>
        )}

        {/* Tab filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer transition-all ${
              tab === "pending"
                ? "bg-amber-500 border-amber-500 text-slate-950"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer transition-all ${
              tab === "all"
                ? "bg-amber-500 border-amber-500 text-slate-950"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            All Restaurants ({tenants.length})
          </button>
          <button
            onClick={() => setTab("payments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer transition-all ${
              tab === "payments"
                ? "bg-rose-500 border-rose-500 text-white"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payments
            {paymentList.filter(p => p.daysOverdue > 0).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {paymentList.filter(p => p.daysOverdue > 0).length}
              </span>
            )}
          </button>
        </div>

        {/* Payments panel */}
        {tab === "payments" && (
          <div className="space-y-3">
            {payLoading ? (
              <div className="text-center py-12 text-slate-500 text-sm animate-pulse">Loading payment data...</div>
            ) : paymentList.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm">No payment data available</div>
            ) : (
              paymentList.map(p => (
                <div
                  key={p.tenantId}
                  className={`bg-slate-900 border rounded-2xl p-5 ${
                    p.daysOverdue > 7 ? "border-rose-500/50" :
                    p.daysOverdue > 0 ? "border-amber-500/40" :
                    "border-slate-800"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-100">{p.businessName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          p.subscriptionStatus === "expired" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                          p.subscriptionStatus === "grace"   ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                          "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}>
                          {p.subscriptionStatus.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{p.tenantCode}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.ownerName}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{p.monthlyFee.toLocaleString()} ETB/mo</span>
                        {p.subscriptionEnd && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Ends: {new Date(p.subscriptionEnd).toLocaleDateString()}</span>}
                        {p.daysOverdue > 0 && (
                          <span className={`flex items-center gap-1 font-bold ${p.daysOverdue > 7 ? "text-rose-400" : "text-amber-400"}`}>
                            <AlertTriangle className="w-3 h-3" />{p.daysOverdue} day{p.daysOverdue !== 1 ? "s" : ""} overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setRenewForm({ tenantId: p.tenantId, businessName: p.businessName, plan: p.plan, months: 1, note: "", submitting: false })}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Record Payment
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Record payment modal */}
        {renewForm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-sm font-black text-slate-100">Record Payment — {renewForm.businessName}</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Plan</label>
                  <select
                    value={renewForm.plan}
                    onChange={e => setRenewForm(f => f ? { ...f, plan: e.target.value } : f)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="trial">Trial (free)</option>
                    <option value="starter">Starter — 499 ETB/mo</option>
                    <option value="professional">Professional — 1,499 ETB/mo</option>
                    <option value="enterprise">Enterprise — 3,999 ETB/mo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Months to extend</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={renewForm.months}
                    onChange={e => setRenewForm(f => f ? { ...f, months: Number(e.target.value) } : f)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Note (e.g. Telebirr ref)</label>
                  <input
                    type="text"
                    value={renewForm.note}
                    onChange={e => setRenewForm(f => f ? { ...f, note: e.target.value } : f)}
                    placeholder="Optional payment reference"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={recordPayment}
                  disabled={renewForm.submitting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-950 font-black text-sm py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  {renewForm.submitting ? "Saving..." : "Confirm Payment"}
                </button>
                <button
                  onClick={() => setRenewForm(null)}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-sm py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tenant list */}
        {tab !== "payments" && (loading ? (
          <div className="text-center py-16 text-slate-500 text-sm animate-pulse">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">
            {tab === "pending" ? "No pending registrations 🎉" : "No restaurants yet"}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((t) => (
              <div
                key={t.id}
                className={`bg-slate-900 border rounded-2xl p-5 ${
                  t.status === "pending" ? "border-amber-500/40" : "border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">

                  {/* Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-100">{t.businessName}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[t.status] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}>
                        {t.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {t.code}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                        {t.plan}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.ownerName}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.phone}</span>
                      {t.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{t.orderCount} orders</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.staffCount} staff</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {t.status === "pending" && (
                      <>
                        <button
                          onClick={() => approve(t.id)}
                          disabled={actionId === t.id}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => reject(t.id, t.businessName)}
                          disabled={actionId === t.id}
                          className="flex items-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                    {(t.status === "active" || t.status === "trial") && (
                      <button
                        onClick={() => suspend(t.id)}
                        disabled={actionId === t.id}
                        className="text-xs text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 px-3 py-2 rounded-xl cursor-pointer transition-all"
                      >
                        Suspend
                      </button>
                    )}
                    {(t.status === "suspended" || t.status === "expired") && (
                      <button
                        onClick={() => activate(t.id)}
                        disabled={actionId === t.id}
                        className="flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 px-3 py-2 rounded-xl cursor-pointer transition-all"
                      >
                        <Check className="w-3 h-3" />
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

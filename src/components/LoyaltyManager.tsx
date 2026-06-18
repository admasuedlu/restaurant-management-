import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Props { tenantCode: string; isAmharic: boolean; }

interface Customer {
  id: string; customer_name: string; phone: string;
  points: number; total_spent: number; visits: number; tier: string;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "text-amber-600 bg-amber-900/30",
  Silver: "text-gray-300 bg-gray-700/60",
  Gold:   "text-yellow-300 bg-yellow-900/30",
};

const TIER_ICONS: Record<string, string> = { Bronze: "🥉", Silver: "🥈", Gold: "🥇" };

export default function LoyaltyManager({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [tab, setTab] = useState<"customers"|"register"|"redeem">("customers");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regForm, setRegForm] = useState({ customerName: "", phone: "" });
  const [redeemPhone, setRedeemPhone] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [lookupCustomer, setLookupCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type:"success"|"error",text:string}|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/api/loyalty");
    if (r.ok) setCustomers(await r.json());
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { load(); }, [load]);

  const register = async () => {
    if (!regForm.customerName || !regForm.phone) return;
    setSaving(true);
    const r = await apiFetch("/api/loyalty/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regForm),
    });
    const d = await r.json();
    if (r.ok) { setMsg({ type:"success", text: tc("Customer registered!","ደንበኛ ተመዘገቡ!") }); load(); setRegForm({ customerName:"", phone:"" }); }
    else setMsg({ type:"error", text: d.error });
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const lookup = async () => {
    if (!redeemPhone) return;
    const r = await apiFetch(`/api/loyalty?phone=${redeemPhone}`);
    if (r.ok) { const d = await r.json(); setLookupCustomer(d); if (!d) setMsg({ type:"error", text: tc("Customer not found","ደንበኛ አልተገኘም") }); }
  };

  const redeem = async () => {
    if (!redeemPhone || !redeemPoints || !lookupCustomer) return;
    setSaving(true);
    const r = await apiFetch("/api/loyalty/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: redeemPhone, points: Number(redeemPoints) }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg({ type:"success", text: tc(`Redeemed! Discount: ${d.discountAmount} ETB`,`ተቀናሽ: ${d.discountAmount} ብር`) });
      setLookupCustomer(null); setRedeemPhone(""); setRedeemPoints(""); load();
    } else setMsg({ type:"error", text: d.error });
    setSaving(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const filtered = customers.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const goldCount = customers.filter(c => c.tier === "Gold").length;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-amber-400">{tc("Loyalty Program","የቋሚ ደንበኞች ፕሮግራም")}</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tc("Members","አባላት"), val: customers.length, color: "text-blue-400" },
          { label: tc("Total Points","ጠቅላላ ነጥቦች"), val: totalPoints.toLocaleString(), color: "text-amber-400" },
          { label: tc("Gold Members","ወርቅ አባላት"), val: goldCount, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["customers","register","redeem"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab===t?"bg-amber-500 text-gray-900":"bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {t==="customers" ? tc("Members","አባላት") : t==="register" ? tc("Register","ምዝገባ") : tc("Redeem","ቅናሽ")}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.type==="success"?"bg-green-900/40 text-green-400":"bg-red-900/40 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {tab === "customers" && (
        <>
          <input type="text" placeholder={tc("Search by name or phone...","በስም ወይም ስልክ ፈልግ...")} value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
          {loading ? <div className="text-center text-gray-400 py-8">{tc("Loading...","በመጫን ላይ...")}</div>
          : filtered.length === 0 ? <div className="text-center text-gray-500 py-8">{tc("No members yet.","ምንም አባል የለም።")}</div>
          : (
            <div className="space-y-2">
              {filtered.map(c => (
                <div key={c.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${TIER_COLORS[c.tier]||TIER_COLORS.Bronze}`}>
                      {TIER_ICONS[c.tier]} {c.tier}
                    </span>
                    <div>
                      <div className="font-medium text-gray-100">{c.customer_name}</div>
                      <div className="text-xs text-gray-400">{c.phone} · {c.visits} {tc("visits","ጉብኝቶች")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{c.points.toLocaleString()} {tc("pts","ነጥብ")}</div>
                    <div className="text-xs text-gray-500">{Number(c.total_spent).toLocaleString()} ETB {tc("spent","ወጪ")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "register" && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
          <h3 className="font-semibold text-gray-200">{tc("Register New Customer","አዲስ ደንበኛ ምዝገባ")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Customer Name","የደንበኛ ስም")}</label>
              <input type="text" placeholder={tc("Full name","ሙሉ ስም")} value={regForm.customerName}
                onChange={e => setRegForm(f => ({...f, customerName: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{tc("Phone Number","ስልክ ቁጥር")}</label>
              <input type="tel" placeholder="09..." value={regForm.phone}
                onChange={e => setRegForm(f => ({...f, phone: e.target.value}))}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 text-xs text-gray-400">
            ℹ️ {tc("Customers earn 1 point per ETB spent. 1000 points = Silver tier. 5000 = Gold tier.",
              "ደንበኞች ለእያንዳንዱ ብር 1 ነጥብ ያገኛሉ። 1000 ነጥብ = ሲልቨር። 5000 = ጎልድ።")}
          </div>
          <button onClick={register} disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {saving ? tc("Registering...","በምዝገባ ላይ...") : tc("Register","ምዝገብ")}
          </button>
        </div>
      )}

      {tab === "redeem" && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-4">
          <h3 className="font-semibold text-gray-200">{tc("Redeem Points","ነጥቦች ቅናሽ")}</h3>
          <div className="flex gap-2">
            <input type="tel" placeholder={tc("Customer phone...","የደንበኛ ስልክ...")} value={redeemPhone}
              onChange={e => { setRedeemPhone(e.target.value); setLookupCustomer(null); }}
              className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm" />
            <button onClick={lookup} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm">
              {tc("Lookup","ፈልግ")}
            </button>
          </div>
          {lookupCustomer && (
            <div className="bg-gray-700/50 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-100">{lookupCustomer.customer_name}</div>
                  <div className="text-xs text-gray-400">{TIER_ICONS[lookupCustomer.tier]} {lookupCustomer.tier}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 text-xl font-bold">{lookupCustomer.points.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{tc("points","ነጥቦች")}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{tc("Points to Redeem","ለመቀናሽ ነጥቦች")}</label>
                <input type="number" min="1" max={lookupCustomer.points} value={redeemPoints}
                  onChange={e => setRedeemPoints(e.target.value)}
                  className="w-full bg-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm" />
                {redeemPoints && <div className="text-xs text-green-400 mt-1">= {(Number(redeemPoints)*0.5).toFixed(2)} ETB {tc("discount","ቅናሽ")}</div>}
              </div>
              <button onClick={redeem} disabled={saving || !redeemPoints || Number(redeemPoints) > lookupCustomer.points}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? tc("Processing...","በማስኬድ ላይ...") : tc("Apply Discount","ቅናሽ ተፈጻሚ ያድርጉ")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

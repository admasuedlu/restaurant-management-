import { useState } from "react";
import { RefreshCw, Zap, CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

const PLAN_OPTIONS = [
  { value: "starter",      label: "Starter",      price: 499,  features: ["Up to 3 staff", "Basic reports", "QR menu"] },
  { value: "professional", label: "Professional", price: 1499, features: ["Up to 15 staff", "Full analytics", "QR pay", "Inventory"] },
  { value: "enterprise",   label: "Enterprise",   price: 3999, features: ["Unlimited staff", "Multi-branch", "Priority support", "All features"] },
];

interface Props {
  tenantCode: string;
  currentPlan: string;
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  monthlyFee: number;
  trialDaysLeft?: number;
  daysOverdue?: number;
  isAmharic: boolean;
}

export default function SubscriptionTab({
  tenantCode, currentPlan, subscriptionStatus, subscriptionEnd,
  monthlyFee, trialDaysLeft, daysOverdue, isAmharic,
}: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const [selectedPlan, setSelectedPlan] = useState(currentPlan || "professional");
  const [months, setMonths]             = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const selectedPlanData = PLAN_OPTIONS.find(p => p.value === selectedPlan);
  const totalAmount = (selectedPlanData?.price ?? 0) * months;

  const statusColor = {
    active:         "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    trial:          "text-amber-400  bg-amber-500/10  border-amber-500/30",
    grace:          "text-orange-400 bg-orange-500/10 border-orange-500/30",
    expiring_soon:  "text-orange-400 bg-orange-500/10 border-orange-500/30",
    expired:        "text-rose-400   bg-rose-500/10   border-rose-500/30",
    suspended:      "text-rose-400   bg-rose-500/10   border-rose-500/30",
  }[subscriptionStatus] ?? "text-slate-400 bg-slate-800 border-slate-700";

  const statusLabel = {
    active:        tc("Active",       "ንቁ"),
    trial:         tc("Trial",        "ሙከራ"),
    grace:         tc("Grace Period", "የምህረት ጊዜ"),
    expiring_soon: tc("Expiring Soon","ሊያልቅ ነው"),
    expired:       tc("Expired",      "ጊዜ አልፎበት"),
    suspended:     tc("Suspended",    "ታግዷል"),
  }[subscriptionStatus] ?? subscriptionStatus;

  const handleChapaPay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscription/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantCode, plan: selectedPlan, months }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Payment init failed"); return; }
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  const daysUntilExpiry = subscriptionEnd
    ? Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-100">{tc("Subscription", "ደንበኝነት")}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{tc("Manage your plan and billing", "ፕላንዎን እና ክፍያዎን ያስተዳድሩ")}</p>
      </div>

      {/* Current status card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tc("Current Plan", "አሁን ያለ ፕላን")}</span>
          <span className={`text-xs font-black px-3 py-1 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">{tc("Plan", "ፕላን")}</div>
            <div className="font-black text-slate-100 capitalize">{currentPlan || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">{tc("Monthly Fee", "ወርሃዊ ክፍያ")}</div>
            <div className="font-black text-slate-100">{monthlyFee > 0 ? `${monthlyFee.toLocaleString()} ETB` : tc("Free Trial", "ነፃ ሙከራ")}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">{tc("Expires", "ያበቃበት")}</div>
            <div className="font-black text-slate-100 text-sm">
              {subscriptionStatus === "trial"
                ? tc(`${trialDaysLeft ?? 0} days left`, `${trialDaysLeft ?? 0} ቀናት ቀርተዋል`)
                : subscriptionEnd
                ? new Date(subscriptionEnd).toLocaleDateString()
                : "—"
              }
            </div>
          </div>
        </div>

        {/* Days remaining bar */}
        {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{tc("Days remaining", "ቀናት ቀርተዋል")}</span>
              <span className={`font-bold ${daysUntilExpiry <= 7 ? "text-rose-400" : daysUntilExpiry <= 14 ? "text-orange-400" : "text-amber-400"}`}>
                {daysUntilExpiry} {tc("days", "ቀናት")}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${daysUntilExpiry <= 7 ? "bg-rose-500" : daysUntilExpiry <= 14 ? "bg-orange-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, (daysUntilExpiry / 30) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Status-specific alert */}
        {subscriptionStatus === "trial" && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{tc(`Trial ends in ${trialDaysLeft ?? 0} days. Subscribe before it ends to keep full access.`, `ሙከራ ጊዜ ${trialDaysLeft ?? 0} ቀን ውስጥ ይጠናቀቃል። ሙሉ መዳረሻን ለማቆየት ከማብቃቱ በፊት ይመዝገቡ።`)}</span>
          </div>
        )}
        {subscriptionStatus === "expiring_soon" && (
          <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-xs text-orange-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{tc("Subscription expiring soon. Renew now to avoid interruption.", "ደንበኝነቱ ሊያልቅ ነው። ላለ ምቸቱ አሁን ያድሱ።")}</span>
          </div>
        )}
        {subscriptionStatus === "active" && (
          <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{tc("Subscription is active. You can renew early to extend it further.", "ደንበኝነቱ ንቁ ነው። ቀደም ብለው ቢያድሱ ተጨማሪ ጊዜ ያገኛሉ።")}</span>
          </div>
        )}
        {subscriptionStatus === "grace" && (
          <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-xs text-orange-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{tc(`Payment overdue by ${daysOverdue ?? 0} days. Pay now to restore full access.`, `ክፍያ ${daysOverdue ?? 0} ቀን ዘግይቷል። ሙሉ መዳረሻን ለመመለስ አሁን ይክፈሉ።`)}</span>
          </div>
        )}
      </div>

      {/* Plan selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="text-sm font-bold text-slate-300">
          {tc("Renew / Upgrade", "አድስ / አሻሽል")}
        </div>

        {/* Plan cards */}
        <div className="grid gap-2">
          {PLAN_OPTIONS.map(p => (
            <label
              key={p.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedPlan === p.value
                  ? "bg-amber-500/10 border-amber-500/50"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.value}
                checked={selectedPlan === p.value}
                onChange={() => setSelectedPlan(p.value)}
                className="accent-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${selectedPlan === p.value ? "text-amber-400" : "text-slate-200"}`}>
                    {p.label}
                    {p.value === currentPlan && (
                      <span className="ml-2 text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">
                        {tc("current", "አሁን ያለ")}
                      </span>
                    )}
                  </span>
                  <span className="font-black text-sm text-slate-100">{p.price.toLocaleString()} ETB/mo</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.features.join(" · ")}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Months selector */}
        <div>
          <label className="text-xs text-slate-500 block mb-2">{tc("Months to pay", "ለመክፈል ወራት")}</label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 6, 12].map(m => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  months === m
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {m} {tc("mo", "ወር")}
                {m === 3 && <span className="ml-1 text-[9px] text-emerald-400">-5%</span>}
                {m === 6 && <span className="ml-1 text-[9px] text-emerald-400">-10%</span>}
                {m === 12 && <span className="ml-1 text-[9px] text-emerald-400">-15%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
          <span className="text-sm text-slate-400">{tc("Total to pay:", "ጠቅላላ ለመክፈል:")}</span>
          <span className="text-xl font-black text-amber-400">{totalAmount.toLocaleString()} ETB</span>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handleChapaPay}
          disabled={loading || subscriptionStatus === "suspended"}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/20"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" />{tc("Connecting to Chapa...", "ወደ Chapa እየተያያዘ...")}</>
            : <><Zap className="w-4 h-4" />{tc("Pay with Chapa (Telebirr / CBE / Card)", "በChapa ይክፈሉ — Telebirr / CBE / ካርድ")}</>
          }
        </button>
        <p className="text-[10px] text-slate-600 text-center">
          {tc(
            "Secure payment powered by Chapa. Your subscription activates automatically after payment.",
            "ደህንነቱ በ Chapa የተጠበቀ ክፍያ። ክፍያ ከፈጸሙ በኋላ ደንበኝነቱ ወዲያው ይነቃል።"
          )}
        </p>

        {subscriptionStatus === "suspended" && (
          <div className="text-xs text-rose-400 text-center">
            {tc("Account suspended — contact support to restore access.", "መለያ ታግዷል — ለድጋፍ ያወሩ።")}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tc("How it works", "እንዴት ነው")}</div>
        <div className="space-y-2">
          {[
            [tc("Select your plan & months above", "ከላይ ፕላን እና ወር ይምረጡ"), "1"],
            [tc("Click 'Pay with Chapa' — redirected to secure checkout", "'በChapa ይክፈሉ' ጠቅ ያድርጉ — ወደ ደህንነቱ የተጠበቀ ክፍያ ይሄዳሉ"), "2"],
            [tc("Pay via Telebirr, CBE Birr, or bank card", "በቴሌቢር፣ CBE ብር ወይም ባንክ ካርድ ይክፈሉ"), "3"],
            [tc("Subscription auto-renews instantly — no admin needed", "ደንበኝነቱ ወዲያው ይታደሳል — ምንም አድሚን አያስፈልግም"), "4"],
          ].map(([label, step]) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </span>
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">
        {tc("Support · Aurarise Tech Solution PLC · 0996168990", "ድጋፍ · Aurarise Tech Solution PLC · 0996168990")}
      </p>
    </div>
  );
}

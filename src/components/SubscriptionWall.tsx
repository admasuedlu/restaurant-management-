import { useState } from "react";
import { AlertTriangle, Phone, CreditCard, Building2, RefreshCw, Clock, Zap } from "lucide-react";

const PLAN_OPTIONS = [
  { value: "starter",      label: "Starter",      price: 499  },
  { value: "professional", label: "Professional", price: 1499 },
  { value: "enterprise",   label: "Enterprise",   price: 3999 },
];

interface Props {
  tenantCode: string;
  businessName: string;
  plan: string;
  monthlyFee: number;
  daysOverdue: number;
  status: string; // "expired" | "suspended" | "grace"
  subscriptionEnd: string | null;
  graceEnds: string | null;
  isAmharic: boolean;
  onLogout: () => void;
}

export default function SubscriptionWall({
  tenantCode, businessName, plan, monthlyFee, daysOverdue,
  status, subscriptionEnd, graceEnds, isAmharic, onLogout,
}: Props) {
  const [notifying, setNotifying]     = useState(false);
  const [notified, setNotified]       = useState(false);
  const [payLoading, setPayLoading]   = useState(false);
  const [payError, setPayError]       = useState("");
  const [selectedPlan, setSelectedPlan] = useState(plan);
  const [months, setMonths]           = useState(1);
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const isGrace     = status === "grace";
  const isSuspended = status === "suspended";

  const handleNotify = async () => {
    setNotifying(true);
    await new Promise(r => setTimeout(r, 1500));
    setNotified(true);
    setNotifying(false);
  };

  const handleChapaPay = async () => {
    setPayLoading(true);
    setPayError("");
    try {
      const res = await fetch("/api/subscription/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: undefined, tenantCode: tenantCode, plan: selectedPlan, months }),
      });
      // We don't have tenantId on the frontend, so the backend resolves by tenantCode
      const data = await res.json();
      if (!res.ok) { setPayError(data.error ?? "Payment init failed"); return; }
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setPayError(e.message ?? "Network error");
    } finally {
      setPayLoading(false);
    }
  };

  const selectedPlanData = PLAN_OPTIONS.find(p => p.value === selectedPlan);
  const totalAmount = (selectedPlanData?.price ?? monthlyFee) * months;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Icon */}
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-2xl ${
          isSuspended ? "bg-rose-900/60 border-2 border-rose-500" : isGrace ? "bg-amber-900/60 border-2 border-amber-500" : "bg-rose-900/60 border-2 border-rose-500"
        }`}>
          {isSuspended
            ? <AlertTriangle className="w-10 h-10 text-rose-400" />
            : <Clock className={`w-10 h-10 ${isGrace ? "text-amber-400" : "text-rose-400"}`} />
          }
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className={`text-2xl font-black ${isGrace ? "text-amber-300" : "text-rose-300"}`}>
            {isSuspended
              ? tc("Account Suspended", "መለያ ታግዷል")
              : isGrace
              ? tc("Payment Overdue — Grace Period", "ክፍያ ዘግይቷል — የምህረት ጊዜ")
              : tc("Subscription Expired", "ደንበኝነት ጊዜ አልፎበታል")
            }
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            <span className="text-amber-400 font-bold">{businessName}</span>
            {" · "}
            <span className="font-mono text-slate-500">{tenantCode}</span>
          </p>
        </div>

        {/* Status card */}
        <div className={`rounded-2xl border p-5 space-y-3 ${
          isGrace ? "bg-amber-900/20 border-amber-500/40" : "bg-rose-900/20 border-rose-500/40"
        }`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">{tc("Plan", "ፕላን")}</div>
              <div className="font-bold text-slate-200 capitalize">{plan}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">{tc("Monthly Fee", "ወርሃዊ ክፍያ")}</div>
              <div className="font-bold text-slate-200">{monthlyFee.toLocaleString()} ETB</div>
            </div>
            {daysOverdue > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-0.5">{tc("Days Overdue", "ዘግይቶ ያለ ቀናት")}</div>
                <div className={`font-black text-lg ${isGrace ? "text-amber-400" : "text-rose-400"}`}>{daysOverdue}</div>
              </div>
            )}
            {isGrace && graceEnds && (
              <div>
                <div className="text-xs text-slate-500 mb-0.5">{tc("Grace Ends", "ምህረት ያበቃበት")}</div>
                <div className="font-bold text-amber-400 text-xs">
                  {new Date(graceEnds).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {isGrace && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
              {tc(
                `⚠ You have ${7 - daysOverdue} day(s) left before your account is fully blocked. Pay now to avoid interruption.`,
                `⚠ ${7 - daysOverdue} ቀን ቀርቷል — ካልከፈሉ ስርዓቱ ይቆማል። አሁን ይክፈሉ።`
              )}
            </div>
          )}
          {!isGrace && !isSuspended && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
              {tc(
                "Your subscription has expired. All operations are paused until payment is confirmed by admin.",
                "ደንበኝነቱ ጊዜ ቀሮ ክፍያ እስኪረጋገጥ ድረስ ሁሉም ስራ ቆሟል።"
              )}
            </div>
          )}
          {isSuspended && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
              {tc(
                "Your account has been suspended by the administrator. Contact support to restore access.",
                "መለያዎ በአድሚን ታግዷል። ለድጋፍ ያግኙን።"
              )}
            </div>
          )}
        </div>

        {/* Payment instructions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-bold text-slate-300">
            {tc("How to Pay", "እንዴት ይክፈሉ")}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
              <Phone className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-green-400">Telebirr</div>
                <div className="text-xs text-slate-300 font-mono">0912 345 678</div>
                <div className="text-xs text-slate-500">{tc("Send to this number", "ወደዚህ ቁጥር ይላኩ")}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-xl">
              <Building2 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-purple-400">CBE Birr</div>
                <div className="text-xs text-slate-300 font-mono">1000123456789</div>
                <div className="text-xs text-slate-500">{tc("Account name: Aura Hotel Solutions", "የሂሳብ ስም: Aura Hotel Solutions")}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <CreditCard className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-blue-400">{tc("Bank Transfer", "ባንክ ዝውውር")}</div>
                <div className="text-xs text-slate-300 font-mono">{tc("Contact admin for bank details", "ለባንክ ዝርዝር አድሚን ያግኙ")}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 border-t border-slate-800 pt-3">
            {tc(
              `After payment, mention your restaurant code: `,
              `ክፍያ ከፈጸሙ በኋላ ይህን ኮድ ይጠቅሱ: `
            )}
            <span className="font-mono font-bold text-amber-400">{tenantCode}</span>
          </div>
        </div>

        {/* Pay online with Chapa */}
        {!isSuspended && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300">{tc("Pay Online Now", "አሁን ይክፈሉ")}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">{tc("Plan", "ፕላን")}</label>
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  {PLAN_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label} — {p.price} ETB</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">{tc("Months", "ወራት")}</label>
                <select
                  value={months}
                  onChange={e => setMonths(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100"
                >
                  {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} mo.</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{tc("Total due:", "ጠቅላላ:")}</span>
              <span className="font-black text-amber-400 text-base">{totalAmount.toLocaleString()} ETB</span>
            </div>

            {payError && <p className="text-xs text-rose-400">{payError}</p>}

            <button
              onClick={handleChapaPay}
              disabled={payLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-slate-950 font-black text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {payLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> {tc("Connecting...", "እየተያያዘ...")}</>
                : <><Zap className="w-4 h-4" /> {tc("Pay with Chapa (Telebirr / CBE / Card)", "በChapa ይክፈሉ")}</>
              }
            </button>
            <p className="text-[10px] text-slate-600 text-center">
              {tc("Powered by Chapa · Telebirr · CBE Birr · Cards accepted", "Chapa · Telebirr · CBE Birr · ካርድ ተቀባይ")}
            </p>
          </div>
        )}

        {/* Manual payment + notify fallback */}
        {!isSuspended && (
          <button
            onClick={handleNotify}
            disabled={notifying || notified}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {notified
              ? <><span>✓</span> {tc("Admin Notified!", "አድሚን ተነግሯቸዋል!")}</>
              : notifying
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {tc("Notifying...", "እየነገረ ነው...")}</>
              : <>{tc("Already paid manually? Notify Admin →", "ቀደም ብለው ከፍለዋል? አድሚን ያሳውቁ →")}</>
            }
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-all cursor-pointer"
        >
          {tc("← Logout", "← ውጣ")}
        </button>

        <p className="text-center text-xs text-slate-700">
          {tc("Support: Aurarise Tech Solution PLC · 0996168990", "ድጋፍ: Aurarise Tech Solution PLC · 0996168990")}
        </p>
      </div>
    </div>
  );
}

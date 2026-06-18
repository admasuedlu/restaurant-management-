import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

interface Props {
  tenantCode?: string;
  isAmharic: boolean;
}

export default function PaymentSettings({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [paymentEnabled,  setPaymentEnabled]  = useState(false);
  const [chapaSecretKey,  setChapaSecretKey]  = useState("");
  const [chapaPublicKey,  setChapaPublicKey]  = useState("");
  const [maskedSecret,    setMaskedSecret]    = useState("");
  const [hasSecret,       setHasSecret]       = useState(false);
  const [showSecret,      setShowSecret]      = useState(false);
  const [testResult,      setTestResult]      = useState<"idle"|"testing"|"ok"|"fail">("idle");

  useEffect(() => { loadSettings(); }, [tenantCode]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/payment-settings", tenantCode);
      if (r.ok) {
        const d = await r.json();
        setPaymentEnabled(d.paymentEnabled);
        setChapaPublicKey(d.chapaPublicKey || "");
        setMaskedSecret(d.chapaSecretKeyMasked || "");
        setHasSecret(d.hasSecretKey);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const body: Record<string, any> = {
        paymentEnabled,
        chapaPublicKey,
      };
      // Only send secret if user typed a new one
      if (chapaSecretKey.trim()) body.chapaSecretKey = chapaSecretKey.trim();

      const r = await apiFetch("/api/payment-settings", tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setSaved(true);
        setChapaSecretKey("");   // clear the field after save
        await loadSettings();    // reload to show masked key
        setTimeout(() => setSaved(false), 4000);
      } else {
        alert(tc("Failed to save settings.", "ቅንብሮቹን ማስቀመጥ አልተቻለም።"));
      }
    } catch {
      alert(tc("Connection error.", "የግንኙነት ስህተት።"));
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6 animate-pulse space-y-3">
      {[1,2,3].map(n => <div key={n} className="h-10 bg-slate-800 rounded-xl" />)}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-xl">

      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-100">
          {tc("Customer Payment Settings", "የደንበኛ ክፍያ ቅንብሮች")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {tc(
            "Let customers pay via Telebirr, CBE Birr, or card by scanning the table QR code. Money goes directly to your Chapa account.",
            "ደንበኞች የጠረጴዛ QR ኮድ ቅኝት በማድረግ በቴሌቢር፣ CBE ብር ወይም ካርድ እንዲከፍሉ ፍቀድ። ገንዘቡ ቀጥታ ወደ ቻፓ መለያዎ ይሄዳል።"
          )}
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <div>
          <p className="font-bold text-slate-200">
            {tc("Enable QR Scan-to-Pay", "QR ቅኝት-ለ-ክፍያ አንቃ")}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {tc("Customers see a 'Pay Now' button after ordering", "ደንበኞች ካዘዙ በኋላ 'አሁን ክፈል' ቁልፍ ያያሉ")}
          </p>
        </div>
        <button
          onClick={() => setPaymentEnabled(!paymentEnabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${paymentEnabled ? "bg-amber-500" : "bg-slate-600"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${paymentEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Chapa key fields */}
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
          <p className="font-bold mb-1">📌 {tc("How to get your Chapa keys:", "የቻፓ ቁልፎቹን እንዴት ማግኘት ይቻላል:")}</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-400/80 text-xs">
            <li>{tc("Go to dashboard.chapa.co and sign up as a merchant", "dashboard.chapa.co ይሂዱ እና እንደ ነጋዴ ይመዝገቡ")}</li>
            <li>{tc("Verify your business (takes 1–2 days)", "ድርጅትዎን ያረጋግጡ (1–2 ቀናት ይወስዳል)")}</li>
            <li>{tc("Go to API Keys → copy Secret Key and Public Key", "ወደ API Keys ሂዱ → ሚስጥራዊ ቁልፍ እና ህዝባዊ ቁልፍ ይቅዱ")}</li>
            <li>{tc("Paste them below and click Save", "ከዚህ በታች ያስገቡ እና አስቀምጥ ጠቅ ያድርጉ")}</li>
          </ol>
        </div>

        {/* Secret Key */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {tc("Chapa Secret Key", "ቻፓ ሚስጥራዊ ቁልፍ")}
          </label>
          {hasSecret && !showSecret ? (
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-500 font-mono text-sm">
                {maskedSecret}
              </div>
              <button
                onClick={() => setShowSecret(true)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                {tc("Change", "ቀይር")}
              </button>
            </div>
          ) : (
            <input
              type="password"
              placeholder="CHLIVE_SK_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={chapaSecretKey}
              onChange={e => setChapaSecretKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 text-slate-200 rounded-xl px-4 py-3 font-mono text-sm outline-none transition-all"
            />
          )}
          <p className="text-[10px] text-slate-600 mt-1">
            {tc("Never shared. Stored encrypted. Used to charge customers.", "ጋር አይጋራም። ምስጠራ ተቀምጧል። ደንበኞችን ለማስከፈል ጥቅም ላይ ይውላል።")}
          </p>
        </div>

        {/* Public Key */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {tc("Chapa Public Key (optional)", "ቻፓ ህዝባዊ ቁልፍ (አማራጭ)")}
          </label>
          <input
            type="text"
            placeholder="CHLIVE_PK_xxxxxxxxxxxxxxxxxxxxxxxx"
            value={chapaPublicKey}
            onChange={e => setChapaPublicKey(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 text-slate-200 rounded-xl px-4 py-3 font-mono text-sm outline-none transition-all"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
          saved
            ? "bg-emerald-500 text-slate-950"
            : saving
            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
            : "bg-amber-500 hover:bg-amber-600 text-slate-950"
        }`}
      >
        {saved ? `✅ ${tc("Saved!", "ተቀምጧል!")}` : saving ? `${tc("Saving…", "እየተቀመጠ…")}` : tc("Save Payment Settings", "የክፍያ ቅንብሮቹን አስቀምጥ")}
      </button>

      {/* Status box */}
      <div className={`rounded-xl p-4 text-sm border ${
        paymentEnabled && hasSecret
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-slate-800 border-slate-700 text-slate-400"
      }`}>
        {paymentEnabled && hasSecret ? (
          <>
            <p className="font-bold">✅ {tc("QR payments are LIVE", "QR ክፍያዎች ቀጥታ ናቸው")}</p>
            <p className="text-xs mt-1 text-emerald-400/70">
              {tc(
                "Customers at your tables can pay via Telebirr, CBE Birr, or card. Money lands directly in your Chapa account.",
                "በጠረጴዛዎ ያሉ ደንበኞች በቴሌቢር፣ CBE ብር ወይም ካርድ መክፈል ይችላሉ። ገንዘቡ ቀጥታ ወደ ቻፓ መለያዎ ይገባል።"
              )}
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">⚪ {tc("QR payments are OFF", "QR ክፍያዎች ጠፍቷል")}</p>
            <p className="text-xs mt-1">
              {tc(
                !hasSecret
                  ? "Add your Chapa Secret Key and enable payments above."
                  : "Toggle the switch above to enable.",
                !hasSecret
                  ? "ቻፓ ሚስጥራዊ ቁልፍ ያስገቡ እና ከላይ ክፍያዎቹን ያንቁ።"
                  : "ከላይ ያለውን መቀያየሪያ ያብሩ።"
              )}
            </p>
          </>
        )}
      </div>

      {/* Per-tenant isolation note */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-400">🔒 {tc("Your money stays yours", "ገንዘብዎ የርሶ ሆኖ ይቆያል")}</p>
        <p>{tc("Every restaurant on this platform has completely separate Chapa keys. When your customers pay, the money goes directly into YOUR Chapa merchant account — not Aura Hotel Solutions, not any other restaurant.", "በዚህ መድረክ ላይ ያለ እያንዳንዱ ምግብ ቤት ሙሉ ለሙሉ የተለየ ቻፓ ቁልፎች አሉት። ደንበኞቻቸው ሲከፍሉ ገንዘቡ ቀጥታ ወደ ቻፓ ነጋዴ መለያዎ ይሄዳል — Aura Hotel Solutions አይደለም።")}</p>
      </div>
    </div>
  );
}

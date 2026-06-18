import React, { useState } from "react";
import { Building2, User, Phone, Mail, ArrowLeft, ArrowRight, Check, Globe, Lock, Eye, EyeOff, Coffee, UtensilsCrossed, Hotel, RefreshCw, ShieldCheck } from "lucide-react";

interface Props {
  isAmharic: boolean;
  setIsAmharic: (v: boolean) => void;
  onBack: () => void;
}

type BusinessSize = "small" | "medium" | "large";
type Step = "size" | "info" | "verify";

const SIZES: {
  id: BusinessSize;
  icon: React.ReactNode;
  label: string; labelAm: string;
  subtitle: string; subtitleAm: string;
  color: string; bg: string; border: string;
  features: string[]; featuresAm: string[];
  notIncluded: string[]; notIncludedAm: string[];
}[] = [
  {
    id: "small",
    icon: <Coffee className="w-7 h-7" />,
    label: "Small Café", labelAm: "ትንሽ ካፌ",
    subtitle: "1–5 tables or counter only", subtitleAm: "1–5 ጠረጴዛ ወይም ካውንተር ብቻ",
    color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/40",
    features: [
      "Counter orders (cashier does everything)",
      "Kitchen display + voice alarm",
      "Daily cash & payment report",
      "Expense tracking",
      "Basic sales dashboard",
    ],
    featuresAm: [
      "ካውንተር ትዕዛዝ (ካሽየር ሁሉን ይሠራል)",
      "ኩሽና ማሳያ + ድምፅ ማንቂያ",
      "ዕለታዊ ሪፖርት",
      "ወጪ ይዘግባል",
      "ቀለል ያለ ሽያጭ ሪፖርት",
    ],
    notIncluded: ["Separate waiter roles", "Reservations", "Loyalty program", "Suppliers", "Multi-branch"],
    notIncludedAm: ["ልዩ አስተናጋጅ ሚና", "ቦታ ማስያዝ", "ቋሚ ደንበኛ ፕሮግራም", "አቅራቢ", "ቅርንጫፍ"],
  },
  {
    id: "medium",
    icon: <UtensilsCrossed className="w-7 h-7" />,
    label: "Medium Restaurant", labelAm: "መካከለኛ ሬስቶራንት",
    subtitle: "5–20 tables, dedicated staff", subtitleAm: "5–20 ጠረጴዛ፣ ልዩ ሠራተኞች",
    color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/40",
    features: [
      "Separate waiter, cashier, kitchen & bar roles",
      "Waiter daily summary for cashier",
      "QR menu & customer ordering",
      "Reservations & customer loyalty",
      "Recipe cost & profit margins",
      "Feedback & ratings",
      "Full sales dashboard",
    ],
    featuresAm: [
      "ልዩ አስተናጋጅ፣ ካሽየር፣ ኩሽና፣ ባር",
      "ዕለታዊ አስተናጋጅ ሪፖርት",
      "QR ምናሌ",
      "ቦታ ማስያዝ እና ቋሚ ደንበኛ",
      "የምግብ ዋጋ እና ትርፍ",
      "አስተያየት",
      "ሙሉ ሽያጭ ሪፖርት",
    ],
    notIncluded: ["Supplier management", "Staff shift tracking", "Bar stock control", "Multi-branch"],
    notIncludedAm: ["አቅራቢ አስተዳደር", "የሠራተኛ ፈረቃ", "የባር ክምችት", "ቅርንጫፍ"],
  },
  {
    id: "large",
    icon: <Hotel className="w-7 h-7" />,
    label: "Large Hotel / Restaurant", labelAm: "ትልቅ ሆቴል / ሬስቶራንት",
    subtitle: "20+ tables, full operations", subtitleAm: "20+ ጠረጴዛ፣ ሙሉ ክወናዎች",
    color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/40",
    features: [
      "Everything in Medium, plus:",
      "Bar staff inventory control",
      "Supplier & purchase management",
      "Staff shift tracking & tips",
      "Multi-branch analytics",
      "Advanced owner dashboard",
    ],
    featuresAm: [
      "ሁሉም የMedium ባህሪያት እና:",
      "የባር ሠራተኛ ክምችት ቁጥጥር",
      "አቅራቢ እና ግዢ አስተዳደር",
      "የሠራተኛ ፈረቃ እና ጠቀሜታ",
      "የቅርንጫፍ ትንተና",
      "የባለቤት ሙሉ ዳሽቦርድ",
    ],
    notIncluded: [],
    notIncludedAm: [],
  },
];

const PLANS = [
  { value: "trial",        label: "Free Trial",   amLabel: "ነፃ ሙከራ",    price: "0 ETB",        color: "border-slate-600" },
  { value: "starter",      label: "Starter",      amLabel: "ስታርተር",      price: "499 ETB/mo",   color: "border-amber-500" },
  { value: "professional", label: "Professional", amLabel: "ፕሮፌሽናል",     price: "1,499 ETB/mo", color: "border-purple-500" },
  { value: "enterprise",   label: "Enterprise",   amLabel: "ኢንተርፕራይዝ",   price: "3,999 ETB/mo", color: "border-rose-500" },
];

export default function RegisterPage({ isAmharic, setIsAmharic, onBack }: Props) {
  const [step, setStep] = useState<Step>("size");
  const [selectedSize, setSelectedSize] = useState<BusinessSize | null>(null);

  const [form, setForm] = useState({
    businessName: "", ownerName: "", phone: "", email: "",
    password: "", confirmPassword: "", plan: "trial",
  });
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [done, setDone]                 = useState<{ code: string; name: string } | null>(null);
  const [error, setError]               = useState("");
  // Email verification
  const [otp, setOtp]                   = useState("");
  const [otpSending, setOtpSending]     = useState(false);
  const [otpSent, setOtpSent]           = useState(false);
  const [otpError, setOtpError]         = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const tc = (en: string, am: string) => isAmharic ? am : en;
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const sendOtp = async () => {
    if (!form.email.trim()) { setOtpError(tc("Enter your email first", "ኢሜልዎን ያስገቡ")); return; }
    setOtpSending(true); setOtpError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, businessName: form.businessName }),
      });
      const data = await res.json();
      if (res.ok) { setOtpSent(true); setStep("verify"); }
      else setOtpError(data.error || "Failed to send email");
    } catch { setOtpError(tc("Network error", "የኔትዎርክ ስህተት")); }
    finally { setOtpSending(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setOtpError(tc("Enter the 6-digit code", "6-አሃዝ ኮድ ያስገቡ")); return; }
    setSubmitting(true); setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (res.ok) { setEmailVerified(true); await submit(true); }
      else setOtpError(data.error || "Invalid code");
    } catch { setOtpError(tc("Network error", "የኔትዎርክ ስህተት")); }
    finally { setSubmitting(false); }
  };

  const submit = async (emailOk = false) => {
    if (!selectedSize) { setError(tc("Please select a business size", "ሥፋት ይምረጡ")); return; }
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.phone.trim() || !form.password.trim()) {
      setError(tc("Please fill all required fields *", "ሁሉንም * ሜዳዎች ይሙሉ")); return;
    }
    if (form.password.length < 6) {
      setError(tc("Password must be at least 6 characters", "የይለፍ ቃል ቢያንስ 6 ፊደሎች")); return;
    }
    if (form.password !== form.confirmPassword) {
      setError(tc("Passwords do not match", "የይለፍ ቃሎቹ አይዛመዱም")); return;
    }
    // If email provided and not yet verified, go to OTP step
    if (form.email.trim() && !emailOk) { await sendOtp(); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName, ownerName: form.ownerName,
          phone: form.phone, email: form.email, password: form.password,
          plan: form.plan, businessSize: selectedSize,
        }),
      });
      const data = await res.json();
      if (res.ok) setDone({ code: data.code, name: data.businessName });
      else setError(data.error || "Registration failed");
    } catch {
      setError(tc("Network error. Please try again.", "የኔትዎርክ ስህተት"));
    } finally { setSubmitting(false); }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <Check className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-100">{tc("Registration Submitted!", "ምዝገባ ተልኳል!")}</h2>
          <p className="text-sm text-slate-400 mt-2">
            {tc("Your request was sent to the admin. Once approved, login with your phone number and password.",
               "ጥያቄዎ ለሱፐር አድሚን ተልኳል። ሲፈቀድ በስልክ ቁጥርዎ ይግቡ።")}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {tc("Restaurant Code", "ሬስቶራንት ኮድ")}
          </p>
          <p className="text-2xl font-black text-amber-400 font-mono tracking-widest">{done.code}</p>
          <p className="text-xs text-slate-500">
            {tc("Your staff will use this code to login.", "ሠራተኞችዎ ይህን ኮድ ለግባ ይጠቀሙበታል።")}
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs text-amber-400 font-semibold">
            {tc("⏳ Admin will review and approve your account shortly.", "⏳ አድሚን ሲፈቅድ ስርዓቱን ይጠቀሙ።")}
          </p>
        </div>
        <button onClick={onBack} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer transition-all">
          {tc("← Back to Login", "← ወደ መግቢያ ተመለስ")}
        </button>
      </div>
    </div>
  );

  // ── STEP 1: Size picker ───────────────────────────────────────────────────────
  if (step === "size") return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-2xl shadow-2xl shadow-amber-500/30 mb-4">
            <span className="text-xl font-black text-slate-900">H</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100">
            {tc("What size is your business?", "የንግድ ቦታዎ ምን ያህል ትልቅ ነው?")}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {tc("We'll set up the right features for you — you can change later",
               "ለእርስዎ ተስማሚ ባህሪያት እናዘጋጃለን — በኋላ መቀየር ይቻላል")}
          </p>
        </div>

        {/* Three size cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {SIZES.map(size => (
            <button
              key={size.id}
              onClick={() => setSelectedSize(size.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedSize === size.id
                  ? `${size.border} ${size.bg} ring-2 ring-offset-2 ring-offset-slate-950 ${size.border.replace('border-', 'ring-')}`
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}
            >
              {/* Icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${size.bg} border ${size.border} flex items-center justify-center ${size.color}`}>
                  {size.icon}
                </div>
                <div>
                  <div className={`font-black text-base ${selectedSize === size.id ? size.color : 'text-slate-200'}`}>
                    {isAmharic ? size.labelAm : size.label}
                  </div>
                  <div className="text-xs text-slate-500">{isAmharic ? size.subtitleAm : size.subtitle}</div>
                </div>
              </div>

              {/* Included features */}
              <div className="space-y-1.5 mb-3">
                {(isAmharic ? size.featuresAm : size.features).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check className={`w-3.5 h-3.5 ${size.color} mt-0.5 shrink-0`} />
                    {f}
                  </div>
                ))}
              </div>

              {/* Not included */}
              {size.notIncluded.length > 0 && (
                <div className="border-t border-slate-800 pt-2 mt-2 space-y-1">
                  {(isAmharic ? size.notIncludedAm : size.notIncluded).slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="mt-0.5 shrink-0">✕</span>
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {selectedSize === size.id && (
                <div className={`mt-3 text-center text-xs font-black ${size.color}`}>
                  ✓ {tc("Selected", "ተመርጧል")}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {tc("Back", "ተመለስ")}
          </button>

          <button
            onClick={() => { if (selectedSize) setStep("info"); }}
            disabled={!selectedSize}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            {tc("Continue", "ቀጥል")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={() => setIsAmharic(!isAmharic)} className="text-xs text-slate-600 hover:text-slate-400 cursor-pointer">
            🌐 {isAmharic ? "English" : "አማርኛ"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2b: Email OTP verification ──────────────────────────────────────────
  if (step === "verify") return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-slate-100">{tc("Verify Your Email", "ኢሜልዎን ያረጋግጡ")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {tc("We sent a 6-digit code to", "ወደዚህ ኢሜል ኮድ ልከናል")}
            <span className="text-amber-400 font-bold ml-1">{form.email}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
            onKeyDown={e => e.key === "Enter" && verifyOtp()}
            placeholder="000000"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white font-mono text-3xl tracking-[0.6em] text-center placeholder-slate-700 focus:outline-none focus:border-emerald-500/50"
            autoFocus
          />
          {otpError && <p className="text-xs text-rose-400 font-semibold">{otpError}</p>}

          <button
            onClick={verifyOtp}
            disabled={submitting || otp.length < 6}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-sm py-3 rounded-xl cursor-pointer transition-all"
          >
            {submitting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> {tc("Verifying...", "እያረጋገጠ...")}</>
              : <><Check className="w-4 h-4" /> {tc("Verify & Complete Registration", "አረጋግጥ እና ምዝገባ ጨርስ")}</>
            }
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-slate-600">{tc("Didn't receive it?", "አልደረሰዎትም?")}</p>
          <button
            onClick={() => { setOtp(""); setOtpError(""); sendOtp(); }}
            disabled={otpSending}
            className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-2 cursor-pointer disabled:opacity-50"
          >
            {otpSending ? tc("Sending...", "እየላከ...") : tc("Resend code", "ኮዱን እንደገና ላክ")}
          </button>
        </div>

        <button onClick={() => { setStep("info"); setOtp(""); setOtpError(""); }} className="w-full text-xs text-slate-600 hover:text-slate-400 cursor-pointer py-1 text-center">
          ← {tc("Back", "ተመለስ")}
        </button>
      </div>
    </div>
  );

  // ── STEP 2: Business info form ────────────────────────────────────────────────
  const chosenSize = SIZES.find(s => s.id === selectedSize)!;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Selected size badge */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setStep("size")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> {tc("Change size", "ዓይነት ቀይር")}
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${chosenSize.bg} border ${chosenSize.border}`}>
            <span className={chosenSize.color}>{chosenSize.icon}</span>
            <span className={`text-xs font-bold ${chosenSize.color}`}>{isAmharic ? chosenSize.labelAm : chosenSize.label}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-2xl shadow-2xl shadow-amber-500/30 mb-3">
            <span className="text-xl font-black text-slate-900">H</span>
          </div>
          <h1 className="text-xl font-black text-slate-100">{tc("Register Your Restaurant", "ሬስቶራንት ይመዝገቡ")}</h1>
          <p className="text-xs text-slate-500 mt-1">{tc("All * fields are required", "ሁሉም * ሜዳዎች ያስፈልጋሉ")}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">

          {/* Restaurant name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <Building2 className="w-3 h-3" />
              {tc("Restaurant Name *", "የሬስቶራንት ስም *")}
            </label>
            <input type="text" value={form.businessName} onChange={e => set("businessName", e.target.value)}
              placeholder={tc("e.g. Aura Grand Hotel", "ኦራ ግራንድ ሆቴል")}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Owner name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <User className="w-3 h-3" />
              {tc("Owner Name *", "የባለቤት ስም *")}
            </label>
            <input type="text" value={form.ownerName} onChange={e => set("ownerName", e.target.value)}
              placeholder={tc("e.g. Kebede Alemu", "ስምዎን ያስገቡ")}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <Phone className="w-3 h-3" />
              {tc("Phone Number * (used to login)", "ስልክ ቁጥር * (ለመግቢያ ያገለግላል)")}
            </label>
            <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
              placeholder="+251911XXXXXX"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <Mail className="w-3 h-3" />
              {tc("Email (optional)", "ኢሜይል (አስፈላጊ አይደለም)")}
            </label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="info@restaurant.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <Lock className="w-3 h-3" />
              {tc("Password * (min 6 characters)", "የይለፍ ቃል * (ቢያንስ 6 ፊደሎች)")}
            </label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder={tc("Create a strong password", "የይለፍ ቃልዎን ይፍጠሩ")}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 pr-10" />
              <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
              <Lock className="w-3 h-3" />
              {tc("Confirm Password *", "የይለፍ ቃል አረጋግጥ *")}
            </label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                onChange={e => set("confirmPassword", e.target.value)}
                placeholder={tc("Re-enter your password", "የይለፍ ቃሉን እንደገና ያስገቡ")}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 pr-10" />
              <button onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">
              {tc("Subscription Plan", "የደንበኝነት ዕቅድ")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLANS.map(p => (
                <button key={p.value} type="button" onClick={() => set("plan", p.value)}
                  className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                    form.plan === p.value ? `${p.color} bg-amber-500/5` : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <p className="text-xs font-black text-slate-200">{isAmharic ? p.amLabel : p.label}</p>
                  <p className="text-[10px] font-mono font-bold text-amber-400 mt-1">{p.price}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              ⚠ {error}
            </p>
          )}

          <button onClick={submit} disabled={submitting}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {submitting
              ? <span className="animate-pulse">{tc("Submitting...", "በመላክ ላይ...")}</span>
              : tc("Submit Registration", "ምዝገባ ላክ")}
          </button>
        </div>
      </div>
    </div>
  );
}

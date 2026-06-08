import React, { useState, useEffect } from "react";
import {
  Delete, Globe, Building2, ArrowRight, Shield,
  Eye, EyeOff, Phone, Lock, Users, ChefHat, CreditCard,
  Wine, BarChart3, ArrowLeft,
} from "lucide-react";
import { AuthUser } from "../types";

interface PinLoginProps {
  onAuth: (user: AuthUser) => void;
  onRegister: () => void;
  onSuperAdmin: () => void;
  onBack?: () => void;
  isAmharic: boolean;
  setIsAmharic: (v: boolean) => void;
}

type Screen = "select" | "owner" | "staff-code" | "staff-pin";

interface RoleCard {
  id: string;
  label: string;
  labelAm: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  isOwner?: boolean;
}

// Staff-only role cards — Owner and Super Admin are NOT shown here for security
const ROLE_CARDS: RoleCard[] = [
  { id: "waiter",  label: "Waiter",   labelAm: "አስተናጋጅ",     icon: <Users className="w-6 h-6" />,      color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30"   },
  { id: "cashier", label: "Cashier",  labelAm: "ካሽየር",        icon: <CreditCard className="w-6 h-6" />, color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30"  },
  { id: "kitchen", label: "Kitchen",  labelAm: "ኩሽና",         icon: <ChefHat className="w-6 h-6" />,    color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  { id: "bar",     label: "Bar",      labelAm: "ቡና / ባር",     icon: <Wine className="w-6 h-6" />,       color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  { id: "manager", label: "Manager",  labelAm: "ሥራ አስኪያጅ",   icon: <BarChart3 className="w-6 h-6" />,  color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/30"   },
];

export default function PinLogin({ onAuth, onRegister, onSuperAdmin, onBack, isAmharic, setIsAmharic }: PinLoginProps) {
  const [screen, setScreen]       = useState<Screen>("select");
  const [selectedRole, setSelectedRole] = useState<RoleCard | null>(null);

  // Owner login state
  const [phone, setPhone]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Staff login state
  const [tenantCode, setTenantCode] = useState("");
  const [pin, setPin]             = useState("");
  const [codeError, setCodeError] = useState("");
  const [pinError, setPinError]   = useState(false);
  const [shake, setShake]         = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  // Super admin state
  const [showAdmin, setShowAdmin]   = useState(false);
  const [adminKey, setAdminKey]     = useState("");
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminStep, setAdminStep]   = useState<"key" | "otp">("key");
  const [adminOtp, setAdminOtp]     = useState("");
  const [adminOtpMsg, setAdminOtpMsg] = useState("");

  // Secret tap counter — triple-tap logo to reveal owner/admin access
  const [logoTaps, setLogoTaps]     = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const handleLogoTap = () => {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) { setShowSecret(true); setLogoTaps(0); }
    setTimeout(() => setLogoTaps(0), 2000); // reset after 2s inactivity
  };

  // Forgot code state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotResult, setForgotResult] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const tc = (en: string, am: string) => isAmharic ? am : en;

  const handleForgotCode = async () => {
    if (!forgotPhone.trim()) { setForgotError(tc("Phone number required", "ስልክ ቁጥር ያስፈልጋል")); return; }
    setForgotLoading(true); setForgotError(""); setForgotResult(null);
    try {
      const res = await fetch("/api/auth/lookup-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: forgotPhone.trim() }),
      });
      const data = await res.json();
      if (res.ok) setForgotResult(data.code);
      else setForgotError(tc("No account found with this phone number", "ይህ ስልክ ቁጥር አልተገኘም"));
    } catch { setForgotError(tc("Network error. Try again.", "የኔትዎርክ ስህተት")); }
    finally { setForgotLoading(false); }
  };

  const handleOwnerLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setOwnerError(tc("Phone and password are required", "ስልክ ቁጥርና የይለፍ ቃል ያስፈልጋሉ"));
      return;
    }
    setOwnerLoading(true); setOwnerError("");
    try {
      const res = await fetch("/api/auth/owner-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) onAuth(data);
      else if (res.status === 403) setOwnerError(isAmharic ? "መለያዎ ገና አልተፈቀደም። አድሚን ይጠብቁ።" : data.error);
      else setOwnerError(tc("Invalid phone or password", "ስልክ ቁጥር ወይም የይለፍ ቃል ትክክል አይደለም"));
    } catch { setOwnerError(tc("Network error. Try again.", "የኔትዎርክ ስህተት")); }
    finally { setOwnerLoading(false); }
  };

  const handleCodeSubmit = () => {
    const code = tenantCode.trim().toUpperCase();
    if (!code) { setCodeError(tc("Enter the restaurant code", "ኮድ ያስገቡ")); return; }
    setTenantCode(code); setCodeError("");
    setScreen("staff-pin");
  };

  const submitPin = async (fullPin: string) => {
    setStaffLoading(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-Code": tenantCode },
        body: JSON.stringify({ pin: fullPin }),
      });
      if (res.ok) onAuth(await res.json());
      else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) { setScreen("staff-code"); setCodeError(data.error || "Restaurant not found"); }
        else triggerPinError();
      }
    } catch { triggerPinError(); }
    finally { setStaffLoading(false); }
  };

  const triggerPinError = () => {
    setPinError(true); setShake(true);
    setTimeout(() => { setPin(""); setPinError(false); setShake(false); }, 900);
  };

  const handleDigit = (d: string) => {
    if (staffLoading || pin.length >= 4 || pinError) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) setTimeout(() => submitPin(next), 150);
  };

  const handleDelete = () => { if (!staffLoading && !pinError) setPin(p => p.slice(0, -1)); };

  // Step 1: verify key → send OTP
  const handleAdminKeySubmit = async () => {
    if (!adminKey.trim()) { setAdminError("Enter the admin key"); return; }
    setAdminLoading(true); setAdminError("");
    try {
      const res = await fetch("/api/admin/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminStep("otp");
        setAdminOtpMsg(data.message || "OTP sent to your email");
      } else {
        setAdminError(data.error || "Invalid admin key");
      }
    } catch { setAdminError("Network error"); }
    finally { setAdminLoading(false); }
  };

  // Step 2: verify OTP → grant access
  const handleAdminOtpSubmit = async () => {
    if (!adminOtp.trim()) { setAdminError("Enter the OTP code"); return; }
    setAdminLoading(true); setAdminError("");
    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: adminOtp }),
      });
      const data = await res.json();
      if (res.ok) onSuperAdmin();
      else setAdminError(data.error || "Invalid code");
    } catch { setAdminError("Network error"); }
    finally { setAdminLoading(false); }
  };

  const goBack = () => {
    if (screen === "staff-pin") { setScreen("staff-code"); setPin(""); setPinError(false); }
    else { setScreen("select"); setSelectedRole(null); setOwnerError(""); setCodeError(""); setPin(""); setTenantCode(""); setShowForgot(false); setForgotResult(null); setForgotError(""); setForgotPhone(""); }
  };

  // Keyboard handlers
  useEffect(() => {
    if (screen !== "staff-pin") return;
    const h = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      if (e.key === "Backspace") handleDelete();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pin, staffLoading, pinError, screen]);

  useEffect(() => {
    if (screen !== "staff-code") return;
    const h = (e: KeyboardEvent) => { if (e.key === "Enter") handleCodeSubmit(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [screen, tenantCode]);

  useEffect(() => {
    if (screen !== "owner") return;
    const h = (e: KeyboardEvent) => { if (e.key === "Enter") handleOwnerLogin(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phone, password, screen]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-7">
          <div
            onClick={handleLogoTap}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-2xl shadow-2xl shadow-amber-500/30 mb-4 cursor-pointer select-none"
          >
            <span className="text-2xl font-black text-slate-900">H</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            {tc("Habesha Restaurant OS", "ሀበሻ ሬስቶራንት OS")}
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">
            {tc("Cloud-based restaurant management", "የደመና ሬስቶራንት ስርዓት")}
          </p>
        </div>

        {/* ── SUPER ADMIN OVERLAY ── */}
        {showAdmin ? (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-200">Super Admin Access</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-4">
                {adminStep === "key" ? "Step 1 of 2 — Enter admin key" : "Step 2 of 2 — Enter OTP sent to your email"}
              </p>

              {adminStep === "key" ? (
                <>
                  <div className="relative">
                    <input
                      type={showAdminKey ? "text" : "password"}
                      value={adminKey}
                      onChange={e => { setAdminKey(e.target.value); setAdminError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleAdminKeySubmit()}
                      placeholder="Enter admin key"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 pr-10"
                      autoFocus
                    />
                    <button onClick={() => setShowAdminKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                      {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {adminError && <p className="mt-2 text-xs text-rose-400 font-semibold">{adminError}</p>}
                  <button
                    onClick={handleAdminKeySubmit}
                    disabled={adminLoading}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-3 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                  >
                    {adminLoading ? "Sending OTP..." : <><ArrowRight className="w-4 h-4" /> Send Verification Code</>}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl px-3 py-2 mb-3 text-xs text-emerald-400">
                    📧 {adminOtpMsg}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={adminOtp}
                    onChange={e => { setAdminOtp(e.target.value.replace(/\D/g, "")); setAdminError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleAdminOtpSubmit()}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-xl tracking-[0.5em] text-center placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    autoFocus
                  />
                  {adminError && <p className="mt-2 text-xs text-rose-400 font-semibold">{adminError}</p>}
                  <button
                    onClick={handleAdminOtpSubmit}
                    disabled={adminLoading || adminOtp.length < 6}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-3 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                  >
                    {adminLoading ? "Verifying..." : <><Shield className="w-4 h-4" /> Confirm & Login</>}
                  </button>
                  <button
                    onClick={() => { setAdminStep("key"); setAdminOtp(""); setAdminError(""); }}
                    className="mt-2 w-full text-xs text-slate-600 hover:text-slate-400 cursor-pointer py-1"
                  >
                    ← Resend / use different key
                  </button>
                </>
              )}
            </div>
            <button onClick={() => { setShowAdmin(false); setAdminStep("key"); setAdminOtp(""); setAdminKey(""); setAdminError(""); }} className="w-full text-xs text-slate-600 hover:text-slate-400 cursor-pointer py-2">
              ← Back
            </button>
          </div>

        ) : screen === "select" ? (
          /* ── ROLE SELECTION SCREEN ── */
          <>
            <div className="text-center mb-5">
              <p className="text-sm font-semibold text-slate-400">{tc("Who are you?", "እርስዎ ማን ናቸው?")}</p>
              <p className="text-xs text-slate-600 mt-0.5">{tc("Select your role to continue", "ሚናዎን ይምረጡ")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ROLE_CARDS.map(card => (
                <button
                  key={card.id}
                  onClick={() => {
                    setSelectedRole(card);
                    if (card.isOwner) setScreen("owner");
                    else setScreen("staff-code");
                  }}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border ${card.bg} ${card.border} hover:brightness-110 active:scale-95 transition-all cursor-pointer group`}
                >
                  <div className={`${card.color} group-hover:scale-110 transition-transform`}>
                    {card.icon}
                  </div>
                  <span className={`text-sm font-bold ${card.color}`}>
                    {isAmharic ? card.labelAm : card.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-600">
                {tc("New restaurant?", "አዲስ ሬስቶራንት?")}{" "}
                <button onClick={onRegister} className="text-amber-500 font-semibold cursor-pointer hover:text-amber-400">
                  {tc("Register here", "ይመዝገቡ")}
                </button>
              </p>
            </div>

            {/* Secret panel — only visible after 5 logo taps */}
            {showSecret && (
              <div className="mt-4 bg-slate-900/80 border border-amber-500/20 rounded-2xl p-4 space-y-2 animate-in fade-in">
                <p className="text-[10px] text-slate-500 text-center mb-3">
                  {tc("Restricted access", "የተከለከለ መዳረሻ")}
                </p>
                <button
                  onClick={() => { setShowSecret(false); setScreen("owner"); setSelectedRole({ id:"owner", label:"Owner / Manager", labelAm:"ባለቤት", icon: <Building2 className="w-6 h-6" />, color:"text-amber-400", bg:"bg-amber-500/10", border:"border-amber-500/30", isOwner:true }); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  {tc("Owner / Manager Login", "የባለቤት መግቢያ")}
                </button>
                <button
                  onClick={() => { setShowSecret(false); setShowAdmin(true); setAdminError(""); setAdminKey(""); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  Super Admin
                </button>
                <button onClick={() => setShowSecret(false)} className="w-full text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer pt-1">
                  {tc("Cancel", "ሰርዝ")}
                </button>
              </div>
            )}
          </>

        ) : screen === "owner" ? (
          /* ── OWNER LOGIN SCREEN ── */
          <div className="space-y-4">
            {/* Back + role badge */}
            <button onClick={goBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> {tc("Back", "ተመለስ")}
            </button>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">{tc("Owner Login", "የባለቤት መግቢያ")}</div>
                <div className="text-xs text-slate-500">{tc("Phone & password", "ስልክ እና የይለፍ ቃል")}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
                  <Phone className="w-3 h-3" />
                  {tc("Phone Number", "ስልክ ቁጥር")}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setOwnerError(""); }}
                  placeholder="+251911XXXXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
                  <Lock className="w-3 h-3" />
                  {tc("Password", "የይለፍ ቃል")}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setOwnerError(""); }}
                    placeholder={tc("Enter your password", "የይለፍ ቃልዎን ያስገቡ")}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 pr-10"
                  />
                  <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {ownerError && (
                <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  ⚠ {ownerError}
                </p>
              )}

              <button
                onClick={handleOwnerLogin}
                disabled={ownerLoading}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-3 rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-50 mt-2"
              >
                {ownerLoading
                  ? <span className="animate-pulse">{tc("Verifying...", "በማረጋገጥ ላይ...")}</span>
                  : <>{tc("Login", "ግባ")} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>

        ) : screen === "staff-code" ? (
          /* ── STAFF: RESTAURANT CODE SCREEN ── */
          <div className="space-y-4">
            <button onClick={goBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> {tc("Back", "ተመለስ")}
            </button>

            {selectedRole && (
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${selectedRole.bg} border ${selectedRole.border} rounded-xl flex items-center justify-center ${selectedRole.color}`}>
                  {React.cloneElement(selectedRole.icon as React.ReactElement, { className: "w-4 h-4" })}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200">
                    {isAmharic ? selectedRole.labelAm : selectedRole.label}
                  </div>
                  <div className="text-xs text-slate-500">{tc("Enter restaurant code", "የሬስቶራንት ኮድ ያስገቡ")}</div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <input
                type="text"
                value={tenantCode}
                onChange={e => { setTenantCode(e.target.value.toUpperCase()); setCodeError(""); }}
                placeholder={tc("Restaurant code (e.g. HABESHA)", "የሬስቶራንት ኮድ")}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 tracking-widest uppercase"
                autoFocus
              />
              {codeError && <p className="mt-2 text-xs text-rose-400 font-semibold">{codeError}</p>}
              <button
                onClick={handleCodeSubmit}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-3 rounded-xl cursor-pointer transition-all active:scale-95"
              >
                {tc("Continue", "ቀጥል")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Forgot Code */}
            <div className="text-center">
              <button
                onClick={() => { setShowForgot(!showForgot); setForgotResult(null); setForgotError(""); setForgotPhone(""); }}
                className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-2"
              >
                {tc("Forgot your code?", "ኮዱን ረሳሁ?")}
              </button>
            </div>

            {showForgot && (
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-semibold text-amber-400">
                  {tc("Enter your phone number to find your restaurant code", "ስልክ ቁጥርዎን ያስገቡ — ኮዱን እናሳይዎታለን")}
                </div>
                <input
                  type="tel"
                  value={forgotPhone}
                  onChange={e => { setForgotPhone(e.target.value); setForgotError(""); setForgotResult(null); }}
                  placeholder={tc("Phone number...", "ስልክ ቁጥር...")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                {forgotError && <p className="text-xs text-rose-400">{forgotError}</p>}
                {forgotResult && (
                  <div className="bg-green-900/30 border border-green-500/40 rounded-xl p-3 text-center space-y-1">
                    <div className="text-xs text-green-400">{tc("Your restaurant code is:", "የሬስቶራንት ኮድዎ፡")}</div>
                    <div className="text-2xl font-black font-mono text-amber-400 tracking-widest">{forgotResult}</div>
                    <button
                      onClick={() => { setTenantCode(forgotResult); setShowForgot(false); setForgotResult(null); }}
                      className="mt-1 text-xs bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-4 py-1.5 rounded-lg"
                    >
                      {tc("Use this code →", "ይህን ኮድ ተጠቀም →")}
                    </button>
                  </div>
                )}
                {!forgotResult && (
                  <button
                    onClick={handleForgotCode}
                    disabled={forgotLoading || !forgotPhone.trim()}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors"
                  >
                    {forgotLoading ? tc("Looking up...", "በመፈለግ ላይ...") : tc("Find My Code", "ኮዴን ፈልግ")}
                  </button>
                )}
              </div>
            )}

            <p className="text-center text-xs text-slate-600">
              {tc("Get the code from your restaurant owner", "ኮዱን ከሬስቶራንት ባለቤትዎ ያግኙ")}
            </p>
          </div>

        ) : (
          /* ── STAFF: PIN SCREEN ── */
          <div>
            <button onClick={goBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> {tc("Back", "ተመለስ")}
            </button>

            {/* Role + code badge */}
            <div className="flex items-center justify-between mb-5 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
              {selectedRole ? (
                <div className={`flex items-center gap-2 ${selectedRole.color}`}>
                  {React.cloneElement(selectedRole.icon as React.ReactElement, { className: "w-4 h-4" })}
                  <span className="text-xs font-bold">{isAmharic ? selectedRole.labelAm : selectedRole.label}</span>
                </div>
              ) : <div />}
              <span className="font-mono font-bold text-amber-400 text-xs tracking-widest">{tenantCode}</span>
            </div>

            <div className="text-center mb-6 text-xs font-semibold text-slate-400">
              {tc("Enter your 4-digit PIN", "4-አሃዝ ፒንዎን ያስገቡ")}
            </div>

            {/* PIN dots */}
            <div className={`flex justify-center gap-5 mb-8 ${shake ? "animate-pin-shake" : ""}`}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                  i < pin.length
                    ? pinError
                      ? "bg-rose-500 border-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                      : "bg-amber-400 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                    : "bg-transparent border-slate-700"
                }`} />
              ))}
            </div>

            <div className="h-5 mb-3 text-center">
              {pinError    && <p className="text-xs text-rose-400 font-semibold">{tc("Invalid PIN. Try again.", "ፒን ትክክል አይደለም")}</p>}
              {staffLoading && <p className="text-xs text-amber-400 animate-pulse">{tc("Verifying...", "በማረጋገጥ ላይ...")}</p>}
            </div>

            {/* Numpad */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button
                    key={n}
                    onClick={() => handleDigit(String(n))}
                    disabled={staffLoading || pin.length >= 4 || pinError}
                    className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 text-white text-xl font-bold transition-all cursor-pointer border border-slate-700 hover:border-amber-500/30 select-none"
                  >{n}</button>
                ))}
                <div />
                <button
                  onClick={() => handleDigit("0")}
                  disabled={staffLoading || pin.length >= 4 || pinError}
                  className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 text-white text-xl font-bold transition-all cursor-pointer border border-slate-700 hover:border-amber-500/30 select-none"
                >0</button>
                <button
                  onClick={handleDelete}
                  disabled={staffLoading || pinError}
                  className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-slate-700"
                ><Delete className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom — language toggle only. Owner/Admin access is hidden behind 5 logo taps. */}
        {!showAdmin && (
          <div className="mt-5 flex items-center justify-between">
            <div>
              {onBack && screen === "select" && (
                <button onClick={onBack} className="text-[10px] text-slate-700 hover:text-slate-400 cursor-pointer transition-colors">
                  ← {tc("Home", "መነሻ ገጽ")}
                </button>
              )}
            </div>
            <button
              onClick={() => setIsAmharic(!isAmharic)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              {isAmharic ? "English" : "አማርኛ"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

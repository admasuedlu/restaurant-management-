import React, { useState, useEffect, useRef } from "react";
import {
  ChefHat, Smartphone, BarChart3, Users, ShoppingCart, CreditCard,
  Wifi, WifiOff, Globe, Check, ArrowRight, Star, Zap, Shield,
  Clock, TrendingUp, Layers, Bell, Menu, X, ChevronDown,
  Utensils, Building2, Volume2, QrCode, Printer, Package,
} from "lucide-react";

interface Props {
  onLogin: () => void;
  onRegister: () => void;
  isAmharic: boolean;
  setIsAmharic: (v: boolean) => void;
}

const PLANS = [
  {
    name: "Free Trial",    amName: "ነፃ ሙከራ",
    price: "0",            period: "14 ቀን",
    desc: "Try everything free for 14 days. No credit card required.",
    amDesc: "ሁሉንም ለ14 ቀን ያለ ክፍያ ይሞክሩ።",
    color: "border-slate-700", badge: null,
    features: ["1 branch", "Up to 5 staff", "Full POS", "Menu management", "Order tracking"],
    amFeatures: ["1 ቅርንጫፍ", "እስከ 5 ሠራተኞች", "ሙሉ POS", "ሜኑ አስተዳደር", "ትዕዛዝ ክትትል"],
  },
  {
    name: "Starter",       amName: "ስታርተር",
    price: "499",          period: "ETB/mo",
    desc: "Perfect for small restaurants getting started.",
    amDesc: "ለትንሽ ሬስቶራንቶች ተስማሚ።",
    color: "border-amber-500", badge: null,
    features: ["1 branch", "Up to 15 staff", "Full POS", "Kitchen display", "Basic reports"],
    amFeatures: ["1 ቅርንጫፍ", "እስከ 15 ሠራተኞች", "ሙሉ POS", "የወጥ ቤት ማሳያ", "መሠረታዊ ሪፖርቶች"],
  },
  {
    name: "Professional",  amName: "ፕሮፌሽናል",
    price: "1,499",        period: "ETB/mo",
    desc: "For growing restaurants with multiple branches.",
    amDesc: "ለሚያድጉ ሬስቶራንቶች ከብዙ ቅርንጫፎች ጋር።",
    color: "border-purple-500", badge: "Most Popular",
    features: ["3 branches", "Up to 50 staff", "AI insights", "Advanced reports", "Priority support"],
    amFeatures: ["3 ቅርንጫፎች", "እስከ 50 ሠራተኞች", "AI ትንተና", "የላቁ ሪፖርቶች", "ቅድሚያ ድጋፍ"],
  },
  {
    name: "Enterprise",    amName: "ኢንተርፕራይዝ",
    price: "3,999",        period: "ETB/mo",
    desc: "Unlimited scale for restaurant chains and franchises.",
    amDesc: "ለሬስቶራንት ሰንሰለቶች ያልተወሰነ ስፋት።",
    color: "border-rose-500", badge: "Best Value",
    features: ["Unlimited branches", "Unlimited staff", "AI insights", "Custom reports", "Dedicated support"],
    amFeatures: ["ያልተወሰኑ ቅርንጫፎች", "ያልተወሰኑ ሠራተኞች", "AI ትንተና", "ብጁ ሪፖርቶች", "ዘዴ ድጋፍ"],
  },
];

const FEATURES = [
  { icon: ShoppingCart,  color: "text-amber-400",   bg: "bg-amber-500/10",   title: "Smart POS",          amTitle: "ብልህ POS",            desc: "Waiter takes orders on any device. Kitchen gets instant notification.",  amDesc: "አስተናጋጅ ትዕዛዝ ይወስዳሉ። ወጥ ቤት ወዲያው ያያሉ።" },
  { icon: ChefHat,       color: "text-rose-400",    bg: "bg-rose-500/10",    title: "Kitchen Display",    amTitle: "የወጥ ቤት ማሳያ",         desc: "Amharic voice announcements. Orders appear on kitchen screen in real-time.", amDesc: "በአማርኛ ድምጽ ማሳወቂያ። ትዕዛዞች ወዲያው ይታያሉ።" },
  { icon: CreditCard,    color: "text-emerald-400", bg: "bg-emerald-500/10", title: "Multi-Payment",      amTitle: "ብዙ ክፍያ ዘዴ",          desc: "Cash, Telebirr, CBE Birr, Card. ERCA 15% VAT receipts.",              amDesc: "ጥሬ ገንዘብ፣ Telebirr፣ CBE Birr፣ ካርድ። ERCA 영수증።" },
  { icon: BarChart3,     color: "text-blue-400",    bg: "bg-blue-500/10",    title: "Live Analytics",     amTitle: "ቀጥታ ትንተና",            desc: "Real-time revenue, staff performance, best-selling items.",           amDesc: "ቀጥታ ገቢ፣ የሠራተኛ አፈጻጸም፣ ምርጥ ዕቃዎች።" },
  { icon: Users,         color: "text-purple-400",  bg: "bg-purple-500/10",  title: "Staff Management",   amTitle: "ሠራተኛ አስተዳደር",         desc: "PIN-based login per role. Manager creates and manages all accounts.",  amDesc: "በሚና ፒን ግባ። ማናጀር ሁሉንም መለያዎች ያስተዳድሩ።" },
  { icon: Package,       color: "text-cyan-400",    bg: "bg-cyan-500/10",    title: "Inventory Control",  amTitle: "የዕቃ ቁጥጥር",            desc: "Track stock levels, get low-stock alerts, manage suppliers.",         amDesc: "የዕቃ ደረጃ ይከታተሉ፣ ማስጠንቀቂያ ያግኙ።" },
  { icon: WifiOff,       color: "text-slate-400",   bg: "bg-slate-700/50",   title: "Works Offline",      amTitle: "ያለ ኢንተርኔት ይሰራል",      desc: "Orders cached offline. Syncs automatically when connection returns.",  amDesc: "ትዕዛዞች ሳይቀዩ ይቀመጣሉ። ኔት ሲመጣ ይሰብሰባሉ።" },
  { icon: Building2,     color: "text-amber-400",   bg: "bg-amber-500/10",   title: "Multi-Branch",       amTitle: "ብዙ ቅርንጫፍ",            desc: "Manage all branches from one dashboard. Each branch isolated.",       amDesc: "ሁሉንም ቅርንጫፎች ከአንድ ቦታ ያስተዳድሩ።" },
  { icon: Volume2,       color: "text-rose-400",    bg: "bg-rose-500/10",    title: "Amharic Voice",      amTitle: "የአማርኛ ድምጽ",            desc: "Kitchen announces new orders in Amharic. Repeats every 5 seconds.",   amDesc: "ወጥ ቤት ትዕዛዞችን በአማርኛ ይናገራል። ሁሉም ጊዜ።" },
];

const STEPS = [
  { num: "01", title: "Register",      amTitle: "ይመዝገቡ",      desc: "Fill in your restaurant details and choose a plan.",          amDesc: "የሬስቶራንትዎን መረጃ ይሙሉ እና ዕቅድ ይምረጡ።",       icon: Building2 },
  { num: "02", title: "Get Approved",  amTitle: "ይፈቀዱ",       desc: "Admin reviews and activates your account within minutes.",    amDesc: "አድሚን ያረጋግጡ። ብዙም ሳይቆይ ይከፈታሉ።",            icon: Shield },
  { num: "03", title: "Add Your Data", amTitle: "ዳታ ያስገቡ",    desc: "Add your menu, create staff accounts and set up tables.",     amDesc: "ሜኑ ያክሉ፣ ሠራተኞች ይፍጠሩ፣ ጠረጴዛዎች ያዘጋጁ።",      icon: Layers },
  { num: "04", title: "Go Live",       amTitle: "ይጀምሩ",        desc: "Start taking orders. Kitchen and cashier see everything live.", amDesc: "ትዕዛዞች ይጀምሩ። ሁሉም ቀጥታ ያያሉ።",               icon: Zap },
];

export default function LandingPage({ onLogin, onRegister, isAmharic, setIsAmharic }: Props) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const t = (en: string, am: string) => isAmharic ? am : en;

  const FAQS = [
    { q: t("Do I need a credit card to start?", "ለመጀመር ክሬዲት ካርድ ያስፈልጋል?"), a: t("No! The free trial requires no payment. Just register and start immediately.", "አያስፈልግም! ነፃ ሙከራ ምንም ክፍያ አያስፈልግም። ይመዝገቡ እና ወዲያው ይጀምሩ።") },
    { q: t("Can I use it on a tablet or phone?", "ታብሌት ወይም ስልክ ላይ መጠቀም ይቻላል?"), a: t("Yes. Habesha OS runs on any browser — phone, tablet, or PC. No app install needed.", "አዎ። Habesha OS በማናቸውም ብሮውዘር ይሰራል — ስልክ፣ ታብሌት ወይም ኮምፒውተር።") },
    { q: t("What happens if the internet goes down?", "ኢንተርኔት ቢቋረጥ ምን ይሆናል?"), a: t("Orders are saved offline and sync automatically when the connection returns.", "ትዕዛዞች ሳይቀሩ ይቀመጣሉ። ኔት ሲመለስ ወዲያው ይሰብሰባሉ።") },
    { q: t("Can staff use it without seeing owner data?", "ሠራተኞች የባለቤቱን ዳታ ሳያዩ መጠቀም ይችላሉ?"), a: t("Yes. Each role (waiter, kitchen, cashier) only sees what they need. Owner controls everything.", "አዎ። እያንዳንዱ ሚና የሚፈልጉትን ብቻ ያያሉ። ባለቤቱ ሁሉን ይቆጣጠሩ።") },
    { q: t("Is the voice announcement in Amharic?", "ድምጽ ማሳወቂያ በአማርኛ ነው?"), a: t("Yes! The kitchen display announces new orders in Amharic every 5 seconds until the chef starts cooking.", "አዎ! ወጥ ቤት ትዕዛዞችን በአማርኛ ሼፉ እስኪጀምር ድረስ በ5 ሰከንድ ይናገራሉ።") },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-slate-950/95 backdrop-blur border-b border-slate-800/80 shadow-xl" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-sm font-black text-slate-900">H</span>
            </div>
            <span className="font-black text-sm text-slate-100">Habesha OS</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <button onClick={() => scrollTo("features")} className="hover:text-amber-400 transition-colors cursor-pointer">{t("Features", "ባህሪያት")}</button>
            <button onClick={() => scrollTo("how")} className="hover:text-amber-400 transition-colors cursor-pointer">{t("How it works", "እንዴት ይሰራል")}</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-amber-400 transition-colors cursor-pointer">{t("Pricing", "ዋጋ")}</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-amber-400 transition-colors cursor-pointer">FAQ</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsAmharic(!isAmharic)} className="hidden md:flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors px-2 py-1 rounded-lg">
              <Globe className="w-3.5 h-3.5" /> {isAmharic ? "EN" : "አማ"}
            </button>
            <button onClick={onLogin} className="hidden md:block text-sm text-slate-300 hover:text-white font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition-all cursor-pointer">
              {t("Login", "ግባ")}
            </button>
            <button onClick={onRegister} className="text-sm font-black bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20">
              {t("Get Started", "ይጀምሩ")}
            </button>
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-slate-400 cursor-pointer">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3">
            {[["features", t("Features","ባህሪያት")], ["how", t("How it works","እንዴት ይሰራል")], ["pricing", t("Pricing","ዋጋ")], ["faq","FAQ"]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left text-sm text-slate-400 hover:text-amber-400 py-1 cursor-pointer">{label}</button>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={onLogin} className="flex-1 py-2 text-sm font-bold bg-slate-800 rounded-xl cursor-pointer">{t("Login","ግባ")}</button>
              <button onClick={() => setIsAmharic(!isAmharic)} className="px-3 py-2 text-sm bg-slate-800 rounded-xl cursor-pointer"><Globe className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4 pt-16 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/4 rounded-full blur-3xl pointer-events-none" />

        {/* Floating badge */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-400">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {t("Now live — serving Ethiopian restaurants", "አሁን ቀጥታ — ለኢትዮጵያ ሬስቶራንቶች")}
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-8 py-20">
          {/* Logo big */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-3xl shadow-2xl shadow-amber-500/40 mx-auto">
            <Utensils className="w-9 h-9 text-slate-900" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-rose-400 bg-clip-text text-transparent">
                {t("The Restaurant OS", "ለሬስቶራንት")}
              </span>
              <br />
              <span className="text-slate-100">
                {t("Built for Ethiopia", "የተሰራ OS")}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {t(
                "POS, kitchen display, staff management, inventory and analytics — all in one cloud system. Runs on any device. Works offline. Voice in Amharic.",
                "POS፣ የወጥ ቤት ማሳያ፣ ሠራተኛ አስተዳደር፣ ዕቃ እና ትንተና — ሁሉም በአንድ ስርዓት። በማንኛውም መሳሪያ ይሰራል። ያለ ኔት ይሰራል። ድምጽ በአማርኛ።"
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onRegister}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base px-8 py-4 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-xl shadow-amber-500/30"
            >
              {t("Start Free Trial", "ነፃ ሙከራ ይጀምሩ")}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onLogin}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-base px-8 py-4 rounded-2xl cursor-pointer transition-all"
            >
              {t("Login to Dashboard", "ወደ ዳሽቦርድ ይግቡ")}
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-4">
            {[
              [Check, t("No credit card", "ክሬዲት ካርድ አያስፈልግም")],
              [Check, t("14-day free trial", "14 ቀን ነፃ ሙከራ")],
              [Check, t("Works offline", "ያለ ኔት ይሰራል")],
              [Check, t("Amharic support", "አማርኛ ድጋፍ")],
            ].map(([Icon, label], i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{label as string}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <button onClick={() => scrollTo("features")} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-600 hover:text-amber-400 transition-colors cursor-pointer animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </button>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "4",      label: t("Staff Roles",     "የሠራተኛ ሚናዎች") },
            { num: "15%",    label: t("ERCA VAT Ready",  "ERCA VAT ዝግጁ") },
            { num: "100%",   label: t("Works Offline",   "ያለ ኔት ይሰራል") },
            { num: "24/7",   label: t("Cloud Uptime",    "ደመናዊ ቀናት") },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-black text-amber-400">{s.num}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">{t("Everything you need", "የሚፈልጉት ሁሉ")}</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-100">{t("Built for the real kitchen floor", "ለእውነተኛ ወጥ ቤት የተሰራ")}</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">{t("Every feature was designed with Ethiopian restaurant workflows in mind.", "ሁሉም ባህሪ ለኢትዮጵያ ሬስቶራንት ሥራ ዘዴ ታሳቢ ተደርጎ ተሰርቷል።")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group">
                  <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-black text-slate-100 mb-1.5">{isAmharic ? f.amTitle : f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{isAmharic ? f.amDesc : f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-4 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">{t("Simple setup", "ቀላል ዝግጅት")}</p>
            <h2 className="text-3xl md:text-4xl font-black">{t("Up and running in minutes", "በደቂቃዎች ዝግጁ")}</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="relative text-center space-y-4">
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-6 left-[60%] w-full h-px border-t border-dashed border-slate-700" />
                  )}
                  <div className="relative inline-flex">
                    <div className="w-12 h-12 bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center">{s.num.slice(1)}</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-100">{isAmharic ? s.amTitle : s.title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{isAmharic ? s.amDesc : s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROLE BREAKDOWN ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">{t("Every role covered", "ሁሉም ሚና ተሸፍኗል")}</p>
            <h2 className="text-3xl md:text-4xl font-black">{t("One system, every staff member", "አንድ ስርዓት፣ ሁሉም ሠራተኛ")}</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { role: t("Owner / Manager","ባለቤት / ማናጀር"), icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20",
                perks: [t("Full dashboard access","ሙሉ ዳሽቦርድ"), t("Staff account management","የሠራተኛ አስተዳደር"), t("Revenue & reports","ገቢ እና ሪፖርቶች"), t("Menu management","ሜኑ አስተዳደር")] },
              { role: t("Waiter","አስተናጋጅ"), icon: ShoppingCart, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20",
                perks: [t("Take table orders","ጠረጴዛ ትዕዛዝ"), t("See ready orders","ዝግጁ ትዕዛዞች"), t("Daily earnings tracker","ዕለታዊ ገቢ"), t("Customer menu QR","ደንበኛ ሜኑ QR")] },
              { role: t("Kitchen / Bar","ወጥ ቤት / ባር"), icon: ChefHat, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
                perks: [t("Real-time order queue","ቀጥታ ትዕዛዝ"), t("Amharic voice alert","አማርኛ ድምጽ"), t("Mark orders ready","ዝግጁ ምልክት"), t("Category filter","ምድብ ማጣሪያ")] },
              { role: t("Cashier","ካሺየር"), icon: CreditCard, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20",
                perks: [t("Multi-payment checkout","ብዙ ክፍያ"), t("VAT receipt print","VAT 영수증"), t("Counter order entry","ካውንተር ትዕዛዝ"), t("Daily summary","ዕለታዊ ማጠቃለያ")] },
            ].map(r => {
              const Icon = r.icon;
              return (
                <div key={r.role} className={`bg-slate-900 border ${r.border} rounded-2xl p-6 space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${r.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${r.color}`} />
                    </div>
                    <h3 className="font-black text-slate-100">{r.role}</h3>
                  </div>
                  <ul className="space-y-2">
                    {r.perks.map(p => (
                      <li key={p} className="flex items-center gap-2 text-sm text-slate-400">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">{t("Simple pricing", "ቀላል ዋጋ")}</p>
            <h2 className="text-3xl md:text-4xl font-black">{t("Pay in Ethiopian Birr", "በኢትዮጵያ ብር ይክፈሉ")}</h2>
            <p className="text-slate-400 mt-3">{t("Start free. Upgrade when you're ready.", "ነፃ ይጀምሩ። ሲዘጋጁ ያሻሽሉ።")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(p => (
              <div key={p.name} className={`relative bg-slate-900 border-2 ${p.color} rounded-2xl p-6 flex flex-col ${p.badge ? "ring-2 ring-purple-500/30" : ""}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full whitespace-nowrap">
                    {p.badge}
                  </div>
                )}
                <div className="mb-4">
                  <p className="font-black text-slate-100">{isAmharic ? p.amName : p.name}</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-amber-400">{p.price}</span>
                    <span className="text-xs text-slate-500">{p.period}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{isAmharic ? p.amDesc : p.desc}</p>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {(isAmharic ? p.amFeatures : p.features).map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onRegister}
                  className={`w-full py-2.5 rounded-xl text-sm font-black cursor-pointer transition-all active:scale-95 ${p.badge ? "bg-purple-500 hover:bg-purple-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200"}`}
                >
                  {t("Get Started", "ይጀምሩ")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-black">{t("Common questions", "የተለመዱ ጥያቄዎች")}</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-200">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 ml-4 transition-transform ${activeFaq === i ? "rotate-180" : ""}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-3xl shadow-2xl shadow-amber-500/30 mx-auto">
            <Zap className="w-7 h-7 text-slate-900" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black">
            {t("Ready to modernize your restaurant?", "ሬስቶራንትዎን ዘመናዊ ለማድረግ ዝግጁ ናቸው?")}
          </h2>
          <p className="text-slate-400 text-lg">
            {t("Join restaurants already running on Habesha OS. Start your free 14-day trial today.", "ቀድሞ Habesha OS ሲጠቀሙ ካሉ ሬስቶራንቶች ጋር ይቀላቀሉ። ዛሬ ነፃ ሙከራ ይጀምሩ።")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onRegister}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base px-8 py-4 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-xl shadow-amber-500/30"
            >
              {t("Register Your Restaurant", "ሬስቶራንትዎን ይመዝገቡ")}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onLogin}
              className="flex items-center justify-center gap-2 border border-slate-700 hover:border-amber-500/40 text-slate-300 font-bold text-base px-8 py-4 rounded-2xl cursor-pointer transition-all"
            >
              {t("Already have an account?", "መለያ አለዎት? ይግቡ")}
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center">
                <span className="text-xs font-black text-slate-900">H</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-200">Habesha Restaurant OS</p>
                <p className="text-[10px] text-slate-600">{t("Cloud restaurant management for Ethiopia", "ለኢትዮጵያ ሬስቶራንቶች የደመና ስርዓት")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
              <button onClick={() => scrollTo("features")} className="hover:text-slate-400 cursor-pointer transition-colors">{t("Features","ባህሪያት")}</button>
              <button onClick={() => scrollTo("pricing")} className="hover:text-slate-400 cursor-pointer transition-colors">{t("Pricing","ዋጋ")}</button>
              <button onClick={() => scrollTo("faq")} className="hover:text-slate-400 cursor-pointer transition-colors">FAQ</button>
              <button onClick={onLogin} className="hover:text-slate-400 cursor-pointer transition-colors">{t("Login","ግባ")}</button>
              <button onClick={onRegister} className="text-amber-500 hover:text-amber-400 font-bold cursor-pointer transition-colors">{t("Register","ይመዝገቡ")}</button>
            </div>

            <p className="text-[10px] text-slate-700">
              © {new Date().getFullYear()} Habesha OS · {t("Made in Ethiopia","በኢትዮጵያ የተሰራ")} 🇪🇹
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

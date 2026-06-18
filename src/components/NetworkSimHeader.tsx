import React from "react";
import { Wifi, WifiOff, Globe, Gauge, ShieldAlert, Database, LogOut, ChefHat, ShoppingCart, CreditCard, TrendingUp, Users, Wine, Crown } from "lucide-react";
import { AuthUser } from "../types";

interface NetworkSimHeaderProps {
  isAmharic: boolean;
  setIsAmharic: (v: boolean) => void;
  isLowBandwidth: boolean;
  setIsLowBandwidth: (v: boolean) => void;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
  pendingSyncCount: number;
  triggerSync: () => void;
  authUser?: AuthUser | null;
  onLogout?: () => void;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  customer: <ShoppingCart className="w-3.5 h-3.5" />,
  waiter:   <Users className="w-3.5 h-3.5" />,
  kitchen:  <ChefHat className="w-3.5 h-3.5" />,
  bar:      <Wine className="w-3.5 h-3.5" />,
  cashier:  <CreditCard className="w-3.5 h-3.5" />,
  manager:  <TrendingUp className="w-3.5 h-3.5" />,
  owner:    <Crown className="w-3.5 h-3.5" />,
};

const ROLE_COLORS: Record<string, string> = {
  customer: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  waiter:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
  kitchen:  "text-rose-400 bg-rose-500/10 border-rose-500/20",
  bar:      "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  cashier:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  manager:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  owner:    "text-yellow-300 bg-yellow-400/10 border-yellow-400/20",
};

export default function NetworkSimHeader({
  isAmharic,
  setIsAmharic,
  isLowBandwidth,
  setIsLowBandwidth,
  isOnline,
  setIsOnline,
  pendingSyncCount,
  triggerSync,
  authUser,
  onLogout,
}: NetworkSimHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-xl sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-rose-600 p-2.5 rounded-xl text-slate-900 font-black shadow-lg shadow-orange-500/20">
            <span className="text-xl tracking-tight">A</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                {isAmharic ? "ኦራ ሆቴል ሶሉሽንስ" : "Aura Hotel Solutions"}
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                v2.1 Unified
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {isAmharic ? "የኢትዮጵያ ሬስቶራንቶች ሙሉ ኦፕሬቲንግ ሲስተም" : "Complete Operating System for Ethiopian Hospitality"}
            </p>
          </div>
        </div>

        {/* Network & Optimization Controls Panel */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 justify-center md:justify-end">
          {/* ERCA Compliance TIN */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono font-medium text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>TIN: 104593822 | ERCA Compliant</span>
          </div>

          {/* Offline/Online System Simulator */}
          <button
            onClick={() => {
              const nextVal = !isOnline;
              setIsOnline(nextVal);
              if (nextVal && pendingSyncCount > 0) {
                // Trigger auto sync
                setTimeout(() => triggerSync(), 800);
              }
            }}
            id="network-simulator-btn"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-300 ${
              isOnline
                ? "bg-slate-950 border-emerald-500/20 text-emerald-400 hover:bg-slate-900"
                : "bg-amber-950 border-amber-500/30 text-amber-500 hover:bg-amber-900 animate-pulse"
            }`}
            title={isAmharic ? "ለመቀያየር ይጫኑ" : "Toggle network offline simulator"}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>{isAmharic ? "ኢንተርኔት: ኦንላይን" : "Internet: Online"}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>{isAmharic ? "ከመስመር ውጭ (Local Sim)" : "Offline Mode (Local Cache)"}</span>
              </>
            )}
          </button>

          {/* Sync Trigger for local cached items */}
          {pendingSyncCount > 0 && (
            <button
              onClick={triggerSync}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] cursor-pointer shadow-lg shadow-amber-500/20 animate-bounce"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isAmharic ? `${pendingSyncCount} ትዕዛዝ አስምር` : `Sync ${pendingSyncCount} Orders`}</span>
            </button>
          )}

          {/* Low Bandwidth Mode Toggle */}
          <button
            onClick={() => setIsLowBandwidth(!isLowBandwidth)}
            id="bandwidth-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
              isLowBandwidth
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
            }`}
            title={isAmharic ? "የኢንተርኔት ፍጆታ ለመቆጠብ" : "Reduce network bandwidth/images"}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>
              {isAmharic
                ? isLowBandwidth
                  ? "ዝቅተኛ ባንድዊድዝ: በርቷል"
                  : "ባንድዊድዝ ቆጣቢ"
                : isLowBandwidth
                ? "Low Bandwidth: ON"
                : "Normal Band"}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setIsAmharic(!isAmharic)}
            id="language-btn"
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAmharic ? "English" : "አማርኛ"}</span>
          </button>

          {/* Logged-in user badge + logout */}
          {authUser && authUser.role !== 'customer' && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${ROLE_COLORS[authUser.role] ?? 'text-slate-300 bg-slate-950 border-slate-800'}`}>
                {ROLE_ICONS[authUser.role]}
                <span className="hidden sm:inline">{authUser.name}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  title={isAmharic ? "ውጣ" : "Sign out"}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAmharic ? "ውጣ" : "Sign Out"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

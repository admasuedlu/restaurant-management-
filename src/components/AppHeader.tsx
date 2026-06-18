import React from "react";
import { Globe, LogOut, ChefHat, ShoppingCart, CreditCard, TrendingUp, Users, Wine } from "lucide-react";
import { AuthUser } from "../types";
import { roleLabel } from "../lib/labels";
import { PLATFORM_NAME, PLATFORM_NAME_AM } from "../lib/branding";

interface AppHeaderProps {
  isAmharic: boolean;
  setIsAmharic: (v: boolean) => void;
  authUser: AuthUser;
  onLogout?: () => void;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  customer: <ShoppingCart className="w-3.5 h-3.5" />,
  waiter: <Users className="w-3.5 h-3.5" />,
  kitchen: <ChefHat className="w-3.5 h-3.5" />,
  bar: <Wine className="w-3.5 h-3.5" />,
  cashier: <CreditCard className="w-3.5 h-3.5" />,
  manager: <TrendingUp className="w-3.5 h-3.5" />,
};

const ROLE_COLORS: Record<string, string> = {
  customer: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  waiter: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  kitchen: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  bar: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  cashier: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  manager: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function AppHeader({
  isAmharic,
  setIsAmharic,
  authUser,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-gradient-to-tr from-amber-500 to-rose-600 p-2 rounded-xl text-slate-900 font-black shrink-0">
            <span className="text-lg">A</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-amber-200 truncate">
              {isAmharic ? PLATFORM_NAME_AM : PLATFORM_NAME}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              {isAmharic ? "የሆቴል እና ሬስቶራንት ስርዓት" : "Hotel & restaurant management"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${ROLE_COLORS[authUser.role] ?? "text-slate-300 bg-slate-950 border-slate-800"}`}
          >
            {ROLE_ICONS[authUser.role]}
            <span>{roleLabel(authUser.role, isAmharic)}</span>
          </div>

          <button
            onClick={() => setIsAmharic(!isAmharic)}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAmharic ? "EN" : "አማ"}</span>
          </button>

          {authUser.role !== "customer" && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              title={isAmharic ? "ውጣ" : "Sign out"}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAmharic ? "ውጣ" : "Out"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

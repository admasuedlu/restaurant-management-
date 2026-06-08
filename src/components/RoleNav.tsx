import React from "react";
import { ChefHat, ShoppingCart, CreditCard, TrendingUp, Users, Wine, Crown, Shield } from "lucide-react";
import { AuthUser, Branch, BranchId } from "../types";
import { AppTab, roleHint, roleLabel } from "../lib/labels";

interface RoleNavProps {
  isAmharic: boolean;
  authUser: AuthUser;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  allowedTabs: AppTab[];
  branches: Branch[];
  currentBranch: BranchId;
  setCurrentBranch: (id: BranchId) => void;
  waiterUnreadCount: number;
  kitchenPendingCount: number;
  barPendingCount: number;
  cashierUnpaidCount: number;
}

const TAB_ICONS: Record<AppTab, React.ReactNode> = {
  customer: <ShoppingCart className="w-3.5 h-3.5" />,
  waiter: <Users className="w-3.5 h-3.5" />,
  kitchen: <ChefHat className="w-3.5 h-3.5" />,
  bar: <Wine className="w-3.5 h-3.5" />,
  cashier: <CreditCard className="w-3.5 h-3.5" />,
  manager: <TrendingUp className="w-3.5 h-3.5" />,
  owner: <Crown className="w-3.5 h-3.5" />,
  superadmin: <Shield className="w-3.5 h-3.5" />,
};

function tabBadge(tab: AppTab, props: RoleNavProps): number | null {
  if (tab === "waiter" && props.waiterUnreadCount > 0) return props.waiterUnreadCount;
  if (tab === "kitchen" && props.kitchenPendingCount > 0) return props.kitchenPendingCount;
  if (tab === "bar" && props.barPendingCount > 0) return props.barPendingCount;
  if (tab === "cashier" && props.cashierUnpaidCount > 0) return props.cashierUnpaidCount;
  return null;
}

export default function RoleNav(props: RoleNavProps) {
  const {
    isAmharic,
    authUser,
    activeTab,
    setActiveTab,
    allowedTabs,
    branches,
    currentBranch,
    setCurrentBranch,
  } = props;

  const isManager = authUser.role === "manager" || authUser.role === "owner" || authUser.role === "superadmin";
  const showBranchPicker = isManager;

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 space-y-3">
        {/* Role guidance — one clear line */}
        <p className="text-xs text-slate-400 text-center sm:text-left">
          {roleHint(activeTab, isAmharic)}
        </p>

        {/* Manager: switch between all views. Others: stay on their role (waiter may switch to menu). */}
        {isManager ? (
          <div className="flex flex-wrap gap-2">
            {allowedTabs.map((tab) => {
              const badge = tabBadge(tab, props);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700"
                  }`}
                >
                  {TAB_ICONS[tab]}
                  <span>{roleLabel(tab, isAmharic)}</span>
                  {badge !== null && (
                    <span className="bg-rose-600 text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-200">
              {roleLabel(activeTab, isAmharic)}
            </span>
            {allowedTabs.length > 1 &&
              allowedTabs
                .filter((t) => t !== activeTab)
                .map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="text-xs text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline cursor-pointer"
                  >
                    {isAmharic ? `→ ${roleLabel(tab, isAmharic)}` : `Switch to ${roleLabel(tab, isAmharic)}`}
                  </button>
                ))}
          </div>
        )}

        {showBranchPicker && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-500 self-center mr-1">
              {isAmharic ? "ቅርንጫፍ:" : "Branch:"}
            </span>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setCurrentBranch(b.id)}
                className={`text-[11px] px-2 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                  currentBranch === b.id
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                {isAmharic ? b.ameName.split(" ")[0] : b.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Check, Clock, RefreshCw, Bell, TrendingUp, Utensils, DollarSign, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Order } from "../types";
import { resolveOrderStation } from "../lib/orderRouting";

interface WaiterViewProps {
  orders: Order[];
  isAmharic: boolean;
  waiterName: string;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  getElapsedMinutes: (iso: string) => number;
  onRefresh: () => void;
}

export default function WaiterView({
  orders,
  isAmharic,
  waiterName,
  updateOrderStatus,
  getElapsedMinutes,
  onRefresh,
}: WaiterViewProps) {
  const [filter, setFilter] = useState<"all" | "ready">("all");
  const [showHistory, setShowHistory] = useState(true);

  // ── Compute today's stats ──────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(
    (o) => o.creationTime && o.creationTime.slice(0, 10) === todayStr
  );

  const active = orders.filter(
    (o) => o.status === "Pending" || o.status === "Cooking" || o.status === "Ready"
  );
  const ready   = active.filter((o) => o.status === "Ready");
  const served  = todayOrders.filter((o) => o.status === "Served" || o.status === "Completed");
  const pending = active.filter((o) => o.status === "Pending" || o.status === "Cooking");

  // Money stats
  const totalRevenue   = todayOrders.reduce((s, o) => s + o.total, 0);
  const paidRevenue    = todayOrders.filter((o) => o.paymentStatus === "Paid").reduce((s, o) => s + o.total, 0);
  const unpaidRevenue  = todayOrders.filter((o) => o.paymentStatus === "Unpaid").reduce((s, o) => s + o.total, 0);

  // Item count
  const totalItemsServed = served.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  // Most ordered item today
  const itemCounts: Record<string, { name: string; ameName: string; count: number }> = {};
  todayOrders.forEach((o) =>
    o.items.forEach((i) => {
      const k = i.menuItem.id;
      if (!itemCounts[k]) itemCounts[k] = { name: i.menuItem.name, ameName: i.menuItem.ameName, count: 0 };
      itemCounts[k].count += i.quantity;
    })
  );
  const topItem = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0];

  // Average order value
  const avgOrderValue = served.length > 0
    ? Math.round(served.reduce((s, o) => s + o.total, 0) / served.length)
    : 0;

  const displayed = filter === "ready" ? ready : active;

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-100">
            {isAmharic ? "የእኔ ጠረጴዛዎች" : "My Tables"}
          </h2>
          <p className="text-xs text-slate-500">
            {isAmharic ? `ሰላም, ${waiterName}` : `Hi, ${waiterName}`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── READY ALERT BANNER ────────────────────────────────────────────── */}
      {ready.length > 0 && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-emerald-400">
              {isAmharic
                ? `${ready.length} ትዕዛዝ ዝግጁ ነው — ሂደው አምጡ!`
                : `${ready.length} order${ready.length > 1 ? "s" : ""} READY — go pick up!`}
            </p>
            <p className="text-xs text-emerald-600">
              {ready.map((o) => o.tableId).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
            filter === "all"
              ? "bg-amber-500 border-amber-500 text-slate-950"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          {isAmharic ? `ሁሉም (${active.length})` : `All (${active.length})`}
        </button>
        <button
          onClick={() => setFilter("ready")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer relative ${
            filter === "ready"
              ? "bg-emerald-500 border-emerald-500 text-slate-950"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          {isAmharic ? `ዝግጁ (${ready.length})` : `Ready (${ready.length})`}
          {ready.length > 0 && filter !== "ready" && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full text-[9px] text-white flex items-center justify-center font-black">
              {ready.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active order cards ────────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <div className="py-12 text-center">
          <Check className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">
            {isAmharic ? "ምንም ትዕዛዝ የለም" : "No orders right now"}
          </p>
          <p className="text-slate-700 text-xs mt-1">
            {isAmharic ? "ሁሉም ጠረጴዛዎች ጸዱ" : "All tables are clear"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((order) => {
            const mins = getElapsedMinutes(order.creationTime);
            const isReady = order.status === "Ready";
            const isLate  = mins > 20;

            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isReady
                    ? "bg-emerald-500/5 border-emerald-500/40"
                    : isLate
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                {/* Table + timer */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-100">{order.tableId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isReady ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                    }`}>
                      {isReady
                        ? isAmharic ? "✓ ዝግጁ" : "✓ Ready"
                        : isAmharic ? "⏳ በዝግጅት" : "⏳ Cooking"}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isLate ? "text-rose-400" : "text-slate-500"}`}>
                    {mins}m {isLate && "⚠"}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1.5 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-amber-400 flex-shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-sm font-semibold text-slate-200">
                        {isAmharic ? item.menuItem.ameName : item.menuItem.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action */}
                {isReady ? (
                  <button
                    onClick={() => updateOrderStatus(order.id, "Served")}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {isAmharic ? "ጠረጴዛ ላይ ሰጠሁ ✓" : "Served to table ✓"}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-slate-800/50 text-slate-600 font-semibold text-xs text-center">
                    {isAmharic ? "ሲዘጋጅ ይጠብቁ..." : "Waiting for kitchen/bar..."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DAILY PERFORMANCE SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">

        {/* Section header — toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-black text-slate-200">
              {isAmharic ? "የዛሬ ሪፖርት" : "Today's Performance"}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              {new Date().toLocaleDateString(isAmharic ? "am-ET" : "en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          {showHistory
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </button>

        {showHistory && (
          <div className="border-t border-slate-800">

            {/* ── Big 4 stat cards ── */}
            <div className="grid grid-cols-2 gap-px bg-slate-800">

              {/* Orders served */}
              <div className="bg-slate-900 px-5 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  <Utensils className="w-3 h-3" />
                  {isAmharic ? "ያቀረቡ ትዕዛዞች" : "Orders served"}
                </div>
                <span className="text-3xl font-black text-emerald-400">{served.length}</span>
                <span className="text-[10px] text-slate-600">
                  {pending.length > 0
                    ? isAmharic ? `+ ${pending.length} በዝግጅት` : `+ ${pending.length} in progress`
                    : isAmharic ? "ሁሉም ጸዱ ✓" : "all clear ✓"}
                </span>
              </div>

              {/* Total items */}
              <div className="bg-slate-900 px-5 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  <Check className="w-3 h-3" />
                  {isAmharic ? "ጠቅላላ ምርቶች" : "Items delivered"}
                </div>
                <span className="text-3xl font-black text-amber-400">{totalItemsServed}</span>
                <span className="text-[10px] text-slate-600">
                  {isAmharic ? "ዛሬ ያቀረቡ" : "portions today"}
                </span>
              </div>

              {/* Revenue handled */}
              <div className="bg-slate-900 px-5 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  <DollarSign className="w-3 h-3" />
                  {isAmharic ? "ጠቅላላ ሽያጭ" : "Total revenue"}
                </div>
                <span className="text-2xl font-black text-slate-100 font-mono">
                  {totalRevenue.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 font-mono">ETB</span>
              </div>

              {/* Avg order */}
              <div className="bg-slate-900 px-5 py-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  <Star className="w-3 h-3" />
                  {isAmharic ? "አማካይ ትዕዛዝ" : "Avg order value"}
                </div>
                <span className="text-2xl font-black text-purple-400 font-mono">
                  {avgOrderValue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">ETB</span>
              </div>
            </div>

            {/* ── Paid vs Unpaid bar ── */}
            {totalRevenue > 0 && (
              <div className="px-5 py-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>{isAmharic ? "የተከፈለ vs ያልተከፈለ" : "Paid vs Unpaid"}</span>
                  <span className={paidRevenue >= totalRevenue ? "text-emerald-400" : "text-amber-400"}>
                    {Math.round((paidRevenue / totalRevenue) * 100)}% {isAmharic ? "ተከፍሏል" : "collected"}
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${(paidRevenue / totalRevenue) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-500/40"
                    style={{ width: `${(unpaidRevenue / totalRevenue) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-emerald-500">{isAmharic ? "✓ ተከፍሏል: " : "✓ Paid: "}{paidRevenue.toLocaleString()} ETB</span>
                  <span className="text-amber-500/70">{isAmharic ? "⏳ ይጠበቃል: " : "⏳ Pending: "}{unpaidRevenue.toLocaleString()} ETB</span>
                </div>
              </div>
            )}

            {/* ── Top item today ── */}
            {topItem && (
              <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      {isAmharic ? "ዛሬ ብዙ የታዘዘ" : "Most ordered today"}
                    </p>
                    <p className="text-sm font-bold text-slate-200">
                      {isAmharic ? topItem.ameName : topItem.name}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-black text-amber-400">{topItem.count}×</span>
              </div>
            )}

            {/* ── Served order history list ── */}
            {served.length > 0 ? (
              <div className="border-t border-slate-800">
                <div className="px-5 pt-3 pb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600">
                    {isAmharic ? "ያቀረቡ ትዕዛዞች ዝርዝር" : "Served orders history"}
                  </p>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {served.slice().reverse().map((order) => {
                    const itemStr = order.items
                      .map((i) => `${i.quantity}× ${isAmharic ? i.menuItem.ameName : i.menuItem.name}`)
                      .join(", ");
                    const timeStr = new Date(order.creationTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div key={order.id} className="px-5 py-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="mt-0.5 w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-300">{order.tableId}</p>
                            <p className="text-[10px] text-slate-600 truncate">{itemStr}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-mono font-bold text-amber-400">
                            {order.total.toLocaleString()} <span className="text-[9px] text-slate-600">ETB</span>
                          </p>
                          <p className="text-[10px] text-slate-600">{timeStr}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-600">
                  {isAmharic ? "ዛሬ ምንም ያቀረቡ ትዕዛዝ የለም" : "No served orders yet today"}
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

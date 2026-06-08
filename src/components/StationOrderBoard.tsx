import React from "react";
import { ChefHat, Wine, Check, Clock } from "lucide-react";
import { Order, OrderStation } from "../types";
import { resolveOrderStation } from "../lib/orderRouting";

type KitchenFilter = "All" | "Grill" | "Fasting" | "Dessert";

interface StationOrderBoardProps {
  station: OrderStation;
  orders: Order[];
  isAmharic: boolean;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  getElapsedMinutes: (iso: string) => number;
  kitchenFilter?: KitchenFilter;
  setKitchenFilter?: (f: KitchenFilter) => void;
}

function matchesKitchenFilter(order: Order, filter: KitchenFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Grill") return order.items.some((i) => i.menuItem.category === "Meat");
  if (filter === "Fasting") return order.items.some((i) => i.menuItem.category === "Fasting");
  if (filter === "Dessert") return order.items.some((i) => i.menuItem.category === "Dessert");
  return true;
}

export default function StationOrderBoard({
  station,
  orders,
  isAmharic,
  updateOrderStatus,
  getElapsedMinutes,
  kitchenFilter = "All",
  setKitchenFilter,
}: StationOrderBoardProps) {
  const isBar = station === "bar";
  const stationOrders = orders.filter((o) => resolveOrderStation(o) === station);
  const active = stationOrders.filter((o) => o.status === "Pending" || o.status === "Cooking");
  const ready = stationOrders.filter((o) => o.status === "Ready");

  const title = isBar
    ? (isAmharic ? "የባር ትዕዛዞች" : "Bar orders")
    : (isAmharic ? "የወጥ ቤት ትዕዛዞች" : "Kitchen orders");

  const hint = isBar
    ? (isAmharic ? "መጠጦች → ዝግጁ → አስተናጋጅ" : "Drinks → Mark ready → Waiter serves")
    : (isAmharic ? "ምግብ → መብስል → ዝግጁ" : "Food → Start cooking → Mark ready");

  const startLabel = isBar
    ? (isAmharic ? "መጠጥ ጀምር" : "Start drink")
    : (isAmharic ? "መብስል ጀምር" : "Start cooking");

  const readyLabel = isBar
    ? (isAmharic ? "ዝግጁ — አስተናጋጅ ጥራ" : "Ready — call waiter")
    : (isAmharic ? "ዝግጁ — አስተናጋጅ ጥራ" : "Ready — call waiter");

  const Icon = isBar ? Wine : ChefHat;

  const filteredActive = active.filter((o) =>
    isBar ? true : matchesKitchenFilter(o, kitchenFilter)
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Icon className="w-5 h-5 text-amber-500" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>

        {!isBar && setKitchenFilter && (
          <div className="flex gap-2 text-xs">
            {(["All", "Grill", "Fasting", "Dessert"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setKitchenFilter(f)}
                className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer transition-all ${
                  kitchenFilter === f
                    ? "bg-amber-500 border-amber-500 text-slate-950"
                    : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                }`}
              >
                {isAmharic
                  ? f === "All" ? "ሁሉም" : f === "Grill" ? "ጥብስ" : f === "Fasting" ? "ፆም" : "ጣፋጭ"
                  : f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
            <h4 className="text-sm font-black uppercase text-rose-450 tracking-wider">
              {isAmharic ? "በመስራት ላይ" : "In progress"}
            </h4>
            <span className="text-xs font-mono text-slate-400">{filteredActive.length}</span>
          </div>

          {filteredActive.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-900/60 p-12 text-center rounded-2xl text-slate-600">
              <Check className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-semibold">
                {isAmharic ? "አዲስ ትዕዛዝ የለም" : "No pending tickets"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActive.map((order) => {
                const elapsedMins = getElapsedMinutes(order.creationTime);
                return (
                  <div key={order.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-md">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-400">{order.id}</span>
                        <span className="text-[11px] font-bold text-slate-300 font-mono ml-2">
                          {order.tableId}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">⏱ {elapsedMins}m</span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-slate-200">
                          {item.quantity}x {isAmharic ? item.menuItem.ameName : item.menuItem.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {order.status === "Pending" ? (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Cooking")}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2 rounded-xl cursor-pointer"
                        >
                          {startLabel}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Ready")}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2 rounded-xl cursor-pointer"
                        >
                          {readyLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <h4 className="text-sm font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {isAmharic ? "ዝግጁ" : "Ready"}
            </h4>
            <span className="text-xs font-mono text-slate-400">{ready.length}</span>
          </div>

          {ready.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-900/60 p-12 text-center rounded-2xl text-slate-650">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-xs">{isAmharic ? "ዝግጁ ትዕዛዝ የለም" : "Nothing ready yet"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ready.map((order) => (
                <div key={order.id} className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex justify-between mb-3">
                    <span className="font-mono text-xs font-black text-emerald-400">{order.id}</span>
                    <span className="text-xs text-slate-300">{order.tableId}</span>
                  </div>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="text-xs text-slate-300 mb-1">
                      {item.quantity}x {isAmharic ? item.menuItem.ameName : item.menuItem.name}
                    </div>
                  ))}
                  <button
                    onClick={() => updateOrderStatus(order.id, "Served")}
                    className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2 rounded-xl cursor-pointer"
                  >
                    {isAmharic ? "ተሰጥቷል" : "Served to table"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

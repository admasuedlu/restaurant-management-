import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Props {
  tenantCode: string;
  isAmharic: boolean;
}

interface SalesData {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  orderCount: number;
  paidOrders: number;
  unpaidOrders: number;
  taxCollected: number;
  topItems: { name: string; qty: number; revenue: number }[];
  hourly: { hour: number; orders: number; revenue: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  orderTypes: { type: string; count: number; revenue: number }[];
  waiterStats: { name: string; orders: number; revenue: number }[];
}

interface Compare {
  today: { revenue: number; orders: number };
  yesterday: { revenue: number; orders: number };
}

const PERIODS = [
  { key: "today",  en: "Today",     am: "ዛሬ" },
  { key: "week",   en: "This Week", am: "ይህ ሳምንት" },
  { key: "month",  en: "This Month",am: "ይህ ወር" },
  { key: "year",   en: "This Year", am: "ይህ ዓመት" },
];

function fmt(n: number) { return n.toLocaleString("en-ET", { maximumFractionDigits: 2 }); }

export default function SalesDashboard({ tenantCode, isAmharic }: Props) {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<SalesData | null>(null);
  const [compare, setCompare] = useState<Compare | null>(null);
  const [loading, setLoading] = useState(true);
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        apiFetch(`/api/analytics/sales?period=${period}`),
        apiFetch(`/api/analytics/compare`),
      ]);
      if (sRes.ok) setData(await sRes.json());
      if (cRes.ok) setCompare(await cRes.json());
    } finally { setLoading(false); }
  }, [tenantCode, period]);

  useEffect(() => { load(); }, [load]);

  const growthPct = compare
    ? compare.yesterday.revenue > 0
      ? (((compare.today.revenue - compare.yesterday.revenue) / compare.yesterday.revenue) * 100).toFixed(1)
      : compare.today.revenue > 0 ? "100" : "0"
    : "0";
  const growthUp = Number(growthPct) >= 0;

  const maxHourlyRevenue = Math.max(...(data?.hourly.map(h => h.revenue) || [1]), 1);

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-amber-400">
          {tc("Sales Dashboard", "የሽያጭ ዳሽቦርድ")}
        </h2>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.key ? "bg-amber-500 text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}>
              {tc(p.en, p.am)}
            </button>
          ))}
          <button onClick={load} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300">
            ↻ {tc("Refresh", "አድስ")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mr-3" />
          {tc("Loading...", "በመጫን ላይ...")}
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: tc("Total Revenue","ጠቅላላ ገቢ"), value: `${fmt(data.totalRevenue)} ETB`, color: "text-green-400", icon: "💰" },
              { label: tc("Net Profit","ትርፍ"), value: `${fmt(data.netProfit)} ETB`, color: data.netProfit >= 0 ? "text-green-400" : "text-red-400", icon: "📈" },
              { label: tc("Total Orders","ትዕዛዞች"), value: data.orderCount.toString(), color: "text-blue-400", icon: "🧾" },
              { label: tc("Tax Collected","ታክስ"), value: `${fmt(data.taxCollected)} ETB`, color: "text-purple-400", icon: "🏛️" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="text-2xl mb-1">{kpi.icon}</div>
                <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-gray-400 mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Today vs Yesterday */}
          {compare && period === "today" && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">{tc("vs Yesterday","ትናንት ጋር ሲነጻጸር")}</div>
                  <div className={`text-lg font-bold ${growthUp ? "text-green-400" : "text-red-400"}`}>
                    {growthUp ? "▲" : "▼"} {Math.abs(Number(growthPct))}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 text-right">
                  <div>
                    <div className="text-xs text-gray-400">{tc("Today","ዛሬ")}</div>
                    <div className="text-green-400 font-bold">{fmt(compare.today.revenue)} ETB</div>
                    <div className="text-xs text-gray-500">{compare.today.orders} {tc("orders","ትዕዛዞች")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{tc("Yesterday","ትናንት")}</div>
                    <div className="text-gray-300 font-bold">{fmt(compare.yesterday.revenue)} ETB</div>
                    <div className="text-xs text-gray-500">{compare.yesterday.orders} {tc("orders","ትዕዛዞች")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Hourly Chart */}
            {data.hourly.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-3">{tc("Hourly Revenue","በሰዓት ገቢ")}</h3>
                <div className="flex items-end gap-1 h-32">
                  {Array.from({ length: 24 }, (_, h) => {
                    const d = data.hourly.find(x => x.hour === h);
                    const pct = d ? (d.revenue / maxHourlyRevenue) * 100 : 0;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center group relative">
                        <div className="w-full bg-amber-500 rounded-t transition-all" style={{ height: `${pct}%`, minHeight: d ? 2 : 0 }} />
                        {d && (
                          <div className="absolute bottom-full mb-1 bg-gray-900 text-xs text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            {h}:00 — {fmt(d.revenue)} ETB
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
                </div>
              </div>
            )}

            {/* Top Items */}
            {data.topItems.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-3">{tc("Top Menu Items","ምርጥ ምግቦች")}</h3>
                <div className="space-y-2">
                  {data.topItems.slice(0,6).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold w-5 text-sm">{i+1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-200 truncate">{item.name}</span>
                          <span className="text-green-400 ml-2 shrink-0">{fmt(item.revenue)} ETB</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded mt-1">
                          <div className="h-full bg-amber-500 rounded" style={{ width: `${(item.qty / (data.topItems[0]?.qty||1)) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">×{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {data.paymentMethods.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-3">{tc("Payment Methods","የክፍያ ዘዴዎች")}</h3>
                <div className="space-y-2">
                  {data.paymentMethods.map((pm, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{pm.method || "Cash"}</span>
                      <div className="flex gap-4">
                        <span className="text-gray-400">{pm.count} {tc("orders","ትዕዛዞች")}</span>
                        <span className="text-amber-400 font-medium">{fmt(pm.amount)} ETB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiter Stats */}
            {data.waiterStats.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-3">{tc("Waiter Performance","የአስተናጋጅ አፈጻጸም")}</h3>
                <div className="space-y-2">
                  {data.waiterStats.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold">{w.name[0]}</span>
                      <span className="flex-1 text-gray-200">{w.name}</span>
                      <span className="text-gray-400">{w.orders} {tc("orders","ትዕዛዞች")}</span>
                      <span className="text-green-400 font-medium">{fmt(w.revenue)} ETB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Revenue vs Expenses */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold text-gray-200 mb-3">{tc("Financial Summary","የፋይናንስ ማጠቃለያ")}</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: tc("Revenue","ገቢ"), val: data.totalRevenue, color: "bg-green-500" },
                { label: tc("Expenses","ወጪ"), val: data.totalExpenses, color: "bg-red-500" },
                { label: tc("Net Profit","ትርፍ"), val: data.netProfit, color: data.netProfit >= 0 ? "bg-blue-500" : "bg-orange-500" },
              ].map(row => (
                <div key={row.label} className="text-center">
                  <div className={`text-lg font-bold text-white`}>{fmt(row.val)}</div>
                  <div className="text-xs text-gray-400 mt-1">{row.label}</div>
                  <div className={`h-1.5 rounded mt-2 ${row.color}`} style={{ width: "100%" }} />
                </div>
              ))}
            </div>
          </div>

          {data.totalRevenue === 0 && data.orderCount === 0 && (
            <div className="text-center text-gray-500 py-8">
              {tc("No paid orders in this period yet.", "በዚህ ጊዜ ውስጥ ምንም ክፍያ የተፈጸመ ትዕዛዝ የለም።")}
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">{tc("Failed to load data","ዳታ መጫን አልተቻለም")}</div>
      )}
    </div>
  );
}

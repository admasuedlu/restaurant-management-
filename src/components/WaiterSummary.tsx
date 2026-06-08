import { useState, useEffect, useCallback } from "react";

interface Props {
  tenantCode: string;
  isAmharic: boolean;
  orders: any[]; // live orders from parent — used for real-time totals
}

interface WaiterRow {
  name: string;
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  cashRevenue: number;
  telebirrRevenue: number;
  cbeRevenue: number;
  cardRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  pendingRevenue: number; // unpaid total
}

export default function WaiterSummary({ tenantCode, isAmharic, orders }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;

  // Build summary from live orders prop (today only)
  const today = new Date().toISOString().split("T")[0];

  const todayOrders = orders.filter(o => {
    const d = new Date(o.creationTime).toISOString().split("T")[0];
    return d === today;
  });

  // Build per-waiter rows
  const waiterMap: Record<string, WaiterRow> = {};

  for (const o of todayOrders) {
    const name = o.waiterName || "Counter";
    if (!waiterMap[name]) {
      waiterMap[name] = {
        name, totalOrders: 0, paidOrders: 0, unpaidOrders: 0,
        cashRevenue: 0, telebirrRevenue: 0, cbeRevenue: 0,
        cardRevenue: 0, otherRevenue: 0, totalRevenue: 0, pendingRevenue: 0,
      };
    }
    const w = waiterMap[name];
    w.totalOrders++;

    if (o.paymentStatus === "Paid") {
      w.paidOrders++;
      w.totalRevenue += Number(o.total);
      const m = (o.paymentMethod || "Cash").toLowerCase();
      if (m === "cash")           w.cashRevenue     += Number(o.total);
      else if (m === "telebirr")  w.telebirrRevenue += Number(o.total);
      else if (m.includes("cbe")) w.cbeRevenue      += Number(o.total);
      else if (m === "card")      w.cardRevenue     += Number(o.total);
      else                        w.otherRevenue    += Number(o.total);
    } else {
      w.unpaidOrders++;
      w.pendingRevenue += Number(o.total);
    }
  }

  const rows = Object.values(waiterMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const grandTotal     = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const grandCash      = rows.reduce((s, r) => s + r.cashRevenue, 0);
  const grandTelebirr  = rows.reduce((s, r) => s + r.telebirrRevenue, 0);
  const grandCBE       = rows.reduce((s, r) => s + r.cbeRevenue, 0);
  const grandCard      = rows.reduce((s, r) => s + r.cardRevenue, 0);
  const grandPending   = rows.reduce((s, r) => s + r.pendingRevenue, 0);
  const grandOrders    = rows.reduce((s, r) => s + r.totalOrders, 0);

  const fmt = (n: number) => n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (rows.length === 0) return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
      {tc("No orders today yet.", "ዛሬ ምንም ትዕዛዝ የለም።")}
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <div>
            <div className="font-bold text-slate-100 text-sm">{tc("Waiter Daily Summary", "የዕለቱ አስተናጋጅ ሪፖርት")}</div>
            <div className="text-xs text-slate-500">{tc("Today — all waiters", "ዛሬ — ሁሉም አስተናጋጆች")} · {new Date().toLocaleDateString()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{tc("Total Collected", "ጠቅላላ የተሰበሰበ")}</div>
          <div className="text-xl font-black text-amber-400">{fmt(grandTotal)} ETB</div>
        </div>
      </div>

      {/* Grand totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-slate-800">
        {[
          { label: tc("Cash","ጥሬ ገንዘብ"),     val: grandCash,     icon:"💵", color:"text-green-400" },
          { label: "Telebirr",                  val: grandTelebirr, icon:"📱", color:"text-blue-400"  },
          { label: "CBE Birr",                  val: grandCBE,      icon:"🏦", color:"text-purple-400"},
          { label: tc("Card","ካርድ"),           val: grandCard,     icon:"💳", color:"text-cyan-400"  },
          { label: tc("Unpaid","ያልተከፈለ"),    val: grandPending,  icon:"⏳", color:"text-red-400"   },
        ].map(col => (
          <div key={col.label} className="bg-slate-900/80 px-3 py-3 text-center">
            <div className="text-base">{col.icon}</div>
            <div className={`text-sm font-bold ${col.color}`}>{fmt(col.val)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{col.label}</div>
          </div>
        ))}
      </div>

      {/* Per-waiter table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40">
              <th className="text-left px-4 py-3 text-xs text-slate-400 font-semibold">{tc("Waiter","አስተናጋጅ")}</th>
              <th className="text-center px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Orders","ትዕዛዞች")}</th>
              <th className="text-center px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Paid","የተከፈለ")}</th>
              <th className="text-center px-3 py-3 text-xs text-slate-400 font-semibold">{tc("Unpaid","ያልተከፈለ")}</th>
              <th className="text-right px-3 py-3 text-xs text-green-400 font-semibold">💵 {tc("Cash","ጥሬ")}</th>
              <th className="text-right px-3 py-3 text-xs text-blue-400 font-semibold">📱 Telebirr</th>
              <th className="text-right px-3 py-3 text-xs text-purple-400 font-semibold">🏦 CBE</th>
              <th className="text-right px-3 py-3 text-xs text-red-400 font-semibold">⏳ {tc("Pending","ተጠባቂ")}</th>
              <th className="text-right px-4 py-3 text-xs text-amber-400 font-semibold">{tc("TOTAL","ጠቅላላ")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, i) => (
              <tr key={w.name} className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors ${i === 0 ? "bg-amber-900/10" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-amber-400 text-xs">🥇</span>}
                    {i === 1 && <span className="text-slate-400 text-xs">🥈</span>}
                    {i === 2 && <span className="text-amber-700 text-xs">🥉</span>}
                    <div className="w-7 h-7 bg-amber-900/40 text-amber-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {w.name[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-200">{w.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1 rounded-full">{w.totalOrders}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="bg-green-900/30 text-green-400 text-xs font-bold px-2 py-1 rounded-full">{w.paidOrders}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {w.unpaidOrders > 0
                    ? <span className="bg-red-900/30 text-red-400 text-xs font-bold px-2 py-1 rounded-full">{w.unpaidOrders}</span>
                    : <span className="text-slate-600 text-xs">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-green-400 font-medium text-xs">
                  {w.cashRevenue > 0 ? fmt(w.cashRevenue) : <span className="text-slate-700">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-blue-400 font-medium text-xs">
                  {w.telebirrRevenue > 0 ? fmt(w.telebirrRevenue) : <span className="text-slate-700">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-purple-400 font-medium text-xs">
                  {w.cbeRevenue > 0 ? fmt(w.cbeRevenue) : <span className="text-slate-700">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-red-400 font-medium text-xs">
                  {w.pendingRevenue > 0 ? fmt(w.pendingRevenue) : <span className="text-slate-700">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-amber-400 font-black">{fmt(w.totalRevenue)}</span>
                  <span className="text-xs text-slate-500 ml-1">ETB</span>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Grand total row */}
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-800/50">
              <td className="px-4 py-3 font-black text-slate-200 text-sm">{tc("TOTAL","ጠቅላላ")}</td>
              <td className="px-3 py-3 text-center font-bold text-slate-300">{grandOrders}</td>
              <td className="px-3 py-3 text-center font-bold text-green-400">{rows.reduce((s,r)=>s+r.paidOrders,0)}</td>
              <td className="px-3 py-3 text-center font-bold text-red-400">{rows.reduce((s,r)=>s+r.unpaidOrders,0)}</td>
              <td className="px-3 py-3 text-right font-bold text-green-400 text-xs">{grandCash > 0 ? fmt(grandCash) : "—"}</td>
              <td className="px-3 py-3 text-right font-bold text-blue-400 text-xs">{grandTelebirr > 0 ? fmt(grandTelebirr) : "—"}</td>
              <td className="px-3 py-3 text-right font-bold text-purple-400 text-xs">{grandCBE > 0 ? fmt(grandCBE) : "—"}</td>
              <td className="px-3 py-3 text-right font-bold text-red-400 text-xs">{grandPending > 0 ? fmt(grandPending) : "—"}</td>
              <td className="px-4 py-3 text-right font-black text-amber-400">{fmt(grandTotal)} ETB</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Print / Export */}
      <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {tc("Updates live as orders are paid", "ትዕዛዞች ሲከፈሉ ወዲያው ይዘምናል")}
        </div>
        <button
          onClick={() => {
            const w = window.open("", "_blank", "width=900,height=600");
            if (!w) return;
            const date = new Date().toLocaleDateString();
            w.document.write(`<html><head><title>Waiter Report ${date}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
              h2 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; }
              td { padding: 7px 8px; border: 1px solid #ddd; }
              tfoot td { font-weight: bold; background: #f9f9f9; }
              .right { text-align: right; }
              .center { text-align: center; }
            </style></head><body>
            <h2>Waiter Daily Summary — ${date}</h2>
            <p style="text-align:center; color:#666;">Generated at ${new Date().toLocaleTimeString()}</p>
            <table>
              <thead><tr>
                <th>Waiter</th><th class="center">Orders</th><th class="center">Paid</th><th class="center">Unpaid</th>
                <th class="right">Cash</th><th class="right">Telebirr</th><th class="right">CBE</th>
                <th class="right">Pending</th><th class="right">TOTAL</th>
              </tr></thead>
              <tbody>
                ${rows.map(r => `<tr>
                  <td>${r.name}</td>
                  <td class="center">${r.totalOrders}</td>
                  <td class="center">${r.paidOrders}</td>
                  <td class="center">${r.unpaidOrders}</td>
                  <td class="right">${r.cashRevenue > 0 ? fmt(r.cashRevenue) : '—'}</td>
                  <td class="right">${r.telebirrRevenue > 0 ? fmt(r.telebirrRevenue) : '—'}</td>
                  <td class="right">${r.cbeRevenue > 0 ? fmt(r.cbeRevenue) : '—'}</td>
                  <td class="right">${r.pendingRevenue > 0 ? fmt(r.pendingRevenue) : '—'}</td>
                  <td class="right"><strong>${fmt(r.totalRevenue)} ETB</strong></td>
                </tr>`).join('')}
              </tbody>
              <tfoot><tr>
                <td>TOTAL</td>
                <td class="center">${grandOrders}</td>
                <td class="center">${rows.reduce((s,r)=>s+r.paidOrders,0)}</td>
                <td class="center">${rows.reduce((s,r)=>s+r.unpaidOrders,0)}</td>
                <td class="right">${grandCash > 0 ? fmt(grandCash) : '—'}</td>
                <td class="right">${grandTelebirr > 0 ? fmt(grandTelebirr) : '—'}</td>
                <td class="right">${grandCBE > 0 ? fmt(grandCBE) : '—'}</td>
                <td class="right">${grandPending > 0 ? fmt(grandPending) : '—'}</td>
                <td class="right"><strong>${fmt(grandTotal)} ETB</strong></td>
              </tr></tfoot>
            </table>
            </body></html>`);
            w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
          }}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          🖨️ {tc("Print Report","ሪፖርት አትም")}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";

interface Props { tenantCode: string; isAmharic: boolean; }

interface Feedback {
  id: string; order_id: string; table_id: string; rating: number;
  comment: string; waiter_name: string; food_rating: number; service_rating: number; created_at: string;
}

interface Summary {
  avg_rating: string; avg_food: string; avg_service: string; total: string;
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="text-yellow-400">
      {"★".repeat(Math.round(rating))}{"☆".repeat(max - Math.round(rating))}
    </span>
  );
}

export default function FeedbackView({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/feedback", { headers: { "X-Tenant-Code": tenantCode } });
    if (r.ok) { const d = await r.json(); setFeedback(d.feedback); setSummary(d.summary); }
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { load(); }, [load]);

  const avg = summary ? Number(summary.avg_rating).toFixed(1) : "—";
  const total = summary ? Number(summary.total) : 0;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-amber-400">{tc("Customer Feedback","የደንበኞች አስተያየት")}</h2>
        <button onClick={load} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg text-sm">
          ↻ {tc("Refresh","አድስ")}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: tc("Overall Rating","አጠቃላይ ደረጃ"), val: avg, sub: `${total} ${tc("reviews","ግምገማዎች")}`, icon: "⭐" },
            { label: tc("Food Rating","የምግብ ደረጃ"), val: Number(summary.avg_food).toFixed(1) || "—", sub: tc("avg","አማካይ"), icon: "🍛" },
            { label: tc("Service Rating","የአገልግሎት ደረጃ"), val: Number(summary.avg_service).toFixed(1) || "—", sub: tc("avg","አማካይ"), icon: "🤝" },
            { label: tc("Total Reviews","ጠቅላላ ግምገማዎች"), val: total.toString(), sub: tc("responses","ምላሾች"), icon: "💬" },
          ].map(card => (
            <div key={card.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              <div className="text-2xl mb-1">{card.icon}</div>
              <div className="text-xl font-bold text-amber-400">{card.val}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
              <div className="text-xs text-gray-500">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* QR Share tip */}
      <div className="bg-gray-800 rounded-xl p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <div className="font-medium text-gray-200">{tc("Customer Feedback Link","የደንበኛ አስተያየት ሊንክ")}</div>
            <div className="text-sm text-gray-400 mt-1">
              {tc("Share this URL with customers or add it to your QR menu:","ይህን ሊንክ ለደንበኞቻቸው ያጋሩ ወይም ወደ QR ምናሌያቸው ይጨምሩ:")}
            </div>
            <div className="mt-2 bg-gray-700 rounded px-3 py-2 text-xs text-amber-400 font-mono break-all">
              {window.location.origin}/feedback/{tenantCode}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">{tc("Loading...","በመጫን ላይ...")}</div>
      ) : feedback.length === 0 ? (
        <div className="text-center text-gray-500 py-8">{tc("No feedback received yet.","ምንም አስተያየት አልተቀበለም።")}</div>
      ) : (
        <div className="space-y-3">
          {feedback.map(fb => (
            <div key={fb.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Stars rating={fb.rating} />
                  <span className="text-xs text-gray-500 ml-2">{new Date(fb.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400">
                  {fb.table_id && <span>🪑 {fb.table_id}</span>}
                  {fb.waiter_name && <span>👤 {fb.waiter_name}</span>}
                </div>
              </div>
              {fb.comment && (
                <p className="mt-2 text-sm text-gray-300 italic">"{fb.comment}"</p>
              )}
              {(fb.food_rating > 0 || fb.service_rating > 0) && (
                <div className="mt-2 flex gap-4 text-xs text-gray-400">
                  {fb.food_rating > 0 && <span>🍛 {tc("Food","ምግብ")}: <Stars rating={fb.food_rating} /></span>}
                  {fb.service_rating > 0 && <span>🤝 {tc("Service","አገልግሎት")}: <Stars rating={fb.service_rating} /></span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * KitchenView — Dead-simple screen for chefs.
 * Includes voice announcements for new pending orders.
 */
import React, { useState, useEffect, useRef } from "react";
import { ChefHat, Wine, Flame, Check, Clock, Volume2, VolumeX } from "lucide-react";
import { Order, OrderStation } from "../types";
import { resolveOrderStation } from "../lib/orderRouting";

interface KitchenViewProps {
  station: OrderStation;
  orders: Order[];
  isAmharic: boolean;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  getElapsedMinutes: (iso: string) => number;
}

const CATEGORY_FILTERS = ["All", "Grill", "Fasting", "Dessert"] as const;
type CatFilter = (typeof CATEGORY_FILTERS)[number];

function matchesCat(order: Order, f: CatFilter) {
  if (f === "All") return true;
  if (f === "Grill") return order.items.some((i) => i.menuItem.category === "Meat");
  if (f === "Fasting") return order.items.some((i) => i.menuItem.category === "Fasting");
  if (f === "Dessert") return order.items.some((i) => i.menuItem.category === "Dessert");
  return true;
}

// ─── Voice announcement helper ──────────────────────────────────────────────
// Active audio element — kept so we can cancel before replaying
let activeAudio: HTMLAudioElement | null = null;

// Play a loud beep using Web Audio API before speaking
function playReadyBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const play = (freq: number, start: number, dur: number, vol = 0.7) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur - 0.02);
      osc.start(start); osc.stop(start + dur);
    };
    const t = ctx.currentTime;
    // Three sharp beeps
    play(880, t,       0.15);
    play(880, t + 0.2, 0.15);
    play(1046, t + 0.4, 0.3);
  } catch { /* silent */ }
}

function speak(text: string) {
  // Cancel any currently playing announcement
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }

  // Use Google Translate TTS — free, supports Amharic perfectly
  // Split into chunks ≤ 180 chars to stay within the limit
  const chunks: string[] = [];
  const sentences = text.split("።");
  let current = "";
  for (const s of sentences) {
    const part = s.trim();
    if (!part) continue;
    if ((current + part).length > 180) {
      if (current) chunks.push(current.trim());
      current = part + "። ";
    } else {
      current += part + "። ";
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Play chunks sequentially
  let idx = 0;
  const playNext = () => {
    if (idx >= chunks.length) return;
    const url =
      `https://translate.googleapis.com/translate_tts` +
      `?ie=UTF-8&tl=am&client=gtx&q=${encodeURIComponent(chunks[idx])}`;
    const audio = new Audio(url);
    audio.volume = 1;
    activeAudio = audio;
    audio.onended = () => { idx++; playNext(); };
    audio.onerror  = () => { idx++; playNext(); }; // skip bad chunk
    audio.play().catch(() => {
      // Autoplay blocked — fall back to Web Speech API with English
      window.speechSynthesis?.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      utt.rate = 0.85;
      window.speechSynthesis?.speak(utt);
    });
  };
  playNext();
}

const AM_NUMS: Record<number, string> = {
  1: "አንድ", 2: "ሁለት", 3: "ሶስት", 4: "አራት", 5: "አምስት",
  6: "ስድስት", 7: "ሰባት", 8: "ስምንት", 9: "ዘጠኝ", 10: "አስር",
};

function buildAnnouncement(order: Order): string {
  const waiter = order.waiterName ? `አስተናጋጅ ${order.waiterName}።` : "";
  const tableNum = order.tableId.replace(/[^0-9]/g, "");
  const table = tableNum
    ? `ጠረጴዛ ቁጥር ${AM_NUMS[Number(tableNum)] ?? tableNum}።`
    : `${order.tableId}።`;
  const items = order.items
    .map((i) => `${AM_NUMS[i.quantity] ?? i.quantity} ${i.menuItem.ameName}`)
    .join("። ");
  return `አዲስ ትዕዛዝ። ${waiter} ${table} ${items}።`;
}


function buildReadyAnnouncement(order: Order, isAmharic: boolean): string {
  const tableNum = order.tableId.replace(/[^0-9]/g, "");
  if (isAmharic) {
    const table = tableNum
      ? `${AM_NUMS[Number(tableNum)] ?? tableNum}`
      : order.tableId;
    const items = order.items
      .map((i) => `${AM_NUMS[i.quantity] ?? i.quantity} ${i.menuItem.ameName}`)
      .join(" ");
    return `ORDER READY. Table ${table}. ${items}`;
  } else {
    const table = tableNum ? `Table ${tableNum}` : order.tableId;
    const items = order.items
      .map((i) => `${i.quantity} ${i.menuItem.name}`)
      .join(", ");
    return `Order ready! ${table}. ${items}. Please collect now!`;
  }
}

function speakReady(order: Order, isAmharic: boolean) {
  playReadyBeep();
  setTimeout(() => speak(buildReadyAnnouncement(order, isAmharic)), 800);
}
// ─── Main component ──────────────────────────────────────────────────────────
export default function KitchenView({
  station,
  orders,
  isAmharic,
  updateOrderStatus,
  getElapsedMinutes,
}: KitchenViewProps) {
  const [catFilter, setCatFilter] = useState<CatFilter>("All");
  const [voiceOn, setVoiceOn]     = useState<boolean>(true);

  // Track which order IDs have already been announced
  const announcedRef  = useRef<Set<string>>(new Set());
  // Interval handle for repeating announcements
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBar = station === "bar";

  // Orders routed to this station
  const mine = orders.filter((o) => resolveOrderStation(o) === station);

  // ── Voice: announce every new Pending order, repeat every 5 s ─────────────
  useEffect(() => {
    const pendingOrders = mine.filter((o) => o.status === "Pending");

    // Find orders not yet announced
    const toAnnounce = pendingOrders.filter((o) => !announcedRef.current.has(o.id));

    // Mark all pending orders as announced (so we don't re-fire on re-render)
    pendingOrders.forEach((o) => announcedRef.current.add(o.id));

    // Remove orders that are no longer pending from the announced set
    // so if somehow same ID comes back we re-announce (shouldn't normally happen)
    const pendingIds = new Set(pendingOrders.map((o) => o.id));
    const stale = [...announcedRef.current].filter((id) => {
      const order = orders.find((o) => o.id === id);
      return order && order.status !== "Pending";
    });
    stale.forEach((id) => announcedRef.current.delete(id));

    if (!voiceOn || toAnnounce.length === 0) return;

    // Immediately announce each new order, staggered by 1.5 s
    toAnnounce.forEach((order, i) => {
      const delay = i * 1500;
      const timer = setTimeout(() => {
        speak(buildAnnouncement(order));
      }, delay);
      // store timer so cleanup can clear it
      return timer;
    });
  }, [mine.map((o) => o.id + o.status).join(","), voiceOn, isAmharic]);

  // ── Repeat announcements every 5 s for still-pending orders ───────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!voiceOn) return;

    intervalRef.current = setInterval(() => {
      const stillPending = mine.filter((o) => o.status === "Pending");
      if (stillPending.length === 0) return;
      // Pick the oldest pending order to announce
      const oldest = stillPending.reduce((a, b) =>
        new Date(a.creationTime) < new Date(b.creationTime) ? a : b
      );
      speak(buildAnnouncement(oldest));
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mine.map((o) => o.id + o.status).join(","), voiceOn, isAmharic]);

  const newOrders = mine
    .filter((o) => o.status === "Pending")
    .filter((o) => (isBar ? true : matchesCat(o, catFilter)));

  const cooking = mine
    .filter((o) => o.status === "Cooking")
    .filter((o) => (isBar ? true : matchesCat(o, catFilter)));

  const readyOrders = mine.filter((o) => o.status === "Ready");

  const Icon = isBar ? Wine : ChefHat;
  const accentColor = isBar ? "cyan" : "amber";

  const accent = {
    amber: {
      bg: "bg-amber-500",
      text: "text-amber-400",
      border: "border-amber-500/40",
      light: "bg-amber-500/10",
    },
    cyan: {
      bg: "bg-cyan-500",
      text: "text-cyan-400",
      border: "border-cyan-500/40",
      light: "bg-cyan-500/10",
    },
  }[accentColor];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${accent.bg} flex items-center justify-center shadow-lg flex-shrink-0`}>
          <Icon className="w-5 h-5 text-slate-950" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-black text-slate-100">
            {isBar
              ? isAmharic ? "ባር ትዕዛዞች" : "Bar Orders"
              : isAmharic ? "ወጥ ቤት ትዕዛዞች" : "Kitchen Orders"}
          </h2>
          <p className="text-xs text-slate-500">
            {isAmharic
              ? `${newOrders.length} አዲስ · ${cooking.length} በዝግጅት · ${readyOrders.length} ዝግጁ`
              : `${newOrders.length} new · ${cooking.length} cooking · ${readyOrders.length} ready`}
          </p>
        </div>

        {/* Voice mute toggle */}
        <button
          onClick={() => {
            if (voiceOn) window.speechSynthesis?.cancel();
            setVoiceOn((v) => !v);
          }}
          title={voiceOn ? "Mute voice announcements" : "Enable voice announcements"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
            voiceOn
              ? "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
              : "bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300"
          }`}
        >
          {voiceOn
            ? <><Volume2 className="w-4 h-4" /><span className="hidden sm:inline">{isAmharic ? "ድምፅ" : "Voice"}</span></>
            : <><VolumeX className="w-4 h-4" /><span className="hidden sm:inline">{isAmharic ? "ጸጥ" : "Muted"}</span></>
          }
        </button>
      </div>

      {/* ── Voice status pill (only when pending orders exist) ─────────── */}
      {voiceOn && newOrders.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
          <p className="text-xs text-amber-400 font-semibold">
            {isAmharic
              ? `🔊 ${newOrders.length} ትዕዛዝ በድምፅ እያወጀ ነው — በ5 ሰከንድ ይደጋገማል`
              : `🔊 Announcing ${newOrders.length} new order${newOrders.length > 1 ? "s" : ""} — repeating every 5 seconds`}
          </p>
        </div>
      )}

      {/* ── Category filter (kitchen only) ─────────────────────────────── */}
      {!isBar && (
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setCatFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                catFilter === f
                  ? "bg-amber-500 border-amber-500 text-slate-950"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              {isAmharic
                ? f === "All" ? "ሁሉም" : f === "Grill" ? "ጥብስ" : f === "Fasting" ? "ፆም" : "ጣፋጭ"
                : f}
            </button>
          ))}
        </div>
      )}

      {/* ── Two-column order board ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* LEFT — New / Cooking */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-400">
              {isAmharic ? "አዲስ ትዕዛዝ" : "New orders"}
            </h3>
            {newOrders.length > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {newOrders.length}
              </span>
            )}
          </div>

          {newOrders.length === 0 && cooking.length === 0 ? (
            <div className="py-10 text-center">
              <Check className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-semibold">
                {isAmharic ? "ምንም አዲስ ትዕዛዝ የለም" : "No new orders"}
              </p>
            </div>
          ) : (
            <>
              {newOrders.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  isAmharic={isAmharic}
                  elapsed={getElapsedMinutes(order.creationTime)}
                  phase="new"
                  onAction={() => updateOrderStatus(order.id, "Cooking")}
                  accentClass={accent.text}
                />
              ))}

              {cooking.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  isAmharic={isAmharic}
                  elapsed={getElapsedMinutes(order.creationTime)}
                  phase="cooking"
                  onAction={() => { speakReady(order, isAmharic); updateOrderStatus(order.id, "Ready"); }}
                  accentClass={accent.text}
                />
              ))}
            </>
          )}
        </div>

        {/* RIGHT — Ready */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {isAmharic ? "ዝግጁ — አስተናጋጅ ጥራ" : "Ready — call waiter"}
            </h3>
            {readyOrders.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {readyOrders.length}
              </span>
            )}
          </div>

          {readyOrders.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600">
                {isAmharic ? "ዝግጁ ትዕዛዝ የለም" : "Nothing ready yet"}
              </p>
            </div>
          ) : (
            <>
              {/* Flashing alarm banner */}
              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-500/10 px-4 py-3 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <div>
                    <div className="text-sm font-black text-emerald-300">
                      {isAmharic ? "ምግብ ዝግጁ ነው!" : "FOOD READY!"}
                    </div>
                    <div className="text-xs text-emerald-500">
                      {readyOrders.length} {isAmharic ? "ትዕዛዝ ተዘጋጅቷል" : "order(s) waiting for pickup"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => readyOrders.forEach((o, i) => setTimeout(() => speakReady(o, isAmharic), i * 2500))}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  🔊 {isAmharic ? "ድምፅ ደግም" : "Repeat Alarm"}
                </button>
              </div>

              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/5 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-emerald-400 text-base">{order.tableId}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakReady(order, isAmharic)}
                        title={isAmharic ? "ድምፅ ደግም" : "Repeat alarm"}
                        className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-700/50 text-emerald-400 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-slate-500">
                        {getElapsedMinutes(order.creationTime)}m
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-black text-center flex items-center justify-center text-[10px] flex-shrink-0">
                          {item.quantity}
                        </span>
                        {isAmharic ? item.menuItem.ameName : item.menuItem.name}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-[10px] text-emerald-500 font-semibold">
                      {isAmharic ? "🔔 ካሽየር/አስተናጋጅ ማስጠንቀቂያ ተልኳል" : "🔔 Cashier & waiter alerted"}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Single ticket card ─────────────────────────────────────────────────── */
interface TicketProps {
  key?: string;
  order: Order;
  isAmharic: boolean;
  elapsed: number;
  phase: "new" | "cooking";
  onAction: () => void;
  accentClass: string;
}

function OrderTicket({ order, isAmharic, elapsed, phase, onAction, accentClass }: TicketProps) {
  const isLate = elapsed > 15;
  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        phase === "cooking"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      {/* Table + timer */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-slate-100">{order.tableId}</span>
          {phase === "cooking" && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" />
              {isAmharic ? "በዝግጅት" : "Cooking"}
            </span>
          )}
        </div>
        <span className={`text-xs font-mono font-bold ${isLate ? "text-rose-400" : "text-slate-500"}`}>
          {elapsed}m {isLate ? "⚠" : ""}
        </span>
      </div>

      {/* Items — large, readable */}
      <div className="space-y-1.5 mb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black ${accentClass} flex-shrink-0`}>
              {item.quantity}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              {isAmharic ? item.menuItem.ameName : item.menuItem.name}
            </span>
          </div>
        ))}
      </div>

      {/* Big single action button */}
      <button
        onClick={onAction}
        className={`w-full py-3 rounded-xl font-black text-sm cursor-pointer transition-all active:scale-95 ${
          phase === "new"
            ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
            : "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
        }`}
      >
        {phase === "new"
          ? isAmharic ? "🔥 መብሰል ጀምር" : "🔥 Start cooking"
          : isAmharic ? "✓ ዝግጁ — አስተናጋጅ ጥራ" : "✓ Ready — call waiter"}
      </button>
    </div>
  );
}

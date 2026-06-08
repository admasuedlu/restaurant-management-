import React, { useState } from "react";
import { Wifi, WifiOff, Gauge, ShieldAlert, Settings2 } from "lucide-react";

interface DevToolsPanelProps {
  isAmharic: boolean;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
  isLowBandwidth: boolean;
  setIsLowBandwidth: (v: boolean) => void;
  pendingSyncCount: number;
  triggerSync: () => void;
}

export default function DevToolsPanel({
  isAmharic,
  isOnline,
  setIsOnline,
  isLowBandwidth,
  setIsLowBandwidth,
  pendingSyncCount,
  triggerSync,
}: DevToolsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer transition-colors"
      >
        <Settings2 className="w-3 h-3" />
        <span>{isAmharic ? "የሙከራ መቆጣጠሪያ (Manager)" : "Demo settings (Manager)"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-wrap gap-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            onClick={() => {
              const next = !isOnline;
              setIsOnline(next);
              if (next && pendingSyncCount > 0) {
                setTimeout(() => triggerSync(), 800);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
              isOnline
                ? "border-emerald-500/20 text-emerald-400"
                : "border-amber-500/30 text-amber-500"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? (isAmharic ? "ኦንላይን" : "Online") : (isAmharic ? "ኦፍላይን" : "Offline")}
          </button>

          <button
            onClick={() => setIsLowBandwidth(!isLowBandwidth)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
              isLowBandwidth ? "border-rose-500/30 text-rose-400" : "border-slate-800 text-slate-400"
            }`}
          >
            <Gauge className="w-3 h-3" />
            {isAmharic ? "ዝቅተኛ ባንድዊድዝ" : "Low bandwidth"}
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={triggerSync}
              className="flex items-center gap-1.5 bg-amber-500 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3" />
              {isAmharic ? `${pendingSyncCount} አስምር` : `Sync ${pendingSyncCount}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

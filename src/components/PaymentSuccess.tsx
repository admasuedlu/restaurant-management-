import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, AlertCircle } from "lucide-react";

interface Props {
  isAmharic: boolean;
  onContinue: () => void;
}

export default function PaymentSuccess({ isAmharic, onContinue }: Props) {
  const [status, setStatus]   = useState<"checking" | "completed" | "pending" | "error">("checking");
  const [info, setInfo]       = useState<{ businessName?: string; plan?: string; months?: number } | null>(null);
  const tc = (en: string, am: string) => isAmharic ? am : en;

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) { setStatus("error"); return; }

    let attempts = 0;
    const check = async () => {
      try {
        const res  = await fetch(`/api/subscription/payment-result?ref=${encodeURIComponent(ref)}`);
        const data = await res.json();
        if (data.status === "completed") {
          setStatus("completed");
          setInfo(data);
        } else if (++attempts < 8) {
          setTimeout(check, 3000);
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("error");
      }
    };
    check();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-5">

        {status === "checking" && (
          <>
            <RefreshCw className="w-16 h-16 text-amber-400 mx-auto animate-spin" />
            <h1 className="text-xl font-black text-slate-200">
              {tc("Confirming your payment...", "ክፍያዎ እየተረጋገጠ ነው...")}
            </h1>
            <p className="text-sm text-slate-500">
              {tc("Please wait a moment.", "እባክዎ ትንሽ ጊዜ ይጠብቁ።")}
            </p>
          </>
        )}

        {status === "completed" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-emerald-300">
              {tc("Payment Confirmed!", "ክፍያ ተረጋግጧል!")}
            </h1>
            {info?.businessName && (
              <p className="text-sm text-slate-400">
                <span className="font-bold text-amber-400">{info.businessName}</span>
                {" — "}
                {tc(`${info.plan} plan renewed for ${info.months} month(s).`,
                    `${info.plan} ፕላን ለ${info.months} ወር ታደሰ።`)}
              </p>
            )}
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all cursor-pointer"
            >
              {tc("Continue to App →", "ወደ ስርዓቱ ይሂዱ →")}
            </button>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-xl font-black text-amber-300">
              {tc("Payment Pending", "ክፍያ በሂደት ላይ")}
            </h1>
            <p className="text-sm text-slate-400">
              {tc(
                "Your payment is being processed. Your account will be activated within a few minutes.",
                "ክፍያዎ እየተሰራ ነው። መለያዎ በጥቂት ደቂቃዎች ውስጥ ይነቃቃል።"
              )}
            </p>
            <button onClick={onContinue} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all cursor-pointer">
              {tc("← Back to Login", "← ወደ መግቢያ")}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-16 h-16 text-rose-400 mx-auto" />
            <h1 className="text-xl font-black text-rose-300">
              {tc("Could not verify payment", "ክፍያ ማረጋገጥ አልተቻለም")}
            </h1>
            <p className="text-sm text-slate-500">
              {tc("Contact admin with your payment reference.", "የክፍያ ማጣቀሻዎን ለአድሚን ያሳውቁ።")}
            </p>
            <button onClick={onContinue} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-sm transition-all cursor-pointer">
              {tc("← Back", "← ተመለስ")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

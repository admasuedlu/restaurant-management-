import { useState, useEffect, useRef } from "react";

interface Props { tenantCode: string; isAmharic: boolean; }

const TABLES = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","Bar","Terrace","VIP"];

export default function QRGenerator({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [selectedTable, setSelectedTable] = useState("T1");
  const [qrUrl, setQrUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const menuUrl = `${window.location.origin}/menu/${tenantCode}/${selectedTable}`;
  const feedbackUrl = `${window.location.origin}/feedback/${tenantCode}`;

  useEffect(() => {
    // Use QR Server API to generate QR codes
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(menuUrl)}&format=png&margin=10`);
  }, [menuUrl]);

  const downloadQR = async (url: string, filename: string) => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch { alert(tc("Download failed — try right-click Save on the QR image","ማውረድ አልተቻለም")); }
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-amber-400">{tc("QR Code Generator","QR ኮድ አመንጪ")}</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Table QR */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-4">
          <h3 className="font-semibold text-gray-200">📱 {tc("Table Menu QR","የጠረጴዛ ምናሌ QR")}</h3>
          <p className="text-sm text-gray-400">
            {tc("Customers scan this QR to view the menu and place orders from their phone.",
              "ደንበኞች ይህን QR ስካን ያደርጋሉ ምናሌ ለማየት እና ትዕዛዝ ለመስጠት።")}
          </p>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">{tc("Select Table","ጠረጴዛ ይምረጡ")}</label>
            <div className="grid grid-cols-5 gap-1">
              {TABLES.map(t => (
                <button key={t} onClick={() => setSelectedTable(t)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedTable===t ? "bg-amber-500 text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            {qrUrl && (
              <div className="bg-white p-3 rounded-xl">
                <img src={qrUrl} alt={`QR for ${selectedTable}`} className="w-40 h-40" />
              </div>
            )}
            <div className="text-xs text-gray-400 text-center break-all bg-gray-700/50 rounded-lg p-2">
              {menuUrl}
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={() => downloadQR(qrUrl, `qr-${selectedTable}-${tenantCode}.png`)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 rounded-lg text-sm">
                ⬇️ {tc("Download","አውርድ")}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(menuUrl); }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded-lg text-sm">
                📋 {tc("Copy URL","ሊንክ ቅዳ")}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback QR */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-4">
          <h3 className="font-semibold text-gray-200">⭐ {tc("Feedback QR","አስተያየት QR")}</h3>
          <p className="text-sm text-gray-400">
            {tc("Place this QR on tables or receipts so customers can rate your service.",
              "ይህን QR በጠረጴዛዎች ወይም ደረሰኝ ላይ ያስቀምጡ ደንበኞች ደረጃ እንዲሰጡ።")}
          </p>

          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(feedbackUrl)}&format=png&margin=10`}
                alt="Feedback QR"
                className="w-40 h-40"
              />
            </div>
            <div className="text-xs text-gray-400 text-center break-all bg-gray-700/50 rounded-lg p-2">
              {feedbackUrl}
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={() => downloadQR(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(feedbackUrl)}&format=png&margin=10`, `qr-feedback-${tenantCode}.png`)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 rounded-lg text-sm">
                ⬇️ {tc("Download","አውርድ")}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(feedbackUrl); }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded-lg text-sm">
                📋 {tc("Copy URL","ሊንክ ቅዳ")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="font-semibold text-gray-200 mb-3">📖 {tc("How to use","እንዴት ይጠቀሙ")}</h3>
        <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
          <li>{tc("Download the QR for each table","ለእያንዳንዱ ጠረጴዛ QR ያውርዱ")}</li>
          <li>{tc("Print and laminate each QR","ያትሙ እና ያሸጉ")}</li>
          <li>{tc("Place on the respective table","በየጠረጴዛቸው ላይ ያስቀምጡ")}</li>
          <li>{tc("Customers scan → view menu → order directly","ደንበኞች ስካን ያደርጋሉ → ምናሌ ያያሉ → ቀጥታ ይትዛዛሉ")}</li>
          <li>{tc("Orders appear instantly in the kitchen!","ትዕዛዞቹ ወዲያው በወጥ ቤት ይታያሉ!")}</li>
        </ol>
      </div>
    </div>
  );
}

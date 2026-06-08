import { useState, useEffect, useRef } from "react";

interface Props {
  orderId: string;
  tenantCode: string;
  onClose: () => void;
  isAmharic: boolean;
}

interface Receipt {
  receiptId: string;
  restaurant: { name: string; phone: string; code: string };
  order: { id: string; tableId: string; type: string; waiterName: string; creationTime: string; paymentMethod: string };
  items: { name: string; ameName: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  footer: string;
  printedAt: string;
}

export default function ReceiptPrinter({ orderId, tenantCode, onClose, isAmharic }: Props) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/receipt`, { headers: { "X-Tenant-Code": tenantCode } })
      .then(r => r.json())
      .then(d => { setReceipt(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orderId, tenantCode]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank", "width=380,height=700");
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .separator { border-top: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
        h2 { font-size: 14px; margin: 4px 0; }
        p { margin: 2px 0; }
      </style></head><body>
      ${content}
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 text-gray-300">Loading receipt...</div>
    </div>
  );
  if (!receipt) return null;

  const time = new Date(receipt.order.creationTime).toLocaleString();
  const printedAt = new Date(receipt.printedAt).toLocaleString();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-bold text-amber-400">{isAmharic ? "ደረሰኝ" : "Receipt"}</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
              🖨️ {isAmharic ? "አትም" : "Print"}
            </button>
            <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm">✕</button>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="p-4">
          <div ref={printRef} className="bg-white text-black p-4 rounded-lg font-mono text-xs space-y-1" style={{ fontFamily: "Courier New, monospace" }}>
            {/* Header */}
            <div className="center bold" style={{ textAlign:"center", fontWeight:"bold" }}>
              <h2 style={{ fontSize:"14px", margin:"4px 0" }}>{receipt.restaurant.name.toUpperCase()}</h2>
              <p>Tel: {receipt.restaurant.phone}</p>
              <p>Code: {receipt.restaurant.code}</p>
            </div>
            <div className="separator" style={{ borderTop:"1px dashed #000", margin:"4px 0" }} />

            {/* Order info */}
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>Receipt#:</span><span>{receipt.receiptId}</span>
            </div>
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>Order:</span><span>{receipt.order.id}</span>
            </div>
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>Table:</span><span>{receipt.order.tableId}</span>
            </div>
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>Type:</span><span>{receipt.order.type}</span>
            </div>
            {receipt.order.waiterName && (
              <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
                <span>Waiter:</span><span>{receipt.order.waiterName}</span>
              </div>
            )}
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>Time:</span><span>{time}</span>
            </div>
            <div className="separator" style={{ borderTop:"1px dashed #000", margin:"4px 0" }} />

            {/* Items */}
            <div className="bold" style={{ fontWeight:"bold" }}>
              <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ flex:2 }}>Item</span>
                <span>Qty</span>
                <span style={{ textAlign:"right", minWidth:"60px" }}>Total</span>
              </div>
            </div>
            <div className="separator" style={{ borderTop:"1px dashed #000", margin:"4px 0" }} />
            {receipt.items.map((item, i) => (
              <div key={i}>
                <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ flex:2 }}>{item.name}</span>
                  <span>×{item.qty}</span>
                  <span style={{ textAlign:"right", minWidth:"60px" }}>{item.total.toFixed(2)}</span>
                </div>
                <div style={{ color:"#666", fontSize:"10px" }}>  {item.ameName} @ {item.unitPrice.toFixed(2)} ETB</div>
              </div>
            ))}
            <div className="separator" style={{ borderTop:"1px dashed #000", margin:"4px 0" }} />

            {/* Totals */}
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>Subtotal:</span><span>{receipt.subtotal.toFixed(2)} ETB</span>
            </div>
            <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
              <span>VAT ({receipt.taxRate}%):</span><span>{receipt.tax.toFixed(2)} ETB</span>
            </div>
            <div className="separator" style={{ borderTop:"1px dashed #000", margin:"4px 0" }} />
            <div className="total-row bold" style={{ display:"flex", justifyContent:"space-between", fontWeight:"bold", fontSize:"14px" }}>
              <span>TOTAL:</span><span>{receipt.total.toFixed(2)} ETB</span>
            </div>
            {receipt.order.paymentMethod && (
              <div className="row" style={{ display:"flex", justifyContent:"space-between" }}>
                <span>Paid via:</span><span>{receipt.order.paymentMethod}</span>
              </div>
            )}
            <div className="separator" style={{ borderTop:"1px dashed #000", margin:"4px 0" }} />

            {/* Footer */}
            <div className="center" style={{ textAlign:"center", marginTop:"8px" }}>
              <p>{receipt.footer}</p>
              <p style={{ color:"#888", fontSize:"10px" }}>ERCA Registered · VAT Inclusive</p>
              <p style={{ color:"#888", fontSize:"10px" }}>Printed: {printedAt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

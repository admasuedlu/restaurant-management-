import { useState, useEffect, useRef } from "react";

interface Props { tenantCode: string; tableId?: string; }

interface MenuItem {
  id: string; name: string; ameName: string; price: number;
  category: string; description: string; ameDescription: string;
  prepTime: number; image: string; popularity: number;
}
interface CartItem { menuItem: MenuItem; quantity: number; }

const CATEGORY_ICONS: Record<string, string> = {
  "Meat": "🥩", "Fasting": "🫘", "Drinks": "🥤", "Dessert": "🍮",
  "Main Dishes":"🍲", "Breakfast":"🍳", "Beverages":"🧃", "Specials":"⭐",
};

type PayStep = "menu" | "confirm" | "paying" | "done";

export default function QRMenuPage({ tenantCode, tableId }: Props) {
  const [menu,         setMenu]         = useState<MenuItem[]>([]);
  const [restaurant,   setRestaurant]   = useState<{ name: string; code: string } | null>(null);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showCart,     setShowCart]     = useState(false);
  const [isAmharic,    setIsAmharic]    = useState(false);
  const [step,         setStep]         = useState<PayStep>("menu");
  const [placing,      setPlacing]      = useState(false);
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([]);
  const [placedTotal,    setPlacedTotal]    = useState(0);
  const [txRef,          setTxRef]          = useState("");
  const [pollCount,      setPollCount]      = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tc = (en: string, am: string) => isAmharic ? am : en;

  useEffect(() => {
    fetch(`/api/public/${tenantCode}/menu`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setMenu(d.menu); setRestaurant(d.restaurant); }
      })
      .catch(() => setError("Failed to load menu"))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  // Poll payment status after Chapa redirect
  useEffect(() => {
    if (step !== "paying" || !txRef) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/public/${tenantCode}/payment/status?txRef=${txRef}`);
        const d = await r.json();
        if (d.status === "completed") {
          clearInterval(pollRef.current!);
          setStep("done");
        } else {
          setPollCount(c => c + 1);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(pollRef.current!);
  }, [step, txRef]);

  // Check if returning from Chapa redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref   = params.get("ref");
    const type  = params.get("type");
    if (ref && type === "order") {
      setTxRef(ref);
      setStep("paying");
    }
  }, []);

  const categories = ["All", ...Array.from(new Set(menu.map(m => m.category)))];
  const filtered   = activeCategory === "All" ? menu : menu.filter(m => m.category === activeCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id);
      if (ex) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };
  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === itemId);
      if (!ex) return prev;
      if (ex.quantity === 1) return prev.filter(c => c.menuItem.id !== itemId);
      return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const cartTax      = parseFloat((cartSubtotal * 0.15).toFixed(2));
  const cartTotal    = parseFloat((cartSubtotal + cartTax).toFixed(2));
  const cartCount    = cart.reduce((s, c) => s + c.quantity, 0);

  // Step 1: place the order
  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const r = await fetch(`/api/public/${tenantCode}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: tableId || "QR",
          items: cart,
          customerPhone: phone || null,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setPlacedOrderIds(d.orderIds || []);
        setPlacedTotal(cartTotal);
        setCart([]);
        setShowCart(false);
        setStep("confirm"); // go to payment choice
      } else {
        const e = await r.json();
        alert(e.error || "Failed to place order");
      }
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Step 2a: pay via Chapa
  const payWithChapa = async () => {
    setPlacing(true);
    try {
      const r = await fetch(`/api/public/${tenantCode}/payment/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: placedOrderIds,
          amount: placedTotal,
          tableId: tableId || "QR",
          customerPhone: phone || undefined,
          customerEmail: email || undefined,
        }),
      });
      const d = await r.json();
      if (d.checkoutUrl) {
        setTxRef(d.txRef);
        // Redirect customer to Chapa checkout page
        window.location.href = d.checkoutUrl;
      } else {
        alert(d.error || "Could not initiate payment. Please pay at the counter.");
        setStep("done");
      }
    } catch {
      alert("Connection error. Please pay at the counter.");
      setStep("done");
    } finally {
      setPlacing(false);
    }
  };

  // Step 2b: pay at counter (just confirm)
  const payAtCounter = () => setStep("done");

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center text-white space-y-3">
        <div className="animate-spin w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto" />
        <p className="text-amber-400">{tc("Loading menu…", "ምናሌ በመጫን ላይ…")}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center text-red-400 p-8">{error}</div>
    </div>
  );

  // ── Payment polling screen (returned from Chapa) ──────────────────────────
  if (step === "paying") return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-sm w-full">
        <div className="text-5xl animate-spin">⏳</div>
        <h2 className="text-xl font-bold text-amber-400">
          {tc("Confirming Payment…", "ክፍያ እያረጋገጥን ነው…")}
        </h2>
        <p className="text-gray-400 text-sm">
          {tc("Please wait while we confirm your payment with Chapa.", "ከቻፓ ጋር ክፍያዎን እያረጋገጥን ነው፤ ትንሽ ይጠብቁ።")}
        </p>
        <div className="bg-gray-800 rounded-xl p-3 font-mono text-xs text-gray-500 break-all">
          {txRef}
        </div>
        <p className="text-xs text-gray-600">
          {tc(`Checking… (${pollCount})`, `እያረጋገጠ ነው… (${pollCount})`)}
        </p>
        <button onClick={() => setStep("done")} className="text-xs text-gray-600 underline mt-4">
          {tc("Skip — I'll pay at the counter", "ዝለሉ — በቁጠር ልከፍል")}
        </button>
      </div>
    </div>
  );

  // ── Payment confirmed ─────────────────────────────────────────────────────
  if (step === "done") return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-sm w-full">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-amber-400">
          {tc("Order Confirmed!", "ትዕዛዝ ተቀብሏል!")}
        </h2>
        <p className="text-gray-300 text-sm">
          {tc(
            "Your order is being prepared. Food → kitchen, Drinks → bar.",
            "ምግብዎ በዝግጅት ላይ ነው። ምግብ → ወጥ ቤት, መጠጥ → ባር።"
          )}
        </p>
        {tableId && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-300 font-semibold text-lg">
            🪑 {tc("Table", "ጠረጴዛ")}: {tableId}
          </div>
        )}
        <button
          onClick={() => { setStep("menu"); setPlacedOrderIds([]); }}
          className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 rounded-2xl text-base"
        >
          {tc("Order More", "ተጨማሪ ትዕዛዝ")}
        </button>
      </div>
    </div>
  );

  // ── Payment choice screen ─────────────────────────────────────────────────
  if (step === "confirm") return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-5">
        {/* Success banner */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🍽️</div>
          <h2 className="text-xl font-bold text-emerald-400">
            {tc("Order Placed!", "ትዕዛዝ ተቀብሏል!")}
          </h2>
          <p className="text-gray-400 text-sm">
            {tc("Kitchen is preparing your order. How would you like to pay?",
                "ወጥ ቤቱ ትዕዛዝዎን እያዘጋጀ ነው። እንዴት መክፈል ይፈልጋሉ?")}
          </p>
        </div>

        {/* Bill summary */}
        <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-3">
            {tc("Bill Summary", "የሂሳብ ማጠቃለያ")}
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>{tc("Subtotal", "ንዑስ ድምር")}</span>
            <span className="font-mono">{(placedTotal / 1.15).toFixed(0)} ETB</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{tc("VAT (15%)", "ቫት (15%)")}</span>
            <span className="font-mono">{(placedTotal - placedTotal / 1.15).toFixed(2)} ETB</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
            <span className="text-gray-100">{tc("Total", "ጠቅላላ")}</span>
            <span className="text-amber-400 text-xl font-mono">{placedTotal.toFixed(2)} ETB</span>
          </div>
        </div>

        {/* Optional email for receipt */}
        <input
          type="email"
          placeholder={tc("Email for receipt (optional)", "ኢሜይል ለደረሰኝ (አማራጭ)")}
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500"
        />

        {/* Payment buttons */}
        <div className="space-y-3">
          {/* Chapa — online payment */}
          <button
            onClick={payWithChapa}
            disabled={placing}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-3 disabled:opacity-60 transition-all active:scale-95"
          >
            {placing ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <span className="text-xl">📱</span>
            )}
            <div className="text-left">
              <div className="font-black">{tc("Pay Now via Chapa", "አሁን በቻፓ ይክፈሉ")}</div>
              <div className="text-xs font-normal opacity-80">
                {tc("Telebirr · CBE Birr · Card", "ቴሌቢር · CBE ብር · ካርድ")}
              </div>
            </div>
          </button>

          {/* Cash at counter */}
          <button
            onClick={payAtCounter}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold py-4 rounded-2xl text-base flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <span className="text-xl">💵</span>
            <div className="text-left">
              <div className="font-bold">{tc("Pay at Counter", "በቁጠር ይክፈሉ")}</div>
              <div className="text-xs font-normal text-gray-500">
                {tc("Cash · Telebirr manual · Transfer", "ጥሬ ገንዘብ · ቴሌቢር · ዝውውር")}
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-gray-600">
          {tc("Your order is already sent to the kitchen regardless of payment.",
              "ትዕዛዝዎ ቀድሞ ወደ ወጥ ቤቱ ተልኳል።")}
        </p>
      </div>
    </div>
  );

  // ── Main menu page ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="font-bold text-amber-400 text-lg">{restaurant?.name}</h1>
            {tableId && (
              <p className="text-xs text-gray-400">
                🪑 {tc("Table", "ጠረጴዛ")}: <span className="font-bold text-gray-200">{tableId}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAmharic(!isAmharic)}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg transition-colors"
            >
              {isAmharic ? "EN" : "አማ"}
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              🛒 {tc("Cart", "ቅርጫት")}
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto sticky top-[61px] bg-gray-900/90 backdrop-blur border-b border-gray-800 z-10">
        <div className="flex gap-2 px-4 py-2 max-w-2xl mx-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-amber-500 text-gray-900"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {CATEGORY_ICONS[cat] || ""} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-2xl mx-auto p-4 grid gap-3 pb-28">
        {filtered.map(item => {
          const inCart = cart.find(c => c.menuItem.id === item.id);
          return (
            <div key={item.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 flex">
              {item.image && (
                <img
                  src={item.image} alt={item.name}
                  className="w-24 h-24 object-cover shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <div>
                  <div className="font-semibold text-gray-100 leading-tight">
                    {isAmharic ? item.ameName : item.name}
                  </div>
                  {(isAmharic ? item.ameDescription : item.description) && (
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {isAmharic ? item.ameDescription : item.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">⏱ {item.prepTime} {tc("min","ደቂ")}</span>
                    <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                      {CATEGORY_ICONS[item.category] || ""} {item.category}
                    </span>
                    {item.category === "Drinks" && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">→ Bar</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-amber-400">{item.price.toLocaleString()} ETB</span>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-full text-sm font-bold flex items-center justify-center"
                      >−</button>
                      <span className="text-amber-400 font-bold w-4 text-center">{inCart.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-full text-sm font-bold flex items-center justify-center"
                      >+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-3 py-1.5 rounded-xl text-sm transition-colors active:scale-95"
                    >
                      + {tc("Add", "ጨምር")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-6 py-4 rounded-2xl shadow-xl text-sm flex items-center gap-2 z-40 transition-all active:scale-95"
        >
          🛒 {cartCount} {tc("items", "ምርቶች")} ·{" "}
          <span className="font-mono">{cartTotal.toLocaleString()} ETB</span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-amber-400 text-lg">{tc("Your Order", "ትዕዛዝዎ")}</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-200 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800">✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-12">{tc("Your cart is empty", "ቅርጫትዎ ባዶ ነው")}</div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Cart items */}
                {cart.map(item => (
                  <div key={item.menuItem.id} className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-100 truncate">
                        {isAmharic ? item.menuItem.ameName : item.menuItem.name}
                      </div>
                      <div className="text-sm text-amber-400 font-mono">
                        {(item.menuItem.price * item.quantity).toLocaleString()} ETB
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button onClick={() => removeFromCart(item.menuItem.id)} className="w-8 h-8 bg-gray-700 rounded-full font-bold text-gray-100 flex items-center justify-center">−</button>
                      <span className="text-gray-100 font-bold w-5 text-center">{item.quantity}</span>
                      <button onClick={() => addToCart(item.menuItem)} className="w-8 h-8 bg-amber-500 text-gray-900 rounded-full font-bold flex items-center justify-center">+</button>
                    </div>
                  </div>
                ))}

                {/* Bill */}
                <div className="bg-gray-800 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>{tc("Subtotal", "ንዑስ ድምር")}</span>
                    <span className="font-mono">{cartSubtotal.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>{tc("VAT 15%", "ቫት 15%")}</span>
                    <span className="font-mono">{cartTax.toFixed(2)} ETB</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-700">
                    <span className="text-gray-100">{tc("Total", "ጠቅላላ")}</span>
                    <span className="text-amber-400 font-mono">{cartTotal.toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Phone */}
                <input
                  type="tel"
                  placeholder={tc("Phone number (optional)", "ስልክ ቁጥር (አማራጭ)")}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 focus:border-amber-500 text-gray-100 rounded-xl px-4 py-3 text-sm outline-none"
                />

                {/* Place order button */}
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-4 rounded-2xl text-lg disabled:opacity-50 transition-all active:scale-95"
                >
                  {placing
                    ? tc("Sending Order…", "ትዕዛዝ እየተላከ ነው…")
                    : tc("Place Order →", "ትዕዛዝ ላክ →")}
                </button>

                <p className="text-center text-xs text-gray-600">
                  {tc("You'll choose how to pay after ordering.", "ከፈጠኑ በኋላ ክፍያ ዘዴ ይመርጣሉ።")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

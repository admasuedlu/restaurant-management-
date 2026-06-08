import { useState, useEffect } from "react";

interface Props { tenantCode: string; tableId?: string; }

interface MenuItem {
  id: string; name: string; ameName: string; price: number;
  category: string; description: string; ameDescription: string;
  prepTime: number; image: string; popularity: number;
}

interface CartItem { menuItem: MenuItem; quantity: number; }

const CATEGORY_ICONS: Record<string, string> = {
  "Meat": "🥩", "Fasting": "🫘", "Drinks": "🥤", "Dessert": "🍮",
};

export default function QRMenuPage({ tenantCode, tableId }: Props) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<{name:string;code:string}|null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showCart, setShowCart] = useState(false);
  const [isAmharic, setIsAmharic] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [phone, setPhone] = useState("");
  const tc = (en: string, am: string) => isAmharic ? am : en;

  useEffect(() => {
    fetch(`/api/public/${tenantCode}/menu`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setMenu(d.menu); setRestaurant(d.restaurant); } })
      .catch(() => setError("Failed to load menu"))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const categories = ["All", ...Array.from(new Set(menu.map(m => m.category)))];
  const filtered = activeCategory === "All" ? menu : menu.filter(m => m.category === activeCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id);
      if (ex) return prev.map(c => c.menuItem.id === item.id ? {...c, quantity: c.quantity+1} : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === itemId);
      if (!ex) return prev;
      if (ex.quantity === 1) return prev.filter(c => c.menuItem.id !== itemId);
      return prev.map(c => c.menuItem.id === itemId ? {...c, quantity: c.quantity-1} : c);
    });
  };

  const cartTotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    const r = await fetch(`/api/public/${tenantCode}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: tableId || "QR", items: cart, customerPhone: phone }),
    });
    if (r.ok) { setOrdered(true); setCart([]); setShowCart(false); }
    setPlacing(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center text-white space-y-3">
        <div className="animate-spin w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto" />
        <p className="text-amber-400">Loading menu...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center text-red-400 p-8">{error}</div>
    </div>
  );

  if (ordered) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-amber-400">{tc("Order Placed!","ትዕዛዝ ተቀብሏል!")}</h2>
        <p className="text-gray-300">{tc("Your order is being prepared. Please wait.","ምግብዎ በዝግጅት ላይ ነው። እባክዎ ይጠብቁ።")}</p>
        <button onClick={() => setOrdered(false)}
          className="bg-amber-500 text-gray-900 font-semibold px-6 py-3 rounded-xl">
          {tc("Order More","ተጨማሪ ትዕዛዝ")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="font-bold text-amber-400 text-lg">{restaurant?.name}</h1>
            {tableId && <p className="text-xs text-gray-400">{tc("Table","ጠረጴዛ")}: {tableId}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsAmharic(!isAmharic)} className="text-xs bg-gray-700 px-2 py-1 rounded">
              {isAmharic ? "EN" : "አማ"}
            </button>
            <button onClick={() => setShowCart(true)} className="relative bg-amber-500 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm">
              🛒 {tc("Cart","ቅርጫት")}
              {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto sticky top-[61px] bg-gray-900/90 border-b border-gray-800 z-10">
        <div className="flex gap-2 px-4 py-2 max-w-2xl mx-auto">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory===cat ? "bg-amber-500 text-gray-900" : "bg-gray-700 text-gray-300"
              }`}>
              {CATEGORY_ICONS[cat as string] || ""} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-2xl mx-auto p-4 grid gap-3">
        {filtered.map(item => {
          const inCart = cart.find(c => c.menuItem.id === item.id);
          return (
            <div key={item.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 flex">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              )}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-gray-100">{isAmharic ? item.ameName : item.name}</div>
                  {(isAmharic ? item.ameDescription : item.description) && (
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{isAmharic ? item.ameDescription : item.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">⏱ {item.prepTime} min</span>
                    <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{item.category}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-amber-400">{item.price.toLocaleString()} ETB</span>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-full text-sm font-bold flex items-center justify-center">−</button>
                      <span className="text-amber-400 font-bold">{inCart.quantity}</span>
                      <button onClick={() => addToCart(item)} className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-full text-sm font-bold flex items-center justify-center">+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-3 py-1.5 rounded-xl text-sm">
                      + {tc("Add","ጨምር")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="bg-gray-900 rounded-t-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-amber-400 text-lg">{tc("Your Order","ትዕዛዝዎ")}</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-200 text-xl">✕</button>
            </div>
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-12">{tc("Your cart is empty","ቅርጫትዎ ባዶ ነው")}</div>
            ) : (
              <div className="p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.menuItem.id} className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-100">{isAmharic ? item.menuItem.ameName : item.menuItem.name}</div>
                      <div className="text-sm text-amber-400">{(item.menuItem.price * item.quantity).toLocaleString()} ETB</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.menuItem.id)} className="w-8 h-8 bg-gray-700 rounded-full font-bold text-gray-100 flex items-center justify-center">−</button>
                      <span className="text-gray-100 font-bold">{item.quantity}</span>
                      <button onClick={() => addToCart(item.menuItem)} className="w-8 h-8 bg-amber-500 text-gray-900 rounded-full font-bold flex items-center justify-center">+</button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-gray-700 pt-3">
                  <input type="tel" placeholder={tc("Phone (optional)","ስልክ ቁጥር (አማራጭ)")} value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-gray-700 text-gray-100 rounded-xl px-4 py-2 text-sm mb-3" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">{tc("Total","ጠቅላላ")} ({tc("excl. tax","ቀረጥ ሳይጨምር")})</span>
                    <span className="text-xl font-bold text-amber-400">{cartTotal.toLocaleString()} ETB</span>
                  </div>
                  <button onClick={placeOrder} disabled={placing}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-4 rounded-2xl text-lg disabled:opacity-50">
                    {placing ? tc("Placing Order...","ትዕዛዝ በመላክ ላይ...") : tc("Place Order","ትዕዛዝ ላክ")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-amber-500 text-gray-900 font-bold px-6 py-4 rounded-2xl shadow-lg text-sm flex items-center gap-2">
          🛒 {cartCount} {tc("items","ምርቶች")} · {cartTotal.toLocaleString()} ETB
        </button>
      )}
    </div>
  );
}

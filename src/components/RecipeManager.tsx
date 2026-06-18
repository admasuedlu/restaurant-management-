import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Props { tenantCode: string; isAmharic: boolean; }

interface MenuItem { id: string; name: string; ameName: string; price: number; category: string; }
interface InventoryItem { id: string; name: string; unit: string; stock: number; cost: number; }
interface Recipe {
  id: string; menu_item_id: string; inventory_id: string; qty_per_serve: number;
  menu_name: string; menu_price: number;
  inv_name: string; unit: string; inv_cost: number;
}
interface CostBreakdown {
  ingredients: { name: string; unit: string; qty_per_serve: number; cost: number; inv_cost: number; line_cost: number }[];
  totalCost: number; price: number; margin: number; marginPct: string;
}

export default function RecipeManager({ tenantCode, isAmharic }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string>("");
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [addInvId, setAddInvId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qForm, setQForm] = useState({ name: "", unit: "kg", stock: "", cost: "" });
  const [qSaving, setQSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, iRes, rRes] = await Promise.all([
      apiFetch("/api/menu"),
      apiFetch("/api/inventory"),
      apiFetch("/api/recipes"),
    ]);
    if (mRes.ok) setMenu(await mRes.json());
    if (iRes.ok) setInventory(await iRes.json());
    if (rRes.ok) setRecipes(await rRes.json());
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { load(); }, [load]);

  const loadCost = useCallback(async (menuItemId: string) => {
    if (!menuItemId) return;
    const r = await apiFetch(`/api/recipes/cost/${menuItemId}`);
    if (r.ok) setCostBreakdown(await r.json());
    else setCostBreakdown(null);
  }, [tenantCode]);

  useEffect(() => {
    if (selectedMenu) loadCost(selectedMenu);
    else setCostBreakdown(null);
  }, [selectedMenu, recipes]);

  const addIngredient = async () => {
    if (!selectedMenu || !addInvId || !addQty) return;
    setSaving(true);
    const r = await apiFetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId: selectedMenu, inventoryId: addInvId, qtyPerServe: Number(addQty) }),
    });
    if (r.ok) { await load(); await loadCost(selectedMenu); setAddInvId(""); setAddQty(""); }
    setSaving(false);
  };

  const removeIngredient = async (recipeId: string) => {
    await apiFetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    await load();
    if (selectedMenu) await loadCost(selectedMenu);
  };

  const selectedItem = menu.find(m => m.id === selectedMenu);
  const itemRecipes = recipes.filter(r => r.menu_item_id === selectedMenu);
  const usedInvIds = new Set(itemRecipes.map(r => r.inventory_id));
  const availableInv = inventory.filter(i => !usedInvIds.has(i.id));

  // Summary table: all menu items with their cost/margin
  const filteredMenu = menu.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase())
  );

  // Build per-item cost map from recipes
  const costMap: Record<string, { cost: number; margin: number; marginPct: number; hasRecipe: boolean }> = {};
  for (const m of menu) {
    const mRecipes = recipes.filter(r => r.menu_item_id === m.id);
    if (mRecipes.length === 0) { costMap[m.id] = { cost: 0, margin: m.price, marginPct: 100, hasRecipe: false }; continue; }
    const cost = mRecipes.reduce((s, r) => s + r.qty_per_serve * r.inv_cost, 0);
    const margin = m.price - cost;
    costMap[m.id] = { cost, margin, marginPct: m.price > 0 ? (margin / m.price) * 100 : 0, hasRecipe: true };
  }

  const marginColor = (pct: number) =>
    pct >= 65 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-amber-400">
        🧪 {tc("Recipe & Cost Calculator", "የምግብ አዘገጃጀት እና ወጪ ሂሳብ")}
      </h2>

      {/* Guide banner when no inventory exists */}
      {!loading && inventory.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <div className="font-semibold text-amber-400 text-base">
                {tc("How to add ingredients", "እንዴት ንጥረ ነገሮች ይጨምሩ")}
              </div>
              <ol className="mt-2 space-y-1.5 text-sm text-gray-300 list-decimal list-inside">
                <li>{tc("Select a menu item from the dropdown on the left", "ከግራ ዝርዝር ምናሌ ምርት ይምረጡ")}</li>
                <li>{tc('Click "⚠️ No inventory — add one first" to open the quick-add form', '"⚠️ እቃ ቤት ባዶ ነው" ቁልፍ ይጫኑ')}</li>
                <li>{tc("Add ingredients like: Beef (kg, 350 ETB/kg), Teff (kg, 45 ETB/kg)", "እቃዎች ጨምሩ፡ ስጋ (ኪ.ግ, 350 ብር), ጤፍ (ኪ.ግ, 45 ብር)")}</li>
                <li>{tc("Select the ingredient and enter qty per serving, then click +", "ንጥረ ነገር ይምረጡ፣ መጠን ያስገቡ፣ + ይጫኑ")}</li>
                <li>{tc("The cost & profit margin will calculate automatically!", "ወጪ እና ትርፍ ህዳግ ወዲያው ይሰላሉ!")}</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT — Menu item selector + recipe builder */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 space-y-3">
            <h3 className="font-semibold text-gray-200">{tc("Select Menu Item", "ምናሌ ምርጥ")}</h3>
            <select
              value={selectedMenu}
              onChange={e => setSelectedMenu(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">{tc("-- Choose a dish --", "-- ምግብ ይምረጡ --")}</option>
              {menu.map(m => (
                <option key={m.id} value={m.id}>
                  {isAmharic ? m.ameName : m.name} — {m.price} ETB
                </option>
              ))}
            </select>

            {selectedMenu && selectedItem && (
              <>
                {/* Current Ingredients */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    {tc("Ingredients", "ንጥረ ነገሮች")}
                  </div>
                  {itemRecipes.length === 0 ? (
                    <div className="text-xs text-gray-500 italic py-2">
                      {tc("No ingredients linked yet.", "ምንም ንጥረ ነገር አልተጨመረም።")}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {itemRecipes.map(rec => (
                        <div key={rec.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2 text-sm">
                          <div>
                            <span className="text-gray-200">{rec.inv_name}</span>
                            <span className="text-gray-400 ml-2">
                              {rec.qty_per_serve} {rec.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-amber-400 text-xs">
                              {(rec.qty_per_serve * rec.inv_cost).toFixed(2)} ETB
                            </span>
                            <button
                              onClick={() => removeIngredient(rec.id)}
                              className="text-gray-500 hover:text-red-400 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Ingredient */}
                <div className="space-y-2 border-t border-gray-700 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400 font-medium">{tc("Add Ingredient", "ንጥረ ነገር ጨምር")}</div>
                    <button
                      onClick={() => setShowQuickAdd(!showQuickAdd)}
                      className="text-xs text-amber-400 hover:text-amber-300 underline"
                    >
                      {inventory.length === 0
                        ? tc("⚠️ No inventory — add one first", "⚠️ እቃ ቤት ባዶ ነው — ጨምር")
                        : tc("+ New inventory item", "+ አዲስ እቃ ጨምር")}
                    </button>
                  </div>

                  {/* Quick-add inventory form */}
                  {showQuickAdd && (
                    <div className="bg-gray-700/60 rounded-xl p-3 space-y-2 border border-amber-500/30">
                      <div className="text-xs text-amber-400 font-medium">{tc("Quick-add inventory item", "ፈጣን እቃ ጨምር")}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">{tc("Name","ስም")}</label>
                          <input type="text" placeholder={tc("e.g. Beef","ለምሳሌ: ስጋ")} value={qForm.name}
                            onChange={e => setQForm(f => ({...f, name: e.target.value}))}
                            className="w-full bg-gray-600 text-gray-100 rounded px-2 py-1 text-xs mt-0.5" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">{tc("Unit","ክፍል")}</label>
                          <select value={qForm.unit} onChange={e => setQForm(f => ({...f, unit: e.target.value}))}
                            className="w-full bg-gray-600 text-gray-100 rounded px-2 py-1 text-xs mt-0.5">
                            {["kg","g","L","mL","pcs","tbsp","tsp","cup"].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">{tc("Current Stock","ክምችት")}</label>
                          <input type="number" min="0" placeholder="10" value={qForm.stock}
                            onChange={e => setQForm(f => ({...f, stock: e.target.value}))}
                            className="w-full bg-gray-600 text-gray-100 rounded px-2 py-1 text-xs mt-0.5" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">{tc("Cost (ETB/unit)","ወጪ (ብር/ክፍል)")}</label>
                          <input type="number" min="0" placeholder="350" value={qForm.cost}
                            onChange={e => setQForm(f => ({...f, cost: e.target.value}))}
                            className="w-full bg-gray-600 text-gray-100 rounded px-2 py-1 text-xs mt-0.5" />
                        </div>
                      </div>
                      <button
                        disabled={qSaving || !qForm.name}
                        onClick={async () => {
                          if (!qForm.name) return;
                          setQSaving(true);
                          const r = await apiFetch("/api/inventory", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name: qForm.name, ameName: qForm.name,
                              stock: Number(qForm.stock) || 0,
                              unit: qForm.unit,
                              cost: Number(qForm.cost) || 0,
                              minAlert: 1, category: "Spices", station: "kitchen"
                            }),
                          });
                          if (r.ok) {
                            await load();
                            setQForm({ name: "", unit: "kg", stock: "", cost: "" });
                            setShowQuickAdd(false);
                          }
                          setQSaving(false);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-1.5 rounded text-xs disabled:opacity-40"
                      >
                        {qSaving ? tc("Adding...","በማስገባት ላይ...") : tc("Add to Inventory","ወደ እቃ ቤት ጨምር")}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={addInvId}
                      onChange={e => setAddInvId(e.target.value)}
                      className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-2 py-1.5 text-xs"
                      disabled={availableInv.length === 0}
                    >
                      <option value="">
                        {availableInv.length === 0
                          ? tc("No inventory — add items above ↑", "እቃ ቤት ባዶ ነው — ከላይ ጨምር ↑")
                          : tc("Select ingredient...", "ንጥረ ነገር ይምረጡ...")}
                      </option>
                      {availableInv.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.stock} {i.unit}) — {i.cost} ETB/{i.unit}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.001"
                      step="0.1"
                      placeholder={tc("Qty", "መጠን")}
                      value={addQty}
                      onChange={e => setAddQty(e.target.value)}
                      className="w-20 bg-gray-700 text-gray-100 rounded-lg px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={addIngredient}
                      disabled={saving || !addInvId || !addQty}
                      className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                    >
                      {saving ? "..." : "+"}
                    </button>
                  </div>
                  {addInvId && addQty && (
                    <div className="text-xs text-green-400">
                      ≈ Cost added: {(Number(addQty) * (inventory.find(i => i.id === addInvId)?.cost || 0)).toFixed(2)} ETB
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Cost Breakdown Card */}
          {costBreakdown && selectedItem && (
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 space-y-3">
              <h3 className="font-semibold text-gray-200">
                💰 {tc("Cost Breakdown", "የወጪ ዝርዝር")} — {selectedItem.name}
              </h3>

              {costBreakdown.ingredients.length === 0 ? (
                <p className="text-xs text-gray-500">{tc("No ingredients linked.", "ምንም ንጥረ ነገር የለም።")}</p>
              ) : (
                <div className="space-y-1">
                  {costBreakdown.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        {ing.name} × {ing.qty_per_serve} {ing.unit}
                      </span>
                      <span className="text-gray-400">{Number(ing.line_cost).toFixed(2)} ETB</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-700 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{tc("Total Cost", "ጠቅላላ ወጪ")}</span>
                  <span className="text-red-400 font-medium">{Number(costBreakdown.totalCost).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{tc("Selling Price", "የሽያጭ ዋጋ")}</span>
                  <span className="text-blue-400 font-medium">{Number(costBreakdown.price).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-200">{tc("Gross Margin", "ትርፍ ህዳግ")}</span>
                  <span className={marginColor(Number(costBreakdown.marginPct))}>
                    {Number(costBreakdown.margin).toFixed(2)} ETB ({costBreakdown.marginPct}%)
                  </span>
                </div>
              </div>

              {/* Margin bar */}
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    Number(costBreakdown.marginPct) >= 65 ? "bg-green-500" :
                    Number(costBreakdown.marginPct) >= 40 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, Number(costBreakdown.marginPct)))}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {Number(costBreakdown.marginPct) >= 65
                  ? tc("✅ Excellent margin", "✅ አስደናቂ ትርፍ")
                  : Number(costBreakdown.marginPct) >= 40
                  ? tc("⚠️ Acceptable margin", "⚠️ ተቀባይነት ያለው ትርፍ")
                  : tc("❌ Low margin — consider raising price or reducing cost", "❌ ዝቅተኛ ትርፍ — ዋጋ ይጨምሩ ወይም ወጪ ይቀንሱ")}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — All menu items cost overview */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-200">{tc("All Dishes — Margin Overview", "ሁሉም ምግቦች — ትርፍ ዝርዝር")}</h3>
          </div>
          <input
            type="text"
            placeholder={tc("Search...", "ፈልግ...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-xs"
          />

          {loading ? (
            <div className="text-center text-gray-400 py-8">{tc("Loading...", "በመጫን ላይ...")}</div>
          ) : menu.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {tc("No menu items yet. Add menu items first.", "ምንም ምናሌ ምርት የለም። ምናሌ ምርቶች ይጨምሩ።")}
            </div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {filteredMenu.map(m => {
                const c = costMap[m.id];
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMenu(m.id)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                      selectedMenu === m.id
                        ? "bg-amber-500/20 border border-amber-500/40"
                        : "bg-gray-700/40 hover:bg-gray-700 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-100 font-medium">{m.name}</span>
                        {!c.hasRecipe && (
                          <span className="text-xs bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
                            {tc("No recipe", "አዘገጃጀት የለም")}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-400">{m.price} ETB</div>
                        {c.hasRecipe && (
                          <div className={`text-xs font-bold ${marginColor(c.marginPct)}`}>
                            {c.marginPct.toFixed(0)}% {tc("margin", "ህዳግ")}
                          </div>
                        )}
                      </div>
                    </div>
                    {c.hasRecipe && (
                      <div className="mt-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.marginPct >= 65 ? "bg-green-500" :
                            c.marginPct >= 40 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, c.marginPct))}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-700 pt-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{tc("≥65% Good", "≥65% ጥሩ")}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" />{tc("40–64% OK", "40–64% ደህና")}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />{tc("<40% Low", "<40% ዝቅተኛ")}</span>
          </div>
        </div>
      </div>

      {/* How auto-deduct works info box */}
      <div className="bg-gray-800 rounded-xl p-4 border border-blue-500/20">
        <h3 className="font-semibold text-blue-400 mb-2">⚙️ {tc("Auto Stock Deduction", "አውቶማቲክ ክምችት ቅናሽ")}</h3>
        <p className="text-sm text-gray-400">
          {tc(
            "When an order is placed, stock is automatically deducted from inventory based on the recipe. Example: if Tibs uses 0.3 kg of beef per serve and 2 Tibs are ordered, 0.6 kg is deducted from beef stock instantly.",
            "ትዕዛዝ ሲቀርብ፣ ክምችቱ በአዘገጃጀቱ ላይ ተመስርቶ ከእቃ ቤቱ ይቀነሳል። ምሳሌ፡ ጥብስ በእያንዳንዱ ምናሌ 0.3 ኪ.ግ ቤፍ ቢጠቀም እና 2 ጥብስ ቢትዘዝ፣ 0.6 ኪ.ግ ቤፍ ወዲያው ይቀነሳል።"
          )}
        </p>
      </div>
    </div>
  );
}

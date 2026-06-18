import bcrypt from "bcryptjs";
import { pool, initSchema } from "../src/lib/database";
import { menuItems } from "../src/data/menu";

const DEMO = {
  id: "tenant-demo",
  code: "DEMO",
  businessName: "Habesha Demo Restaurant",
  ownerName: "Demo Owner",
  phone: "+251911000000",
  email: "demo@habesha.os",
  ownerPassword: "demo123",
  plan: "professional",
  status: "active",
  businessSize: "large",
};

const STAFF = [
  { id: "demo-owner",   name: "Demo Owner",   role: "owner",   pin: "" },
  { id: "demo-waiter",  name: "Almaz Tadesse", role: "waiter",  pin: "1111" },
  { id: "demo-kitchen", name: "Chef Bekele",  role: "kitchen", pin: "2222" },
  { id: "demo-bar",     name: "Sara Bekele",  role: "bar",     pin: "3333" },
  { id: "demo-cashier", name: "Yonas Haile",  role: "cashier", pin: "4444" },
  { id: "demo-manager", name: "Hana Girma",   role: "manager", pin: "5555" },
];

const INVENTORY = [
  { id: "demo-inv-1",  name: "Berbere Spice",     ameName: "በርበሬ",           stock: 12,  unit: "kg",  cost: 450,  minAlert: 3,  category: "Spices",      station: "kitchen" },
  { id: "demo-inv-2",  name: "Teff Flour",        ameName: "ጤፍ",              stock: 80,  unit: "kg",  cost: 120,  minAlert: 20, category: "Grains",      station: "kitchen" },
  { id: "demo-inv-3",  name: "Niter Kibe",        ameName: "ንጥር ቅቤ",         stock: 8,   unit: "kg",  cost: 900,  minAlert: 2,  category: "Dairy",       station: "kitchen" },
  { id: "demo-inv-4",  name: "Chicken (whole)",   ameName: "ዶሮ",              stock: 25,  unit: "pcs", cost: 380,  minAlert: 8,  category: "Meat",        station: "kitchen" },
  { id: "demo-inv-5",  name: "Beef (lean)",       ameName: "በሬ ሥጋ",           stock: 18,  unit: "kg",  cost: 650,  minAlert: 5,  category: "Meat",        station: "kitchen" },
  { id: "demo-inv-6",  name: "St. George Beer",   ameName: "ጊዮርጊስ ቢራ",       stock: 48,  unit: "btl", cost: 55,   minAlert: 12, category: "Beer",        station: "bar" },
  { id: "demo-inv-7",  name: "Tej Honey Wine",    ameName: "ጠጅ",              stock: 15,  unit: "L",   cost: 220,  minAlert: 4,  category: "Wine",        station: "bar" },
  { id: "demo-inv-8",  name: "Gin (local)",       ameName: "ጂን",              stock: 6,   unit: "btl", cost: 480,  minAlert: 2,  category: "Spirits",     station: "bar" },
  { id: "demo-inv-9",  name: "Soft Drinks",       ameName: "ለስላሳ",            stock: 36,  unit: "btl", cost: 35,   minAlert: 10, category: "Soft Drinks", station: "bar" },
  { id: "demo-inv-10", name: "Coffee Beans",      ameName: "ቡና",              stock: 10,  unit: "kg",  cost: 380,  minAlert: 3,  category: "Produce",     station: "both" },
];

const RECIPES = [
  { menuSuffix: "item-1", invId: "demo-inv-5", qty: 0.25 },
  { menuSuffix: "item-1", invId: "demo-inv-3", qty: 0.05 },
  { menuSuffix: "item-2", invId: "demo-inv-4", qty: 1 },
  { menuSuffix: "item-2", invId: "demo-inv-1", qty: 0.08 },
  { menuSuffix: "item-5", invId: "demo-inv-2", qty: 0.1 },
  { menuSuffix: "item-6", invId: "demo-inv-10", qty: 0.03 },
  { menuSuffix: "item-7", invId: "demo-inv-6", qty: 1 },
  { menuSuffix: "item-8", invId: "demo-inv-7", qty: 0.25 },
];

function menuId(suffix: string) {
  return `demo-${suffix}`;
}

async function seed() {
  await pool.connect().then(c => { c.release(); });
  await initSchema();

  const existing = await pool.query("SELECT id FROM tenants WHERE code = $1", [DEMO.code]);
  if (existing.rows.length) {
    await pool.query("DELETE FROM tenants WHERE code = $1", [DEMO.code]);
    console.log("Removed existing demo tenant");
  }

  const now = new Date();
  const subEnd = new Date(now);
  subEnd.setMonth(subEnd.getMonth() + 3);
  const hashed = await bcrypt.hash(DEMO.ownerPassword, 12);

  await pool.query(`
    INSERT INTO tenants (id, code, business_name, owner_name, phone, email, plan, status,
      trial_start, trial_end, subscription_start, subscription_end, branches,
      created_at, monthly_fee, currency, owner_password, business_size)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,NULL,$9,$10,$11,$12,$13,'ETB',$14,$15)
  `, [
    DEMO.id, DEMO.code, DEMO.businessName, DEMO.ownerName, DEMO.phone, DEMO.email,
    DEMO.plan, DEMO.status, now.toISOString(), subEnd.toISOString(), ["main", "bole"],
    now.toISOString(), 1499, hashed, DEMO.businessSize,
  ]);

  await pool.query(`
    INSERT INTO branch_locations (id, tenant_id, name, ame_name, location, phone, capacity) VALUES
      ('main', $1, 'Habesha Demo — Main', 'ዋና ቅርንጫፍ', 'Kazanchis, Addis Ababa', '+251911000000', 30),
      ('bole', $1, 'Bole Branch', 'ቦሌ ቅርንጫፍ', 'Bole Medhanialem, Addis Ababa', '+251911000001', 24)
  `, [DEMO.id]);

  await pool.query(`
    INSERT INTO settings (tenant_id, mode, allow_waiter_direct_order, allow_partial_serving,
      notify_waiter_on_ready, notify_cashier_on_ready, currency, tax_rate, receipt_footer,
      loyalty_points_per_birr, loyalty_birr_per_point)
    VALUES ($1,'hybrid',TRUE,TRUE,TRUE,TRUE,'ETB',15,'Thank you for dining at Habesha Demo! 🇪🇹',1,0.5)
  `, [DEMO.id]);

  const staffBranches: Record<string, string> = {
    "demo-owner": "main", "demo-waiter": "bole", "demo-kitchen": "main",
    "demo-bar": "bole", "demo-cashier": "main", "demo-manager": "main",
  };
  for (const s of STAFF) {
    await pool.query(
      `INSERT INTO staff (id, tenant_id, name, role, pin, branch, salary, hire_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [s.id, DEMO.id, s.name, s.role, s.pin, staffBranches[s.id] || "main",
       s.role === "manager" ? 12000 : 8000, "2025-01-15"],
    );
  }

  for (const item of menuItems) {
    const id = menuId(item.id);
    await pool.query(`
      INSERT INTO menu_items (id, tenant_id, name, ame_name, price, category, description, ame_description,
        prep_time, image, popularity, combos_suggestion, is_available)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)
    `, [
      id, DEMO.id, item.name, item.ameName, item.price, item.category,
      item.description, item.ameDescription, item.prepTime, item.image, item.popularity,
      item.combosSuggestion ? JSON.stringify(item.combosSuggestion) : null,
    ]);
  }

  for (const inv of INVENTORY) {
    await pool.query(`
      INSERT INTO inventory (id, tenant_id, name, ame_name, stock, unit, cost, min_alert, category, station)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [inv.id, DEMO.id, inv.name, inv.ameName, inv.stock, inv.unit, inv.cost, inv.minAlert, inv.category, inv.station]);
  }

  for (const r of RECIPES) {
    await pool.query(`
      INSERT INTO recipes (id, tenant_id, menu_item_id, inventory_id, qty_per_serve)
      VALUES ($1,$2,$3,$4,$5)
    `, [`demo-recipe-${r.menuSuffix}-${r.invId}`, DEMO.id, menuId(r.menuSuffix), r.invId, r.qty]);
  }

  const m1 = menuItems.find(m => m.id === "item-1")!;
  const m2 = menuItems.find(m => m.id === "item-2")!;
  const m7 = menuItems.find(m => m.id === "item-7")!;
  const m8 = menuItems.find(m => m.id === "item-8")!;

  const orderItems1 = [
    { menuItem: { ...m1, id: menuId(m1.id) }, quantity: 2, addedBy: "Almaz Tadesse", itemStatus: "Preparing", itemStation: "kitchen" },
    { menuItem: { ...m7, id: menuId(m7.id) }, quantity: 2, addedBy: "Almaz Tadesse", itemStatus: "Ready", itemStation: "bar" },
  ];
  const sub1 = 2 * m1.price + 2 * m7.price;
  const tax1 = Math.round(sub1 * 0.15);
  await pool.query(`
    INSERT INTO orders (id, tenant_id, table_id, type, items, subtotal, tax, total, status, payment_status, creation_time, station, waiter_name)
    VALUES ($1,$2,'T3','Dine-in',$3,$4,$5,$6,'Cooking','Unpaid',NOW() - INTERVAL '20 minutes','kitchen','Almaz Tadesse')
  `, ["demo-order-1", DEMO.id, JSON.stringify(orderItems1), sub1, tax1, sub1 + tax1]);

  const orderItems2 = [
    { menuItem: { ...m8, id: menuId(m8.id) }, quantity: 3, addedBy: "Almaz Tadesse", itemStatus: "Pending", itemStation: "bar" },
  ];
  const sub2 = 3 * m8.price;
  const tax2 = Math.round(sub2 * 0.15);
  await pool.query(`
    INSERT INTO orders (id, tenant_id, table_id, type, items, subtotal, tax, total, status, payment_status, creation_time, station, waiter_name)
    VALUES ($1,$2,'T7','Dine-in',$3,$4,$5,$6,'Pending','Unpaid',NOW() - INTERVAL '8 minutes','bar','Almaz Tadesse')
  `, ["demo-order-2", DEMO.id, JSON.stringify(orderItems2), sub2, tax2, sub2 + tax2]);

  const orderItems3 = [
    { menuItem: { ...m2, id: menuId(m2.id) }, quantity: 1, addedBy: "Almaz Tadesse", itemStatus: "Served", itemStation: "kitchen" },
    { menuItem: { ...m7, id: menuId(m7.id) }, quantity: 2, addedBy: "Almaz Tadesse", itemStatus: "Served", itemStation: "bar" },
  ];
  const sub3 = m2.price + 2 * m7.price;
  const tax3 = Math.round(sub3 * 0.15);
  await pool.query(`
    INSERT INTO orders (id, tenant_id, table_id, type, items, subtotal, tax, total, status, payment_status, payment_method, creation_time, station, waiter_name)
    VALUES ($1,$2,'T1','Dine-in',$3,$4,$5,$6,'Completed','Paid','Telebirr',NOW() - INTERVAL '2 hours','kitchen','Almaz Tadesse')
  `, ["demo-order-3", DEMO.id, JSON.stringify(orderItems3), sub3, tax3, sub3 + tax3]);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  await pool.query(`
    INSERT INTO orders (id, tenant_id, table_id, type, items, subtotal, tax, total, status, payment_status, payment_method, creation_time, station, waiter_name)
    VALUES ($1,$2,'T5','Dine-in',$3,1060,159,1219,'Completed','Paid','Cash',$4,'kitchen','Almaz Tadesse')
  `, ["demo-order-4", DEMO.id, JSON.stringify(orderItems1), yesterday.toISOString()]);

  await pool.query(`INSERT INTO expenses (id,tenant_id,category,description,amount,date,branch) VALUES
    ('demo-exp-1',$1,'Rent','Monthly rent — Bole branch',25000,$2,'main'),
    ('demo-exp-2',$1,'Utilities','Electricity & water',3200,$2,'main'),
    ('demo-exp-3',$1,'Supplies','Kitchen supplies restock',1800,$3,'main')
  `, [DEMO.id, now.toISOString().slice(0, 10), yesterday.toISOString().slice(0, 10)]);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  await pool.query(`
    INSERT INTO reservations (id,tenant_id,customer_name,phone,guests,date,time,table_id,status,note,branch)
    VALUES ('demo-res-1',$1,'Abebe Kebede','+251922111222',4,$2,'19:00','T4','Confirmed','Birthday dinner','main')
  `, [DEMO.id, tomorrow.toISOString().slice(0, 10)]);

  await pool.query(`
    INSERT INTO loyalty (id,tenant_id,customer_name,phone,points,total_spent,visits,tier)
    VALUES
      ('demo-loy-1',$1,'Sara Mekonnen','+251911222333',450,8500,12,'Gold'),
      ('demo-loy-2',$1,'Dawit Assefa','+251933444555',120,2100,4,'Bronze')
  `, [DEMO.id]);

  await pool.query(`
    INSERT INTO feedback (id,tenant_id,order_id,table_id,rating,comment,waiter_name,food_rating,service_rating,created_at)
    VALUES ('demo-fb-1',$1,'demo-order-3','T1',5,'Amazing doro wat! Best in Addis.','Almaz Tadesse',5,5,NOW() - INTERVAL '1 hour')
  `, [DEMO.id]);

  await pool.query(`
    INSERT INTO suppliers (id,tenant_id,name,phone,email,address,category,note)
    VALUES
      ('demo-sup-1',$1,'Mercato Spice Traders','+251911555666','spices@mercato.et','Mercato, Addis','Spices','Weekly berbere delivery'),
      ('demo-sup-2',$1,'Bole Beverages Ltd','+251911777888','orders@bolebev.et','Bole, Addis','Beverages','Beer & soft drinks')
  `, [DEMO.id]);

  await pool.query(`
    INSERT INTO purchase_orders (id,tenant_id,supplier,item,qty,cost,status,date)
    VALUES
      ('demo-po-1',$1,'Mercato Spice Traders','Berbere Spice',10,4500,'Ordered',$2),
      ('demo-po-2',$1,'Bole Beverages Ltd','St. George Beer',24,1320,'Draft',$2)
  `, [DEMO.id, now.toISOString().slice(0, 10)]);

  await pool.query(`
    INSERT INTO shifts (id,tenant_id,staff_id,staff_name,role,clock_in,clock_out,hours,tips,branch)
    VALUES ('demo-shift-1',$1,'demo-waiter','Almaz Tadesse','waiter',NOW() - INTERVAL '6 hours',NULL,NULL,0,'main')
  `, [DEMO.id]);

  await pool.query(`
    INSERT INTO notifications (id,tenant_id,order_id,table_id,items_summary,message,for_waiter,station)
    VALUES
      ('demo-notif-1',$1,'demo-order-1','T3','2x Special Beef Tibs','Kitchen: order T3 is preparing','Almaz Tadesse','kitchen'),
      ('demo-notif-2',$1,'demo-order-2','T7','3x Shekla Tej','Bar: new order for table T7',NULL,'bar')
  `, [DEMO.id]);

  console.log("\n✅ Demo account created successfully!\n");
  console.log("Restaurant code : DEMO");
  console.log("Business name   : Habesha Demo Restaurant");
  console.log("Plan            : Professional (large — all features enabled)\n");
  console.log("── Owner login ──");
  console.log("  Phone    : +251911000000");
  console.log("  Password : demo123\n");
  console.log("── Staff PINs (use code DEMO first) ──");
  console.log("  Waiter   : 1111  (Almaz Tadesse)");
  console.log("  Kitchen  : 2222  (Chef Bekele)");
  console.log("  Bar      : 3333  (Sara Bekele)");
  console.log("  Cashier  : 4444  (Yonas Haile)");
  console.log("  Manager  : 5555  (Hana Girma)\n");
  console.log("Seeded: 9 menu items, 10 inventory items, 8 recipes, 4 orders,");
  console.log("        expenses, reservations, loyalty, feedback, suppliers, POs, shifts\n");

  await pool.end();
}

seed().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});

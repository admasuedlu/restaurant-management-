const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/habesha_os'
});

async function q(text, params) {
  const client = await pool.connect();
  try { return await client.query(text, params); }
  finally { client.release(); }
}

async function seed() {
  console.log('🌱 Creating demo account...');

  const tenantId = 'tenant-demo-001';
  const code = 'DEMO';
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash('demo123456', 12);

  // Remove old demo if exists
  await q('DELETE FROM tenants WHERE code=$1', [code]);

  // Create tenant
  await q(`
    INSERT INTO tenants (id,code,business_name,owner_name,phone,email,plan,status,
      trial_start,trial_end,branches,created_at,monthly_fee,currency,owner_password)
    VALUES ($1,$2,$3,$4,$5,$6,'trial','active',$7,$8,ARRAY['main'],$9,0,'ETB',$10)
  `, [tenantId, code, 'Aura Demo Restaurant', 'Demo Manager', '0900000000',
      'demo@auraraisetech.com', now.toISOString(), trialEnd.toISOString(),
      now.toISOString(), hashedPassword]);

  await q(`INSERT INTO settings (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [tenantId]);

  await q(`
    INSERT INTO branch_locations (id,tenant_id,name,location,phone,capacity)
    VALUES ('main',$1,'Main Branch','Addis Ababa','0900000000',50)
    ON CONFLICT DO NOTHING
  `, [tenantId]);

  // Staff
  const staff = [
    ['owner-demo',    tenantId, 'Demo Owner',    'owner',   '1111', 'main', 10000, '2024-01-01'],
    ['manager-demo',  tenantId, 'Demo Manager',  'manager', '1234', 'main', 7000,  '2024-01-01'],
    ['waiter-demo-1', tenantId, 'Abebe Kebede',  'waiter',  '2222', 'main', 3000,  '2024-02-01'],
    ['waiter-demo-2', tenantId, 'Tigist Haile',  'waiter',  '3333', 'main', 3000,  '2024-03-01'],
    ['cashier-demo',  tenantId, 'Meseret Alemu', 'cashier', '4444', 'main', 4000,  '2024-01-15'],
    ['kitchen-demo',  tenantId, 'Tesfaye Worku', 'kitchen', '5555', 'main', 5000,  '2024-01-01'],
    ['bar-demo',      tenantId, 'Dawit Bekele',  'kitchen', '6666', 'main', 4500,  '2024-02-01'],
  ];
  for (const s of staff)
    await q(`INSERT INTO staff (id,tenant_id,name,role,pin,branch,salary,hire_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`, s);

  // Menu items
  const menu = [
    ['menu-d1',  tenantId, 'Doro Wat',           150, 'Main Dishes', 'Spicy Ethiopian chicken stew with injera', 20],
    ['menu-d2',  tenantId, 'Tibs',               130, 'Main Dishes', 'Sautéed beef with vegetables and spices',  15],
    ['menu-d3',  tenantId, 'Kitfo',              180, 'Main Dishes', 'Ethiopian steak tartare with spiced butter',15],
    ['menu-d4',  tenantId, 'Shiro Wat',           80, 'Main Dishes', 'Chickpea stew served with injera',         10],
    ['menu-d5',  tenantId, 'Ful',                 60, 'Breakfast',   'Fava bean stew with spices',               10],
    ['menu-d6',  tenantId, 'Firfir',              70, 'Breakfast',   'Torn injera with sauce',                   10],
    ['menu-d7',  tenantId, 'Ethiopian Coffee',    35, 'Beverages',   'Traditional coffee ceremony brew',          5],
    ['menu-d8',  tenantId, 'Fresh Juice',         55, 'Beverages',   'Seasonal fresh fruit juice',                5],
    ['menu-d9',  tenantId, 'Tej',                 65, 'Beverages',   'Traditional Ethiopian honey wine',          5],
    ['menu-d10', tenantId, 'Water',               20, 'Beverages',   'Bottled mineral water',                     2],
    ['menu-d11', tenantId, 'Special Combo',      250, 'Specials',    'Full Ethiopian feast for 2 people',        25],
    ['menu-d12', tenantId, 'Vegetarian Platter', 120, 'Specials',    'Mixed vegetarian dishes with injera',      20],
  ];
  for (const m of menu)
    await q(`INSERT INTO menu_items (id,tenant_id,name,price,category,description,prep_time,is_available)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT DO NOTHING`, m);

  // Inventory
  const inv = [
    ['inv-d1', tenantId, 'Teff Flour',    50, 'kg',  35, 10, 'Ingredients', 'kitchen'],
    ['inv-d2', tenantId, 'Chicken',       20, 'kg', 150,  5, 'Meat',        'kitchen'],
    ['inv-d3', tenantId, 'Beef',          15, 'kg', 280,  5, 'Meat',        'kitchen'],
    ['inv-d4', tenantId, 'Berbere Spice',  5, 'kg', 120,  1, 'Spices',      'kitchen'],
    ['inv-d5', tenantId, 'Cooking Oil',   10, 'L',   80,  2, 'Ingredients', 'kitchen'],
    ['inv-d6', tenantId, 'Onions',        30, 'kg',  15,  5, 'Vegetables',  'kitchen'],
    ['inv-d7', tenantId, 'Tomatoes',      20, 'kg',  25,  5, 'Vegetables',  'kitchen'],
    ['inv-d8', tenantId, 'Coffee Beans',   8, 'kg', 200,  2, 'Beverages',   'bar'    ],
  ];
  for (const i of inv)
    await q(`INSERT INTO inventory (id,tenant_id,name,stock,unit,cost,min_alert,category,station)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`, i);

  // Sample paid orders — items must match app's expected structure
  const orders = [
    ['order-d1', tenantId, 'T1', JSON.stringify([
      {menuItem:{id:'menu-d1',name:'Doro Wat',ameName:'',price:150,category:'Main Dishes'},quantity:2},
      {menuItem:{id:'menu-d7',name:'Ethiopian Coffee',ameName:'',price:35,category:'Beverages'},quantity:2}
    ]), 370, 55.5, 425.5, 'Abebe Kebede', 'Cash'],
    ['order-d2', tenantId, 'T2', JSON.stringify([
      {menuItem:{id:'menu-d3',name:'Kitfo',ameName:'',price:180,category:'Main Dishes'},quantity:1},
      {menuItem:{id:'menu-d8',name:'Fresh Juice',ameName:'',price:55,category:'Beverages'},quantity:1}
    ]), 235, 35.25, 270.25, 'Tigist Haile', 'Card'],
    ['order-d3', tenantId, 'T3', JSON.stringify([
      {menuItem:{id:'menu-d11',name:'Special Combo',ameName:'',price:250,category:'Specials'},quantity:2},
      {menuItem:{id:'menu-d9',name:'Tej',ameName:'',price:65,category:'Beverages'},quantity:3}
    ]), 695, 104.25, 799.25, 'Abebe Kebede', 'Cash'],
  ];
  for (const o of orders)
    await q(`INSERT INTO orders (id,tenant_id,table_id,type,items,subtotal,tax,total,status,payment_status,payment_method,waiter_name)
             VALUES ($1,$2,$3,'Dine-in',$4,$5,$6,$7,'Served','Paid',$9,$8) ON CONFLICT DO NOTHING`,
      [...o.slice(0,8), o[8]]);

  console.log('\n✅ Demo account created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DEMO ACCOUNT LOGIN DETAILS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Restaurant Code : DEMO');
  console.log('  Owner Password  : demo123456');
  console.log('  ');
  console.log('  Staff PINs:');
  console.log('    Owner    : 1111');
  console.log('    Manager  : 1234');
  console.log('    Waiter 1 : 2222');
  console.log('    Waiter 2 : 3333');
  console.log('    Cashier  : 4444');
  console.log('    Kitchen  : 5555');
  console.log('    Bar      : 6666  (uses kitchen role)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await pool.end();
}

seed().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

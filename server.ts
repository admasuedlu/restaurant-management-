import dotenv from "dotenv";
dotenv.config(); // Must run BEFORE database import so DATABASE_URL is set

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { pool, initSchema, query, transaction } from "./src/lib/database";

const app  = express();
const PORT = 3000;

// ─── Type Definitions ─────────────────────────────────────────────────────────

type SubscriptionPlan   = "trial" | "starter" | "professional" | "enterprise";
type SubscriptionStatus = "active" | "trial" | "expired" | "suspended" | "cancelled";
type WorkflowMode       = "cashier" | "waiter" | "hybrid";
type ItemStatus         = "Pending" | "Preparing" | "Ready" | "Served";

interface Tenant {
  id: string; code: string; businessName: string; ownerName: string;
  phone: string; email: string; plan: SubscriptionPlan; status: SubscriptionStatus;
  trialStart: string | null; trialEnd: string | null;
  subscriptionStart: string | null; subscriptionEnd: string | null;
  branches: string[]; createdAt: string; monthlyFee: number;
  currency: "ETB"; ownerPassword?: string; businessSize?: string;
}

interface MenuItem {
  id: string; name: string; ameName: string; price: number;
  category: "Fasting" | "Meat" | "Drinks" | "Dessert";
  description: string; ameDescription: string; prepTime: number;
  image: string; popularity: number;
  combosSuggestion?: { name: string; ameName: string; price: number; desc: string; ameDesc: string };
}

interface OrderItem {
  menuItem: MenuItem; quantity: number; addedBy: string;
  itemStatus?: ItemStatus; itemStation?: "kitchen" | "bar";
}

interface Order {
  id: string; tableId: string; type: "Dine-in" | "Takeaway" | "Delivery";
  items: OrderItem[]; subtotal: number; tax: number; total: number;
  status: "Pending" | "Cooking" | "Ready" | "Served" | "Completed";
  paymentStatus: "Unpaid" | "Paid";
  paymentMethod?: "Cash" | "Telebirr" | "CBE Birr" | "Card";
  creationTime: string; isVip?: boolean;
  station: "kitchen" | "bar"; groupId?: string; waiterName?: string;
}

interface InventoryItem {
  id: string; name: string; ameName: string; stock: number; unit: string;
  cost: number; minAlert: number;
  category: "Spices"|"Grains"|"Meat"|"Beverages"|"Dairy"|"Produce"|"Spirits"|"Beer"|"Wine"|"Soft Drinks"|"Juice";
  station: "kitchen" | "bar" | "both";
}

interface PurchaseOrder {
  id: string; supplier: string; item: string; qty: number;
  cost: number; status: "Draft"|"Sent"|"Received"; date: string;
}

interface StaffMember { id: string; name: string; role: string; pin: string; branch: string; }

interface StaffNotification {
  id: string; orderId: string; tableId: string; itemsSummary: string;
  message: string; time: string; isRead: boolean; forWaiter?: string; station?: string;
}

interface WorkflowSettings {
  mode: WorkflowMode; allowWaiterDirectOrder: boolean;
  allowPartialServing: boolean; notifyWaiterOnReady: boolean; notifyCashierOnReady: boolean;
}

// ─── Plan limits ─────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<SubscriptionPlan, { branches: number; staff: number; aiInsights: boolean; price: number; label: string }> = {
  trial:        { branches: 1,  staff: 5,    aiInsights: false, price: 0,    label: "Free Trial (14 days)"             },
  starter:      { branches: 1,  staff: 15,   aiInsights: false, price: 499,  label: "Starter — 499 ETB/mo"             },
  professional: { branches: 3,  staff: 50,   aiInsights: true,  price: 1499, label: "Professional — 1,499 ETB/mo"      },
  enterprise:   { branches: 99, staff: 9999, aiInsights: true,  price: 3999, label: "Enterprise — 3,999 ETB/mo"        },
};

// ─── Email / OTP ─────────────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "ediluadmasu@gmail.com";

const emailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,          // SSL on port 465
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: (process.env.EMAIL_PASS || "").replace(/\s/g, ""), // strip spaces from app password
  },
  connectionTimeout: 10000,
  greetingTimeout:   10000,
  socketTimeout:     15000,
});

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTPEmail(to: string, otp: string, purpose: "register" | "superadmin", businessName?: string): Promise<void> {
  const isAdmin = purpose === "superadmin";
  const subject = isAdmin
    ? "🔐 Habesha POS — Super Admin Login OTP"
    : `✅ Habesha POS — Verify Your Restaurant Registration`;

  const html = isAdmin ? `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);width:56px;height:56px;border-radius:14px;line-height:56px;font-size:24px;font-weight:900;color:#0f172a">H</div>
        <h2 style="color:#fbbf24;margin:12px 0 4px">Super Admin Access</h2>
        <p style="color:#64748b;font-size:13px;margin:0">Habesha Restaurant OS</p>
      </div>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center">
        <p style="color:#94a3b8;font-size:14px;margin:0 0 16px">Your one-time login code:</p>
        <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#f59e0b;font-family:monospace">${otp}</div>
        <p style="color:#64748b;font-size:12px;margin:16px 0 0">Expires in <strong style="color:#fbbf24">10 minutes</strong>. Do not share this code.</p>
      </div>
      <p style="color:#475569;font-size:11px;text-align:center;margin-top:24px">If you did not request this, your system may be under attack. Change your admin key immediately.</p>
    </div>
  ` : `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);width:56px;height:56px;border-radius:14px;line-height:56px;font-size:24px;font-weight:900;color:#0f172a">H</div>
        <h2 style="color:#fbbf24;margin:12px 0 4px">Verify Your Email</h2>
        <p style="color:#64748b;font-size:13px;margin:0">${businessName || "Restaurant Registration"}</p>
      </div>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center">
        <p style="color:#94a3b8;font-size:14px;margin:0 0 16px">Your verification code:</p>
        <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#10b981;font-family:monospace">${otp}</div>
        <p style="color:#64748b;font-size:12px;margin:16px 0 0">Expires in <strong style="color:#fbbf24">15 minutes</strong>.</p>
      </div>
      <p style="color:#475569;font-size:12px;margin-top:20px">Welcome to Habesha POS — the restaurant OS built for Ethiopia. 🇪🇹</p>
    </div>
  `;

  // 20-second hard timeout so the request never hangs forever
  await Promise.race([
    emailTransporter.sendMail({
      from: `"Habesha POS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Email send timeout after 20s")), 20000)
    ),
  ]);
}

async function createOTP(email: string, purpose: "register" | "superadmin", tenantId?: string): Promise<string> {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + (purpose === "superadmin" ? 10 : 15) * 60 * 1000);
  await query(
    `INSERT INTO email_otps (id, email, otp, purpose, tenant_id, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [`OTP-${Date.now()}`, email.toLowerCase(), otp, purpose, tenantId || null, expiresAt.toISOString()]
  );
  return otp;
}

async function verifyOTP(email: string, otp: string, purpose: "register" | "superadmin"): Promise<boolean> {
  const r = await query(
    `SELECT id FROM email_otps
     WHERE LOWER(email)=LOWER($1) AND otp=$2 AND purpose=$3 AND used=FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, otp, purpose]
  );
  if (!r.rows.length) return false;
  await query("UPDATE email_otps SET used=TRUE WHERE id=$1", [r.rows[0].id]);
  return true;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToTenant(r: any): Tenant {
  return {
    id: r.id, code: r.code, businessName: r.business_name, ownerName: r.owner_name,
    phone: r.phone, email: r.email || "", plan: r.plan, status: r.status,
    trialStart: r.trial_start ? new Date(r.trial_start).toISOString() : null,
    trialEnd:   r.trial_end   ? new Date(r.trial_end).toISOString()   : null,
    subscriptionStart: r.subscription_start ? new Date(r.subscription_start).toISOString() : null,
    subscriptionEnd:   r.subscription_end   ? new Date(r.subscription_end).toISOString()   : null,
    branches: r.branches || ["main"],
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    monthlyFee: Number(r.monthly_fee) || 0,
    currency: "ETB",
    ownerPassword: r.owner_password,
    businessSize: r.business_size || "medium",
  };
}

function rowToMenuItem(r: any): MenuItem {
  return {
    id: r.id, name: r.name, ameName: r.ame_name || r.name,
    price: Number(r.price), category: r.category,
    description: r.description || "", ameDescription: r.ame_description || "",
    prepTime: Number(r.prep_time) || 10,
    image: r.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
    popularity: Number(r.popularity) || 7.0,
    combosSuggestion: r.combos_suggestion || undefined,
  };
}

function rowToOrder(r: any): Order {
  return {
    id: r.id, tableId: r.table_id, type: r.type,
    items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items || []),
    subtotal: Number(r.subtotal), tax: Number(r.tax), total: Number(r.total),
    status: r.status, paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    creationTime: r.creation_time ? new Date(r.creation_time).toISOString() : new Date().toISOString(),
    isVip: r.is_vip || false,
    station: r.station, groupId: r.group_id, waiterName: r.waiter_name,
  };
}

function rowToInventory(r: any): InventoryItem {
  return {
    id: r.id, name: r.name, ameName: r.ame_name || r.name,
    stock: Number(r.stock), unit: r.unit, cost: Number(r.cost),
    minAlert: Number(r.min_alert), category: r.category, station: r.station,
  };
}

function rowToPO(r: any): PurchaseOrder {
  return {
    id: r.id, supplier: r.supplier, item: r.item,
    qty: Number(r.qty), cost: Number(r.cost), status: r.status, date: r.date,
  };
}

function rowToStaff(r: any): StaffMember {
  return { id: r.id, name: r.name, role: r.role, pin: r.pin || "", branch: r.branch || "main" };
}

function rowToNotification(r: any): StaffNotification {
  return {
    id: r.id, orderId: r.order_id || "", tableId: r.table_id || "",
    itemsSummary: r.items_summary || "", message: r.message || "",
    time: r.time ? new Date(r.time).toISOString() : new Date().toISOString(),
    isRead: r.is_read || false, forWaiter: r.for_waiter, station: r.station,
  };
}

function rowToSettings(r: any): WorkflowSettings {
  return {
    mode: r.mode || "hybrid",
    allowWaiterDirectOrder: r.allow_waiter_direct_order ?? true,
    allowPartialServing:    r.allow_partial_serving ?? true,
    notifyWaiterOnReady:    r.notify_waiter_on_ready ?? true,
    notifyCashierOnReady:   r.notify_cashier_on_ready ?? true,
  };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getTenant(code: string): Promise<Tenant | null> {
  const r = await query("SELECT * FROM tenants WHERE code = $1", [code.toUpperCase()]);
  return r.rows.length ? rowToTenant(r.rows[0]) : null;
}

async function getTenantById(id: string): Promise<Tenant | null> {
  const r = await query("SELECT * FROM tenants WHERE id = $1", [id]);
  return r.rows.length ? rowToTenant(r.rows[0]) : null;
}

async function getAllTenants(): Promise<Tenant[]> {
  const r = await query("SELECT * FROM tenants ORDER BY created_at DESC");
  return r.rows.map(rowToTenant);
}

async function saveTenant(t: Partial<Tenant> & { id: string }): Promise<void> {
  await query(`
    INSERT INTO tenants (id, code, business_name, owner_name, phone, email, plan, status,
      trial_start, trial_end, subscription_start, subscription_end, branches,
      created_at, monthly_fee, currency, owner_password)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (id) DO UPDATE SET
      code=EXCLUDED.code, business_name=EXCLUDED.business_name, owner_name=EXCLUDED.owner_name,
      phone=EXCLUDED.phone, email=EXCLUDED.email, plan=EXCLUDED.plan, status=EXCLUDED.status,
      trial_start=EXCLUDED.trial_start, trial_end=EXCLUDED.trial_end,
      subscription_start=EXCLUDED.subscription_start, subscription_end=EXCLUDED.subscription_end,
      branches=EXCLUDED.branches, monthly_fee=EXCLUDED.monthly_fee,
      owner_password=EXCLUDED.owner_password
  `, [
    t.id, t.code, t.businessName, t.ownerName, t.phone, t.email || "",
    t.plan || "trial", t.status || "pending",
    t.trialStart || null, t.trialEnd || null,
    t.subscriptionStart || null, t.subscriptionEnd || null,
    t.branches || ["main"], t.createdAt || new Date().toISOString(),
    t.monthlyFee || 0, "ETB", t.ownerPassword || null,
  ]);
}

async function ensureSettings(tenantId: string): Promise<WorkflowSettings> {
  const r = await query("SELECT * FROM settings WHERE tenant_id = $1", [tenantId]);
  if (r.rows.length) return rowToSettings(r.rows[0]);
  await query(`INSERT INTO settings (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [tenantId]);
  return { mode: "hybrid", allowWaiterDirectOrder: true, allowPartialServing: true, notifyWaiterOnReady: true, notifyCashierOnReady: true };
}

// ─── Subscription helpers ─────────────────────────────────────────────────────

const GRACE_DAYS = 7; // days after expiry before hard block

function getSubscriptionStatus(tenant: Tenant): {
  status: SubscriptionStatus; trialDaysLeft: number;
  daysOverdue: number; graceEnds: string | null;
} {
  const now = Date.now();
  if ((tenant.status as string) === "pending") return { status: "pending" as any, trialDaysLeft: 0, daysOverdue: 0, graceEnds: null };
  if (tenant.status === "suspended" || tenant.status === "cancelled") return { status: tenant.status, trialDaysLeft: 0, daysOverdue: 0, graceEnds: null };

  if (tenant.plan === "trial" && tenant.trialEnd) {
    const daysLeft = Math.ceil((new Date(tenant.trialEnd).getTime() - now) / 86400000);
    if (daysLeft <= 0) {
      const daysOverdue = Math.abs(daysLeft);
      if (daysOverdue <= GRACE_DAYS) {
        const graceEnds = new Date(new Date(tenant.trialEnd).getTime() + GRACE_DAYS * 86400000).toISOString();
        return { status: "grace" as any, trialDaysLeft: 0, daysOverdue, graceEnds };
      }
      return { status: "expired", trialDaysLeft: 0, daysOverdue, graceEnds: null };
    }
    return { status: "trial", trialDaysLeft: daysLeft, daysOverdue: 0, graceEnds: null };
  }

  if (tenant.subscriptionEnd) {
    const end = new Date(tenant.subscriptionEnd).getTime();
    if (end < now) {
      const daysOverdue = Math.ceil((now - end) / 86400000);
      if (daysOverdue <= GRACE_DAYS) {
        const graceEnds = new Date(end + GRACE_DAYS * 86400000).toISOString();
        return { status: "grace" as any, trialDaysLeft: 0, daysOverdue, graceEnds };
      }
      return { status: "expired", trialDaysLeft: 0, daysOverdue, graceEnds: null };
    }
    const daysLeft = Math.ceil((end - now) / 86400000);
    if (daysLeft <= 7) return { status: "expiring_soon" as any, trialDaysLeft: daysLeft, daysOverdue: 0, graceEnds: null };
  }
  return { status: "active", trialDaysLeft: 0, daysOverdue: 0, graceEnds: null };
}

// ─── Order helpers ────────────────────────────────────────────────────────────

function recomputeOrderStatus(order: Order): Order["status"] {
  if (order.items.length === 0) return "Pending";
  const s = order.items.map(i => i.itemStatus ?? "Pending");
  if (s.every(x => x === "Served")) return "Completed";
  if (s.every(x => x === "Served" || x === "Ready")) return "Ready";
  if (s.some(x => x === "Ready" || x === "Preparing")) return "Cooking";
  return "Pending";
}

async function pushNotification(tenantId: string, orderId: string, tableId: string, itemsSummary: string, message: string, forWaiter?: string, station?: string) {
  const id = `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await query(`
    INSERT INTO notifications (id, tenant_id, order_id, table_id, items_summary, message, for_waiter, station)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [id, tenantId, orderId, tableId, itemsSummary, message, forWaiter || null, station || null]);
  // Keep max 100
  await query(`DELETE FROM notifications WHERE tenant_id=$1 AND id NOT IN (SELECT id FROM notifications WHERE tenant_id=$1 ORDER BY time DESC LIMIT 100)`, [tenantId]);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

interface TenantRequest extends Request { tenant?: Tenant; }

async function requireTenant(req: TenantRequest, res: Response, next: NextFunction) {
  const code = (req.headers["x-tenant-code"] as string || req.query.tenant as string || "").toUpperCase().trim();
  if (!code) return res.status(400).json({ error: "Tenant code required (X-Tenant-Code header)" });
  try {
    const tenant = await getTenant(code);
    if (!tenant) return res.status(404).json({ error: "Restaurant not found. Check your code." });
    if ((tenant.status as string) === "pending") {
      return res.status(403).json({ error: "Registration pending approval.", status: "pending" });
    }
    const { status, trialDaysLeft, daysOverdue, graceEnds } = getSubscriptionStatus(tenant);
    if (status === "expired" || status === "suspended" || status === "cancelled") {
      return res.status(402).json({
        error: "Subscription expired or suspended.", status,
        tenantId: tenant.id, businessName: tenant.businessName,
        daysOverdue, plan: tenant.plan, monthlyFee: tenant.monthlyFee,
        ownerPhone: tenant.phone,
      });
    }
    req.tenant = { ...tenant, status };
    (req as any).trialDaysLeft = trialDaysLeft;
    (req as any).daysOverdue  = daysOverdue;
    (req as any).graceEnds    = graceEnds;
    next();
  } catch (e: any) {
    console.error("requireTenant error:", e.message);
    res.status(500).json({ error: "Database error" });
  }
}

// ─── Gemini AI ────────────────────────────────────────────────────────────────

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  try { ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } }); }
  catch (e) { console.error("Gemini init error:", e); }
} else { console.warn("⚠️  GEMINI_API_KEY not set — AI will use fallback."); }

app.use(express.json());

// ─── ADMIN ────────────────────────────────────────────────────────────────────

const ADMIN_KEY = process.env.ADMIN_KEY || "habesha-admin-2024";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(403).json({ error: "Admin access denied" });
  next();
}

app.get("/api/admin/tenants", requireAdmin, async (_req, res) => {
  try {
    const tenants = await getAllTenants();
    const enriched = await Promise.all(tenants.map(async t => {
      const { status, trialDaysLeft } = getSubscriptionStatus(t);
      const [orderCount, staffCount] = await Promise.all([
        query("SELECT COUNT(*) FROM orders WHERE tenant_id=$1", [t.id]).then(r => Number(r.rows[0].count)),
        query("SELECT COUNT(*) FROM staff WHERE tenant_id=$1", [t.id]).then(r => Number(r.rows[0].count)),
      ]);
      const { ownerPassword: _omit, ...safe } = t;
      return { ...safe, status, trialDaysLeft, orderCount, staffCount };
    }));
    res.json(enriched);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/tenants/:id/suspend", requireAdmin, async (req, res) => {
  try {
    await query("UPDATE tenants SET status='suspended' WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/tenants/:id/activate", requireAdmin, async (req, res) => {
  try {
    const t = await getTenantById(req.params.id);
    if (!t) return res.status(404).json({ error: "Tenant not found" });
    const from = t.subscriptionEnd && new Date(t.subscriptionEnd) > new Date() ? new Date(t.subscriptionEnd) : new Date();
    from.setDate(from.getDate() + 30);
    const plan = req.body.plan || t.plan;
    await query(`UPDATE tenants SET status='active', plan=$1, subscription_end=$2, subscription_start=COALESCE(subscription_start, NOW()) WHERE id=$3`,
      [plan, from.toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/tenants/:id/approve", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);
    await query(`UPDATE tenants SET status='trial', trial_start=$1, trial_end=$2 WHERE id=$3`,
      [now.toISOString(), trialEnd.toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/tenants/:id/reject", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM tenants WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/admin/tenants/:id", requireAdmin, async (req, res) => {
  try {
    const t = await getTenantById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const updated = { ...t, ...req.body, id: t.id };
    await saveTenant(updated);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/tenants/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM tenants WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/login", (req, res) => {
  const { key } = req.body;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: "Invalid admin key" });
  res.json({ id: "superadmin-1", name: "Super Admin", role: "superadmin", tenantCode: "SUPERADMIN", tenantName: "Habesha OS Admin" });
});

// ─── REGISTRATION ─────────────────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  const { businessName, ownerName, phone, email, password, plan = "trial", businessSize = "medium" } = req.body;
  if (!businessName || !ownerName || !phone || !password)
    return res.status(400).json({ error: "Business name, owner name, phone and password are required" });
  if (String(password).length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    // Duplicate phone check
    const dup = await query("SELECT id FROM tenants WHERE REPLACE(phone,' ','') = REPLACE($1,' ','')", [String(phone)]);
    if (dup.rows.length) return res.status(409).json({ error: "An account with this phone number already exists" });

    // Generate unique code
    const baseCode = businessName.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 12);
    let code = baseCode;
    let suffix = 1;
    while ((await query("SELECT id FROM tenants WHERE code=$1", [code])).rows.length) {
      code = `${baseCode}-${suffix++}`;
    }

    const tenantId = `tenant-${Date.now()}`;
    const now = new Date();
    await saveTenant({
      id: tenantId, code, businessName, ownerName, phone,
      email: email || "", plan: plan as SubscriptionPlan,
      status: "pending" as any,
      trialStart: null, trialEnd: null, subscriptionStart: null, subscriptionEnd: null,
      branches: ["main"], createdAt: now.toISOString(),
      monthlyFee: PLAN_LIMITS[plan as SubscriptionPlan]?.price ?? 0,
      currency: "ETB", ownerPassword: String(password),
    });

    // Store business_size
    await query(`UPDATE tenants SET business_size=$1 WHERE id=$2`, [String(businessSize), tenantId]);
    // Seed owner staff account
    await query(`INSERT INTO staff (id, tenant_id, name, role, pin, branch) VALUES ($1,$2,$3,'owner','',$4)`,
      [`owner-${tenantId}`, tenantId, ownerName, "main"]);
    // Seed default settings
    await query(`INSERT INTO settings (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [tenantId]);

    res.status(201).json({ success: true, code, businessName, plan, businessSize, status: "pending",
      message: `Registration submitted! Your restaurant code is ${code}. Awaiting admin approval.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── EMAIL OTP ────────────────────────────────────────────────────────────────

// Send OTP for registration email verification
app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
  const { email, businessName } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
    return res.status(503).json({ error: "Email service not configured. Contact admin." });
  try {
    const recent = await query(
      "SELECT COUNT(*) FROM email_otps WHERE LOWER(email)=LOWER($1) AND purpose='register' AND created_at > NOW() - INTERVAL '1 hour'",
      [email]
    );
    if (Number(recent.rows[0].count) >= 3)
      return res.status(429).json({ error: "Too many requests. Wait 1 hour." });
    const otp = await createOTP(email, "register");
    await sendOTPEmail(email, otp, "register", businessName);
    res.json({ success: true, message: "Verification code sent to " + email });
  } catch (e: any) {
    console.error("send-otp error:", e.message);
    res.status(500).json({ error: "Failed to send email: " + e.message });
  }
});

// Verify registration OTP
app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });
  try {
    const valid = await verifyOTP(email, otp, "register");
    if (!valid) return res.status(400).json({ error: "Invalid or expired code. Try again." });
    res.json({ success: true, verified: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Send OTP for super admin 2FA — key must be correct first
app.post("/api/admin/send-otp", async (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "Admin key required" });
  if (key !== process.env.ADMIN_KEY) return res.status(401).json({ error: "Invalid admin key" });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
    return res.status(503).json({ error: "Email service not configured." });
  try {
    const otp = await createOTP(SUPER_ADMIN_EMAIL, "superadmin");
    await sendOTPEmail(SUPER_ADMIN_EMAIL, otp, "superadmin");
    const masked = SUPER_ADMIN_EMAIL.replace(/(.{2})(.*)(@.*)/, "$1***$3");
    res.json({ success: true, message: `OTP sent to ${masked}` });
  } catch (e: any) {
    console.error("admin-send-otp error:", e.message);
    res.status(500).json({ error: "Failed to send email: " + e.message });
  }
});

// Verify super admin OTP
app.post("/api/admin/verify-otp", async (req: Request, res: Response) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: "OTP required" });
  try {
    const valid = await verifyOTP(SUPER_ADMIN_EMAIL, otp, "superadmin");
    if (!valid) return res.status(400).json({ error: "Invalid or expired code." });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────────

// Renew works even for expired tenants (admin records the payment)
app.post("/api/subscription/renew", async (req: TenantRequest, res) => {
  const { tenantId, plan, months = 1 } = req.body;
  if (!tenantId) return res.status(400).json({ error: "tenantId required" });
  try {
    const t = await getTenantById(tenantId);
    if (!t) return res.status(404).json({ error: "Tenant not found" });
    const newPlan = (plan || t.plan) as SubscriptionPlan;
    // Always extend from today if subscription has expired, otherwise from current end
    const base = t.subscriptionEnd && new Date(t.subscriptionEnd) > new Date() ? new Date(t.subscriptionEnd) : new Date();
    base.setDate(base.getDate() + 30 * Number(months));
    await query(
      `UPDATE tenants SET plan=$1, status='active', subscription_end=$2,
       subscription_start=COALESCE(subscription_start,NOW()), monthly_fee=$3 WHERE id=$4`,
      [newPlan, base.toISOString(), PLAN_LIMITS[newPlan].price, t.id]
    );
    // Log payment
    await query(
      `INSERT INTO payment_logs (id, tenant_id, amount, plan, months, recorded_at, recorded_by)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6) ON CONFLICT DO NOTHING`,
      [`PAY-${Date.now()}`, t.id, PLAN_LIMITS[newPlan].price * Number(months), newPlan, Number(months), req.body.recordedBy || "admin"]
    ).catch(() => {}); // payment_logs may not exist yet — ignore
    res.json({ success: true, plan: newPlan, subscriptionEnd: base.toISOString(), businessName: t.businessName });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── CHAPA PAYMENT INTEGRATION ───────────────────────────────────────────────

const CHAPA_SECRET     = process.env.CHAPA_SECRET_KEY || "";
const CHAPA_ENC_KEY    = process.env.CHAPA_ENCRYPTION_KEY || "";
const CHAPA_API        = "https://api.chapa.co/v1";
const APP_URL          = process.env.APP_URL || "http://localhost:3000";

// Initiate a Chapa payment for subscription renewal
app.post("/api/subscription/initiate-payment", async (req: Request, res: Response) => {
  const { tenantId, tenantCode, plan, months = 1 } = req.body;
  if ((!tenantId && !tenantCode) || !plan) return res.status(400).json({ error: "tenantId or tenantCode + plan required" });
  if (!CHAPA_SECRET) return res.status(503).json({ error: "Payment gateway not configured. Contact admin." });

  try {
    let t: Tenant | null = null;
    if (tenantId) {
      t = await getTenantById(tenantId);
    } else {
      const r = await query("SELECT * FROM tenants WHERE UPPER(code)=UPPER($1)", [tenantCode]);
      if (r.rows.length) t = rowToTenant(r.rows[0]);
    }
    if (!t) return res.status(404).json({ error: "Tenant not found" });
    if (!t) return res.status(404).json({ error: "Tenant not found" });

    const planKey = plan as SubscriptionPlan;
    const amount  = PLAN_LIMITS[planKey].price * Number(months);
    if (amount <= 0) return res.status(400).json({ error: "Invalid plan or free plan needs no payment" });

    const txRef = `HPOS-${t.code}-${Date.now()}`;

    // Store pending transaction
    await query(
      `INSERT INTO chapa_transactions (tx_ref, tenant_id, plan, months, amount, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',NOW())
       ON CONFLICT (tx_ref) DO NOTHING`,
      [txRef, t.id, planKey, Number(months), amount]
    );

    // Call Chapa initialize API
    const chapaRes = await fetch(`${CHAPA_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CHAPA_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount:       String(amount),
        currency:     "ETB",
        email:        t.email || `${t.code.toLowerCase()}@habeshapos.com`,
        first_name:   t.ownerName.split(" ")[0] || t.ownerName,
        last_name:    t.ownerName.split(" ").slice(1).join(" ") || "Owner",
        phone_number: t.phone,
        tx_ref:       txRef,
        callback_url: `${APP_URL}/api/subscription/chapa-webhook`,
        return_url:   `${APP_URL}/payment-success?ref=${txRef}`,
        "customization[title]":       "Habesha POS Subscription",
        "customization[description]": `${PLAN_LIMITS[planKey].label} — ${months} month(s) for ${t.businessName}`,
        "customization[logo]":        `${APP_URL}/logo.png`,
      }),
    });

    const chapaData = await chapaRes.json() as any;
    if (!chapaRes.ok || chapaData.status !== "success") {
      console.error("Chapa init failed:", chapaData);
      return res.status(502).json({ error: "Payment gateway error: " + (chapaData.message || "unknown") });
    }

    res.json({ checkoutUrl: chapaData.data.checkout_url, txRef });
  } catch (e: any) {
    console.error("initiate-payment error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Chapa webhook — called by Chapa after payment
app.post("/api/subscription/chapa-webhook", express.json({ type: "*/*" }), async (req: Request, res: Response) => {
  // Verify Chapa signature using encryption key
  const sig = req.headers["x-chapa-signature"] as string | undefined;
  if (sig && CHAPA_ENC_KEY) {
    const crypto = await import("crypto");
    const expected = crypto.createHmac("sha256", CHAPA_ENC_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (sig !== expected) {
      console.warn("Chapa webhook signature mismatch — ignored");
      return res.sendStatus(400);
    }
  }

  // Always respond 200 immediately so Chapa doesn't retry
  res.sendStatus(200);

  try {
    const txRef = req.body?.trx_ref || req.body?.tx_ref;
    if (!txRef) return;

    // Verify the transaction via Chapa verify API
    const verifyRes = await fetch(`${CHAPA_API}/transaction/verify/${txRef}`, {
      headers: { "Authorization": `Bearer ${CHAPA_SECRET}` },
    });
    const verifyData = await verifyRes.json() as any;

    if (!verifyRes.ok || verifyData.status !== "success") {
      console.warn("Chapa verify failed for", txRef, verifyData.message);
      return;
    }

    // Get the pending transaction record
    const txRow = await query("SELECT * FROM chapa_transactions WHERE tx_ref=$1", [txRef]);
    if (!txRow.rows.length) {
      console.warn("No pending tx for", txRef);
      return;
    }
    const tx = txRow.rows[0];
    if (tx.status === "completed") return; // already processed

    // Mark transaction complete
    await query("UPDATE chapa_transactions SET status='completed', completed_at=NOW() WHERE tx_ref=$1", [txRef]);

    // Renew subscription
    const t = await getTenantById(tx.tenant_id);
    if (!t) return;
    const newPlan = tx.plan as SubscriptionPlan;
    const base = t.subscriptionEnd && new Date(t.subscriptionEnd) > new Date()
      ? new Date(t.subscriptionEnd)
      : new Date();
    base.setDate(base.getDate() + 30 * Number(tx.months));
    await query(
      `UPDATE tenants SET plan=$1, status='active', subscription_end=$2,
       subscription_start=COALESCE(subscription_start,NOW()), monthly_fee=$3 WHERE id=$4`,
      [newPlan, base.toISOString(), PLAN_LIMITS[newPlan].price, t.id]
    );
    await query(
      `INSERT INTO payment_logs (id, tenant_id, amount, plan, months, recorded_at, recorded_by, note)
       VALUES ($1,$2,$3,$4,$5,NOW(),'chapa',$6) ON CONFLICT DO NOTHING`,
      [`PAY-${txRef}`, t.id, tx.amount, newPlan, tx.months, `Chapa tx: ${txRef}`]
    ).catch(() => {});
    console.log(`✅ Chapa payment verified for ${t.businessName} — plan: ${newPlan}, months: ${tx.months}`);
  } catch (e: any) {
    console.error("chapa-webhook error:", e.message);
  }
});

// Check payment status (polled by frontend after Chapa redirect)
app.get("/api/subscription/payment-result", async (req: Request, res: Response) => {
  const txRef = req.query.ref as string;
  if (!txRef) return res.status(400).json({ error: "ref required" });
  try {
    const txRow = await query("SELECT * FROM chapa_transactions WHERE tx_ref=$1", [txRef]);
    if (!txRow.rows.length) return res.status(404).json({ error: "Transaction not found" });
    const tx = txRow.rows[0];
    if (tx.status === "completed") {
      const t = await getTenantById(tx.tenant_id);
      return res.json({ status: "completed", businessName: t?.businessName, plan: tx.plan, months: tx.months });
    }
    // Not yet confirmed — verify directly
    if (CHAPA_SECRET) {
      const verifyRes = await fetch(`${CHAPA_API}/transaction/verify/${txRef}`, {
        headers: { "Authorization": `Bearer ${CHAPA_SECRET}` },
      });
      const verifyData = await verifyRes.json() as any;
      if (verifyRes.ok && verifyData.status === "success") {
        return res.json({ status: "completed" });
      }
    }
    return res.json({ status: tx.status });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/subscription/status", requireTenant, (req: TenantRequest, res) => {
  const { status, trialDaysLeft, daysOverdue, graceEnds } = getSubscriptionStatus(req.tenant!);
  res.json({ status, plan: req.tenant!.plan, trialDaysLeft, daysOverdue, graceEnds,
    subscriptionEnd: req.tenant!.subscriptionEnd, monthlyFee: req.tenant!.monthlyFee,
    businessName: req.tenant!.businessName, limits: PLAN_LIMITS[req.tenant!.plan] });
});

// Admin: get all tenants with payment status (for collections dashboard)
app.get("/api/admin/payment-status", requireAdmin, async (req, res) => {
  try {
    const all = await getAllTenants();
    const now = Date.now();
    const result = all.map(t => {
      const { status, trialDaysLeft, daysOverdue, graceEnds } = getSubscriptionStatus(t);
      return {
        id: t.id, code: t.code, businessName: t.businessName, ownerName: t.ownerName,
        phone: t.phone, plan: t.plan, monthlyFee: t.monthlyFee,
        status, trialDaysLeft, daysOverdue, graceEnds,
        subscriptionEnd: t.subscriptionEnd, createdAt: t.createdAt,
        businessSize: (t as any).businessSize || "medium",
      };
    }).sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin: suspend a tenant manually
app.post("/api/admin/tenants/:id/suspend", requireAdmin, async (req, res) => {
  try {
    await query("UPDATE tenants SET status='suspended' WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/pin", requireTenant, async (req: TenantRequest, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: "PIN required" });
  try {
    const r = await query("SELECT * FROM staff WHERE tenant_id=$1 AND pin=$2", [req.tenant!.id, String(pin)]);
    if (!r.rows.length) return res.status(401).json({ error: "Invalid PIN" });
    const staff = rowToStaff(r.rows[0]);
    const { pin: _omit, ...safe } = staff;
    const { status, trialDaysLeft } = getSubscriptionStatus(req.tenant!);
    res.json({ ...safe, tenantId: req.tenant!.id, tenantCode: req.tenant!.code,
      tenantName: req.tenant!.businessName, plan: req.tenant!.plan,
      subscriptionStatus: status, trialDaysLeft,
      daysOverdue: (req as any).daysOverdue ?? 0,
      graceEnds:   (req as any).graceEnds   ?? null,
      subscriptionEnd: req.tenant!.subscriptionEnd,
      monthlyFee:  req.tenant!.monthlyFee,
      businessSize: (req.tenant! as any).businessSize ?? "medium" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Lookup restaurant code by owner phone (for "forgot code" flow)
app.post("/api/auth/lookup-code", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });
  try {
    const r = await query(
      "SELECT code, business_name FROM tenants WHERE REPLACE(phone,' ','') = REPLACE($1,' ','')",
      [String(phone)]
    );
    if (!r.rows.length) return res.status(404).json({ error: "No account found" });
    res.json({ code: r.rows[0].code, businessName: r.rows[0].business_name });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/owner-login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: "Phone and password required" });
  try {
    const r = await query("SELECT * FROM tenants WHERE REPLACE(phone,' ','') = REPLACE($1,' ','')", [String(phone)]);
    if (!r.rows.length) return res.status(401).json({ error: "No account found with this phone number" });
    const tenant = rowToTenant(r.rows[0]);
    if ((tenant.status as string) === "pending")
      return res.status(403).json({ error: "Account pending admin approval. Please wait.", status: "pending" });
    if (!r.rows[0].owner_password) return res.status(401).json({ error: "Password not set. Contact admin." });
    if (r.rows[0].owner_password !== password) return res.status(401).json({ error: "Incorrect password" });
    const { status, trialDaysLeft } = getSubscriptionStatus(tenant);
    if (status === "expired" || status === "suspended" || status === "cancelled")
      return res.status(402).json({ error: "Subscription expired or suspended.", status });
    const sr = await query("SELECT * FROM staff WHERE tenant_id=$1 AND role='owner' LIMIT 1", [tenant.id]);
    const ownerStaff = sr.rows.length ? rowToStaff(sr.rows[0]) : { id: "owner-1", name: tenant.ownerName, role: "owner", pin: "", branch: "main" };
    const { status: s2, trialDaysLeft: t2, daysOverdue: d2, graceEnds: g2 } = getSubscriptionStatus(tenant);
    res.json({ id: ownerStaff.id, name: ownerStaff.name, role: "owner",
      tenantId: tenant.id, tenantCode: tenant.code, tenantName: tenant.businessName,
      plan: tenant.plan, subscriptionStatus: s2, trialDaysLeft: t2,
      daysOverdue: d2, graceEnds: g2,
      subscriptionEnd: tenant.subscriptionEnd,
      monthlyFee: tenant.monthlyFee,
      businessSize: r.rows[0].business_size || "medium" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── TENANT INFO ──────────────────────────────────────────────────────────────

app.get("/api/tenant", requireTenant, (req: TenantRequest, res) => {
  const t = req.tenant!;
  const { status, trialDaysLeft } = getSubscriptionStatus(t);
  res.json({ id: t.id, code: t.code, businessName: t.businessName, ownerName: t.ownerName,
    phone: t.phone, email: t.email, plan: t.plan, status, trialDaysLeft,
    branches: t.branches, subscriptionEnd: t.subscriptionEnd, trialEnd: t.trialEnd });
});

// ─── MENU ─────────────────────────────────────────────────────────────────────

app.get("/api/menu", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM menu_items WHERE tenant_id=$1 ORDER BY popularity DESC", [req.tenant!.id]);
    res.json(r.rows.map(rowToMenuItem));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/menu", requireTenant, async (req: TenantRequest, res) => {
  const { name, ameName, price, category, description, ameDescription, prepTime, image, popularity, combosSuggestion } = req.body;
  if (!name || !price || !category) return res.status(400).json({ error: "name, price, category required" });
  try {
    const id = `item-${Date.now()}`;
    await query(`INSERT INTO menu_items (id, tenant_id, name, ame_name, price, category, description, ame_description, prep_time, image, popularity, combos_suggestion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, req.tenant!.id, name, ameName || name, Number(price), category,
       description || "", ameDescription || "", Number(prepTime) || 10,
       image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
       Number(popularity) || 7.0, combosSuggestion ? JSON.stringify(combosSuggestion) : null]);
    const r = await query("SELECT * FROM menu_items WHERE id=$1", [id]);
    res.status(201).json(rowToMenuItem(r.rows[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/menu/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM menu_items WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    const cur = rowToMenuItem(r.rows[0]);
    const upd = { ...cur, ...req.body, id: cur.id };
    await query(`UPDATE menu_items SET name=$1, ame_name=$2, price=$3, category=$4, description=$5, ame_description=$6, prep_time=$7, image=$8, popularity=$9, combos_suggestion=$10 WHERE id=$11`,
      [upd.name, upd.ameName, upd.price, upd.category, upd.description, upd.ameDescription,
       upd.prepTime, upd.image, upd.popularity, upd.combosSuggestion ? JSON.stringify(upd.combosSuggestion) : null, upd.id]);
    res.json(upd);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/menu/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("DELETE FROM menu_items WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────

app.get("/api/orders", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM orders WHERE tenant_id=$1 ORDER BY creation_time DESC", [req.tenant!.id]);
    res.json(r.rows.map(rowToOrder));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/orders", requireTenant, async (req: TenantRequest, res) => {
  const { tableId, type, items, subtotal, isVip, waiterName } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: "No items" });
  try {
    const settings = await ensureSettings(req.tenant!.id);
    const kitchenItems: OrderItem[] = items.filter((i: OrderItem) => i.menuItem?.category !== "Drinks");
    const barItems: OrderItem[]     = items.filter((i: OrderItem) => i.menuItem?.category === "Drinks");
    const fullSub = items.reduce((s: number, i: OrderItem) => s + i.menuItem.price * i.quantity, 0);
    const discountRatio = fullSub > 0 ? Math.max(0, 1 - (Number(subtotal) || fullSub) / fullSub) : 0;
    const groupId = `GRP-${Date.now()}`;
    const created: Order[] = [];

    const buildOrder = async (stItems: OrderItem[], station: "kitchen"|"bar") => {
      if (stItems.length === 0) return;
      const raw   = stItems.reduce((s: number, i: OrderItem) => s + i.menuItem.price * i.quantity, 0);
      const stSub = parseFloat((raw * (1 - discountRatio)).toFixed(2));
      const stTax = parseFloat((stSub * 0.15).toFixed(2));
      const stamped = stItems.map(i => ({ ...i, itemStation: station, itemStatus: "Pending" as ItemStatus }));
      const order: Order = {
        id: `ORD-${Math.floor(100 + Math.random() * 900)}${station === "bar" ? "-B" : ""}`,
        tableId: tableId || "Counter", type: type || "Dine-in", items: stamped,
        subtotal: stSub, tax: stTax, total: parseFloat((stSub + stTax).toFixed(2)),
        status: "Pending", paymentStatus: "Unpaid",
        creationTime: new Date().toISOString(), isVip: !!isVip,
        station, groupId, waiterName: waiterName || "Counter",
      };
      await query(`INSERT INTO orders (id, tenant_id, table_id, type, items, subtotal, tax, total, status, payment_status, creation_time, is_vip, station, group_id, waiter_name)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [order.id, req.tenant!.id, order.tableId, order.type, JSON.stringify(order.items),
         order.subtotal, order.tax, order.total, order.status, order.paymentStatus,
         order.creationTime, order.isVip, order.station, order.groupId, order.waiterName]);

      // ── Auto-deduct inventory based on recipes ─────────────────────────────
      for (const item of stItems) {
        const recipes = await query(
          `SELECT inventory_id, qty_per_serve FROM recipes WHERE tenant_id=$1 AND menu_item_id=$2`,
          [req.tenant!.id, item.menuItem.id]
        );
        for (const rec of recipes.rows) {
          const deduct = rec.qty_per_serve * item.quantity;
          await query(
            `UPDATE inventory SET stock = GREATEST(0, stock - $1) WHERE id=$2 AND tenant_id=$3`,
            [deduct, rec.inventory_id, req.tenant!.id]
          );
        }
      }

      created.push(order);
    };

    await buildOrder(kitchenItems, "kitchen");
    await buildOrder(barItems, "bar");
    if (created.length === 0) return res.status(400).json({ error: "No routable items" });
    res.status(201).json(created.length === 1 ? created[0] : created);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/orders/:id/status", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM orders WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    await query("UPDATE orders SET status=$1 WHERE id=$2", [req.body.status, req.params.id]);
    res.json({ ...rowToOrder(r.rows[0]), status: req.body.status });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/orders/:id/items/:index/status", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM orders WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Order not found" });
    const order = rowToOrder(r.rows[0]);
    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= order.items.length) return res.status(400).json({ error: "Invalid item index" });
    order.items[idx].itemStatus = req.body.status as ItemStatus;
    const newStatus = recomputeOrderStatus(order);
    await query("UPDATE orders SET items=$1, status=$2 WHERE id=$3", [JSON.stringify(order.items), newStatus, order.id]);
    const settings = await ensureSettings(req.tenant!.id);
    if (newStatus === "Ready" && order.status !== "Ready" && settings.notifyWaiterOnReady) {
      const summary = order.items.map(i => `${i.quantity}× ${i.menuItem.name}`).join(", ");
      await pushNotification(req.tenant!.id, order.id, order.tableId, summary,
        `${order.station === "bar" ? "🍻 Bar" : "🍳 Kitchen"} — ${order.id} (${order.tableId}) READY: ${summary}`,
        order.waiterName, order.station);
    }
    res.json({ order: { ...order, status: newStatus }, itemIndex: idx, itemStatus: req.body.status });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/orders/:id/pay", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM orders WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    await query("UPDATE orders SET payment_status='Paid', payment_method=$1 WHERE id=$2",
      [req.body.paymentMethod || "Cash", req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── INVENTORY ────────────────────────────────────────────────────────────────

app.get("/api/inventory", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM inventory WHERE tenant_id=$1 ORDER BY name", [req.tenant!.id]);
    res.json(r.rows.map(rowToInventory));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/inventory/kitchen", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM inventory WHERE tenant_id=$1 AND station IN ('kitchen','both') ORDER BY name", [req.tenant!.id]);
    res.json(r.rows.map(rowToInventory));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/inventory/bar", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM inventory WHERE tenant_id=$1 AND station IN ('bar','both') ORDER BY name", [req.tenant!.id]);
    res.json(r.rows.map(rowToInventory));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/inventory", requireTenant, async (req: TenantRequest, res) => {
  const { name, ameName, stock, unit, cost, minAlert, category, station } = req.body;
  if (!name || !unit || !category) return res.status(400).json({ error: "name, unit, category required" });
  try {
    const id = `inv-${Date.now()}`;
    await query(`INSERT INTO inventory (id, tenant_id, name, ame_name, stock, unit, cost, min_alert, category, station) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, req.tenant!.id, name, ameName || name, Number(stock) || 0, unit, Number(cost) || 0, Number(minAlert) || 5, category, station || "kitchen"]);
    const r = await query("SELECT * FROM inventory WHERE id=$1", [id]);
    res.status(201).json(rowToInventory(r.rows[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/inventory/adjust", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM inventory WHERE id=$1 AND tenant_id=$2", [req.body.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    const newStock = Math.max(0, parseFloat((Number(r.rows[0].stock) + Number(req.body.adjustment)).toFixed(2)));
    await query("UPDATE inventory SET stock=$1 WHERE id=$2", [newStock, req.body.id]);
    res.json({ ...rowToInventory(r.rows[0]), stock: newStock });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────

app.get("/api/purchase-orders", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM purchase_orders WHERE tenant_id=$1 ORDER BY date DESC", [req.tenant!.id]);
    res.json(r.rows.map(rowToPO));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/purchase-orders", requireTenant, async (req: TenantRequest, res) => {
  const { supplier, item, qty, cost } = req.body;
  if (!item || !qty) return res.status(400).json({ error: "item and qty required" });
  try {
    const id = `PO-${Math.floor(304 + Math.random() * 600)}`;
    const date = new Date().toISOString().split("T")[0];
    await query(`INSERT INTO purchase_orders (id, tenant_id, supplier, item, qty, cost, status, date) VALUES ($1,$2,$3,$4,$5,$6,'Draft',$7)`,
      [id, req.tenant!.id, supplier || "Mercato Central Market", item, Number(qty), Number(cost) || 0, date]);
    const r = await query("SELECT * FROM purchase_orders WHERE id=$1", [id]);
    res.status(201).json(rowToPO(r.rows[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/purchase-orders/:id/status", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM purchase_orders WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    await query("UPDATE purchase_orders SET status=$1 WHERE id=$2", [req.body.status, req.params.id]);
    if (req.body.status === "Received") {
      const po = rowToPO(r.rows[0]);
      await query(`UPDATE inventory SET stock = stock + $1 WHERE tenant_id=$2 AND (LOWER(name) LIKE $3 OR LOWER($4) LIKE '%' || LOWER(name) || '%')`,
        [po.qty, req.tenant!.id, `%${po.item.split(" ")[0].toLowerCase()}%`, po.item.toLowerCase()]);
    }
    res.json({ ...rowToPO(r.rows[0]), status: req.body.status });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── STAFF ────────────────────────────────────────────────────────────────────

app.get("/api/staff", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT id, tenant_id, name, role, branch FROM staff WHERE tenant_id=$1 ORDER BY name", [req.tenant!.id]);
    res.json(r.rows.map(rowToStaff));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/staff", requireTenant, async (req: TenantRequest, res) => {
  const { name, role, pin, branch } = req.body;
  if (!name || !role || !pin) return res.status(400).json({ error: "name, role, pin required" });
  try {
    const dup = await query("SELECT id FROM staff WHERE tenant_id=$1 AND pin=$2", [req.tenant!.id, String(pin)]);
    if (dup.rows.length) return res.status(409).json({ error: "PIN already in use" });
    const cnt = await query("SELECT COUNT(*) FROM staff WHERE tenant_id=$1", [req.tenant!.id]);
    const limits = PLAN_LIMITS[req.tenant!.plan];
    if (Number(cnt.rows[0].count) >= limits.staff) return res.status(403).json({ error: `Plan limit: max ${limits.staff} staff.` });
    const id = `st-${Date.now()}`;
    await query(`INSERT INTO staff (id, tenant_id, name, role, pin, branch) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, req.tenant!.id, name, role, String(pin), branch || "main"]);
    res.status(201).json({ id, name, role, branch: branch || "main" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/staff/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM staff WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    if (req.body.pin) {
      const dup = await query("SELECT id FROM staff WHERE tenant_id=$1 AND pin=$2 AND id<>$3", [req.tenant!.id, req.body.pin, req.params.id]);
      if (dup.rows.length) return res.status(409).json({ error: "PIN already in use" });
    }
    const cur = rowToStaff(r.rows[0]);
    const upd = { ...cur, ...req.body, id: cur.id };
    await query("UPDATE staff SET name=$1, role=$2, pin=$3, branch=$4 WHERE id=$5",
      [upd.name, upd.role, upd.pin || cur.pin, upd.branch, upd.id]);
    const { pin: _omit, ...safe } = upd;
    res.json(safe);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/staff/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("DELETE FROM staff WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

app.get("/api/notifications", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { waiter } = req.query;
    const r = waiter
      ? await query("SELECT * FROM notifications WHERE tenant_id=$1 AND (for_waiter IS NULL OR for_waiter=$2) ORDER BY time DESC LIMIT 100", [req.tenant!.id, waiter])
      : await query("SELECT * FROM notifications WHERE tenant_id=$1 ORDER BY time DESC LIMIT 100", [req.tenant!.id]);
    res.json(r.rows.map(rowToNotification));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/notifications/read-all", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("UPDATE notifications SET is_read=TRUE WHERE tenant_id=$1", [req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

app.get("/api/settings", requireTenant, async (req: TenantRequest, res) => {
  try {
    res.json(await ensureSettings(req.tenant!.id));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/settings", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { mode, allowWaiterDirectOrder, allowPartialServing, notifyWaiterOnReady, notifyCashierOnReady } = req.body;
    await query(`INSERT INTO settings (tenant_id, mode, allow_waiter_direct_order, allow_partial_serving, notify_waiter_on_ready, notify_cashier_on_ready)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (tenant_id) DO UPDATE SET mode=EXCLUDED.mode,
        allow_waiter_direct_order=EXCLUDED.allow_waiter_direct_order,
        allow_partial_serving=EXCLUDED.allow_partial_serving,
        notify_waiter_on_ready=EXCLUDED.notify_waiter_on_ready,
        notify_cashier_on_ready=EXCLUDED.notify_cashier_on_ready`,
      [req.tenant!.id, mode || "hybrid", allowWaiterDirectOrder ?? true, allowPartialServing ?? true,
       notifyWaiterOnReady ?? true, notifyCashierOnReady ?? true]);
    res.json(await ensureSettings(req.tenant!.id));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────

app.post("/api/ai-insights", requireTenant, async (req: TenantRequest, res) => {
  const limits = PLAN_LIMITS[req.tenant!.plan];
  if (!limits.aiInsights) return res.status(403).json({ error: "AI Insights requires Professional or Enterprise plan." });
  const { salesSummary, inventorySummary, currentBranch, lang } = req.body;
  const isAmharic = lang === "am";
  try {
    if (ai) {
      const r = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Branch: ${currentBranch}. Sales: ${salesSummary?.totalSales} ETB. Top: ${salesSummary?.topDish}. Teff: ${inventorySummary?.teffStock}kg, Kibe: ${inventorySummary?.butterStock}kg.`,
        config: { systemInstruction: `You are "Admasu-AI", an advanced restaurant business intelligence consultant for Ethiopian hospitality. Provide 4 actionable bullet points as HTML.`, temperature: 0.85 },
      });
      res.json({ insights: r.text || "No insights" });
    } else {
      res.json({ insights: isAmharic ? "<p>AI ቁልፍ አልተቀናጀም</p>" : "<p>AI key not configured.</p>" });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS / SALES DASHBOARD ─────────────────────────────────────────────

app.get("/api/analytics/sales", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { period = "today", branch } = req.query;
    const tid = req.tenant!.id;
    let fromDate: Date;
    const now = new Date();
    if (period === "today") { fromDate = new Date(now); fromDate.setHours(0,0,0,0); }
    else if (period === "week") { fromDate = new Date(now); fromDate.setDate(now.getDate() - 7); }
    else if (period === "month") { fromDate = new Date(now); fromDate.setDate(1); fromDate.setHours(0,0,0,0); }
    else if (period === "year") { fromDate = new Date(now.getFullYear(), 0, 1); }
    else { fromDate = new Date(now); fromDate.setHours(0,0,0,0); }

    const [revenue, topItems, hourly, payMethods, orderTypes, waiterStats] = await Promise.all([
      // Revenue totals
      query(`SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total),0) as total_revenue,
        COALESCE(SUM(subtotal),0) as subtotal,
        COALESCE(SUM(tax),0) as tax_collected,
        COUNT(CASE WHEN payment_status='Paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN payment_status='Unpaid' THEN 1 END) as unpaid_orders
        FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'`, [tid, fromDate]),

      // Top menu items
      query(`SELECT item->'menuItem'->>'name' as name,
        SUM((item->>'quantity')::int) as qty,
        SUM((item->'menuItem'->>'price')::numeric * (item->>'quantity')::int) as revenue
        FROM orders, jsonb_array_elements(items) as item
        WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'
        GROUP BY name ORDER BY qty DESC LIMIT 10`, [tid, fromDate]),

      // Hourly breakdown (today only)
      query(`SELECT EXTRACT(HOUR FROM creation_time) as hour, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
        FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'
        GROUP BY hour ORDER BY hour`, [tid, fromDate]),

      // Payment methods
      query(`SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as amount
        FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'
        GROUP BY payment_method`, [tid, fromDate]),

      // Order types
      query(`SELECT type, COUNT(*) as count, COALESCE(SUM(total),0) as revenue
        FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'
        GROUP BY type`, [tid, fromDate]),

      // Waiter performance
      query(`SELECT waiter_name, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
        FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'
        AND waiter_name IS NOT NULL
        GROUP BY waiter_name ORDER BY revenue DESC`, [tid, fromDate]),
    ]);

    // Expenses for period
    const expenses = await query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=$1 AND date>=$2`,
      [tid, fromDate.toISOString().split("T")[0]]);

    const totalRevenue = Number(revenue.rows[0]?.total_revenue || 0);
    const totalExpenses = Number(expenses.rows[0]?.total || 0);

    res.json({
      period,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      orderCount: Number(revenue.rows[0]?.order_count || 0),
      paidOrders: Number(revenue.rows[0]?.paid_orders || 0),
      unpaidOrders: Number(revenue.rows[0]?.unpaid_orders || 0),
      taxCollected: Number(revenue.rows[0]?.tax_collected || 0),
      topItems: topItems.rows.map((r: any) => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) })),
      hourly: hourly.rows.map((r: any) => ({ hour: Number(r.hour), orders: Number(r.orders), revenue: Number(r.revenue) })),
      paymentMethods: payMethods.rows.map((r: any) => ({ method: r.payment_method || "Cash", count: Number(r.count), amount: Number(r.amount) })),
      orderTypes: orderTypes.rows.map((r: any) => ({ type: r.type, count: Number(r.count), revenue: Number(r.revenue) })),
      waiterStats: waiterStats.rows.map((r: any) => ({ name: r.waiter_name, orders: Number(r.orders), revenue: Number(r.revenue) })),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Compare today vs yesterday
app.get("/api/analytics/compare", requireTenant, async (req: TenantRequest, res) => {
  try {
    const tid = req.tenant!.id;
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const [tod, yes] = await Promise.all([
      query(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND payment_status='Paid'`, [tid, today]),
      query(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders FROM orders WHERE tenant_id=$1 AND creation_time>=$2 AND creation_time<$3 AND payment_status='Paid'`, [tid, yesterday, today]),
    ]);
    res.json({
      today: { revenue: Number(tod.rows[0]?.revenue||0), orders: Number(tod.rows[0]?.orders||0) },
      yesterday: { revenue: Number(yes.rows[0]?.revenue||0), orders: Number(yes.rows[0]?.orders||0) },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── EXPENSES ────────────────────────────────────────────────────────────────

app.get("/api/expenses", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { from, to } = req.query;
    let q = "SELECT * FROM expenses WHERE tenant_id=$1";
    const params: any[] = [req.tenant!.id];
    if (from) { params.push(from); q += ` AND date>=$${params.length}`; }
    if (to)   { params.push(to);   q += ` AND date<=$${params.length}`; }
    q += " ORDER BY date DESC, created_at DESC";
    const r = await query(q, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/expenses", requireTenant, async (req: TenantRequest, res) => {
  const { category, description, amount, date, branch } = req.body;
  if (!category || !description || !amount) return res.status(400).json({ error: "category, description, amount required" });
  try {
    const id = `exp-${Date.now()}`;
    const d = date || new Date().toISOString().split("T")[0];
    await query(`INSERT INTO expenses (id,tenant_id,category,description,amount,date,branch) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.tenant!.id, category, description, Number(amount), d, branch || "main"]);
    const r = await query("SELECT * FROM expenses WHERE id=$1", [id]);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/expenses/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { category, description, amount, date } = req.body;
    await query(`UPDATE expenses SET category=$1, description=$2, amount=$3, date=$4 WHERE id=$5 AND tenant_id=$6`,
      [category, description, Number(amount), date, req.params.id, req.tenant!.id]);
    const r = await query("SELECT * FROM expenses WHERE id=$1", [req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/expenses/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("DELETE FROM expenses WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── RECIPES ─────────────────────────────────────────────────────────────────

app.get("/api/recipes", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query(`
      SELECT rec.*, mi.name as menu_name, mi.price as menu_price,
        inv.name as inv_name, inv.unit, inv.cost as inv_cost
      FROM recipes rec
      JOIN menu_items mi ON mi.id=rec.menu_item_id
      JOIN inventory inv ON inv.id=rec.inventory_id
      WHERE rec.tenant_id=$1 ORDER BY mi.name, inv.name`, [req.tenant!.id]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/recipes", requireTenant, async (req: TenantRequest, res) => {
  const { menuItemId, inventoryId, qtyPerServe } = req.body;
  if (!menuItemId || !inventoryId || !qtyPerServe) return res.status(400).json({ error: "menuItemId, inventoryId, qtyPerServe required" });
  try {
    const id = `rec-${Date.now()}`;
    await query(`INSERT INTO recipes (id,tenant_id,menu_item_id,inventory_id,qty_per_serve) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT DO NOTHING`,
      [id, req.tenant!.id, menuItemId, inventoryId, Number(qtyPerServe)]);
    res.status(201).json({ id, menuItemId, inventoryId, qtyPerServe: Number(qtyPerServe) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/recipes/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("DELETE FROM recipes WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get cost breakdown for a menu item
app.get("/api/recipes/cost/:menuItemId", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query(`
      SELECT rec.qty_per_serve, inv.name, inv.unit, inv.cost, inv.stock,
        (rec.qty_per_serve * inv.cost) as line_cost
      FROM recipes rec JOIN inventory inv ON inv.id=rec.inventory_id
      WHERE rec.tenant_id=$1 AND rec.menu_item_id=$2`, [req.tenant!.id, req.params.menuItemId]);
    const totalCost = r.rows.reduce((s: number, row: any) => s + Number(row.line_cost), 0);
    const mi = await query("SELECT price FROM menu_items WHERE id=$1", [req.params.menuItemId]);
    const price = mi.rows[0] ? Number(mi.rows[0].price) : 0;
    res.json({ ingredients: r.rows, totalCost, price, margin: price - totalCost, marginPct: price > 0 ? ((price-totalCost)/price*100).toFixed(1) : "0" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SHIFTS ──────────────────────────────────────────────────────────────────

app.get("/api/shifts", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { date, staffId } = req.query;
    let q = "SELECT * FROM shifts WHERE tenant_id=$1";
    const params: any[] = [req.tenant!.id];
    if (date) { params.push(date); q += ` AND DATE(clock_in)=$${params.length}`; }
    if (staffId) { params.push(staffId); q += ` AND staff_id=$${params.length}`; }
    q += " ORDER BY clock_in DESC";
    const r = await query(q, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/shifts/clock-in", requireTenant, async (req: TenantRequest, res) => {
  const { staffId, staffName, role, branch } = req.body;
  if (!staffId || !staffName) return res.status(400).json({ error: "staffId and staffName required" });
  try {
    // Check already clocked in
    const open = await query("SELECT id FROM shifts WHERE tenant_id=$1 AND staff_id=$2 AND clock_out IS NULL", [req.tenant!.id, staffId]);
    if (open.rows.length) return res.status(409).json({ error: "Already clocked in" });
    const id = `shift-${Date.now()}`;
    await query(`INSERT INTO shifts (id,tenant_id,staff_id,staff_name,role,clock_in,branch) VALUES ($1,$2,$3,$4,$5,NOW(),$6)`,
      [id, req.tenant!.id, staffId, staffName, role || "staff", branch || "main"]);
    const r = await query("SELECT * FROM shifts WHERE id=$1", [id]);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/shifts/clock-out", requireTenant, async (req: TenantRequest, res) => {
  const { staffId, tips, note } = req.body;
  if (!staffId) return res.status(400).json({ error: "staffId required" });
  try {
    const open = await query("SELECT * FROM shifts WHERE tenant_id=$1 AND staff_id=$2 AND clock_out IS NULL", [req.tenant!.id, staffId]);
    if (!open.rows.length) return res.status(404).json({ error: "No open shift for this staff" });
    const shift = open.rows[0];
    const hours = (Date.now() - new Date(shift.clock_in).getTime()) / 3600000;
    await query(`UPDATE shifts SET clock_out=NOW(), hours=$1, tips=$2, note=$3 WHERE id=$4`,
      [parseFloat(hours.toFixed(2)), Number(tips)||0, note||"", shift.id]);
    const r = await query("SELECT * FROM shifts WHERE id=$1", [shift.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/shifts/summary", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const m = (month as string) || new Date().toISOString().slice(0,7);
    const r = await query(`
      SELECT staff_id, staff_name, role,
        COUNT(*) as shift_count,
        COALESCE(SUM(hours),0) as total_hours,
        COALESCE(SUM(tips),0) as total_tips
      FROM shifts WHERE tenant_id=$1 AND TO_CHAR(clock_in,'YYYY-MM')=$2 AND clock_out IS NOT NULL
      GROUP BY staff_id, staff_name, role ORDER BY staff_name`, [req.tenant!.id, m]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── LOYALTY ─────────────────────────────────────────────────────────────────

app.get("/api/loyalty", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { phone } = req.query;
    if (phone) {
      const r = await query("SELECT * FROM loyalty WHERE tenant_id=$1 AND phone=$2", [req.tenant!.id, phone]);
      return res.json(r.rows[0] || null);
    }
    const r = await query("SELECT * FROM loyalty WHERE tenant_id=$1 ORDER BY points DESC", [req.tenant!.id]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/loyalty/register", requireTenant, async (req: TenantRequest, res) => {
  const { customerName, phone } = req.body;
  if (!customerName || !phone) return res.status(400).json({ error: "customerName and phone required" });
  try {
    const id = `loy-${Date.now()}`;
    await query(`INSERT INTO loyalty (id,tenant_id,customer_name,phone) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,phone) DO NOTHING`,
      [id, req.tenant!.id, customerName, phone]);
    const r = await query("SELECT * FROM loyalty WHERE tenant_id=$1 AND phone=$2", [req.tenant!.id, phone]);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/loyalty/add-points", requireTenant, async (req: TenantRequest, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: "phone and amount required" });
  try {
    const settingsR = await query("SELECT loyalty_points_per_birr FROM settings WHERE tenant_id=$1", [req.tenant!.id]);
    const ptsPerBirr = Number(settingsR.rows[0]?.loyalty_points_per_birr || 1);
    const pts = Math.floor(Number(amount) * ptsPerBirr);
    const tier = (points: number) => points >= 5000 ? "Gold" : points >= 1000 ? "Silver" : "Bronze";
    const r = await query(`UPDATE loyalty SET points=points+$1, total_spent=total_spent+$2, visits=visits+1,
      tier=$3 WHERE tenant_id=$4 AND phone=$5 RETURNING *`,
      [pts, Number(amount), tier(pts), req.tenant!.id, phone]);
    if (!r.rows.length) return res.status(404).json({ error: "Customer not in loyalty program" });
    res.json({ customer: r.rows[0], pointsAdded: pts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/loyalty/redeem", requireTenant, async (req: TenantRequest, res) => {
  const { phone, points } = req.body;
  if (!phone || !points) return res.status(400).json({ error: "phone and points required" });
  try {
    const cust = await query("SELECT * FROM loyalty WHERE tenant_id=$1 AND phone=$2", [req.tenant!.id, phone]);
    if (!cust.rows.length) return res.status(404).json({ error: "Customer not found" });
    if (cust.rows[0].points < Number(points)) return res.status(400).json({ error: "Insufficient points" });
    const settingsR = await query("SELECT loyalty_birr_per_point FROM settings WHERE tenant_id=$1", [req.tenant!.id]);
    const birrPerPt = Number(settingsR.rows[0]?.loyalty_birr_per_point || 0.5);
    const discount = Number(points) * birrPerPt;
    await query("UPDATE loyalty SET points=points-$1 WHERE tenant_id=$2 AND phone=$3", [Number(points), req.tenant!.id, phone]);
    res.json({ pointsUsed: Number(points), discountAmount: discount });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── FEEDBACK ────────────────────────────────────────────────────────────────

// Public — no auth needed (customer scans QR)
app.post("/api/public/:tenantCode/feedback", async (req, res) => {
  const { tenantCode } = req.params;
  const { orderId, tableId, rating, comment, waiterName, foodRating, serviceRating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "rating 1-5 required" });
  try {
    const tenant = await getTenant(tenantCode);
    if (!tenant) return res.status(404).json({ error: "Restaurant not found" });
    const id = `fb-${Date.now()}`;
    await query(`INSERT INTO feedback (id,tenant_id,order_id,table_id,rating,comment,waiter_name,food_rating,service_rating)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, tenant.id, orderId||null, tableId||null, Number(rating), comment||"", waiterName||null,
       Number(foodRating)||0, Number(serviceRating)||0]);
    res.status(201).json({ success: true, message: "Thank you for your feedback!" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/feedback", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM feedback WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100", [req.tenant!.id]);
    const avg = await query(`SELECT AVG(rating) as avg_rating, AVG(food_rating) as avg_food,
      AVG(service_rating) as avg_service, COUNT(*) as total FROM feedback WHERE tenant_id=$1`, [req.tenant!.id]);
    res.json({ feedback: r.rows, summary: avg.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────

app.get("/api/reservations", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { date } = req.query;
    let q = "SELECT * FROM reservations WHERE tenant_id=$1";
    const params: any[] = [req.tenant!.id];
    if (date) { params.push(date); q += ` AND date=$${params.length}`; }
    q += " ORDER BY date ASC, time ASC";
    const r = await query(q, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/reservations", async (req, res) => {
  // Public — allow customers to book
  const { tenantCode, customerName, phone, guests, date, time, note, branch } = req.body;
  if (!tenantCode || !customerName || !phone || !date || !time)
    return res.status(400).json({ error: "tenantCode, customerName, phone, date, time required" });
  try {
    const tenant = await getTenant(tenantCode);
    if (!tenant) return res.status(404).json({ error: "Restaurant not found" });
    const id = `res-${Date.now()}`;
    await query(`INSERT INTO reservations (id,tenant_id,customer_name,phone,guests,date,time,note,branch)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, tenant.id, customerName, phone, Number(guests)||2, date, time, note||"", branch||"main"]);
    const r = await query("SELECT * FROM reservations WHERE id=$1", [id]);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/reservations/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { status, tableId, note } = req.body;
    await query(`UPDATE reservations SET status=COALESCE($1,status), table_id=COALESCE($2,table_id), note=COALESCE($3,note) WHERE id=$4 AND tenant_id=$5`,
      [status||null, tableId||null, note||null, req.params.id, req.tenant!.id]);
    const r = await query("SELECT * FROM reservations WHERE id=$1", [req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/reservations/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("DELETE FROM reservations WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

app.get("/api/suppliers", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM suppliers WHERE tenant_id=$1 ORDER BY name", [req.tenant!.id]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/suppliers", requireTenant, async (req: TenantRequest, res) => {
  const { name, phone, email, address, category, note } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const id = `sup-${Date.now()}`;
    await query(`INSERT INTO suppliers (id,tenant_id,name,phone,email,address,category,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, req.tenant!.id, name, phone||"", email||"", address||"", category||"General", note||""]);
    const r = await query("SELECT * FROM suppliers WHERE id=$1", [id]);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/suppliers/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    const { name, phone, email, address, category, note } = req.body;
    await query(`UPDATE suppliers SET name=$1,phone=$2,email=$3,address=$4,category=$5,note=$6 WHERE id=$7 AND tenant_id=$8`,
      [name, phone||"", email||"", address||"", category||"General", note||"", req.params.id, req.tenant!.id]);
    const r = await query("SELECT * FROM suppliers WHERE id=$1", [req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/suppliers/:id", requireTenant, async (req: TenantRequest, res) => {
  try {
    await query("DELETE FROM suppliers WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── QR / PUBLIC MENU ─────────────────────────────────────────────────────────

app.get("/api/public/:tenantCode/menu", async (req, res) => {
  try {
    const tenant = await getTenant(req.params.tenantCode);
    if (!tenant) return res.status(404).json({ error: "Restaurant not found" });
    const r = await query("SELECT * FROM menu_items WHERE tenant_id=$1 AND is_available=TRUE ORDER BY category, popularity DESC", [tenant.id]);
    res.json({ restaurant: { name: tenant.businessName, code: tenant.code }, menu: r.rows.map(rowToMenuItem) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/public/:tenantCode/order", async (req, res) => {
  try {
    const tenant = await getTenant(req.params.tenantCode);
    if (!tenant) return res.status(404).json({ error: "Restaurant not found" });
    const { tableId, items, customerPhone } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: "No items" });
    const kitchenItems = items.filter((i: any) => i.menuItem?.category !== "Drinks");
    const barItems     = items.filter((i: any) => i.menuItem?.category === "Drinks");
    const created: any[] = [];
    const groupId = `GRP-QR-${Date.now()}`;

    const buildOrder = async (stItems: any[], station: "kitchen"|"bar") => {
      if (!stItems.length) return;
      const sub = stItems.reduce((s: number, i: any) => s + i.menuItem.price * i.quantity, 0);
      const tax = parseFloat((sub * 0.15).toFixed(2));
      const stamped = stItems.map(i => ({ ...i, itemStation: station, itemStatus: "Pending" }));
      const orderId = `ORD-QR-${Math.floor(100+Math.random()*900)}${station==="bar"?"-B":""}`;
      await query(`INSERT INTO orders (id,tenant_id,table_id,type,items,subtotal,tax,total,status,payment_status,creation_time,station,group_id,customer_phone)
        VALUES ($1,$2,$3,'Dine-in',$4,$5,$6,$7,'Pending','Unpaid',NOW(),$8,$9,$10)`,
        [orderId, tenant.id, tableId||"QR", JSON.stringify(stamped), sub, tax, sub+tax, station, groupId, customerPhone||null]);

      // Auto-deduct inventory via recipes
      for (const item of stItems) {
        const recs = await query(
          `SELECT inventory_id, qty_per_serve FROM recipes WHERE tenant_id=$1 AND menu_item_id=$2`,
          [tenant.id, item.menuItem.id]
        );
        for (const rec of recs.rows) {
          await query(
            `UPDATE inventory SET stock = GREATEST(0, stock - $1) WHERE id=$2 AND tenant_id=$3`,
            [rec.qty_per_serve * item.quantity, rec.inventory_id, tenant.id]
          );
        }
      }

      created.push(orderId);
    };

    await buildOrder(kitchenItems, "kitchen");
    await buildOrder(barItems, "bar");
    res.status(201).json({ success: true, orderIds: created, message: "Order placed! The kitchen is preparing your food." });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── RECEIPT ─────────────────────────────────────────────────────────────────

app.get("/api/orders/:id/receipt", requireTenant, async (req: TenantRequest, res) => {
  try {
    const r = await query("SELECT * FROM orders WHERE id=$1 AND tenant_id=$2", [req.params.id, req.tenant!.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Order not found" });
    const order = rowToOrder(r.rows[0]);
    const tenant = req.tenant!;
    const settingsR = await query("SELECT * FROM settings WHERE tenant_id=$1", [tenant.id]);
    const settings = settingsR.rows[0];
    const footer = settings?.receipt_footer || "Thank you for dining with us!";
    const taxRate = Number(settings?.tax_rate || 15);

    res.json({
      receiptId: `RCT-${order.id}`,
      restaurant: { name: tenant.businessName, phone: tenant.phone, code: tenant.code },
      order: {
        id: order.id, tableId: order.tableId, type: order.type,
        waiterName: order.waiterName, creationTime: order.creationTime,
        paymentMethod: order.paymentMethod,
      },
      items: order.items.map(i => ({
        name: i.menuItem.name, ameName: i.menuItem.ameName,
        qty: i.quantity, unitPrice: i.menuItem.price,
        total: i.menuItem.price * i.quantity,
      })),
      subtotal: order.subtotal,
      taxRate,
      tax: order.tax,
      total: order.total,
      footer,
      printedAt: new Date().toISOString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── TELEBIRR / PAYMENT MOCK ──────────────────────────────────────────────────

app.post("/api/payment/telebirr/initiate", requireTenant, async (req: TenantRequest, res) => {
  const { orderId, amount, phone } = req.body;
  if (!orderId || !amount || !phone) return res.status(400).json({ error: "orderId, amount, phone required" });
  try {
    // In production: call Ethio Telecom Telebirr API here
    // For now: return a mock transaction reference
    const ref = `TB${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    res.json({
      success: true,
      reference: ref,
      amount: Number(amount),
      phone,
      message: `Telebirr payment of ${amount} ETB initiated. Ref: ${ref}`,
      instructions: `Please confirm payment of ${amount} ETB to Habesha Restaurant on your Telebirr app using reference ${ref}`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/payment/telebirr/verify", requireTenant, async (req: TenantRequest, res) => {
  const { reference, orderId } = req.body;
  if (!reference || !orderId) return res.status(400).json({ error: "reference and orderId required" });
  try {
    // In production: verify with Telebirr API
    // Mock: assume payment verified after 10 seconds (demo)
    await query("UPDATE orders SET payment_status='Paid', payment_method='Telebirr' WHERE id=$1 AND tenant_id=$2",
      [orderId, req.tenant!.id]);
    res.json({ verified: true, reference, message: "Payment confirmed via Telebirr" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/payment/cbe/initiate", requireTenant, async (req: TenantRequest, res) => {
  const { orderId, amount, phone } = req.body;
  if (!orderId || !amount) return res.status(400).json({ error: "orderId and amount required" });
  try {
    const ref = `CBE${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    res.json({
      success: true,
      reference: ref,
      amount: Number(amount),
      message: `CBE Birr payment of ${amount} ETB initiated. Ref: ${ref}`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SMS NOTIFICATIONS (Mock / Ethio Telecom) ─────────────────────────────────

app.post("/api/sms/send", requireTenant, async (req: TenantRequest, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: "phone and message required" });
  try {
    // In production: integrate with Ethio Telecom SMS API or Africa's Talking
    const SMS_API = process.env.SMS_API_URL;
    const SMS_KEY = process.env.SMS_API_KEY;
    if (SMS_API && SMS_KEY) {
      // Production call would go here
      console.log(`[SMS] To: ${phone} — ${message}`);
    }
    // Log SMS as notification
    const id = `N-SMS-${Date.now()}`;
    await query(`INSERT INTO notifications (id,tenant_id,message) VALUES ($1,$2,$3)`,
      [id, req.tenant!.id, `[SMS → ${phone}]: ${message}`]);
    res.json({ success: true, phone, message, note: "SMS queued (configure SMS_API_URL and SMS_API_KEY in .env for live SMS)" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Vite / Static ───────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    console.log("⚡ Vite development middleware active.");
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    await pool.connect().then(c => { c.release(); console.log("✅ PostgreSQL connected"); });
    await initSchema();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🍽️  Habesha Restaurant OS — SaaS Edition`);
      console.log(`   Server   : http://localhost:${PORT}`);
      console.log(`   Database : PostgreSQL`);
      console.log(`   Admin    : X-Admin-Key: ${ADMIN_KEY}\n`);
    });
  } catch (e: any) {
    console.error("❌ Failed to connect to PostgreSQL:", e.message);
    console.error("   Set DATABASE_URL in .env or start PostgreSQL");
    process.exit(1);
  }
}

start();

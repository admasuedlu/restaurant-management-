export type OrderStation = 'kitchen' | 'bar';
export type WorkflowMode = 'cashier' | 'waiter' | 'hybrid';
export type ItemStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served';

// ─── SaaS / Tenant ───────────────────────────────────────────────────────────

export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'suspended' | 'cancelled';

export interface Tenant {
  id: string;
  code: string;               // Restaurant login code e.g. "BOLE-2024"
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStart: string | null;
  trialEnd: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  branches: string[];
  createdAt: string;
  monthlyFee: number;
  currency: 'ETB';
  businessSize?: BusinessSize;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  branches: number; staff: number; aiInsights: boolean; barModule: boolean; price: number; label: string;
}> = {
  trial:        { branches: 1, staff: 5,         aiInsights: false, barModule: false, price: 0,    label: 'Free Trial (14 days)' },
  starter:      { branches: 1, staff: 15,        aiInsights: false, barModule: true,  price: 499,  label: 'Starter — 499 ETB/mo' },
  professional: { branches: 3, staff: 50,        aiInsights: true,  barModule: true,  price: 1499, label: 'Professional — 1,499 ETB/mo' },
  enterprise:   { branches: 99, staff: 9999,     aiInsights: true,  barModule: true,  price: 3999, label: 'Enterprise — 3,999 ETB/mo' },
};

// ─── Menu ────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  ameName: string;
  price: number;
  category: 'Fasting' | 'Meat' | 'Drinks' | 'Dessert';
  description: string;
  ameDescription: string;
  prepTime: number;
  image: string;
  popularity: number;
  combosSuggestion?: { name: string; ameName: string; price: number; desc: string; ameDesc: string };
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  addedBy: string;
  itemStatus?: ItemStatus;
  itemStation?: OrderStation;
}

export interface Order {
  id: string;
  tableId: string;
  type: 'Dine-in' | 'Takeaway' | 'Delivery';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'Pending' | 'Cooking' | 'Ready' | 'Served' | 'Completed';
  paymentStatus: 'Unpaid' | 'Paid';
  paymentMethod?: 'Cash' | 'Telebirr' | 'CBE Birr' | 'Card';
  creationTime: string;
  isVip?: boolean;
  station: OrderStation;
  groupId?: string;
  waiterName?: string;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  ameName: string;
  stock: number;
  unit: string;
  cost: number;
  minAlert: number;
  category: 'Spices' | 'Grains' | 'Meat' | 'Beverages' | 'Dairy' | 'Produce' | 'Spirits' | 'Beer' | 'Wine' | 'Soft Drinks' | 'Juice';
  station: 'kitchen' | 'bar' | 'both';
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  item: string;
  qty: number;
  cost: number;
  status: 'Draft' | 'Sent' | 'Received';
  date: string;
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  role: 'Waiter' | 'Cashier' | 'Chef' | 'Manager' | 'Bar' | 'Owner';
  status: 'Active' | 'On Break' | 'Off Shift';
  stats: {
    ordersHandled: number;
    avgPrepSpeed?: number;
    customerRating?: number;
    avgServiceSpeed?: number;
    tipsEarned?: number;
  };
  shift: string;
}

export type BranchId = 'bole' | 'mercato' | 'kazanchis';

export interface StaffNotification {
  id: string;
  orderId: string;
  tableId: string;
  itemsSummary: string;
  message: string;
  time: string;
  isRead: boolean;
  forWaiter?: string;
  station?: OrderStation;
}

export interface Branch {
  id: BranchId;
  name: string;
  ameName: string;
  location: string;
  phone: string;
  capacity: number;
  revenueToday: number;
}

export interface WorkflowSettings {
  mode: WorkflowMode;
  allowWaiterDirectOrder: boolean;
  allowPartialServing: boolean;
  notifyWaiterOnReady: boolean;
  notifyCashierOnReady: boolean;
}

// ─── Auth / Roles ─────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'waiter' | 'kitchen' | 'bar' | 'cashier' | 'manager' | 'owner' | 'superadmin';

export type BusinessSize = 'small' | 'medium' | 'large';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  branch?: BranchId;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  plan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  trialDaysLeft?: number;
  daysOverdue?: number;
  graceEnds?: string | null;
  subscriptionEnd?: string | null;
  monthlyFee?: number;
  businessSize?: BusinessSize;
}

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Utensils,
  ShoppingCart,
  ChefHat,
  CreditCard,
  TrendingUp,
  Users,
  Layers,
  Sparkles,
  AlertCircle,
  DollarSign,
  Plus,
  Minus,
  Clock,
  RefreshCw,
  Send,
  Check,
  MapPin,
  Languages,
  ShoppingBag,
  UserPlus,
  ClipboardCheck,
  Percent,
  Coins,
  Shuffle,
  HelpCircle,
  Truck,
  QrCode,
  Printer,
  Download,
  ExternalLink,
  Share2
} from "lucide-react";
import AppHeader from "./components/AppHeader";
import RoleNav from "./components/RoleNav";
import DevToolsPanel from "./components/DevToolsPanel";
import StationOrderBoard from "./components/StationOrderBoard";
import WaiterView from "./components/WaiterView";
import KitchenView from "./components/KitchenView";
import StaffManager from "./components/StaffManager";
import RegisterPage from "./components/RegisterPage";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import PinLogin from "./components/PinLogin";
import LandingPage from "./components/LandingPage";
import SalesDashboard from "./components/SalesDashboard";
import ExpenseTracker from "./components/ExpenseTracker";
import ReservationManager from "./components/ReservationManager";
import ShiftManager from "./components/ShiftManager";
import LoyaltyManager from "./components/LoyaltyManager";
import SupplierManager from "./components/SupplierManager";
import FeedbackView from "./components/FeedbackView";
import ReceiptPrinter from "./components/ReceiptPrinter";
import QRGenerator from "./components/QRGenerator";
import QRMenuPage from "./components/QRMenuPage";
import PublicFeedbackPage from "./components/PublicFeedbackPage";
import RecipeManager from "./components/RecipeManager";
import WaiterSummary from "./components/WaiterSummary";
import BarInventory from "./components/BarInventory";
import TableAssignmentManager from "./components/TableAssignmentManager";
import BranchManager from "./components/BranchManager";
import SubscriptionWall from "./components/SubscriptionWall";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentSettings from "./components/PaymentSettings";
import SubscriptionTab from "./components/SubscriptionTab";
import HotelManager from "./components/HotelManager";
import PublicBusinessProfile from "./components/PublicBusinessProfile";
import { splitItemsByStation, calcStationTotals, resolveOrderStation } from "./lib/orderRouting";
import { PLATFORM_NAME, FOOTER_TAGLINE_EN, FOOTER_TAGLINE_AM, FOOTER_CREDIT_EN, FOOTER_CREDIT_AM } from "./lib/branding";
import { apiFetch, setAuthToken } from "./lib/api";
import {
  MenuItem,
  OrderItem,
  Order,
  InventoryItem,
  PurchaseOrder,
  StaffMember,
  BranchId,
  Branch,
  StaffNotification,
  AuthUser,
  TableAssignment,
} from "./types";

// Tabs each role is allowed to access and switch between
const ROLE_ALLOWED_TABS: Record<string, Array<'customer' | 'waiter' | 'kitchen' | 'bar' | 'cashier' | 'manager' | 'owner'>> = {
  customer:   ['customer'],
  waiter:     ['waiter', 'customer'],
  kitchen:    ['kitchen'],
  bar:        ['bar'],
  cashier:    ['cashier', 'waiter', 'kitchen', 'bar'],
  manager:    ['manager'],
  owner:      ['owner', 'manager'],
  superadmin: ['owner', 'manager'],
};

// Which tabs are enabled per business size
const SIZE_ALLOWED_TABS: Record<string, Array<'customer' | 'waiter' | 'kitchen' | 'bar' | 'cashier' | 'manager' | 'owner'>> = {
  small:  ['cashier', 'kitchen', 'owner'],
  medium: ['customer', 'waiter', 'cashier', 'kitchen', 'bar', 'manager', 'owner'],
  large:  ['customer', 'waiter', 'cashier', 'kitchen', 'bar', 'manager', 'owner'],
};

// Owner sub-tabs enabled per size
const SIZE_OWNER_SUBTABS: Record<string, string[]> = {
  small:  ['sales', 'expenses', 'payments', 'subscription', 'hotel'],
  medium: ['sales', 'expenses', 'branches', 'recipes', 'reservations', 'loyalty', 'feedback', 'qr', 'payments', 'subscription', 'hotel'],
  large:  ['sales', 'expenses', 'branches', 'recipes', 'reservations', 'shifts', 'loyalty', 'suppliers', 'feedback', 'qr', 'barstock', 'payments', 'subscription', 'hotel'],
};


export default function App() {
  // Auth state
  const [authUser, setAuthUser]       = useState<AuthUser | null>(null);
  const [showLanding, setShowLanding]   = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  // Global States
  const [isAmharic, setIsAmharic] = useState<boolean>(false);
  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [currentBranch, setCurrentBranch] = useState<BranchId>("main");
  const [activeTab, setActiveTab] = useState<'customer' | 'waiter' | 'kitchen' | 'bar' | 'cashier' | 'manager' | 'owner'>('customer');
  const [waiterNotifications, setWaiterNotifications] = useState<StaffNotification[]>([]);

  // Customer menu states
  const [menuFilter, setMenuFilter] = useState<'All' | 'Fasting' | 'Meat' | 'Drinks' | 'Dessert'>('All');
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');
  const [localCart, setLocalCart] = useState<OrderItem[]>([]);
  const [deliveryPhone, setDeliveryPhone] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [tableQrCodeUrl, setTableQrCodeUrl] = useState<string>("");
  const [showQrStandee, setShowQrStandee] = useState<boolean>(false);
  const [qrGlowActive, setQrGlowActive] = useState<boolean>(false);

  // Server state — all loaded from real API on mount
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [customTip, setCustomTip] = useState<number>(0);

  // Cashier counter-order mode
  const [cashierMode, setCashierMode] = useState<'checkout' | 'counter-order'>('checkout');
  // Bar sub-tab
  const [barSubTab, setBarSubTab] = useState<'orders' | 'stock'>('orders');
  const [counterCart, setCounterCart] = useState<OrderItem[]>([]);
  const [counterTable, setCounterTable] = useState<string>("Counter");
  const [counterOrderType, setCounterOrderType] = useState<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');
  const [counterMenuFilter, setCounterMenuFilter] = useState<'All' | 'Fasting' | 'Meat' | 'Drinks' | 'Dessert'>('All');
  const [counterPayNow, setCounterPayNow] = useState<'Cash' | 'Telebirr' | 'CBE Birr' | 'Card' | ''>('');
  const [counterSubmitting, setCounterSubmitting] = useState(false);

  // Menu management UI state (Manager tab)
  const [showMenuForm, setShowMenuForm] = useState<boolean>(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuFormData, setMenuFormData] = useState({
    name: "", ameName: "", price: "", category: "Meat" as MenuItem["category"],
    description: "", ameDescription: "", prepTime: "10", image: "", popularity: "8.0"
  });

  // KDS Screen states
  const [kdsFilter, setKdsFilter] = useState<'All' | 'Grill' | 'Fasting' | 'Dessert'>('All');

  // AI & insights states
  const [aiInsights, setAiInsights] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Offline Pending Sync actions
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [cachedOrders, setCachedOrders] = useState<any[]>([]);

  // New feature states
  const [ownerSubTab, setOwnerSubTab] = useState<"sales"|"expenses"|"branches"|"recipes"|"reservations"|"shifts"|"loyalty"|"suppliers"|"feedback"|"qr"|"barstock"|"payments"|"subscription"|"hotel">("sales");
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);

  // Table-to-waiter assignments
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);
  const [myAssignedTableIds, setMyAssignedTableIds] = useState<string[]>([]);

  // Public page routing (QR menu / feedback / payment-success / place)
  const [currentPath, setCurrentPath] = useState(() => typeof window !== "undefined" ? window.location.pathname : "/");
  useEffect(() => {
    const handler = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const publicPath = currentPath;
  const isQRMenu = publicPath.startsWith("/menu/");
  const isFeedbackPage = publicPath.startsWith("/feedback/");
  const isPaymentSuccess = publicPath.startsWith("/payment-success");
  const isBusinessProfile = publicPath.startsWith("/place/");
  const businessProfileCode = isBusinessProfile ? publicPath.split("/")[2] : "";

  // Branches — loaded from API
  const [branchList, setBranchList] = useState<Branch[]>([]);
  const branches: Branch[] = branchList.map(b => ({
    ...b,
    revenueToday: orders
      .filter(o => o.paymentStatus === "Paid")
      .reduce((s, o) => s + o.total, 0) / Math.max(branchList.length, 1),
  }));

  // Load and refresh initial data
  useEffect(() => {
    fetchAllData();

    // Check if there is a table parameter in the URL (QR scan) — auto-login as customer
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get("table");
      if (tableParam) {
        setSelectedTable(tableParam);
        setOrderType("Dine-in");
        setAuthUser({ id: "qr-guest", name: "Guest", role: "customer" });
        setActiveTab("customer");
      }
    }
  }, []);

  // Update QR Code whenever selectedTable changes
  useEffect(() => {
    const generateQrCode = async () => {
      try {
        if (typeof window !== "undefined") {
          const urlStr = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(selectedTable)}`;
          const qrDataUrl = await QRCode.toDataURL(urlStr, {
            width: 300,
            margin: 2,
            color: {
              dark: "#0b132b",
              light: "#ffffff"
            },
            errorCorrectionLevel: "H"
          });
          setTableQrCodeUrl(qrDataUrl);
        }
      } catch (err) {
        console.error("Failed to generate QR Code offline:", err);
      }
    };
    generateQrCode();
  }, [selectedTable]);

  // Reset QR standee glow state 4 seconds after activation
  useEffect(() => {
    if (qrGlowActive) {
      const timer = setTimeout(() => {
        setQrGlowActive(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [qrGlowActive]);

  const printTableQrThermal = async (tableName: string) => {
    try {
      if (typeof window === "undefined") return;
      const urlStr = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(tableName)}`;
      const qrDataUrl = await QRCode.toDataURL(urlStr, {
        width: 250,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff"
        },
        errorCorrectionLevel: "H"
      });

      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print QR - ${tableName}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  width: 80mm;
                  margin: 0;
                  padding: 4mm;
                  font-family: 'Courier New', Courier, monospace;
                  text-align: center;
                  background: #ffffff;
                  color: #000000;
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact;
                }
                .divider {
                  border-top: 1px dashed #000005;
                  margin: 3mm 0;
                }
                .logo {
                  font-size: 15px;
                  font-weight: bold;
                  letter-spacing: 1px;
                }
                .subtitle {
                  font-size: 9px;
                  margin-top: 1mm;
                  text-transform: uppercase;
                }
                .table-container {
                  border: 2px solid #000000;
                  padding: 2mm;
                  margin: 4mm auto;
                  display: inline-block;
                  font-weight: bold;
                }
                .table-title {
                  font-size: 22px;
                }
                .qr-img {
                  width: 50mm;
                  height: 50mm;
                  margin: 3mm auto;
                  display: block;
                }
                .instructions {
                  font-size: 10px;
                  line-height: 1.4;
                  margin: 3mm 0;
                  font-weight: bold;
                }
                .footer {
                  font-size: 8px;
                  margin-top: 4mm;
                  color: #333333;
                }
              </style>
            </head>
            <body>
              <div class="logo">GURSHA DIGITAL DINING</div>
              <div class="subtitle">Bole Main Branch POS Service</div>
              <div class="divider"></div>
              
              <div class="table-container">
                <span class="table-title">${tableName}</span>
              </div>
              
              <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
              
              <div class="instructions">
                SCAN TO PLACE ACCELERATED ORDER<br/>
                ------------------------------<br/>
                ይህንን የጠረጴዛ ኪዩአር ስካን በማድረግ<br/>
                በቀጥታ ማዘዝ ወይም መክፈል ይችላሉ።
              </div>
              
              <div class="divider"></div>
              
              <div class="footer">
                Thank you for your visit!<br/>
                Instant Kitchen Display Sync On<br/>
                Printed on: ${new Date().toLocaleString()}
              </div>
              
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
      }
    } catch (err) {
      console.error("Failed to generate/print thermal QR:", err);
    }
  };

  const fetchAllData = async (code?: string, userRole?: string) => {
    const tc = code ?? authUser?.tenantCode;
    const role = userRole ?? authUser?.role;
    try {
      const menuRes = await apiFetch("/api/menu", tc);
      if (menuRes.ok) setMenuItems(await menuRes.json());

      // Only fetch authenticated endpoints if we have a logged-in user role
      if (role) {
        const ordRes = await apiFetch("/api/orders", tc);
        if (ordRes.ok) setOrders(await ordRes.json());

        const invRes = await apiFetch("/api/inventory", tc);
        if (invRes.ok) setInventoryList(await invRes.json());

        // Only manager / owner / superadmin roles can access purchase orders
        if (["manager", "owner", "superadmin"].includes(role)) {
          const poRes = await apiFetch("/api/purchase-orders", tc);
          if (poRes.ok) setPurchaseOrders(await poRes.json());
        }

        // Load staff from API (names/roles only — PINs never sent)
        const staffRes = await apiFetch("/api/staff", tc);
        if (staffRes.ok) {
          const apiStaff = await staffRes.json();
          setStaffList(apiStaff
            .filter((s: any) => s.role !== "customer")
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              role: s.role.charAt(0).toUpperCase() + s.role.slice(1) as StaffMember["role"],
              status: "Active" as const,
              shift: "Morning",
              stats: { ordersHandled: 0 },
            }))
          );
        }

        // Load branches
        const branchRes = await apiFetch("/api/branches", tc);
        if (branchRes.ok) {
          const branchData = await branchRes.json();
          const loaded: Branch[] = (branchData.branches || []).map((b: {
            id: string; name: string; ameName: string; location: string; phone: string; capacity: number;
          }) => ({
            id: b.id,
            name: b.name,
            ameName: b.ameName || b.name,
            location: b.location || "",
            phone: b.phone || "",
            capacity: b.capacity || 20,
            revenueToday: 0,
          }));
          if (loaded.length) {
            setBranchList(loaded);
            setCurrentBranch(prev => loaded.some(b => b.id === prev) ? prev : loaded[0].id);
          }
        }
      }
    } catch (e) {
      console.error("API fetch failed:", e);
    } finally {
      setMenuLoading(false);
    }
  };

  // Alias kept for compatibility with existing call sites in the file
  const fetchOrdersAndInventory = fetchAllData;

  // ─── Menu CRUD (Manager only) ───────────────────────────────────────────────
  const openAddMenuForm = () => {
    setEditingMenuItem(null);
    setMenuFormData({ name: "", ameName: "", price: "", category: "Meat", description: "", ameDescription: "", prepTime: "10", image: "", popularity: "8.0" });
    setShowMenuForm(true);
  };

  const openEditMenuForm = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuFormData({
      name: item.name, ameName: item.ameName, price: String(item.price),
      category: item.category, description: item.description, ameDescription: item.ameDescription,
      prepTime: String(item.prepTime), image: item.image, popularity: String(item.popularity),
    });
    setShowMenuForm(true);
  };

  const saveMenuItem = async () => {
    const payload = {
      name: menuFormData.name,
      ameName: menuFormData.ameName || menuFormData.name,
      price: Number(menuFormData.price),
      category: menuFormData.category,
      description: menuFormData.description,
      ameDescription: menuFormData.ameDescription,
      prepTime: Number(menuFormData.prepTime) || 10,
      image: menuFormData.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
      popularity: Number(menuFormData.popularity) || 7.0,
    };
    if (!payload.name || !payload.price || !payload.category) {
      alert("Name, price and category are required.");
      return;
    }
    try {
      let res: Response;
      if (editingMenuItem) {
        res = await apiFetch(`/api/menu/${editingMenuItem.id}`, authUser?.tenantCode, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated: MenuItem = await res.json();
          setMenuItems(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      } else {
        res = await apiFetch("/api/menu", authUser?.tenantCode, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created: MenuItem = await res.json();
          setMenuItems(prev => [...prev, created]);
        }
      }
      setShowMenuForm(false);
      setEditingMenuItem(null);
    } catch (e) {
      alert("Failed to save menu item. Check server connection.");
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm("Delete this menu item? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/menu/${id}`, authUser?.tenantCode, { method: "DELETE" });
      if (res.ok) setMenuItems(prev => prev.filter(m => m.id !== id));
    } catch {
      alert("Failed to delete. Check server connection.");
    }
  };

  // ─── Counter Order Cart (Cashier counter-service mode) ──────────────────────
  const counterAddItem = (item: MenuItem) => {
    setCounterCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1, addedBy: authUser?.name ?? "Cashier" }];
    });
  };

  const counterRemoveItem = (itemId: string) => {
    setCounterCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.menuItem.id !== itemId);
      return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const counterSubtotal = counterCart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const counterTax      = parseFloat((counterSubtotal * 0.15).toFixed(2));
  const counterTotal    = parseFloat((counterSubtotal + counterTax).toFixed(2));

  const submitCounterOrder = async () => {
    if (counterCart.length === 0) return;
    setCounterSubmitting(true);
    try {
      const res = await apiFetch("/api/orders", authUser?.tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: counterTable,
          type: counterOrderType,
          items: counterCart,
          subtotal: counterSubtotal,
          tax: counterTax,
          total: counterTotal,
          isVip: false,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const createdArr: Order[] = Array.isArray(created) ? created : [created];
        setOrders(prev => [...prev, ...createdArr]);

        // If cashier chose to pay immediately, mark all tickets paid
        if (counterPayNow) {
          for (const ord of createdArr) {
            await apiFetch(`/api/orders/${ord.id}/pay`, authUser?.tenantCode, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentMethod: counterPayNow }),
            });
            setOrders(prev => prev.map(o => o.id === ord.id ? { ...o, paymentStatus: "Paid", paymentMethod: counterPayNow as Order["paymentMethod"] } : o));
          }
        }

        setCounterCart([]);
        setCounterPayNow('');
        alert(isAmharic
          ? `ትዕዛዝ ወደ ${createdArr.map(o => o.station === 'bar' ? 'ባር' : 'ወጥቤት').join(' + ')} ተላከ!${counterPayNow ? " ክፍያ ተቀብሏል።" : ""}`
          : `Order sent to ${createdArr.map(o => o.station).join(' + ')}!${counterPayNow ? ` Payment collected (${counterPayNow}).` : " Awaiting payment."}`
        );
      }
    } catch {
      alert(isAmharic ? "ትዕዛዝ ማስቀመጥ አልተቻለም" : "Failed to submit order. Check connection.");
    } finally {
      setCounterSubmitting(false);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem, addedBy: string = "Me") => {
    // Actively trigger the QR code glowing pulse animation & expand the standee to signal active companion session
    setQrGlowActive(true);
    setShowQrStandee(true);

    const existingIndex = localCart.findIndex(
      cartItem => cartItem.menuItem.id === item.id && cartItem.addedBy === addedBy
    );

    if (existingIndex > -1) {
      const updated = [...localCart];
      updated[existingIndex].quantity += 1;
      setLocalCart(updated);
    } else {
      setLocalCart([...localCart, { menuItem: item, quantity: 1, addedBy }]);
    }
  };

  const removeFromCart = (itemId: string, addedBy: string) => {
    const idx = localCart.findIndex(
      cartItem => cartItem.menuItem.id === itemId && cartItem.addedBy === addedBy
    );
    if (idx === -1) return;

    const updated = [...localCart];
    if (updated[idx].quantity > 1) {
      updated[idx].quantity -= 1;
      setLocalCart(updated);
    } else {
      updated.splice(idx, 1);
      setLocalCart(updated);
    }
  };

  // Calculated totals
  const cartSubtotal = localCart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  const cartTax = parseFloat((cartSubtotal * 0.15).toFixed(2)); // ERCA 15% VAT
  const cartTotal = parseFloat((cartSubtotal + cartTax).toFixed(2));

  // Handle Order Submit
  const submitOrder = async () => {
    if (localCart.length === 0) return;

    const tableId = orderType === 'Dine-in' ? selectedTable : `Takeaway ${Math.floor(100+Math.random()*900)}`;
    const isVip = selectedTable.includes("VIP");

    const buildOfflineOrders = (): Order[] => {
      const { kitchen, bar } = splitItemsByStation(localCart);
      const groupId = `GRP-OFF-${Date.now()}`;
      const created: Order[] = [];
      const add = (items: OrderItem[], station: Order["station"]) => {
        if (items.length === 0) return;
        const totals = calcStationTotals(items, 0);
        created.push({
          id: `ORD-OFF-${station}-${Math.floor(1000 + Math.random() * 9000)}`,
          tableId,
          type: orderType,
          items,
          ...totals,
          status: "Pending",
          paymentStatus: "Unpaid",
          creationTime: new Date().toISOString(),
          isVip,
          station,
          groupId,
        });
      };
      add(kitchen, "kitchen");
      add(bar, "bar");
      return created;
    };

    if (!isOnline) {
      const offlineOrders = buildOfflineOrders();
      setCachedOrders([...cachedOrders, ...offlineOrders]);
      setPendingSyncCount(prev => prev + offlineOrders.length);
      setOrders([...offlineOrders, ...orders]);
      setLocalCart([]);
      alert(isAmharic
        ? `ትዕዛዝ(ዎች) ተቀምጠዋል (${offlineOrders.length} ትኬት)`
        : `Order saved offline (${offlineOrders.length} ticket${offlineOrders.length > 1 ? "s" : ""})`);
      return;
    }

    try {
      const res = await apiFetch("/api/orders", authUser?.tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          type: orderType,
          items: localCart,
          subtotal: cartSubtotal,
          tax: cartTax,
          total: cartTotal,
          isVip,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newOrders: Order[] = Array.isArray(data) ? data : [data];
        setOrders([...newOrders, ...orders]);
        setLocalCart([]);
        setTimeout(async () => {
          const invRes = await apiFetch("/api/inventory", authUser?.tenantCode);
          if (invRes.ok) setInventoryList(await invRes.json());
        }, 800);

        // loyalty points would be tracked here
        const ids = newOrders.map(o => o.id).join(", ");
        const routed = newOrders.length > 1
          ? (isAmharic ? "ምግብ → ወጥ ቤት፣ መጠጥ → ባር" : "Food → kitchen, drinks → bar")
          : newOrders[0].station === "bar"
            ? (isAmharic ? "→ ባር" : "→ bar")
            : (isAmharic ? "→ ወጥ ቤት" : "→ kitchen");
        alert(isAmharic
          ? `ትዕዛዝ ተልኳል! ${ids} (${routed})`
          : `Order sent! ${ids} (${routed})`);
      }
    } catch (e) {
      console.error("Failed to post order. Simulating offline fallback", e);
    }
  };

  // Sync Offline Queue
  const triggerSync = async () => {
    if (cachedOrders.length === 0) return;
    
    setIsAiLoading(true); // show generic global loader for action
    let successCount = 0;
    
    for (const cached of cachedOrders) {
      try {
        const res = await apiFetch("/api/orders", authUser?.tenantCode, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: cached.tableId,
            type: cached.type,
            items: cached.items,
            subtotal: cached.subtotal,
            tax: cached.tax,
            total: cached.total,
            isVip: cached.isVip
          })
        });
        if (res.ok) successCount++;
      } catch (e) {
        console.error("Syncing item failed", e);
      }
    }

    setIsAiLoading(false);
    setPendingSyncCount(0);
    setCachedOrders([]);
    fetchOrdersAndInventory();
    alert(isAmharic 
      ? `የተከማቹ ${successCount} ከመስመር ውጭ ትዕዛዞች በተሳካ ሁኔታ ከክላውድ ጋር ተመሳስለዋል!`
      : `Successfully synced ${successCount} offline cached orders to the cloud database!`
    );
  };

  // Status transitions
  const updateOrderStatus = async (orderId: string, newStatus: 'Pending' | 'Cooking' | 'Ready' | 'Served') => {
    // Optimistic UI
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    if (newStatus === 'Ready') {
      const targetOrder = orders.find(o => o.id === orderId);
      const tblId = targetOrder ? targetOrder.tableId : "Dine-in";
      const itemsStr = targetOrder 
        ? targetOrder.items.map(item => `${item.quantity}x ${isAmharic ? item.menuItem.ameName : item.menuItem.name}`).join(", ")
        : "";
      const isBarOrder = targetOrder && resolveOrderStation(targetOrder) === "bar";
      const textMessage = isAmharic
        ? isBarOrder
          ? `የጠረጴዛ ${tblId} መጠጦች (${orderId}) ዝግጁ ናቸው!`
          : `የጠረጴዛ ${tblId} ምግብ (${orderId}) ዝግጁ ነው!`
        : isBarOrder
          ? `Drinks ready for ${tblId} (${orderId})!`
          : `Food ready for ${tblId} (${orderId})!`;
      
      const newNotif: StaffNotification = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderId,
        tableId: tblId,
        itemsSummary: itemsStr,
        message: textMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isRead: false
      };
      
      setWaiterNotifications(prev => [newNotif, ...prev]);

      // Sound notification (using standard Web Audio API for 100% reliable synthesized dining chime)
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const playNote = (frequency: number, startTime: number, duration: number) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.frequency.setValueAtTime(frequency, startTime);
            osc.type = "sine";
            
            gain.gain.setValueAtTime(0.35, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.05);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          playNote(587.33, audioCtx.currentTime, 0.4); // D5
          playNote(698.46, audioCtx.currentTime + 0.15, 0.4); // F5
          playNote(880.00, audioCtx.currentTime + 0.3, 0.6); // A5
        }
      } catch (err) {
        console.warn("Audio synthesis not allowed or supported:", err);
      }

      // Vibration Alert
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([200, 100, 200, 100, 300]);
        } catch (vibErr) {
          console.warn("Vibration failed:", vibErr);
        }
      }
    }

    if (newStatus === "Served") {
      setWaiterNotifications(prev => prev.map(n => n.orderId === orderId ? { ...n, isRead: true } : n));
    }

    try {
      const res = await apiFetch(`/api/orders/${orderId}/status`, authUser?.tenantCode, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Status patch failed");
    } catch (e) {
      console.warn("Using offline memory for status updates.");
    }

    // Adjust staffing stats dynamically
    if (newStatus === "Served") {
      setStaffList(prev => prev.map(s => {
        if (s.role === "Waiter" && s.status === "Active") {
          return {
            ...s,
            stats: { ...s.stats, ordersHandled: (s.stats.ordersHandled || 0) + 1 }
          };
        }
        return s;
      }));
    }
  };

  // Cashier checkout
  const checkoutOrder = async (orderId: string, method: 'Cash' | 'Telebirr' | 'CBE Birr' | 'Card') => {
    // Optimistic update
    setOrders(orders.map(o => o.id === orderId ? { ...o, paymentStatus: 'Paid', paymentMethod: method } : o));

    try {
      const res = await apiFetch(`/api/orders/${orderId}/pay`, authUser?.tenantCode, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method })
      });
      if (res.ok) {
        // Refresh orders and inventory
        fetchOrdersAndInventory();
      }
    } catch (e) {
      console.warn("Using offline memory for checkout.");
    }
  };

  // AI insights request
  const fetchAiAdvisory = async () => {
    setIsAiLoading(true);
    setAiInsights("");

    const salesSummary = {
      totalSales: orders.filter(o => o.paymentStatus === "Paid").reduce((t, o) => t + o.total, 0) || 45600,
      topDish: "Special Beef Tibs (ስፔሻል ጥብስ)",
      topDishCount: orders.length + 15
    };

    const teffItem = inventoryList.find(i => i.id === "inv-2");
    const butterItem = inventoryList.find(i => i.id === "inv-3");

    const inventorySummary = {
      teffStock: teffItem ? teffItem.stock : 82,
      butterStock: butterItem ? butterItem.stock : 4.5
    };

    try {
      const res = await apiFetch("/api/ai-insights", authUser?.tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesSummary,
          inventorySummary,
          currentBranch,
          lang: isAmharic ? "am" : "en"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiInsights(data.insights);
      } else {
        throw new Error("API return issue");
      }
    } catch (e) {
      setAiInsights(isAmharic 
        ? `<p class="text-rose-400">የትስስር ስህተት አጋጥሟል። እባክዎ የኢንተርኔት ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።</p>`
        : `<p class="text-rose-400">Connection to Admasu-AI engine failed. Running fallback rule analytics...</p>`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // Create manual stock adjustment
  const adjustStock = async (itemId: string, diff: number) => {
    setInventoryList(inventoryList.map(item => {
      if (item.id === itemId) {
        return { ...item, stock: Math.max(0, item.stock + diff) };
      }
      return item;
    }));

    try {
      await apiFetch("/api/inventory/adjust", authUser?.tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, adjustment: diff })
      });
    } catch (e) {
      console.warn("Offline stock adjustment completed.");
    }
  };

  // Create draft Purchase Order
  const createPurchaseOrder = async (inventoryName: string, neededQty: number, estCost: number) => {
    const supplier = inventoryName.includes("Teff")
      ? "Mercato Grain Wholesalers"
      : inventoryName.includes("Kibe")
      ? "Sululta Dairy Cooperative"
      : "Mercato Central Market";
    try {
      const res = await apiFetch("/api/purchase-orders", authUser?.tenantCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier, item: inventoryName, qty: neededQty, cost: estCost }),
      });
      if (res.ok) {
        const newPO = await res.json();
        setPurchaseOrders(prev => [newPO, ...prev]);
        alert(isAmharic ? `ረቂቅ የግዢ ትዕዛዝ ተፈጥሯል: ${newPO.id}` : `Draft Purchase Order created: ${newPO.id}`);
      }
    } catch {
      // Offline fallback
      const newPO: PurchaseOrder = {
        id: `PO-${Math.floor(304 + Math.random() * 100)}`,
        supplier,
        item: inventoryName,
        qty: neededQty,
        cost: estCost,
        status: "Draft",
        date: new Date().toISOString().split("T")[0],
      };
      setPurchaseOrders(prev => [newPO, ...prev]);
      alert(isAmharic ? `ረቂቅ ተፈጥሯል (Offline): ${newPO.id}` : `Draft PO created (offline): ${newPO.id}`);
    }
  };

  // Switch status of PO
  const receivePO = async (poId: string, itemName: string, qty: number) => {
    try {
      const res = await apiFetch(`/api/purchase-orders/${poId}/status`, authUser?.tenantCode, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Received" }),
      });
      if (res.ok) {
        setPurchaseOrders(prev => prev.map(po => po.id === poId ? { ...po, status: "Received" } : po));
        fetchOrdersAndInventory();
        alert(isAmharic ? "ዕቃዎቹ ተረክበዋል፤ የክምችት ማከማቻው ዘምኗል!" : "Inventory stock successfully replenished after receiving PO!");
        return;
      }
    } catch { /* offline fallback */ }
    // Optimistic fallback
    setPurchaseOrders(prev => prev.map(po => po.id === poId ? { ...po, status: "Received" } : po));
    const invItem = inventoryList.find(
      i => i.name.toLowerCase().includes(itemName.split(" ")[0].toLowerCase()) || i.ameName.includes(itemName)
    );
    if (invItem) adjustStock(invItem.id, qty);
    alert(isAmharic ? "ዕቃዎቹ ተረክበዋል (Offline)!" : "PO received (offline mode)!");
  };

  // Auth handlers
  const handleAuth = (user: AuthUser) => {
    setAuthUser(user);
    const tabMap: Record<string, typeof activeTab> = {
      customer: "customer",
      waiter: "waiter",
      kitchen: "kitchen",
      bar: "bar",
      cashier: "cashier",
      manager: "manager",
      owner: "owner",
      superadmin: "owner",
    };
    const preferredTab = tabMap[user.role] ?? "customer";
    // Compute allowed tabs now so we don't land on a tab the size blocks
    const size = (user.businessSize ?? "medium") as string;
    const rTabs = ROLE_ALLOWED_TABS[user.role] ?? ["customer"];
    const sTabs = SIZE_ALLOWED_TABS[size] ?? rTabs;
    const allowed = rTabs.filter(t => sTabs.includes(t));
    setActiveTab(allowed.includes(preferredTab as any) ? preferredTab : (allowed[0] ?? "customer") as typeof activeTab);
    // Reset owner sub-tab to avoid showing a tab filtered out by size
    if (user.role === "owner" || user.role === "superadmin") setOwnerSubTab("sales");
    // Store JWT so all subsequent apiFetch calls are authenticated
    setAuthToken(user.token ?? null);
    // Re-fetch with this user's tenant code and role
    fetchAllData(user.tenantCode, user.role);

    // If waiter: fetch which tables are assigned to me
    if (user.role === "waiter" && user.token) {
      apiFetch("/api/table-assignments/mine", user.tenantCode).then(async res => {
        if (res.ok) {
          const ids: string[] = await res.json();
          setMyAssignedTableIds(ids.map(id => id.toUpperCase()));
        }
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthUser(null);
    setActiveTab("customer");
  };

  // Help calculate time elapsed
  const getElapsedMinutes = (isoString: string) => {
    const elapsedMs = Date.now() - new Date(isoString).getTime();
    return Math.floor(elapsedMs / (1000 * 60));
  };

  // Public routes — QR menu, feedback, payment success
  if (isBusinessProfile && businessProfileCode) {
    return (
      <PublicBusinessProfile
        code={businessProfileCode}
        isAmharic={isAmharic}
        onBack={() => { window.history.pushState({}, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }}
      />
    );
  }
  if (isPaymentSuccess) {
    return <PaymentSuccess isAmharic={isAmharic} onContinue={() => { window.history.replaceState(null, "", "/"); handleLogout(); }} />;
  }
  if (isQRMenu) {
    const parts = publicPath.split("/"); // /menu/TENANTCODE/TABLE
    const tc = parts[2] || "";
    const table = parts[3] || "";
    return <QRMenuPage tenantCode={tc} tableId={table} />;
  }
  if (isFeedbackPage) {
    const parts = publicPath.split("/"); // /feedback/TENANTCODE
    const tc = parts[2] || "";
    return <PublicFeedbackPage tenantCode={tc} />;
  }

  // Show landing page
  if (showLanding && !showRegister && !showSuperAdmin) {
    return (
      <LandingPage
        isAmharic={isAmharic}
        setIsAmharic={setIsAmharic}
        onLogin={() => setShowLanding(false)}
        onRegister={() => { setShowLanding(false); setShowRegister(true); }}
      />
    );
  }

  // Show register page
  if (showRegister) {
    return (
      <RegisterPage
        isAmharic={isAmharic}
        setIsAmharic={setIsAmharic}
        onBack={() => { setShowRegister(false); setShowLanding(true); }}
      />
    );
  }

  // Show super admin dashboard
  if (showSuperAdmin) {
    return (
      <SuperAdminDashboard
        onLogout={() => { sessionStorage.removeItem("admin_token"); setShowSuperAdmin(false); setShowLanding(true); }}
      />
    );
  }

  // Show PIN login when not authenticated
  if (!authUser) {
    return (
      <PinLogin
        onAuth={handleAuth}
        onRegister={() => setShowRegister(true)}
        onSuperAdmin={() => setShowSuperAdmin(true)}
        onBack={() => setShowLanding(true)}
        isAmharic={isAmharic}
        setIsAmharic={setIsAmharic}
      />
    );
  }

  const bizSize = (authUser.businessSize ?? "medium") as string;
  const roleTabs = ROLE_ALLOWED_TABS[authUser.role] ?? ["customer"];
  const sizeTabs = SIZE_ALLOWED_TABS[bizSize] ?? roleTabs;
  const allowedTabs = roleTabs.filter(t => sizeTabs.includes(t));

  // Full-screen payment wall for expired / suspended tenants
  const subStatus = authUser.subscriptionStatus;
  if (subStatus === 'expired' || subStatus === 'suspended') {
    return (
      <SubscriptionWall
        tenantCode={authUser.tenantCode ?? ""}
        businessName={authUser.tenantName ?? "Your Restaurant"}
        plan={authUser.plan ?? "starter"}
        monthlyFee={authUser.monthlyFee ?? 0}
        daysOverdue={authUser.daysOverdue ?? 0}
        status={subStatus}
        subscriptionEnd={authUser.subscriptionEnd ?? null}
        graceEnds={authUser.graceEnds ?? null}
        isAmharic={isAmharic}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300">

      {/* Subscription status banner */}
      {authUser.subscriptionStatus === 'trial' && authUser.trialDaysLeft !== undefined && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-amber-400 font-semibold">
            {isAmharic
              ? `🕐 ሙከራ ጊዜ: ${authUser.trialDaysLeft} ቀናት ቀርተዋል`
              : `🕐 Trial: ${authUser.trialDaysLeft} day${authUser.trialDaysLeft === 1 ? '' : 's'} remaining`}
          </span>
          <span className="text-amber-300 font-mono">{authUser.tenantCode}</span>
        </div>
      )}
      {authUser.subscriptionStatus === 'grace' && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-amber-300 font-semibold">
            {isAmharic
              ? `⚠ ክፍያ ዘግይቷል — ${7 - (authUser.daysOverdue ?? 0)} ቀን ቀርቷል፣ ካልከፈሉ ስርዓቱ ይቆማል`
              : `⚠ Payment overdue — ${7 - (authUser.daysOverdue ?? 0)} day(s) left in grace period before access is blocked`}
          </span>
          <span className="text-amber-400 font-mono">{authUser.tenantCode}</span>
        </div>
      )}
      {authUser.subscriptionStatus === 'expiring_soon' && (
        <div className="bg-orange-500/10 border-b border-orange-500/30 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-orange-400 font-semibold">
            {isAmharic
              ? `🔔 ደንበኝነት ሲያልቅ ቀናት ቀርተዋል — እባክዎ ቶሎ ያድሱ`
              : `🔔 Subscription expiring soon — please renew to avoid interruption`}
          </span>
          <span className="text-orange-300 font-mono">{authUser.tenantCode}</span>
        </div>
      )}

      {/* Floating Kitchen Alerts Toast Notification Banner */}
      {waiterNotifications.length > 0 && waiterNotifications.some(n => !n.isRead) && (
        <div id="waiter-toast-overlay" className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-2 pointer-events-none">
          {waiterNotifications.filter(n => !n.isRead).slice(0, 3).map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur border-2 border-amber-500 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.25)] p-4 rounded-2xl flex gap-3 transform translate-x-0 transition-all duration-350 hover:scale-[1.02] animate-qr-glow"
              role="alert"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-500 font-mono flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-ping" />
                    {isAmharic ? "ምግብ ደርሷል" : "Plate Ready"}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">{notif.time}</span>
                </div>
                <h4 className="text-xs font-black text-slate-200">
                  {isAmharic ? `ጠረጴዛ: ${notif.tableId}` : `Table: ${notif.tableId}`}
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {notif.message}
                </p>
                {notif.itemsSummary && (
                  <p className="text-[10px] text-zinc-450 font-mono truncate border-t border-slate-800/60 pt-1 mt-1">
                    {notif.itemsSummary}
                  </p>
                )}
                
                <div className="flex gap-2 pt-1.5 justify-end">
                  <button
                    onClick={() => {
                      setWaiterNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                    }}
                    className="text-[10px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {isAmharic ? "ደብቅ" : "Dismiss"}
                  </button>
                  <button
                    onClick={() => {
                      setWaiterNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                      setActiveTab('waiter');
                    }}
                    className="text-[10px] font-black px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors cursor-pointer"
                  >
                    {isAmharic ? "እይ" : "View"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Header + role navigation */}
      <AppHeader
        isAmharic={isAmharic}
        setIsAmharic={setIsAmharic}
        authUser={authUser}
        onLogout={handleLogout}
      />

      <RoleNav
        isAmharic={isAmharic}
        authUser={authUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allowedTabs={allowedTabs}
        branches={branches}
        currentBranch={currentBranch}
        setCurrentBranch={setCurrentBranch}
        waiterUnreadCount={waiterNotifications.filter(n => !n.isRead).length}
        kitchenPendingCount={orders.filter(o => resolveOrderStation(o) === 'kitchen' && o.status === 'Pending').length}
        barPendingCount={orders.filter(o => resolveOrderStation(o) === 'bar' && o.status === 'Pending').length}
        cashierUnpaidCount={orders.filter(o => o.paymentStatus === 'Unpaid').length}
      />

      {authUser.role === 'manager' && (
        <DevToolsPanel
          isAmharic={isAmharic}
          isOnline={isOnline}
          setIsOnline={setIsOnline}
          isLowBandwidth={isLowBandwidth}
          setIsLowBandwidth={setIsLowBandwidth}
          pendingSyncCount={pendingSyncCount}
          triggerSync={triggerSync}
        />
      )}

      {/* Main Core View Area */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* ==================== 1. CUSTOMER QR MENU VIEW ==================== */}
        {activeTab === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Menu Browsing & Ordering Filters */}
            <div className="lg:col-span-2 space-y-6">

              {/* Table info — simple */}
              {orderType === 'Dine-in' && (
                <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-200">
                    {isAmharic ? `${selectedTable} — ጠረጴዛ` : `${selectedTable}`}
                  </span>
                </div>
              )}

              {/* Category Filter Pills */}
              <div className="flex gap-2 pb-2 overflow-x-auto">
                {(['All', 'Meat', 'Fasting', 'Drinks', 'Dessert'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMenuFilter(cat)}
                    className={`text-xs font-bold px-4 py-2 bg-slate-900 border rounded-full whitespace-nowrap cursor-pointer transition-all ${
                      menuFilter === cat 
                        ? 'border-amber-500 text-amber-400 bg-amber-500/5 shadow-md shadow-amber-500/5' 
                        : 'border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {isAmharic ? (
                      cat === "All" ? "ሁሉም" :
                      cat === "Meat" ? "ሥጋ" :
                      cat === "Fasting" ? "ፆም" :
                      cat === "Drinks" ? "መጠጥ" : "ጣፋጭ"
                    ) : (
                      cat === "All" ? "All" :
                      cat === "Meat" ? "Meat" :
                      cat === "Fasting" ? "Fasting" :
                      cat === "Drinks" ? "Drinks" : "Dessert"
                    )}
                  </button>
                ))}
              </div>

              {/* Menu Grid */}
              {menuLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(n => (
                    <div key={n} className="bg-slate-800 rounded-2xl h-40 animate-pulse border border-slate-700" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems
                  .filter(item => menuFilter === 'All' || item.category === menuFilter)
                  .map(item => (
                    <div 
                      key={item.id} 
                      className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-750 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md"
                    >
                      {/* Image / Icon container with Low Bandwidth simulation support */}
                      <div className="relative h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {isLowBandwidth ? (
                          <div className="text-center p-4">
                            <Utensils className="w-12 h-12 text-slate-700 mx-auto mb-2 group-hover:text-amber-500 transition-colors" />
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                              {isAmharic ? "ዝቅተኛ ፍጆታ ሞድ: ምስል ተደብቋል" : "Low Bandwidth: Graphic Hidden"}
                            </span>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                              loading="lazy"
                            />
                            <div className="absolute top-2 right-2 bg-slate-950/85 px-2 py-1 rounded-lg text-[10px] font-mono text-amber-400 font-bold border border-slate-800 hidden sm:block">
                              ★ {item.popularity}
                            </div>
                          </>
                        )}
                        <span className="absolute bottom-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg shadow-md">
                          {item.price} ETB
                        </span>
                      </div>

                      <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                              {isAmharic ? item.ameName : item.name}
                            </h4>
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              item.category === 'Fasting' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              item.category === 'Meat' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {isAmharic 
                                ? (item.category === 'Fasting' ? "የፆም" : item.category === 'Meat' ? "ሥጋ" : "ፈሳሽ") 
                                : item.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {isAmharic ? item.ameDescription : item.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-850 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {item.prepTime} {isAmharic ? "ደቂቃ" : "mins prep"}
                          </span>

                          <button
                            onClick={() => addToCart(item)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-amber-500/10"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAmharic ? "ጨምር" : "Add"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right Col: Interactive Live Bill & Checkout (Customer view) */}
            <div className="space-y-6">
              
              {/* Order Settings Section */}
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span>{isAmharic ? "ትዕዛዝ" : "Your order"}</span>
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {(['Dine-in', 'Takeaway', 'Delivery'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`text-xs py-2 rounded-xl border text-center font-bold tracking-tight cursor-pointer transition-all ${
                        orderType === type 
                          ? "bg-amber-500 border-amber-500 text-slate-950" 
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {isAmharic ? (
                        type === "Dine-in" ? "እዚህ ልብላ" :
                        type === "Takeaway" ? "ይዞ መሄድ" : "ማድረሻ"
                      ) : type}
                    </button>
                  ))}
                </div>


                {/* Conditional dining table input or delivery options */}
                {orderType === 'Dine-in' ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        {isAmharic ? "ጠረጴዛ" : "Table"}
                      </label>
                      <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs font-bold rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Table 1">Table 1 (Regular)</option>
                        <option value="Table 2">Table 2 (Regular)</option>
                        <option value="Table 3">Table 3 (Standard)</option>
                        <option value="Table 4">Table 4 (Regular Window)</option>
                        <option value="Table 8">Table 8 (VIP Private Cubicle)</option>
                        <option value="Table 10 (VIP)">Table 10 (VIP Lounge Group)</option>
                      </select>
                    </div>

                    {/* QR tools — manager only */}
                    {(authUser.role === 'manager' || authUser.role === 'owner') && (
                    <div id="table-qr-section" className="pt-2.5 border-t border-slate-850/60">
                      <button
                        id="btn-toggle-qr-standee"
                        type="button"
                        onClick={() => setShowQrStandee(!showQrStandee)}
                        className={`w-full flex items-center justify-between text-xs py-1.5 px-3 bg-slate-950 border rounded-xl font-bold transition-all duration-500 ${
                          qrGlowActive 
                            ? "border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.01]" 
                            : "border-slate-850 text-slate-300 hover:text-amber-400"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <QrCode className={`w-4 h-4 text-amber-500 ${qrGlowActive ? "animate-spin" : "animate-pulse"}`} />
                          <span>
                            {isAmharic 
                              ? `የዲጂታል ጠረጴዛ QR (${selectedTable})` 
                              : `Digital Table QR (${selectedTable})`}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {showQrStandee 
                            ? (isAmharic ? "ደብቅ" : "Collapse") 
                            : (isAmharic ? "ክፈት" : "Expand")}
                        </span>
                      </button>

                      {showQrStandee && tableQrCodeUrl && (
                        <div 
                          id="qr-standee-card"
                          className={`mt-3 p-4 bg-slate-950 border-2 rounded-2xl relative overflow-hidden transition-all duration-500 shadow-2xl space-y-4 ${
                            qrGlowActive 
                              ? "border-amber-500 animate-qr-glow shadow-[0_0_30px_rgba(245,158,11,0.55)]" 
                              : "border-dashed border-amber-500/30"
                          }`}
                        >
                          {/* Inner glowing accent */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-xl pointer-events-none" />

                          {/* Top Standee Header */}
                          <div className="text-center space-y-1">
                            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-mono">
                              {isAmharic ? "ዲጂታል ምናሌ" : "Digital Menu"}
                            </span>
                            <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1.5 pt-1">
                              <span>{selectedTable}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({isAmharic ? "ቦሌ ቅርንጫፍ" : "Bole Main Branch"})
                              </span>
                            </h4>
                          </div>

                          {/* QR Code Graphic Frame */}
                          <div className="flex justify-center flex-col items-center gap-2 bg-white p-3 rounded-xl max-w-[200px] mx-auto shadow-lg border border-slate-200">
                            <img 
                              id="qr-standee-img"
                              src={tableQrCodeUrl} 
                              alt={`QR Code for ${selectedTable}`}
                              className="w-40 h-40 object-contain selection:bg-transparent"
                              referrerPolicy="no-referrer"
                            />
                            <p className="text-[9px] font-mono font-bold text-slate-900 tracking-wider">
                              SCAN TO ORDER
                            </p>
                          </div>

                          {/* Guide text */}
                          <div className="text-center space-y-1">
                            <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                              {isAmharic 
                                ? "በስልክዎ ካሜራ ስካን በማድረግ በቀጥታ የምግብ ትዕዛዝዎን ይላኩ።" 
                                : "Scan with phone camera to customize & sync table companion session."}
                            </p>
                            <p className="text-[9px] text-slate-500 italic">
                              {isAmharic 
                                ? "* አስተናጋጅ ሳይጠብቁ በTelebirr በቀጥታ መክፈል ይችላሉ።" 
                                : "* Direct self-service with instant local checkout options."}
                            </p>
                          </div>

                          {/* Quick Interactive Actions */}
                          <div className="grid grid-cols-3 gap-1.5 pt-2">
                            <button
                              id="btn-qr-open-link"
                              onClick={() => {
                                const url = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(selectedTable)}`;
                                window.open(url, "_blank");
                              }}
                              className="flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-850 hover:border-amber-500 hover:bg-slate-850 text-slate-300 hover:text-amber-400 rounded-xl transition-all group cursor-pointer"
                              title="Open parameter link in new browser tab to test scan integration"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mb-1 group-hover:scale-105 transition-transform" />
                              <span className="text-[9px] font-bold">
                                {isAmharic ? "ክፈት" : "Open Link"}
                              </span>
                            </button>

                            <button
                              id="btn-qr-download"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = tableQrCodeUrl;
                                link.download = `${selectedTable.replace(/\s+/g, "_")}_digital_menu_qr.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-850 hover:border-emerald-500 hover:bg-slate-850 text-slate-300 hover:text-emerald-400 rounded-xl transition-all group cursor-pointer"
                              title="Download PNG QR image offline"
                            >
                              <Download className="w-3.5 h-3.5 mb-1 group-hover:scale-105 transition-transform" />
                              <span className="text-[9px] font-bold">
                                {isAmharic ? "አውርድ" : "Download"}
                              </span>
                            </button>

                            <button
                              id="btn-qr-print"
                              onClick={() => {
                                const printWin = window.open("", "_blank");
                                if (printWin) {
                                  printWin.document.write(`
                                    <html>
                                      <head>
                                        <title>Print Standee - ${selectedTable}</title>
                                        <style>
                                          body {
                                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                            text-align: center;
                                            padding: 40px;
                                            background: #f8fafc;
                                            color: #0f172a;
                                          }
                                          .card {
                                            border: 4px solid #f59e0b;
                                            border-radius: 24px;
                                            padding: 40px;
                                            max-width: 320px;
                                            margin: 0 auto;
                                            background: white;
                                            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                                          }
                                          .tag {
                                            font-size: 12px;
                                            text-transform: uppercase;
                                            letter-spacing: 2px;
                                            font-weight: 800;
                                            color: #f59e0b;
                                            background: #fef3c7;
                                            padding: 4px 12px;
                                            border-radius: 9999px;
                                          }
                                          h1 {
                                            font-size: 24px;
                                            margin: 20px 0;
                                          }
                                          img {
                                            width: 200px;
                                            height: 200px;
                                            margin: 20px auto;
                                            display: block;
                                          }
                                          p {
                                            font-size: 14px;
                                            color: #475569;
                                            line-height: 1.5;
                                          }
                                          .footer {
                                            font-size: 11px;
                                            color: #94a3b8;
                                            margin-top: 20px;
                                          }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="card">
                                          <span class="tag">Digital Table Menu</span>
                                          <h1>${selectedTable}</h1>
                                          <img src="${tableQrCodeUrl}" alt="QR" />
                                          <p><strong>SCAN TO VIEW MENU</strong><br/>Place orders directly from your phone!</p>
                                          <div class="footer">Gursha Digital Dining Experience - Bole Branch</div>
                                        </div>
                                        <script>
                                          window.onload = function() {
                                            window.print();
                                            setTimeout(function() { window.close(); }, 500);
                                          }
                                        </script>
                                      </body>
                                    </html>
                                  `);
                                  printWin.document.close();
                                }
                              }}
                              className="flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-850 hover:border-blue-500 hover:bg-slate-850 text-slate-300 hover:text-blue-400 rounded-xl transition-all group cursor-pointer"
                              title="Print high-quality table standee template"
                            >
                              <Printer className="w-3.5 h-3.5 mb-1 group-hover:scale-105 transition-transform" />
                              <span className="text-[9px] font-bold">
                                {isAmharic ? "አትም" : "Print QR"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                ) : orderType === 'Delivery' ? (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        {isAmharic ? "የስልክ ቁጥር" : "Contact Phone:"}
                      </label>
                      <input 
                        type="text" 
                        value={deliveryPhone} 
                        onChange={(e)=>setDeliveryPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs rounded-xl py-1.5 px-3 focus:outline-none focus:border-amber-500 text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        {isAmharic ? "የማድረሻ አድራሻ" : "Delivery Destination Address:"}
                      </label>
                      <input 
                        type="text" 
                        value={deliveryAddress} 
                        onChange={(e)=>setDeliveryAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs rounded-xl py-1.5 px-3 focus:outline-none focus:border-amber-500 text-slate-200"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {isAmharic ? "* እቃው በተዘጋጀ ቁጥር በPOS ስምዎ ተጠርተው ይረከባሉ።" : "* Perfect for quick takeaway during busy corporate hours."}
                  </p>
                )}
              </div>

              {/* Digital Cart & Joint Group Orders summary */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl shadow-xl overflow-hidden p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-amber-500" />
                      <span>{isAmharic ? "ጋሪ" : "Cart"}</span>
                    </h3>
                    <span className="bg-slate-950 border border-slate-850 text-xs text-slate-300 font-bold px-2 rounded-lg font-mono">
                      {localCart.reduce((sum, i) => sum + i.quantity, 0)} {isAmharic ? "ንጥል" : "items"}
                    </span>
                  </div>

                  {localCart.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Utensils className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-xs">
                        {isAmharic ? "ጋሪዎ ባዶ ነው — ከምናሌ ይምረጡ" : "Cart is empty — pick from the menu"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                      {localCart.map((item, idx) => (
                        <div key={`${item.menuItem.id}-${item.addedBy}-${idx}`} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-950 last:border-0">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-300">
                                {isAmharic ? item.menuItem.ameName : item.menuItem.name}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-400">
                              {item.menuItem.price} ETB x {item.quantity}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item.menuItem.id, item.addedBy)}
                              className="bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850 p-1.5 rounded-lg cursor-pointer hover:text-rose-500 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold font-mono text-slate-200 min-w-[12px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item.menuItem, item.addedBy)}
                              className="bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850 p-1.5 rounded-lg cursor-pointer hover:text-emerald-500 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {localCart.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-850 space-y-4">
                    
                    {/* Pricing details */}
                    <div className="space-y-1.5 text-xs">
                      
                      <div className="flex justify-between text-slate-450">
                        <span>{isAmharic ? "VAT (15%)" : "VAT (15%):"}</span>
                        <span className="font-mono">{cartTax.toFixed(2)} ETB</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-200 pt-1.5 border-t border-slate-850/60">
                        <span>{isAmharic ? "ጠቅላላ:" : "Total:"}</span>
                        <span className="font-mono text-amber-400">{cartTotal.toFixed(2)} ETB</span>
                      </div>
                    </div>

                    {/* Place order */}
                    <button
                      onClick={submitOrder}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isAmharic ? "ትዕዛዝ ላክ" : "Place order"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ==================== 2. WAITER VIEW ==================== */}
        {activeTab === 'waiter' && false && (() => {
          // ── Compute live waiter stats from real order data ──────────────
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayOrders = orders.filter(o =>
            o.creationTime && o.creationTime.slice(0, 10) === todayStr
          );
          const totalToday      = todayOrders.length;
          const servedToday     = todayOrders.filter(o => o.status === "Served").length;
          const pendingToday    = todayOrders.filter(o => o.status === "Pending" || o.status === "Cooking").length;
          const readyToRun      = todayOrders.filter(o => o.status === "Ready").length;
          const paidRevenue     = todayOrders.filter(o => o.paymentStatus === "Paid").reduce((s, o) => s + o.total, 0);
          const unpaidRevenue   = todayOrders.filter(o => o.paymentStatus === "Unpaid").reduce((s, o) => s + o.total, 0);
          const servedPct       = totalToday > 0 ? Math.round((servedToday / totalToday) * 100) : 0;

          // My personal record from staff list (matched by name)
          const myRecord = staffList.find(s =>
            authUser && s.name.toLowerCase().includes(authUser.name.split(" ")[0].toLowerCase())
          );

          // Hour-by-hour order bucketing (last 8 hours)
          const hourBuckets: { label: string; count: number }[] = [];
          for (let h = 7; h <= 21; h++) {
            const label = `${h}:00`;
            const count = todayOrders.filter(o => {
              const hr = new Date(o.creationTime).getHours();
              return hr === h;
            }).length;
            hourBuckets.push({ label, count });
          }
          const maxBucket = Math.max(...hourBuckets.map(b => b.count), 1);

          return (
          <div className="space-y-8">

            {/* ── MY SHIFT DAILY REPORT ──────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-900 font-black text-base shadow-lg shadow-amber-500/20 flex-shrink-0">
                    {authUser?.name?.charAt(0) ?? "W"}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100">
                      {isAmharic ? `${authUser?.name ?? "አስተናጋጅ"} — የዛሬ ሪፖርት` : `${authUser?.name ?? "Waiter"} — Today's Shift Report`}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isAmharic
                        ? `${new Date().toLocaleDateString("am-ET", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
                        : `${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchOrdersAndInventory}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isAmharic ? "አዙር" : "Refresh"}
                </button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-800">
                {/* Orders received */}
                <div className="bg-slate-900 p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    {isAmharic ? "ዛሬ የተቀበሉ" : "Orders Today"}
                  </span>
                  <span className="text-2xl font-black text-slate-100">{totalToday}</span>
                  <span className="text-[10px] text-slate-500">{isAmharic ? "ጠቅላላ ትዕዛዞች" : "total tickets"}</span>
                </div>

                {/* Served */}
                <div className="bg-slate-900 p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    {isAmharic ? "የቀረቡ" : "Served"}
                  </span>
                  <span className="text-2xl font-black text-emerald-400">{servedToday}</span>
                  <span className="text-[10px] text-slate-500">{servedPct}% {isAmharic ? "ተጠናቋል" : "completion"}</span>
                </div>

                {/* Pending / Cooking */}
                <div className="bg-slate-900 p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    {isAmharic ? "በዝግጅት ላይ" : "In Progress"}
                  </span>
                  <span className="text-2xl font-black text-amber-400">{pendingToday}</span>
                  <span className="text-[10px] text-slate-500">{isAmharic ? "ወጥ ቤት ያለ" : "in kitchen/bar"}</span>
                </div>

                {/* Ready to run */}
                <div className="bg-slate-900 p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    {isAmharic ? "ለማቅረብ ዝግጁ" : "Ready to Run"}
                  </span>
                  <span className={`text-2xl font-black ${readyToRun > 0 ? "text-rose-400 animate-pulse" : "text-slate-400"}`}>{readyToRun}</span>
                  <span className="text-[10px] text-slate-500">{isAmharic ? "ይሂዱ አምጡ!" : "go pick up now"}</span>
                </div>

                {/* Paid revenue */}
                <div className="bg-slate-900 p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    {isAmharic ? "የተከፈለ ዋጋ" : "Paid Revenue"}
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono">{paidRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500">ETB</span>
                </div>

                {/* Unpaid / open bills */}
                <div className="bg-slate-900 p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    {isAmharic ? "ያልተከፈለ" : "Open Bills"}
                  </span>
                  <span className="text-2xl font-black text-blue-400 font-mono">{unpaidRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500">ETB {isAmharic ? "ይጠበቃል" : "outstanding"}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 py-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>{isAmharic ? "የዛሬ ሙሉ ሂደት" : "Shift completion"}</span>
                  <span className="text-amber-400 font-bold">{servedPct}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${servedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>{servedToday} {isAmharic ? "ተጠናቋል" : "served"}</span>
                  <span>{totalToday - servedToday} {isAmharic ? "ይቀራል" : "remaining"}</span>
                </div>
              </div>

              {/* Hourly activity sparkline */}
              <div className="px-6 pb-5 border-t border-slate-800 pt-4 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  {isAmharic ? "የዛሬ ሰዓታዊ የትዕዛዝ ስርጭት" : "Today's orders by hour"}
                </p>
                <div className="flex items-end gap-1 h-12">
                  {hourBuckets.map((b, i) => {
                    const pct = (b.count / maxBucket) * 100;
                    const now = new Date().getHours();
                    const isCurrentHour = (i + 7) === now;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group relative">
                        <div
                          className={`w-full rounded-sm transition-all duration-300 ${
                            isCurrentHour
                              ? "bg-amber-400"
                              : b.count > 0
                              ? "bg-slate-600 hover:bg-slate-500"
                              : "bg-slate-800"
                          }`}
                          style={{ height: `${Math.max(pct, b.count > 0 ? 15 : 4)}%` }}
                        />
                        {/* Tooltip */}
                        {b.count > 0 && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-700 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {b.label}: {b.count}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                  <span>7:00</span>
                  <span>12:00</span>
                  <span>17:00</span>
                  <span>21:00</span>
                </div>
              </div>

              {/* Personal performance row (from staffList) */}
              {myRecord && (
                <div className="border-t border-slate-800 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{isAmharic ? "ያስተናገዱ" : "All-time Handled"}</p>
                    <p className="text-lg font-black text-slate-200 mt-0.5">{myRecord.stats.ordersHandled}</p>
                  </div>
                  {myRecord.stats.avgServiceSpeed !== undefined && (
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{isAmharic ? "አማካይ ፍጥነት" : "Avg Service Speed"}</p>
                      <p className="text-lg font-black text-amber-400 mt-0.5">{myRecord.stats.avgServiceSpeed} min</p>
                    </div>
                  )}
                  {myRecord.stats.customerRating !== undefined && (
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{isAmharic ? "የደንበኛ ደረጃ" : "Customer Rating"}</p>
                      <p className="text-lg font-black text-amber-400 mt-0.5">⭐ {myRecord.stats.customerRating}/5</p>
                    </div>
                  )}
                  {myRecord.stats.tipsEarned !== undefined && (
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{isAmharic ? "ጠቅላላ ጉርሻ" : "Tips Earned"}</p>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">{myRecord.stats.tipsEarned} ETB</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Kitchen Dispatch Alerts / Ready Notifications */}
            {waiterNotifications.length > 0 && (
              <div id="kitchen-dispatch-alerts" className="bg-slate-900 border border-amber-500/20 p-5 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                      <QrCode className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <span>{isAmharic ? "ዝግጁ ምግቦች" : "Ready to serve"}</span>
                        {waiterNotifications.filter(n => !n.isRead).length > 0 && (
                          <span className="bg-rose-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                            {waiterNotifications.filter(n => !n.isRead).length} {isAmharic ? "አዲስ" : "New"}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isAmharic 
                          ? "ምግቦች ወዲያው ሲያልቁ እዚህ ይጠቁማል፤ ሲያቀርቡ 'ቀረበ' በማለት ያጽዱ" 
                          : "Real-time alerts triggered by kitchen chefs. Mark as served once dropped off at tables."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setWaiterNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    {isAmharic ? "ሁሉንም ያጽዱ" : "Clear / Dismiss All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {waiterNotifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-3 ${
                        notif.isRead 
                          ? "bg-slate-950/50 border-slate-900/60 opacity-65" 
                          : "bg-slate-950 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-qr-glow"
                      }`}
                    >
                      {/* Glistening side aura */}
                      {!notif.isRead && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" />
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={`${notif.isRead ? "text-slate-500" : "text-amber-400 font-bold"}`}>
                            {isAmharic ? "ምድብ: ወጥ ቤት" : "DEPT: KITCHEN EXPEDITE"}
                          </span>
                          <span className="text-slate-500">{notif.time}</span>
                        </div>

                        <div className="flex items-baseline justify-between pt-1">
                          <h4 className="text-xs font-black text-slate-250">
                            {notif.tableId}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">ID: {notif.orderId}</span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                          {notif.message}
                        </p>

                        {notif.itemsSummary && (
                          <div className="pt-1.5 text-[10px] text-zinc-400 font-mono italic bg-slate-900/60 p-2 rounded-lg border border-slate-850/50">
                            <strong>{isAmharic ? "የታዘዙት:" : "Platter(s):"}</strong> {notif.itemsSummary}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-900/40 pt-3 mt-1 text-[11px] text-slate-400">
                        <span>
                          {notif.isRead 
                            ? (isAmharic ? "✓ ተላልፏል" : "✓ Run Complete") 
                            : (isAmharic ? "● በመጠበቅ ላይ" : "⚡ Ready to Run")}
                        </span>
                        
                        <div className="flex gap-1.5">
                          {!notif.isRead && (
                            <button
                              onClick={() => {
                                setWaiterNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                              }}
                              className="px-2.5 py-1 text-[10px] bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 rounded-lg hover:text-slate-100 transition-colors cursor-pointer"
                              title="Dismiss from current view"
                            >
                              {isAmharic ? "ደብቅ" : "Dismiss"}
                            </button>
                          )}
                          
                          {/* Served button */}
                          <button
                            onClick={() => {
                              updateOrderStatus(notif.orderId, "Served");
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                              notif.isRead 
                                ? "bg-slate-900 text-slate-500 border border-slate-850/50 cursor-not-allowed" 
                                : "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                            }`}
                            disabled={notif.isRead}
                          >
                            {isAmharic ? "ቀረበ" : "Mark Served"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Upper Grid: Table status map Grid */}
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-amber-550" />
                    <span>{isAmharic ? "የጠረጴዛዎች በይነተገናኝ ሁኔታ እይታ" : "Bole Branch Server Screen - Live Table Map"}</span>
                  </h3>
                  <p className="text-xs text-slate-400">{isAmharic ? "ጠረጴዛን በመጫን ለአስተናጋጅ ፈጣን ሂሳብ ማስነሳት ወይም አዲስ ምግብ መዘዝ ይችላሉ" : "Select live table to trigger tableside manual orders, checks, or VIP service flags"}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">Available</span>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded">Active Cooking</span>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">Bill Requested</span>
                  <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2 py-1 rounded animate-pulse">VIP / Urgent</span>
                </div>
              </div>

              {/* Grid of Tables */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { num: "Table 1", cap: 2, status: "Available" },
                  { num: "Table 2", cap: 4, status: "Available" },
                  { num: "Table 3", cap: 4, status: "Bill Requested" },
                  { num: "Table 4", cap: 6, status: "Active Cooking" },
                  { num: "Table 5", cap: 2, status: "Available" },
                  { num: "Table 6", cap: 4, status: "Available" },
                  { num: "Table 7", cap: 4, status: "Active Cooking" },
                  { num: "Table 8", cap: 2, status: "VIP / Urgent" },
                  { num: "Table 9", cap: 4, status: "Available" },
                  { num: "Table 10 (VIP)", cap: 8, status: "Active Cooking" },
                  { num: "Table 11", cap: 4, status: "Available" },
                  { num: "Table 12", cap: 6, status: "Bill Requested" }
                ].map(tbl => {
                  let badgeColors = "border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300";
                  if (tbl.status === "Active Cooking") badgeColors = "border-amber-500/30 bg-amber-500/5 text-amber-300";
                  if (tbl.status === "Bill Requested") badgeColors = "border-blue-500/30 bg-blue-500/5 text-blue-300 shadow-md shadow-blue-500/5 animate-pulse";
                  if (tbl.status === "VIP / Urgent") badgeColors = "border-rose-500/50 bg-rose-500/5 text-rose-400 shadow-lg shadow-rose-500/10 font-bold border-2";

                  return (
                    <div
                      key={tbl.num}
                      onClick={() => {
                        setSelectedTable(tbl.num);
                        if (allowedTabs.includes('customer')) setActiveTab('customer');
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-[96px] cursor-pointer transition-all hover:scale-[1.03] hover:border-amber-500/50 group relative ${badgeColors}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">{tbl.num}</span>
                        <span className="text-[10px] opacity-75">{tbl.cap} Seats</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800/40">
                        <span className="text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis block text-slate-300">
                          {isAmharic 
                            ? (tbl.status === "Available" ? "ክፍት ጠረጴዛ" : tbl.status === "Active Cooking" ? "በዝግጅት ላይ" : tbl.status === "Bill Requested" ? "ሂሳብ ተጠይቋል" : "VIP ልዩ እንክብካቤ")
                            : tbl.status
                          }
                        </span>
                        
                        <button
                          type="button"
                          id={`btn-print-thermal-qr-${tbl.num.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(tbl.num);
                            printTableQrThermal(tbl.num);
                          }}
                          className="flex items-center gap-1 p-1 px-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-550 text-slate-400 hover:text-amber-400 font-bold transition-all cursor-pointer relative z-10"
                          title={isAmharic ? "ከ80ሚሜ ደረሰኝ ማተሚያ QR አትም" : "Print thermal 80mm Table QR Code"}
                        >
                          <Printer className="w-3 h-3" />
                          <span className="text-[9px] font-mono font-medium">80mm</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row waiter statistics, tips and scheduling performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Waiter Manual order taking launcher */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">{isAmharic ? "ፈጣን ጠረጴዛ ሂሳብ መክፈቻ" : "Tableside Quick Order Entry"}</h4>
                  <p className="text-xs text-slate-450 mt-1 lines-clamp-3">
                    {isAmharic 
                      ? "የደንበኞችዎን ትዕዛዝ በእጅዎ ባለው ዋይፋይ ታብሌት ላይ በመጫን KDS ወጥ ቤት በ1 ሰከንድ ውስጥ እንዲደርስ ማድረግ ይችላሉ።" 
                      : "Directly open the digital cart pre-targeted to tables for tableside guest interaction. Auto deducts stock."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTable("Table 4");
                    setOrderType("Dine-in");
                    if (allowedTabs.includes('customer')) setActiveTab('customer');
                  }}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs py-2 w-full rounded-xl cursor-pointer text-center"
                >
                  {isAmharic ? "አዲስ ትዕዛዝ መዝግብ" : "Launch Table POS Selector"}
                </button>
              </div>

              {/* Waiters Scheduling Tracker */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
                <h4 className="font-bold text-slate-200">{isAmharic ? "ዛሬ በስራ ላይ ያሉ ሰራተኞች" : "Today's Waiter Schedule"}</h4>
                
                <div className="space-y-3.5">
                  {staffList.filter(s => s.role === 'Waiter').map(waiter => (
                    <div key={waiter.id} className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-300">{waiter.name}</span>
                          <span className="bg-slate-900 text-[10px] px-1.5 py-0.5 rounded text-amber-400 font-mono">
                            {waiter.shift} Shift
                          </span>
                        </div>
                        <p className="text-slate-450 text-[11px] mt-0.5">
                          {isAmharic 
                            ? `ያስተናገዱት: ${waiter.stats.ordersHandled} ትዕዛዞች` 
                            : `Handled: ${waiter.stats.ordersHandled} orders | Service speed: ${waiter.stats.avgServiceSpeed} mins`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-amber-500 font-bold block">{waiter.stats.tipsEarned || 0} ETB</span>
                        <span className="text-[10px] text-slate-500">{isAmharic ? "የተጠራቀመ ጉርሻ" : "Tips Pool"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guest Waiting Time Analytics */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">{isAmharic ? "የአቀባበልና ማዕድ አቅርቦት ፍጥነት" : "Table Wait Latency Monitoring"}</h4>
                  <p className="text-xs text-slate-450 mt-1">
                    {isAmharic 
                      ? "የእያንዳንዱን ደንበኛ ምግብ ከታዘዘበት ሰዓት ጀምሮ ለገበታ እስኪበቃ ያለው ጊዜ በየደቂቃው ክትትል ይደረጋል።"
                      : "Average dish preparation speed and waiter food delivery latency since table timestamp checkout."}
                  </p>
                </div>
                
                <div className="space-y-2 uppercase font-mono text-[10px]">
                  <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-900">
                    <span className="text-slate-400">Target Response:</span>
                    <span className="text-emerald-400 font-bold">12 mins Max</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-900">
                    <span className="text-slate-400">Current Avg (Bole):</span>
                    <span className="text-amber-400 font-bold font-mono">8.5 mins</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
          );
        })()}

        {/* ── NEW SIMPLE WAITER VIEW ── */}
        {activeTab === 'waiter' && (
          <WaiterView
            orders={orders}
            isAmharic={isAmharic}
            waiterName={authUser.name}
            updateOrderStatus={updateOrderStatus}
            getElapsedMinutes={getElapsedMinutes}
            onRefresh={fetchOrdersAndInventory}
            assignedTableIds={myAssignedTableIds.length > 0 ? myAssignedTableIds : undefined}
          />
        )}

        {/* ── NEW SIMPLE KITCHEN VIEW ── */}
        {activeTab === 'kitchen' && (
          <KitchenView
            station="kitchen"
            orders={orders}
            isAmharic={isAmharic}
            updateOrderStatus={updateOrderStatus}
            getElapsedMinutes={getElapsedMinutes}
          />
        )}

        {/* ── BAR VIEW (orders + stock) ── */}
        {activeTab === 'bar' && (
          <div className="space-y-4">
            {/* Sub-tab toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setBarSubTab('orders')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                  barSubTab === 'orders'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🍺 {isAmharic ? "ትዕዛዞች" : "Bar Orders"}
              </button>
              <button
                onClick={() => setBarSubTab('stock')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                  barSubTab === 'stock'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                📦 {isAmharic ? "የባር ክምችት" : "Bar Stock"}
              </button>
            </div>

            {barSubTab === 'orders' && (
              <KitchenView
                station="bar"
                orders={orders}
                isAmharic={isAmharic}
                updateOrderStatus={updateOrderStatus}
                getElapsedMinutes={getElapsedMinutes}
              />
            )}

            {barSubTab === 'stock' && (
              <BarInventory
                tenantCode={authUser.tenantCode!}
                isAmharic={isAmharic}
                readOnly={false}
              />
            )}
          </div>
        )}

        {/* ==================== 4. CASHIER POS / ACCREDITED BILLING VIEW ==================== */}
        {activeTab === 'cashier' && (
          <div className="space-y-6">

            {/* ── Waiter Daily Summary ─────────────────────────────────────── */}
            <WaiterSummary
              tenantCode={authUser.tenantCode!}
              isAmharic={isAmharic}
              orders={orders}
            />

            {/* ── Mode Toggle ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setCashierMode('checkout')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                  cashierMode === 'checkout'
                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                {isAmharic ? "ሂሳብ ክፍያ" : "Checkout Bills"}
              </button>
              <button
                onClick={() => setCashierMode('counter-order')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                  cashierMode === 'counter-order'
                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                {isAmharic ? "አዲስ ትዕዛዝ (Counter)" : "New Counter Order"}
              </button>
              <span className="text-xs text-slate-600">
                {cashierMode === 'counter-order'
                  ? (isAmharic ? "ደንበኛ ቆሞ ቢነግርዎ — ምግብ ምረጡ፣ ወደ ወጥቤት ላኩ፣ ክፍያ ሰብስቡ" : "Customer standing at counter — pick items, fire to kitchen, collect payment")
                  : (isAmharic ? "ካሺየር ያልተከፈሉ ሂሳቦችን ያያሉ" : "View and process all unpaid table bills")}
              </span>
            </div>

            {/* ── COUNTER ORDER ENTRY MODE ─────────────────────────────────── */}
            {cashierMode === 'counter-order' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Left — menu item picker */}
                <div className="lg:col-span-3 space-y-4">

                  {/* Category filter */}
                  <div className="flex flex-wrap gap-2">
                    {(['All','Meat','Fasting','Drinks','Dessert'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setCounterMenuFilter(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          counterMenuFilter === f
                            ? 'bg-amber-500 border-amber-500 text-slate-950'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f === 'All' ? (isAmharic ? 'ሁሉም' : 'All') :
                         f === 'Meat' ? (isAmharic ? 'ስጋ' : 'Meat') :
                         f === 'Fasting' ? (isAmharic ? 'ፆም' : 'Fasting') :
                         f === 'Drinks' ? (isAmharic ? 'መጠጥ' : 'Drinks') :
                         (isAmharic ? 'ጣፋጭ' : 'Dessert')}
                      </button>
                    ))}
                  </div>

                  {/* Menu grid — compact tap-to-add */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {menuItems
                      .filter(i => counterMenuFilter === 'All' || i.category === counterMenuFilter)
                      .map(item => {
                        const inCart = counterCart.find(c => c.menuItem.id === item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => counterAddItem(item)}
                            className={`relative text-left p-3 rounded-2xl border transition-all cursor-pointer group ${
                              inCart
                                ? 'bg-amber-500/10 border-amber-500/40'
                                : 'bg-slate-900 border-slate-800 hover:border-amber-500/30 hover:bg-slate-800'
                            }`}
                          >
                            {!isLowBandwidth && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-20 object-cover rounded-xl mb-2 border border-slate-700"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <p className="text-xs font-bold text-slate-200 leading-tight line-clamp-2">
                              {isAmharic ? item.ameName : item.name}
                            </p>
                            <p className="text-[11px] text-amber-400 font-mono font-bold mt-1">{item.price} ETB</p>
                            <p className="text-[10px] text-slate-500">⏱ {item.prepTime}min</p>
                            {inCart && (
                              <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                                {inCart.quantity}
                              </div>
                            )}
                          </button>
                        );
                      })
                    }
                  </div>
                </div>

                {/* Right — cart + order settings + payment */}
                <div className="lg:col-span-2 space-y-4">

                  {/* Order settings */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isAmharic ? "የትዕዛዝ ዝርዝር" : "Order Details"}
                    </p>

                    {/* Table / Seat */}
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">{isAmharic ? "ጠረጴዛ / ቦታ" : "Table / Location"}</label>
                      <select
                        value={counterTable}
                        onChange={e => setCounterTable(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Counter">{isAmharic ? "Counter (ቆሞ)" : "Counter (Walk-up)"}</option>
                        {["Table 1","Table 2","Table 3","Table 4","Table 5","Table 6","Table 7","Table 8","Table 9","Table 10 (VIP)","Table 11","Table 12"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="Takeaway">{isAmharic ? "ይዞ መሄድ" : "Takeaway"}</option>
                      </select>
                    </div>

                    {/* Order type */}
                    <div className="flex gap-2">
                      {(['Dine-in','Takeaway','Delivery'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setCounterOrderType(t)}
                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border cursor-pointer transition-all ${
                            counterOrderType === t
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {t === 'Dine-in' ? (isAmharic ? 'ቤት' : 'Dine-in') : t === 'Takeaway' ? (isAmharic ? 'ይዞ' : 'Takeaway') : (isAmharic ? 'መላክ' : 'Delivery')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cart items */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-300">{isAmharic ? "ያስገቡ ምግቦች" : "Cart"} ({counterCart.reduce((s,c)=>s+c.quantity,0)} {isAmharic ? 'ዓይነት' : 'items'})</p>
                      {counterCart.length > 0 && (
                        <button onClick={() => setCounterCart([])} className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer">
                          {isAmharic ? "ሁሉ አጥፋ" : "Clear all"}
                        </button>
                      )}
                    </div>

                    {counterCart.length === 0 ? (
                      <div className="p-6 text-center text-slate-600 text-xs">
                        {isAmharic ? "ምግብ ለማስገባት ከግራ ዝርዝር ይጫኑ" : "Tap items on the left to add them"}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {counterCart.map(item => (
                          <div key={item.menuItem.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">{isAmharic ? item.menuItem.ameName : item.menuItem.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{item.menuItem.price} × {item.quantity} = {(item.menuItem.price * item.quantity).toLocaleString()} ETB</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => counterRemoveItem(item.menuItem.id)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer">−</button>
                              <span className="w-6 text-center text-xs font-bold text-slate-200">{item.quantity}</span>
                              <button onClick={() => counterAddItem(item.menuItem)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs cursor-pointer">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Totals */}
                    {counterCart.length > 0 && (
                      <div className="border-t border-slate-800 px-4 py-3 space-y-1 text-xs font-mono">
                        <div className="flex justify-between text-slate-400">
                          <span>{isAmharic ? "ንዑስ ድምር" : "Subtotal"}</span>
                          <span>{counterSubtotal.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>ERCA VAT 15%</span>
                          <span>{counterTax.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex justify-between font-black text-amber-400 text-sm pt-1 border-t border-slate-800">
                          <span>{isAmharic ? "ጠቅላላ" : "Total"}</span>
                          <span>{counterTotal.toLocaleString()} ETB</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment — optional collect now */}
                  {counterCart.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {isAmharic ? "ክፍያ አሁን ይሰብስቡ? (አማራጭ)" : "Collect payment now? (optional)"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['', 'Cash', 'Telebirr', 'CBE Birr', 'Card'] as const).map(method => (
                          <button
                            key={method}
                            onClick={() => setCounterPayNow(method)}
                            className={`text-xs py-2 px-3 rounded-xl border font-bold cursor-pointer transition-all ${
                              counterPayNow === method
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                : 'bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {method === '' ? (isAmharic ? '⏳ አሁን አይደለም' : '⏳ Pay later') :
                             method === 'Cash' ? (isAmharic ? '💵 ጥሬ ገንዘብ' : '💵 Cash') :
                             method === 'Telebirr' ? '📱 Telebirr' :
                             method === 'CBE Birr' ? '🏦 CBE Birr' : '💳 Card'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={submitCounterOrder}
                        disabled={counterSubmitting || counterCart.length === 0}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10"
                      >
                        <Send className="w-4 h-4" />
                        {counterSubmitting
                          ? (isAmharic ? "በመላክ ላይ..." : "Sending...")
                          : counterPayNow
                          ? (isAmharic ? `ትዕዛዝ ላክ + ${counterPayNow} ሰብስብ` : `Send to Kitchen + Collect ${counterPayNow}`)
                          : (isAmharic ? "ትዕዛዝ ላክ (ወደ ወጥቤት)" : "Send to Kitchen (pay later)")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CHECKOUT MODE ─────────────────────────────────────────────── */}
            {cashierMode === 'checkout' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left lists: Unpaid bills in queue */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl shadow-xl space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span>{isAmharic ? "ያልተከፈሉ ወቅታዊ ሂሳቦች" : "Bole Branch Active Checkout Bills"}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAmharic ? "ያልተከፈሉ ቢሎች" : "Unpaid bills"}
                  </p>
                </div>

                {orders.filter(o => o.paymentStatus === 'Unpaid').length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs">
                      {isAmharic ? "ምንም ያልተከፈሉ ትዕዛዞች የሉም! ሁሉም ጠረጴዛዎች በታማኝነት ከፍለዋል።" : "Zero active bills in checkout queue. Great job cashier team!"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {orders
                      .filter(o => o.paymentStatus === 'Unpaid')
                      .map(order => (
                        <div 
                          key={order.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            selectedTable === order.tableId 
                              ? "bg-slate-950 border-amber-500/50" 
                              : "bg-slate-950/50 hover:bg-slate-950 border-slate-850"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-900/60 mb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-amber-400">{order.id}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  order.status === 'Served' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-300 mt-1 block">
                                {order.tableId} - ({order.items.reduce((acc, i)=>acc+i.quantity, 0)} {isAmharic ? "ምግብ" : "items"})
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-sm font-mono font-black text-amber-400 block">{order.total.toFixed(2)} ETB</span>
                              <span className="text-[10px] text-slate-500">VAT + Service incl.</span>
                            </div>
                          </div>

                          {/* Split order checkout simulation display */}
                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-mono">
                              Sub: {order.subtotal.toFixed(2)} ETB | VAT: {order.tax.toFixed(2)} ETB
                            </span>
                            <div className="flex gap-2.5">
                              <button
                                onClick={() => setSelectedTable(order.tableId)}
                                className="bg-slate-900 border border-slate-800 text-slate-350 hover:text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                {isAmharic ? "ደረሰኝ እይ (View)" : "Review & Check"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Secure simulated payments support platform banner */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4">
                <h4 className="font-bold text-slate-200">
                  {isAmharic ? "እንዴት ደንበኞች በቴሌብር ይከፍላሉ?" : "Telebirr & CBE Birr Checkout Mechanics"}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAmharic 
                    ? "ካሺየሩ ሂሳቡን በቴሌብር ለመፈጸም ሲመርጥ የቴሌብር መተግበሪያን መክፈት ሳያስፈልግ የደንበኛውን ስልክ ኮድ በማስገባት ሂሳቡ በቅጽበት ይገባል። ይህ በምሳ ሰዓት ጫና የሚፈጠሩ ሰልፎችን በ30% ይቀንሳል።"
                    : "No complex terminal typing needed! Waiters present generated table receipts with automatic Telebirr merchant codes. Instant verification pops onto this screen through continuous local endpoint updates."}
                </p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900/80 flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-450 border border-emerald-500/20 text-xs">
                    65% Transactions
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">Fast Telebirr Merchant Integration Approved</span>
                    <span className="text-[11px] text-slate-500">ERCA Registered Signature Key ID: SIG_TG_84920</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right side check builder: Printable Receipt & interactive payment form */}
            <div>
              {(() => {
                const selectedOrder = orders.find(o => o.tableId === selectedTable && o.paymentStatus === 'Unpaid');
                if(!selectedOrder) {
                  return (
                    <div className="bg-slate-900 border border-slate-850 p-6 text-center rounded-2xl text-slate-500">
                      <CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs">
                        {isAmharic ? "እባክዎን ከግራ ዝርዝር ውስጥ ያልተከፈለ ትዕዛዝ ይምረጡ" : "Choose an unpaid table ticket from the list on the left to simulate checkout & prints!"}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-5 space-y-5">
                    
                    {/* ERCA Standard Receipt Simulator */}
                    <div className="bg-white text-slate-900 p-5 rounded-xl font-mono text-[11px] leading-relaxed shadow-lg relative border border-slate-300 select-none">
                      
                      {/* Thermal Receipt jagged borders */}
                      <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-400">
                        <h4 className="font-black text-sm tracking-tight text-slate-950 uppercase">{PLATFORM_NAME}</h4>
                        <p className="text-[10px] uppercase">{currentBranch === 'bole' ? "Bole Main Medhanialem" : currentBranch === 'mercato' ? "Mercato Hub" : "Kazanchis Express"}</p>
                        <p className="text-[9px]">Addis Ababa, Ethiopia</p>
                        <p className="text-[9px] font-bold">TIN: 104593822 | ERCA REGISTERED</p>
                        <p className="text-[9px]">MACHINE: TAX_SIM_001</p>
                      </div>

                      <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300 text-[10px]">
                        <div className="flex justify-between">
                          <span>INVOICE: #{selectedOrder.id}</span>
                          <span>DATE: {new Date(selectedOrder.creationTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TABLE: {selectedOrder.tableId}</span>
                        <span>SERVER: {authUser?.name ?? "Cashier"}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>TYPE: {selectedOrder.type}</span>
                          <span className="text-rose-600">UNPAID ACCRUAL</span>
                        </div>
                      </div>

                      {/* Items loop */}
                      <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
                        {selectedOrder.items.map((item, i) => (
                          <div key={i} className="space-y-0.5">
                            <div className="flex justify-between font-bold text-slate-950 text-[11px]">
                              <span>{item.menuItem.name}</span>
                              <span>{(item.menuItem.price * item.quantity).toFixed(2)} ETB</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600 pl-2">
                              <span>{item.quantity} x {item.menuItem.price} ETB</span>
                              {selectedOrder.type === 'Dine-in' && (
                                <span>Tag: {item.addedBy === "Me" ? "Guest 1" : item.addedBy}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* VAT and Service Calculations */}
                      <div className="py-2.5 space-y-1 border-b border-slate-400 text-slate-800">
                        <div className="flex justify-between">
                          <span>SUBTOTAL (Net):</span>
                          <span>{selectedOrder.subtotal.toFixed(2)} ETB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ERCA VAT (15.00%):</span>
                          <span>{selectedOrder.tax.toFixed(2)} ETB</span>
                        </div>
                        
                        {/* Optional tip parameters inside bill receipt */}
                        {customTip > 0 && (
                          <div className="flex justify-between text-slate-900 font-bold">
                            <span>OPTIONAL STAFF TIP:</span>
                            <span>{customTip.toFixed(2)} ETB</span>
                          </div>
                        )}

                        <div className="flex justify-between font-black text-slate-950 text-xs pt-1.5 border-t border-slate-300">
                          <span>TOTAL RECEIPT:</span>
                          <span>{(selectedOrder.total + customTip).toFixed(2)} ETB</span>
                        </div>
                      </div>

                      <div className="text-center pt-4 space-y-1 text-[9px] text-slate-500">
                        <p>*** THANK YOU / አመሰግናለሁ ***</p>
                        <p>Powered by {PLATFORM_NAME}</p>
                        <div className="w-16 h-16 bg-slate-250 mx-auto mt-2 border border-slate-300 flex items-center justify-center p-1 rounded">
                          <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-60">
                            {Array.from({length:16}).map((_, key)=>(
                              <div key={key} className={`w-full h-full ${key % 3 === 0 ? "bg-slate-900" : "bg-white"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[7px] text-slate-400 font-sans mt-1">Scan for Digital ERCA receipt audit</p>
                      </div>

                    </div>

                    {/* Tip Selection parameters */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400">{isAmharic ? "የአስተናጋጅ ድጋፍ / ጉርሻ (Tips)" : "Add Waiter Tip:"}</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 20, 50, 100].map(tipAmt => (
                          <button
                            key={tipAmt}
                            onClick={() => setCustomTip(tipAmt)}
                            className={`text-xs py-1.5 rounded-lg border font-mono font-medium cursor-pointer transition-all ${
                              customTip === tipAmt 
                                ? "bg-amber-500 border-amber-500 text-slate-950" 
                                : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {tipAmt === 0 ? "None" : `+${tipAmt} ETB`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment methods */}
                    <div className="space-y-3">
                      <span className="text-xs font-semibold text-slate-400">{isAmharic ? "የክፍያ አማራጭ ይምረጡ" : "Choose Payment Option:"}</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        
                        {/* Telebirr trigger */}
                        <button
                          onClick={() => {
                            checkoutOrder(selectedOrder.id, 'Telebirr');
                            alert(isAmharic ? `የቴሌብር ኤፒአይ በተሳካ ሁኔታ ተረጋግጧል! ${selectedOrder.total + customTip} ብር ተከፍሏል።` : `Telebirr API checkout verified! Received ${selectedOrder.total + customTip} ETB successfully.`);
                            setCustomTip(0);
                          }}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-250 group-hover:text-amber-400">telebirr (ቴሌብር)</span>
                          <span className="text-[10px] text-slate-500 mt-1">Mobile Money SDK</span>
                        </button>
                        
                        {/* Cash checkout */}
                        <button
                          onClick={() => {
                            checkoutOrder(selectedOrder.id, 'Cash');
                            alert(isAmharic ? "ክፍያው በጥሬ ገንዘብ ተጠናቋል" : "Checkout completed with Cash.");
                            setCustomTip(0);
                          }}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-250 group-hover:text-amber-400">{isAmharic ? "ጥሬ ገንዘብ" : "Cash (በአይነት)"}</span>
                          <span className="text-[10px] text-slate-550 mt-1">Direct Drawer</span>
                        </button>

                        {/* CBE Birr checkout */}
                        <button
                          onClick={() => {
                            checkoutOrder(selectedOrder.id, 'CBE Birr');
                            alert(isAmharic ? "የኢትዮጵያ ንግድ ባንክ ክፍያ ተረጋግጧል" : "CBE Birr mobile checkout completed.");
                            setCustomTip(0);
                          }}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-250 group-hover:text-amber-400">CBE Birr (ንግድ ባንክ)</span>
                          <span className="text-[10px] text-slate-550 mt-1">Bank Transfer Code</span>
                        </button>

                        {/* Card checkout */}
                        <button
                          onClick={() => {
                            checkoutOrder(selectedOrder.id, 'Card');
                            alert("Card Swipe checkout complete.");
                            setCustomTip(0);
                          }}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-250 group-hover:text-amber-400">Debit Card</span>
                          <span className="text-[10px] text-slate-550 mt-1">Visa/Mastercard Terminal</span>
                        </button>

                      </div>

                      {/* Print Receipt button */}
                      {selectedOrder.paymentStatus === "Paid" && (
                        <button
                          onClick={() => setReceiptOrderId(selectedOrder.id)}
                          className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                        >
                          🖨️ {isAmharic ? "ደረሰኝ አትም" : "Print Receipt"}
                        </button>
                      )}

                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
            )}
            {/* end cashierMode checkout */}
          </div>
        )}

        {/* ==================== 5. MANAGER, AI & INVENTORY VIEW ==================== */}
        {activeTab === 'manager' && (
          <div className="space-y-8">
            
            {/* Top row: Real-time numeric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Total Revenue (Today)</span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, ord) => sum + ord.total, 0) + 84500} ETB
                  </span>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-450 border border-amber-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Active Dine-In Guests</span>
                  <span className="text-xl font-bold font-mono text-slate-200">
                    {orders.filter(o => o.status === 'Pending' || o.status === 'Cooking').length * 4 + 18} People
                  </span>
                </div>
                <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400 border border-blue-500/20">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Ingredient Alarms</span>
                  <span className="text-xl font-bold font-mono text-rose-400">
                    {inventoryList.filter(i => i.stock <= i.minAlert).length} Alerts
                  </span>
                </div>
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-455 border border-rose-500/20 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Pending Offline Syncs</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {pendingSyncCount} Active
                  </span>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Shuffle className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* ── MENU MANAGEMENT ─────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-400" />
                    {isAmharic ? "የምግብ ዝርዝር አስተዳደር" : "Menu Management"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAmharic ? "ምግቦችን ጨምሩ፣ አርትዕ ያድርጉ ወይም ያስወግዱ — ቁጠባ ቋሚ ነው።" : "Add, edit or remove dishes — saved permanently to the database."}
                  </p>
                </div>
                <button
                  onClick={openAddMenuForm}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAmharic ? "ምግብ ጨምር" : "Add Item"}
                </button>
              </div>

              {/* Add / Edit form */}
              {showMenuForm && (
                <div className="p-5 bg-slate-950/50 border-b border-slate-800 space-y-4">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    {editingMenuItem ? (isAmharic ? "ምግብ አርትዕ" : "Edit Menu Item") : (isAmharic ? "አዲስ ምግብ ጨምር" : "New Menu Item")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Name (English) *</label>
                      <input
                        value={menuFormData.name}
                        onChange={e => setMenuFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Special Beef Tibs"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Name (Amharic)</label>
                      <input
                        value={menuFormData.ameName}
                        onChange={e => setMenuFormData(p => ({ ...p, ameName: e.target.value }))}
                        placeholder="ስፔሻል ጥብስ"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Price (ETB) *</label>
                      <input
                        type="number"
                        value={menuFormData.price}
                        onChange={e => setMenuFormData(p => ({ ...p, price: e.target.value }))}
                        placeholder="450"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Category *</label>
                      <select
                        value={menuFormData.category}
                        onChange={e => setMenuFormData(p => ({ ...p, category: e.target.value as MenuItem["category"] }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Meat">Meat / ስጋ</option>
                        <option value="Fasting">Fasting / ፆም</option>
                        <option value="Drinks">Drinks / መጠጥ</option>
                        <option value="Dessert">Dessert / ጣፋጭ</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Prep Time (min)</label>
                      <input
                        type="number"
                        value={menuFormData.prepTime}
                        onChange={e => setMenuFormData(p => ({ ...p, prepTime: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Popularity (1–10)</label>
                      <input
                        type="number"
                        min="1" max="10" step="0.1"
                        value={menuFormData.popularity}
                        onChange={e => setMenuFormData(p => ({ ...p, popularity: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Description (English)</label>
                      <textarea
                        value={menuFormData.description}
                        onChange={e => setMenuFormData(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Description (Amharic)</label>
                      <textarea
                        value={menuFormData.ameDescription}
                        onChange={e => setMenuFormData(p => ({ ...p, ameDescription: e.target.value }))}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Image URL (Unsplash or direct link)</label>
                      <input
                        value={menuFormData.image}
                        onChange={e => setMenuFormData(p => ({ ...p, image: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveMenuItem}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isAmharic ? "አስቀምጥ" : "Save Item"}
                    </button>
                    <button
                      onClick={() => setShowMenuForm(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all"
                    >
                      {isAmharic ? "ሰርዝ" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}

              {/* Menu items table */}
              <div className="divide-y divide-slate-800">
                {menuItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    {menuLoading ? "Loading menu from database..." : "No menu items yet. Click 'Add Item' to create the first dish."}
                  </div>
                ) : (
                  menuItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-slate-800/30 transition-colors">
                      {/* Thumbnail */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-700"
                        onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60"; }}
                      />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-200 truncate">{isAmharic ? item.ameName : item.name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                            item.category === "Meat"    ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                            item.category === "Fasting" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            item.category === "Drinks"  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                                                          "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          }`}>{item.category}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-amber-400 font-mono font-bold">{item.price} ETB</span>
                          <span className="text-[10px] text-slate-500">⏱ {item.prepTime}min</span>
                          <span className="text-[10px] text-slate-500">⭐ {item.popularity}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEditMenuForm(item)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-slate-300 hover:text-amber-400 px-3 py-1.5 rounded-lg cursor-pointer transition-all font-semibold"
                        >
                          {isAmharic ? "አርትዕ" : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg cursor-pointer transition-all font-semibold"
                        >
                          {isAmharic ? "ሰርዝ" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ADMASU-AI BI ANALYTICS BOARD */}
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles className="w-24 h-24 text-amber-500" />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500 text-slate-950 text-[10px] tracking-widest font-mono font-black uppercase px-2.5 py-1 rounded-full">
                      {isAmharic ? "AI ግንዛቤ" : "Daily insights"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100">
                    {isAmharic ? "አድማሱ-አይ የሬስቶራንት ንግድ አስተያየት ትንተና" : "AI Business intelligence & Food Cost Report"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAmharic 
                      ? "የዛሬውን ገቢ፣ የፆም መርሃግብር እና የጥሬ ዕቃዎች ክምችት የዳሰሰ ምክረ-ሃሳብ" 
                      : "Generates high-value contextual optimization tips for Bole branches combining Gemini AI text models and current inventory data."}
                  </p>
                </div>

                <button
                  onClick={fetchAiAdvisory}
                  disabled={isAiLoading}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/15 min-w-[200px]"
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAmharic ? "አድማሱ-አይ እየተነተነ ነው..." : "AI Consulting..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>{isAmharic ? "ሪፖርት አውጣ (AI)" : "Generate Advisory (Gemini)"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI output display panel with custom load screens */}
              {isAiLoading ? (
                <div className="space-y-3.5 py-6">
                  <div className="h-4 bg-slate-800 rounded-lg animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-800 rounded-lg animate-pulse w-5/6" />
                  <div className="h-4 bg-slate-800 rounded-lg animate-pulse w-2/3" />
                  <p className="text-[11px] text-center text-slate-500 uppercase tracking-widest font-mono pt-4 animate-bounce">
                    Analyzing white teff prices, fasting schedule adjustments & Telebirr transaction splits...
                  </p>
                </div>
              ) : aiInsights ? (
                <div 
                  className="bg-slate-950/80 p-5 rounded-2xl border border-slate-850 text-xs text-slate-300 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: aiInsights }}
                />
              ) : (
                <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-850 text-center text-slate-450 hover:bg-slate-950 transition-colors">
                  <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">
                    {isAmharic 
                      ? "የአድማሱ-አይ (Gemini 3.5 Flash) ምክረ-ሃሳብን ለመቀበል ከላይ ያለውን አዝራር ይጫኑ።" 
                      : "No active report generated values. Tap the button above to authorize local or Cloud Gemini insights logic."}
                  </p>
                </div>
              )}
            </div>

            {/* Split panel: INVENTORY TRACKER vs MULTI-BRANCH PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Side: Real-Time Ingredient Inventory control panel */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
                  <div>
                    <h4 className="font-bold text-slate-200">{isAmharic ? "ጥሬ ዕቃዎችና ማከማቻ አስተዳደር (Inventory)" : "Real-time Ingredient Level Stock List"}</h4>
                    <span className="text-[11px] text-slate-400 font-sans block">{isAmharic ? "ለጥብስ፣ ዶሮ ወጥ እና ሽሮ ወጥ ፈጣን ማስተካከያ" : "Auto deducted as customers place meals in QR desks."}</span>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                    Odoo ERP Logic Active
                  </span>
                </div>

                <div className="space-y-4">
                  {inventoryList.map(item => {
                    const isLow = item.stock <= item.minAlert;
                    return (
                      <div key={item.id} className={`p-3.5 rounded-xl bg-slate-950 border ${isLow ? "border-rose-500/25 bg-rose-500/5" : "border-slate-850"} space-y-3`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-200">
                                {isAmharic ? item.ameName : item.name}
                              </span>
                              {isLow && (
                                <span className="bg-rose-500/10 text-[9px] text-rose-455 font-mono font-bold border border-rose-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                  LOW STOCK WARN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono">
                              Category: {item.category} | Alert limit: {item.minAlert}{item.unit}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`text-sm font-mono font-black ${isLow ? "text-rose-400" : "text-amber-400"} block`}>
                              {item.stock} {item.unit}
                            </span>
                            <span className="text-[10px] text-slate-550 block font-mono">Cost: {item.cost} ETB/unit</span>
                          </div>
                        </div>

                        {/* Interactive adjustment buttons & auto purchase order generator */}
                        <div className="flex gap-2 items-center justify-between flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                            <button 
                              onClick={() => adjustStock(item.id, -1)}
                              className="bg-slate-950 p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] font-bold text-slate-300 font-mono px-1">Adjust</span>
                            <button 
                              onClick={() => adjustStock(item.id, 5)}
                              className="bg-slate-950 p-1 rounded text-slate-450 hover:text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {isLow && (
                            <button
                              onClick={() => createPurchaseOrder(item.name, 40, 40 * item.cost)}
                              className="bg-rose-950 border border-rose-500/30 hover:bg-rose-900 text-rose-450 text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                            >
                              Buy 40 {item.unit} (Auto PO)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ADVANCED FOOD COST MATRIX CALCULATOR FOR ETHIOPIAN DISHES */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-3.5">
                  <h5 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">Ingredient Recipe Cost Index</h5>
                  <div className="space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex justify-between pb-1 border-b border-slate-900">
                      <span>🍽 Special Beef Tibs (BEEF 300g, KIBE 50g, ONIONS 100g):</span>
                      <span className="text-emerald-400 font-mono">Est Cost: 147 ETB (Gross Profit: 67%)</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-slate-900">
                      <span>🥣 Shiro Tegabere (SHIRO POWDER 150g, ONIONS 80g):</span>
                      <span className="text-emerald-400 font-mono">Est Cost: 32 ETB (Gross Profit: 85%)</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-slate-900">
                      <span>🍗 Royal Doro Wat (CHICKEN, BERBERE 40g, KIBE 80g, EGGS):</span>
                      <span className="text-emerald-400 font-mono">Est Cost: 216 ETB (Gross Profit: 66%)</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Side: Multi-Branch Comparators & Active Purchase orders */}
              <div className="space-y-6">
                
                {/* Branch comparison */}
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-slate-200">{isAmharic ? "የቅርንጫፎች ዕለታዊ ሽያጭ ንጽጽር" : "Branch Operations Comparison Board"}</h4>
                  <p className="text-xs text-slate-450">{isAmharic ? "ቦሌ፣ መርካቶ እና ካዛንቺስ ንዑስ ማዕከላት" : "Centralized corporate database records for active branches."}</p>

                  <div className="space-y-4 pt-1">
                    {branches.map(branch => {
                      const percentage = (branch.revenueToday / 120000) * 100;
                      return (
                        <div key={branch.id} className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-200">
                              {isAmharic ? branch.ameName : branch.name}
                            </span>
                            <span className="font-mono font-bold text-amber-400">{branch.revenueToday.toLocaleString()} ETB</span>
                          </div>
                          
                          {/* Simulated mini indicator progress tracking bar */}
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${
                                branch.id === currentBranch 
                                  ? "from-amber-400 to-amber-500 font-bold" 
                                  : "from-slate-600 to-slate-500"
                              }`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Phone: {branch.phone}</span>
                            <span>Tables Capacity: {branch.capacity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Purchase Order queue records */}
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-slate-200">{isAmharic ? "የግዢ ማዘዣዎች መከታተያ (PO System)" : "Active Supplier Purchase Orders"}</h4>
                  <div className="space-y-3">
                    {purchaseOrders.map(po => (
                      <div key={po.id} className="text-xs bg-slate-955 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-500">{po.id}</span>
                            <span className={`text-[9px] uppercase font-bold px-1.5 rounded ${
                              po.status === "Received" ? "bg-emerald-505/10 text-emerald-450" : "bg-slate-900 text-slate-400"
                            }`}>
                              {po.status}
                            </span>
                          </div>
                          <p className="text-slate-350 font-bold mt-1">Item: {po.item} x {po.qty} units</p>
                          <span className="text-[10px] text-slate-500 block">Supplier: {po.supplier}</span>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="text-slate-300 font-mono block font-bold">{po.cost} ETB</span>
                          {po.status === "Sent" && (
                            <button
                              onClick={() => receivePO(po.id, po.item, po.qty)}
                              className="bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-1 rounded cursor-pointer"
                            >
                              Mark Received
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* ── TABLE ASSIGNMENTS ─────────────────────────────────────── */}
            <TableAssignmentManager
              isAmharic={isAmharic}
              tenantCode={authUser.tenantCode}
              staffList={staffList}
            />

            {/* ── STAFF MANAGEMENT ──────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-6">
              <StaffManager
                staffList={staffList}
                isAmharic={isAmharic}
                authUser={authUser}
                tenantCode={authUser.tenantCode}
                branches={branches}
                onStaffChange={fetchOrdersAndInventory}
              />
            </div>

          </div>
        )}

        {/* ==================== 6. OWNER DASHBOARD ==================== */}
        {activeTab === 'owner' && (
          <div className="space-y-4">
            {/* Owner sub-tabs */}
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {([
                  { key:"sales",        icon:"📊", en:"Sales",        am:"ሽያጭ" },
                  { key:"expenses",     icon:"💸", en:"Expenses",     am:"ወጪ" },
                  { key:"branches",     icon:"🏢", en:"Branches",     am:"ቅርንጫፎች" },
                  { key:"recipes",      icon:"🧪", en:"Recipes",      am:"አዘገጃጀት" },
                  { key:"reservations", icon:"📅", en:"Reservations", am:"ቦታ ያዝ" },
                  { key:"shifts",       icon:"⏰", en:"Shifts",       am:"ፈረቃ" },
                  { key:"loyalty",      icon:"🏅", en:"Loyalty",      am:"ቋሚ ደንበኞች" },
                  { key:"suppliers",    icon:"🚚", en:"Suppliers",    am:"አቅራቢዎች" },
                  { key:"feedback",     icon:"⭐", en:"Feedback",     am:"አስተያየት" },
                  { key:"qr",           icon:"📱", en:"QR Codes",     am:"QR ኮዶች" },
                  { key:"barstock",     icon:"🍺", en:"Bar Stock",     am:"የባር ክምችት" },
                  { key:"payments",      icon:"💳", en:"Payments",      am:"ክፍያ" },
                  { key:"subscription",  icon:"🔄", en:"Subscription",  am:"ደንበኝነት" },
                  { key:"hotel",         icon:"🏨", en:"Hotel",          am:"ሆቴል" },
                ] as const).filter(t => (SIZE_OWNER_SUBTABS[bizSize] ?? SIZE_OWNER_SUBTABS.large).includes(t.key)).map(t => (
                  <button key={t.key} onClick={() => setOwnerSubTab(t.key)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      ownerSubTab === t.key
                        ? "bg-amber-500 text-gray-900"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                    }`}>
                    {t.icon} {isAmharic ? t.am : t.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tab content */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 min-h-[400px]">
              {ownerSubTab === "sales" && <SalesDashboard tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "expenses" && <ExpenseTracker tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "branches" && (
                <BranchManager
                  tenantCode={authUser.tenantCode!}
                  isAmharic={isAmharic}
                  plan={authUser.plan}
                  onBranchesChange={fetchAllData}
                />
              )}
              {ownerSubTab === "recipes" && <RecipeManager tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "reservations" && <ReservationManager tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "shifts" && <ShiftManager tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "loyalty" && <LoyaltyManager tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "suppliers" && <SupplierManager tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "feedback" && <FeedbackView tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "qr" && <QRGenerator tenantCode={authUser.tenantCode!} isAmharic={isAmharic} />}
              {ownerSubTab === "barstock" && (
                <div className="p-4">
                  <BarInventory tenantCode={authUser.tenantCode!} isAmharic={isAmharic} readOnly={true} />
                </div>
              )}
              {ownerSubTab === "payments" && (
                <PaymentSettings tenantCode={authUser.tenantCode} isAmharic={isAmharic} />
              )}
              {ownerSubTab === "hotel" && (
                <HotelManager
                  tenantCode={authUser.tenantCode}
                  isAmharic={isAmharic}
                  staffName={authUser.name}
                />
              )}
              {ownerSubTab === "subscription" && (
                <SubscriptionTab
                  tenantCode={authUser.tenantCode ?? ""}
                  currentPlan={authUser.plan ?? "starter"}
                  subscriptionStatus={authUser.subscriptionStatus ?? "trial"}
                  subscriptionEnd={authUser.subscriptionEnd ?? null}
                  monthlyFee={authUser.monthlyFee ?? 0}
                  trialDaysLeft={authUser.trialDaysLeft}
                  daysOverdue={authUser.daysOverdue}
                  isAmharic={isAmharic}
                />
              )}
            </div>
          </div>
        )}

        {/* Receipt Printer Modal */}
        {receiptOrderId && authUser?.tenantCode && (
          <ReceiptPrinter
            orderId={receiptOrderId}
            tenantCode={authUser.tenantCode}
            onClose={() => setReceiptOrderId(null)}
            isAmharic={isAmharic}
          />
        )}

      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex justify-center items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isAmharic ? FOOTER_TAGLINE_AM : FOOTER_TAGLINE_EN}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {isAmharic ? FOOTER_CREDIT_AM : FOOTER_CREDIT_EN}
          </p>
        </div>
      </footer>

    </div>
  );
}

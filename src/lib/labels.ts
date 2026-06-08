import { UserRole } from "../types";

export type AppTab = UserRole;

export const ROLE_LABELS: Record<AppTab, { en: string; am: string }> = {
  customer: { en: "Menu", am: "ምናሌ" },
  waiter: { en: "Tables", am: "ጠረጴዛዎች" },
  kitchen: { en: "Kitchen", am: "ወጥ ቤት" },
  bar: { en: "Bar", am: "ባር" },
  cashier: { en: "Payments", am: "ክፍያ" },
  manager: { en: "Dashboard", am: "ዳሽቦርድ" },
  owner: { en: "Owner", am: "ባለቤት" },
  superadmin: { en: "Super Admin", am: "ሱፐር አድሚን" },
};

export const ROLE_HINTS: Record<AppTab, { en: string; am: string }> = {
  customer: { en: "Pick food → review cart → place order", am: "ምግብ ይምረጡ → ጋሪ ይመልከቱ → ትዕዛዝ ይላኩ" },
  waiter: { en: "Track tables and serve ready orders", am: "ጠረጴዛዎችን ይከታተሉ እና ዝግጁ ትዕዛዞችን ያቅርቡ" },
  kitchen: { en: "Food only — pending → cook → ready", am: "ምግብ ብቻ — በመጠባበቅ → መብስል → ዝግጁ" },
  bar: { en: "Drinks only — pending → prepare → ready", am: "መጠጥ ብቻ — በመጠባበቅ → ዝግጽ → ዝግጁ" },
  cashier: { en: "Find unpaid bills and collect payment", am: "ያልተከፈሉ ቢሎችን ያግኙ እና ክፍያ ይቀበሉ" },
  manager: { en: "Today’s sales, stock alerts, and insights", am: "የዛሬ ሽያጭ፣ ክምችት ማስጠንቀቂያ እና ግንዛቤ" },
  owner: { en: "Full business overview and settings", am: "የሙሉ ንግድ እይታ እና ቅንብሮች" },
  superadmin: { en: "Manage all tenants and subscriptions", am: "ሁሉንም ተከራዮች እና ደንበኝነቶች ያስተዳድሩ" },
};

export function roleLabel(tab: AppTab, isAmharic: boolean): string {
  return isAmharic ? ROLE_LABELS[tab].am : ROLE_LABELS[tab].en;
}

export function roleHint(tab: AppTab, isAmharic: boolean): string {
  return isAmharic ? ROLE_HINTS[tab].am : ROLE_HINTS[tab].en;
}

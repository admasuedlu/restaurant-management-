# CLAUDE.md — Project Memory & Developer Preferences
> Claude reads this file automatically at the start of every session.
> **Always follow everything in this file without being asked.**

---

## 👤 Developer Preferences (apply in EVERY session, always)

1. **Never ask "shall I proceed?" — just do it.** When something is clear, implement it immediately.
2. **Build and deploy after every change** — always run `npm run build` and give the exact deploy commands.
3. **Dark, modern, premium UI** — Tailwind only. Slate-900/950 backgrounds, amber-500 accents, rounded-2xl/3xl, glass effects (`backdrop-blur`), gradient overlays, smooth hover transitions. No plain/flat designs.
4. **Bilingual** — All UI text uses `tc("English", "አማርኛ")` helper for English + Amharic.
5. **Always use the `tc()` helper** for every visible string — never hardcode English-only text.
6. **Never break existing features** — always read the file before editing, make surgical edits.
7. **No placeholder/demo data** — everything talks to real API endpoints.
8. **Mobile-first** — all UIs must work on phone screens (max-w-md modals, responsive grids).
9. **Auto-refresh** — dashboards refresh every 30s using `setInterval` in `useEffect`.
10. **Show loading spinners and error states** on every async operation.
11. **TypeScript strict** — no `any` unless absolutely necessary, always type interfaces.
12. **Deployment pattern**: build locally → SCP to `~/newdistN` (increment N each time) → server-side copy. Never reuse the same folder name.

---

## 🖥️ Infrastructure

| Item | Value |
|------|-------|
| **Server** | Ubuntu VPS — `ubuntu@vps-bb919de9.vps.ovh.ca` (or IP `135.181.180.188`) |
| **App port** | 3005 |
| **PM2 app name** | `aurahotel` (id=7) |
| **Web root** | `/var/www/aurahotel/dist/` |
| **Nginx** | Serves static `/var/www/aurahotel/dist/`, proxies `/api/` → `localhost:3005` |
| **Database** | PostgreSQL, multi-tenant (`tenant_id` on every table) |
| **Local project** | `D:\rms\restaurant-management-` |

### Full Deploy Sequence
**Window 1 — PowerShell (local):**
```powershell
# Increment N each time (newdist5, newdist6, etc.)
scp -r "D:\rms\restaurant-management-\dist\." ubuntu@vps-bb919de9.vps.ovh.ca:~/newdist6
```

**Window 2 — SSH on server:**
```bash
sudo rm -rf /var/www/aurahotel/dist/assets
sudo rm -f /var/www/aurahotel/dist/index.html
sudo cp -r ~/newdist6/. /var/www/aurahotel/dist/
sudo chown -R www-data:www-data /var/www/aurahotel/dist/
pm2 restart aurahotel
# Verify:
cat /var/www/aurahotel/dist/index.html | grep "index-"
pm2 status
```

> ⚠️ **IMPORTANT**: Never `scp` into an existing folder (it nests the files). Always use a fresh name.
> ⚠️ The SCP command is run in **local PowerShell**. The `sudo cp` commands are run in **SSH session**. They are TWO DIFFERENT WINDOWS.

---

## 🏗️ Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript → compiled to `dist/server.cjs` via esbuild
- **Build**: `npm run build` (Vite frontend + esbuild backend)
- **Auth**: JWT, roles: `owner`, `manager`, `waiter`, `cashier`, `kitchen`, `bar`
- **Payments**: Chapa (Ethiopian gateway) — platform key for subscriptions, per-tenant key for customer QR payments
- **Body limit**: `express.json({ limit: "12mb" })` — needed for base64 image uploads
- **SPA routing**: `window.history.pushState` + `popstate` event listener with React state

---

## 📁 Key Source Files

| File | Purpose |
|------|---------|
| `server.ts` | Main backend — all API routes |
| `src/lib/database.ts` | PostgreSQL schema + safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations |
| `src/App.tsx` | Root component, routing, auth, role-based rendering |
| `src/components/SuperAdminDashboard.tsx` | SuperAdmin panel — tenant management, payment recording |
| `src/components/HotelManager.tsx` | Full Hotel PMS — rooms, bookings, check-in/out, folio, housekeeping |
| `src/components/SubscriptionTab.tsx` | Owner subscription management + Chapa payment |
| `src/components/PublicBusinessProfile.tsx` | Public `/place/:code` page — menu, rooms, booking |
| `src/components/LandingPage.tsx` | Public landing with business directory section |

---

## 🗄️ Database Tables (key ones)

```sql
tenants            -- Multi-tenant root (business_name, code, status, subscription fields)
menu_items         -- Restaurant menu (tenant_id, name, ame_name, price, category, image)
orders / order_items
reservations       -- Table reservations
hotel_rooms        -- id, tenant_id, room_number, room_type, floor, capacity,
                   --   price_per_night, amenities TEXT[], status, description, image TEXT
hotel_bookings     -- id, tenant_id, room_id, room_number, guest_name, guest_phone,
                   --   check_in_date, check_out_date, status, balance_due, adults, children
hotel_room_charges -- Extra charges per booking (room service, minibar, etc.)
housekeeping_logs  -- Cleaning/maintenance activity log
feedback           -- Customer ratings
```

### Tenant columns added via migration:
```sql
business_type TEXT DEFAULT 'restaurant'
description TEXT DEFAULT ''
cover_image TEXT DEFAULT ''
address TEXT DEFAULT ''
city TEXT DEFAULT 'Addis Ababa'
is_public BOOLEAN DEFAULT TRUE
avg_rating NUMERIC DEFAULT 0
opening_hours TEXT DEFAULT '08:00-22:00'
```

---

## 🔌 API Endpoints Reference

### Auth
- `POST /api/auth/login` — `{ tenantCode, password, role }`
- `GET  /api/auth/me`

### SuperAdmin
- `GET  /api/admin/tenants` — list all tenants
- `GET  /api/admin/payment-status` — returns `{ tenantId, tenantCode, businessName, subscriptionStatus }`
- `POST /api/admin/record-payment` — `{ tenantId, months }`

### Hotel PMS
- `GET    /api/hotel/rooms` — all rooms with current booking joined
- `POST   /api/hotel/rooms` — create room (`roomNumber, roomType, floor, capacity, pricePerNight, amenities, description, image`)
- `PUT    /api/hotel/rooms/:id` — update room (same fields + `status`)
- `DELETE /api/hotel/rooms/:id`
- `PATCH  /api/hotel/rooms/:id/status` — housekeeping status update
- `GET    /api/hotel/bookings`
- `POST   /api/hotel/bookings` — create booking
- `POST   /api/hotel/bookings/:id/checkin`
- `POST   /api/hotel/bookings/:id/checkout`
- `POST   /api/hotel/bookings/:id/cancel`
- `GET    /api/hotel/bookings/:id/charges`
- `POST   /api/hotel/bookings/:id/charges`

### Public Directory
- `GET  /api/public/directory` — all active/trial public businesses
- `GET  /api/public/directory/:code/profile` — full profile (menu + rooms with `image`)
- `POST /api/public/directory/:code/reserve` — table reservation
- `POST /api/public/directory/:code/book-room` — hotel room booking

### Subscriptions
- `POST /api/subscription/initiate-payment` — Chapa payment init
- `GET  /api/subscription/verify/:txRef` — payment verification

---

## 🎨 UI Design System

### Colors
```
Background:   slate-950, slate-900, slate-800
Cards:        slate-900 border border-slate-800
Accent:       amber-500 (hover: amber-600) — buttons, highlights
Success:      emerald-500
Danger:       rose-500
Info:         sky-400
Text primary: slate-100 / white
Text muted:   slate-400, slate-500, slate-600
```

### Component Patterns
```tsx
// Modal backdrop
<div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto"
  style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>

// Card
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all">

// Primary button
<button className="py-3 px-6 rounded-2xl font-black text-slate-950 transition-all"
  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>

// Input field
<input className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500
  focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />

// Status pill
<span className="text-[10px] font-black px-2.5 py-1 rounded-full border backdrop-blur-md">
```

### Room Status Config
```ts
const ROOM_STATUS_CONFIG = {
  available:   { label:"Available",   color:"text-emerald-400", bg:"bg-emerald-500/10 border-emerald-500/20", icon:"✅" },
  occupied:    { label:"Occupied",    color:"text-rose-400",    bg:"bg-rose-500/10 border-rose-500/20",       icon:"🔴" },
  reserved:    { label:"Reserved",    color:"text-amber-400",   bg:"bg-amber-500/10 border-amber-500/20",     icon:"📋" },
  cleaning:    { label:"Cleaning",    color:"text-sky-400",     bg:"bg-sky-500/10 border-sky-500/20",         icon:"🧹" },
  maintenance: { label:"Maintenance", color:"text-slate-400",   bg:"bg-slate-700/30 border-slate-600/30",     icon:"🔧" },
};
```

---

## 🏨 Hotel PMS Features (fully built)

- **Rooms tab**: Floor-by-floor grid, color-coded status cards with image/GIF/video thumbnails
- **Bookings tab**: Full booking list with expand/collapse per row, action buttons
- **Check-In/Out tab**: Pending check-ins & active stays in one view
- **Folio tab**: Per-guest itemized charges, add extras (room service, minibar, etc.)
- **Housekeeping tab**: Rooms needing cleaning/maintenance, log updates
- **Stats bar**: Total / Available / Occupied / Reserved / Cleaning / Occupancy% / Outstanding ETB
- **Add Room Modal**: Media upload (photo/GIF/video), amenity quick-pick chips, all fields
- **Auto-refresh**: Every 30 seconds

---

## 🖼️ Room Media (image/GIF/video) — Implementation

### How it works
- Files are stored as **base64 data URLs** in the `image TEXT` column of `hotel_rooms`
- No external file storage needed
- Express body limit is `12mb` to accommodate base64 payloads
- Supported: `image/jpeg`, `image/png`, `image/gif` (animated), `image/webp`, `video/mp4`, `video/webm`
- Size limits: photos 5MB, videos 8MB

### Detection helpers
```ts
const hasVideo = src.startsWith("data:video/") || /\.(mp4|webm)$/i.test(src);
const hasGif   = src.includes("image/gif");
```

### Rendering
```tsx
// Image/GIF
<img src={room.image} className="w-full h-full object-cover" />

// Video (always autoplay + loop + muted)
<video src={room.image} autoPlay loop muted playsInline className="w-full h-full object-cover" />
```

---

## 🌐 Public Business Directory

- Landing page has `<section id="directory">` — shows all `is_public=true` businesses
- Cards link to `/place/:code` (uses `pushState` + `popstate` — no page reload)
- `/place/:code` renders `<PublicBusinessProfile>` — menu, rooms, info tabs
- Rooms show full-width media hero, price overlay, "Book This Room" button
- Table reservations → `POST /api/public/directory/:code/reserve`
- Room bookings → `POST /api/public/directory/:code/book-room`

---

## 💳 Subscriptions

- Plans: Starter / Professional / Enterprise
- Durations: 1 / 2 / 3 / 6 / 12 months (with discount badges)
- Owner pays via Chapa (`POST /api/subscription/initiate-payment`)
- SuperAdmin can also manually record payment (`POST /api/admin/record-payment`)
- Tenant statuses: `trial` → `active` → `grace` → `expired`
- SuperAdmin dashboard fix: `/api/admin/payment-status` returns `tenantId`, `tenantCode`, `subscriptionStatus` (NOT `id`, `code`, `status`)

---

## ⚠️ Known Gotchas

1. **SCP subfolder trap**: `scp -r dist/.` into existing `~/newdist` nests files. Always use a NEW folder name.
2. **Old JS still loading**: Check `cat /var/www/aurahotel/dist/index.html | grep "index-"` to confirm new hash deployed.
3. **`tenantid required` error**: Was caused by field name mismatch in SuperAdmin payment-status endpoint — fixed.
4. **`React.useRef` in functional components**: Needs `import React` (not just `{ useState }`).
5. **Amharic font**: Already loaded via Google Fonts in `index.html`.
6. **PM2 must restart** after every server.cjs change: `pm2 restart aurahotel`.

---

## 📋 Current State (as of last session — 2026-06-16)

### ✅ Completed & Deployed
- Full multi-tenant restaurant PMS (orders, menu, kitchen, bar, reservations, loyalty, QR, feedback, shifts, suppliers)
- SuperAdmin dashboard with tenant management + manual payment recording
- Hotel PMS (rooms, bookings, check-in/out, folio, housekeeping) — 5 tabs
- Subscription tab (owner pays via Chapa)
- Public business directory on landing page
- Public business profile pages (`/place/:code`)

### 🔄 IN PROGRESS (built but NOT yet deployed as of session end)
- **Room media upload** (image/GIF/video) in Add Room modal
  - New build hash: `index-CvZvTUlx.js` (in `D:\rms\restaurant-management-\dist\`)
  - Next deploy folder: `~/newdist6` (newdist5 may have been used — use newdist6 to be safe)
  - Changes made:
    - `HotelManager.tsx` — fully redesigned `AddRoomModal` with drag-and-drop, preview, amenity chips
    - `HotelManager.tsx` — redesigned `RoomCard` with full-bleed media thumbnail
    - `PublicBusinessProfile.tsx` — room cards show full-width media hero with overlays
    - `server.ts` — POST/PUT `/api/hotel/rooms` now includes `image` field
    - `server.ts` — `GET /api/public/directory/:code/profile` rooms now include `image`
    - `src/lib/database.ts` — `hotel_rooms` table already has `image TEXT DEFAULT ''`

### 📌 Next Potential Features (user may ask for these)
- Customer reviews / rating system for public profiles
- QR code for each room (scan to see room info / request service)
- Multi-language (English + Amharic + Oromo)
- WhatsApp notification on new booking
- Revenue dashboard with charts
- Room rate calendar (different prices per date)

---

## 🔑 Important Patterns

### apiFetch helper (used everywhere in frontend)
```ts
async function apiFetch(url: string, tenantCode?: string, opts?: RequestInit) {
  const token = localStorage.getItem("authToken");
  return fetch(url, {
    ...opts,
    headers: {
      ...opts?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantCode ? { "x-tenant-code": tenantCode } : {}),
    },
  });
}
```

### tc() bilingual helper
```ts
const tc = (en: string, am: string) => lang === "am" ? am : en;
// lang comes from: const [lang, setLang] = useState(localStorage.getItem("lang") ?? "en");
```

### requireAuth middleware
```ts
// Used as: app.get("/api/route", requireAuth, rMgr, handler)
// rMgr = role-based middleware (owner/manager only)
// Sets req.tenant (from JWT + DB lookup)
```

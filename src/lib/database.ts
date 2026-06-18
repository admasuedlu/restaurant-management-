import { Pool, PoolClient } from "pg";
import { config } from "../config";

// ─── Connection pool ──────────────────────────────────────────────────────────

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

// ─── Schema init ──────────────────────────────────────────────────────────────

export async function initSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Tenants registry
      CREATE TABLE IF NOT EXISTS tenants (
        id                TEXT PRIMARY KEY,
        code              TEXT UNIQUE NOT NULL,
        business_name     TEXT NOT NULL,
        owner_name        TEXT NOT NULL,
        phone             TEXT NOT NULL,
        email             TEXT DEFAULT '',
        plan              TEXT NOT NULL DEFAULT 'trial',
        status            TEXT NOT NULL DEFAULT 'pending',
        trial_start       TIMESTAMPTZ,
        trial_end         TIMESTAMPTZ,
        subscription_start TIMESTAMPTZ,
        subscription_end  TIMESTAMPTZ,
        branches          TEXT[] DEFAULT ARRAY['main'],
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        monthly_fee       INTEGER DEFAULT 0,
        currency          TEXT DEFAULT 'ETB',
        owner_password    TEXT
      );

      -- Menu items
      CREATE TABLE IF NOT EXISTS menu_items (
        id               TEXT PRIMARY KEY,
        tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,
        ame_name         TEXT DEFAULT '',
        price            NUMERIC NOT NULL,
        category         TEXT NOT NULL,
        description      TEXT DEFAULT '',
        ame_description  TEXT DEFAULT '',
        prep_time        INTEGER DEFAULT 10,
        image            TEXT DEFAULT '',
        popularity       NUMERIC DEFAULT 7.0,
        combos_suggestion JSONB,
        is_available     BOOLEAN DEFAULT TRUE
      );

      -- Orders (items stored as JSONB for simplicity)
      CREATE TABLE IF NOT EXISTS orders (
        id              TEXT PRIMARY KEY,
        tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        table_id        TEXT NOT NULL,
        type            TEXT NOT NULL DEFAULT 'Dine-in',
        items           JSONB NOT NULL DEFAULT '[]',
        subtotal        NUMERIC DEFAULT 0,
        tax             NUMERIC DEFAULT 0,
        total           NUMERIC DEFAULT 0,
        status          TEXT DEFAULT 'Pending',
        payment_status  TEXT DEFAULT 'Unpaid',
        payment_method  TEXT,
        creation_time   TIMESTAMPTZ DEFAULT NOW(),
        is_vip          BOOLEAN DEFAULT FALSE,
        station         TEXT DEFAULT 'kitchen',
        group_id        TEXT,
        waiter_name     TEXT,
        customer_phone  TEXT,
        loyalty_points_used INTEGER DEFAULT 0
      );

      -- Inventory
      CREATE TABLE IF NOT EXISTS inventory (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        ame_name    TEXT DEFAULT '',
        stock       NUMERIC DEFAULT 0,
        unit        TEXT DEFAULT 'kg',
        cost        NUMERIC DEFAULT 0,
        min_alert   NUMERIC DEFAULT 0,
        category    TEXT DEFAULT 'Spices',
        station     TEXT DEFAULT 'kitchen'
      );

      -- Purchase orders
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        supplier    TEXT NOT NULL,
        item        TEXT NOT NULL,
        qty         NUMERIC DEFAULT 0,
        cost        NUMERIC DEFAULT 0,
        status      TEXT DEFAULT 'Draft',
        date        TEXT NOT NULL
      );

      -- Staff members
      CREATE TABLE IF NOT EXISTS staff (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        role        TEXT NOT NULL,
        pin         TEXT DEFAULT '',
        branch      TEXT DEFAULT 'main',
        salary      NUMERIC DEFAULT 0,
        hire_date   TEXT DEFAULT ''
      );

      -- Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id            TEXT PRIMARY KEY,
        tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id      TEXT,
        table_id      TEXT,
        items_summary TEXT,
        message       TEXT,
        time          TIMESTAMPTZ DEFAULT NOW(),
        is_read       BOOLEAN DEFAULT FALSE,
        for_waiter    TEXT,
        station       TEXT
      );

      -- Settings (one row per tenant)
      CREATE TABLE IF NOT EXISTS settings (
        tenant_id                    TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        mode                         TEXT DEFAULT 'hybrid',
        allow_waiter_direct_order    BOOLEAN DEFAULT TRUE,
        allow_partial_serving        BOOLEAN DEFAULT TRUE,
        notify_waiter_on_ready       BOOLEAN DEFAULT TRUE,
        notify_cashier_on_ready      BOOLEAN DEFAULT TRUE,
        currency                     TEXT DEFAULT 'ETB',
        tax_rate                     NUMERIC DEFAULT 15,
        receipt_footer               TEXT DEFAULT 'Thank you for dining with us!',
        loyalty_points_per_birr      NUMERIC DEFAULT 1,
        loyalty_birr_per_point       NUMERIC DEFAULT 0.5
      );

      -- Expenses
      CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        category    TEXT NOT NULL,
        description TEXT NOT NULL,
        amount      NUMERIC NOT NULL,
        date        TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        branch      TEXT DEFAULT 'main'
      );

      -- Recipes (ingredient links per menu item)
      CREATE TABLE IF NOT EXISTS recipes (
        id            TEXT PRIMARY KEY,
        tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        menu_item_id  TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        inventory_id  TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
        qty_per_serve NUMERIC NOT NULL DEFAULT 0
      );

      -- Shifts (staff clock in/out)
      CREATE TABLE IF NOT EXISTS shifts (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        staff_id    TEXT NOT NULL,
        staff_name  TEXT NOT NULL,
        role        TEXT NOT NULL,
        clock_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        clock_out   TIMESTAMPTZ,
        hours       NUMERIC,
        tips        NUMERIC DEFAULT 0,
        branch      TEXT DEFAULT 'main',
        note        TEXT DEFAULT ''
      );

      -- Loyalty customers
      CREATE TABLE IF NOT EXISTS loyalty (
        id            TEXT PRIMARY KEY,
        tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        phone         TEXT NOT NULL,
        points        INTEGER DEFAULT 0,
        total_spent   NUMERIC DEFAULT 0,
        visits        INTEGER DEFAULT 0,
        tier          TEXT DEFAULT 'Bronze',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (tenant_id, phone)
      );

      -- Feedback / ratings
      CREATE TABLE IF NOT EXISTS feedback (
        id            TEXT PRIMARY KEY,
        tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id      TEXT,
        table_id      TEXT,
        rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment       TEXT DEFAULT '',
        waiter_name   TEXT,
        food_rating   INTEGER DEFAULT 0,
        service_rating INTEGER DEFAULT 0,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      -- Reservations
      CREATE TABLE IF NOT EXISTS reservations (
        id            TEXT PRIMARY KEY,
        tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        phone         TEXT NOT NULL,
        guests        INTEGER NOT NULL DEFAULT 2,
        date          TEXT NOT NULL,
        time          TEXT NOT NULL,
        table_id      TEXT DEFAULT '',
        status        TEXT DEFAULT 'Pending',
        note          TEXT DEFAULT '',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        branch        TEXT DEFAULT 'main'
      );

      -- Suppliers
      CREATE TABLE IF NOT EXISTS suppliers (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        phone       TEXT DEFAULT '',
        email       TEXT DEFAULT '',
        address     TEXT DEFAULT '',
        category    TEXT DEFAULT 'General',
        note        TEXT DEFAULT '',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes for fast tenant-scoped queries
      CREATE INDEX IF NOT EXISTS idx_menu_items_tenant   ON menu_items(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_tenant       ON orders(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_tenant    ON inventory(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_po_tenant           ON purchase_orders(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_staff_tenant        ON staff(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_notif_tenant        ON notifications(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_tenant     ON expenses(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_shifts_tenant       ON shifts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_loyalty_tenant      ON loyalty(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_tenant     ON feedback(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_tenant    ON suppliers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_recipes_tenant      ON recipes(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_time         ON orders(tenant_id, creation_time DESC);

      -- Add new columns if they don't exist (safe migrations)
      DO $$ BEGIN
        ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER DEFAULT 0;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date TEXT DEFAULT '';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ETB';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 15;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Thank you for dining with us!';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS loyalty_points_per_birr NUMERIC DEFAULT 1;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS loyalty_birr_per_point NUMERIC DEFAULT 0.5;
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS chapa_secret_key TEXT DEFAULT '';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS chapa_public_key TEXT DEFAULT '';
        ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT FALSE;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_size TEXT DEFAULT 'medium';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'restaurant';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT '';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Addis Ababa';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 0;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS opening_hours TEXT DEFAULT '08:00-22:00';
      END $$;

      -- Payment logs (created after initial schema, safe to add here)
      CREATE TABLE IF NOT EXISTS payment_logs (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        amount      NUMERIC NOT NULL DEFAULT 0,
        plan        TEXT NOT NULL,
        months      INTEGER NOT NULL DEFAULT 1,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        recorded_by TEXT DEFAULT 'admin',
        note        TEXT DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_payment_logs_tenant ON payment_logs(tenant_id);

      -- Email OTP verifications
      CREATE TABLE IF NOT EXISTS email_otps (
        id          TEXT PRIMARY KEY,
        email       TEXT NOT NULL,
        otp         TEXT NOT NULL,
        purpose     TEXT NOT NULL DEFAULT 'register', -- 'register' | 'superadmin'
        tenant_id   TEXT,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email, purpose);

      -- Chapa payment transactions (pending/completed)
      CREATE TABLE IF NOT EXISTS chapa_transactions (
        tx_ref       TEXT PRIMARY KEY,
        tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plan         TEXT NOT NULL,
        months       INTEGER NOT NULL DEFAULT 1,
        amount       NUMERIC NOT NULL DEFAULT 0,
        status       TEXT NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_chapa_tenant ON chapa_transactions(tenant_id);

      -- Table-to-waiter assignments
      CREATE TABLE IF NOT EXISTS table_assignments (
        tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        table_id   TEXT NOT NULL,
        staff_id   TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        PRIMARY KEY (tenant_id, table_id)
      );
      CREATE INDEX IF NOT EXISTS idx_table_assignments_tenant ON table_assignments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_table_assignments_staff  ON table_assignments(tenant_id, staff_id);

      -- Branch locations (per tenant)
      CREATE TABLE IF NOT EXISTS branch_locations (
        id          TEXT NOT NULL,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        ame_name    TEXT DEFAULT '',
        location    TEXT DEFAULT '',
        phone       TEXT DEFAULT '',
        capacity    INTEGER DEFAULT 20,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (tenant_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_branch_locations_tenant ON branch_locations(tenant_id);

      -- ═══════════════════════════════════════════════════════════════
      -- HOTEL PROPERTY MANAGEMENT SYSTEM
      -- ═══════════════════════════════════════════════════════════════

      -- Hotel rooms / beds
      CREATE TABLE IF NOT EXISTS hotel_rooms (
        id               TEXT PRIMARY KEY,
        tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        room_number      TEXT NOT NULL,
        room_type        TEXT NOT NULL DEFAULT 'standard',
        floor            INTEGER DEFAULT 1,
        capacity         INTEGER DEFAULT 2,
        price_per_night  NUMERIC NOT NULL DEFAULT 0,
        amenities        TEXT[] DEFAULT '{}',
        status           TEXT NOT NULL DEFAULT 'available',
        description      TEXT DEFAULT '',
        image            TEXT DEFAULT '',
        UNIQUE(tenant_id, room_number)
      );
      CREATE INDEX IF NOT EXISTS idx_hotel_rooms_tenant ON hotel_rooms(tenant_id);

      -- Hotel bookings / reservations
      CREATE TABLE IF NOT EXISTS hotel_bookings (
        id                TEXT PRIMARY KEY,
        tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        room_id           TEXT NOT NULL,
        room_number       TEXT NOT NULL,
        guest_name        TEXT NOT NULL,
        guest_phone       TEXT NOT NULL DEFAULT '',
        guest_id_number   TEXT DEFAULT '',
        guest_nationality TEXT DEFAULT '',
        adults            INTEGER DEFAULT 1,
        children          INTEGER DEFAULT 0,
        check_in_date     TEXT NOT NULL,
        check_out_date    TEXT NOT NULL,
        actual_check_in   TIMESTAMPTZ,
        actual_check_out  TIMESTAMPTZ,
        status            TEXT NOT NULL DEFAULT 'reserved',
        booking_source    TEXT DEFAULT 'walk_in',
        room_rate         NUMERIC NOT NULL DEFAULT 0,
        total_nights      INTEGER DEFAULT 1,
        subtotal          NUMERIC DEFAULT 0,
        discount          NUMERIC DEFAULT 0,
        tax               NUMERIC DEFAULT 0,
        total             NUMERIC DEFAULT 0,
        advance_paid      NUMERIC DEFAULT 0,
        balance_due       NUMERIC DEFAULT 0,
        payment_status    TEXT DEFAULT 'unpaid',
        payment_method    TEXT DEFAULT '',
        special_requests  TEXT DEFAULT '',
        notes             TEXT DEFAULT '',
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        created_by        TEXT DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_hotel_bookings_tenant    ON hotel_bookings(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_hotel_bookings_room      ON hotel_bookings(tenant_id, room_id);
      CREATE INDEX IF NOT EXISTS idx_hotel_bookings_status    ON hotel_bookings(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_hotel_bookings_checkin   ON hotel_bookings(tenant_id, check_in_date);

      -- Room charges (minibar, room service, laundry, etc.)
      CREATE TABLE IF NOT EXISTS hotel_room_charges (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        booking_id  TEXT NOT NULL REFERENCES hotel_bookings(id) ON DELETE CASCADE,
        room_id     TEXT NOT NULL,
        room_number TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'other',
        description TEXT NOT NULL,
        amount      NUMERIC NOT NULL DEFAULT 0,
        quantity    INTEGER DEFAULT 1,
        date        TIMESTAMPTZ DEFAULT NOW(),
        added_by    TEXT DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_hotel_charges_booking ON hotel_room_charges(booking_id);
      CREATE INDEX IF NOT EXISTS idx_hotel_charges_tenant  ON hotel_room_charges(tenant_id);

      -- Housekeeping logs
      CREATE TABLE IF NOT EXISTS housekeeping_logs (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        room_id     TEXT NOT NULL,
        room_number TEXT NOT NULL,
        action      TEXT NOT NULL,
        staff_name  TEXT DEFAULT '',
        notes       TEXT DEFAULT '',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_housekeeping_tenant ON housekeeping_logs(tenant_id);

      -- Customer order payments via Chapa (QR scan-to-pay)
      CREATE TABLE IF NOT EXISTS order_payments (
        tx_ref       TEXT PRIMARY KEY,
        tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_ids    TEXT[] NOT NULL DEFAULT '{}',
        amount       NUMERIC NOT NULL DEFAULT 0,
        status       TEXT NOT NULL DEFAULT 'pending',
        method       TEXT DEFAULT 'chapa',
        table_id     TEXT DEFAULT '',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_order_payments_tenant ON order_payments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(tenant_id, status);
    `);
    console.log("✅ PostgreSQL schema ready");
  } finally {
    client.release();
  }
}

// ─── Query helper ─────────────────────────────────────────────────────────────

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

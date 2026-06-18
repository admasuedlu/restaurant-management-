import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";
import {
  BedDouble, Users, Calendar, CheckCircle2, XCircle, Clock,
  Wrench, Sparkles, Plus, RefreshCw, ChevronRight, X,
  CreditCard, Phone, Hash, Globe, Star, AlertTriangle,
  DoorOpen, DoorClosed, Trash2, Receipt, ChevronDown, Search
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomStatus = "available" | "occupied" | "reserved" | "cleaning" | "maintenance";
type BookingStatus = "reserved" | "checked_in" | "checked_out" | "cancelled" | "no_show";

interface HotelRoom {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  price_per_night: number;
  amenities: string[];
  status: RoomStatus;
  description: string;
  // joined from bookings
  booking_id?: string;
  guest_name?: string;
  guest_phone?: string;
  check_in_date?: string;
  check_out_date?: string;
  booking_status?: BookingStatus;
  balance_due?: number;
  adults?: number;
  children?: number;
}

interface Booking {
  id: string;
  room_id: string;
  room_number: string;
  guest_name: string;
  guest_phone: string;
  guest_id_number: string;
  guest_nationality: string;
  adults: number;
  children: number;
  check_in_date: string;
  check_out_date: string;
  actual_check_in?: string;
  actual_check_out?: string;
  status: BookingStatus;
  booking_source: string;
  room_rate: number;
  total_nights: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  advance_paid: number;
  balance_due: number;
  payment_status: string;
  payment_method: string;
  special_requests: string;
  notes: string;
  extra_charges?: number;
}

interface RoomCharge {
  id: string;
  type: string;
  description: string;
  amount: number;
  quantity: number;
  date: string;
  added_by: string;
}

interface Props {
  tenantCode?: string;
  isAmharic: boolean;
  staffName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_TYPES = ["standard", "deluxe", "suite", "presidential", "twin", "family"];
const ROOM_STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  available:   { label: "Available",   color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40", icon: <CheckCircle2 className="w-4 h-4" /> },
  occupied:    { label: "Occupied",    color: "text-rose-400",    bg: "bg-rose-500/15 border-rose-500/40",       icon: <BedDouble className="w-4 h-4" /> },
  reserved:    { label: "Reserved",    color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/40",     icon: <Clock className="w-4 h-4" /> },
  cleaning:    { label: "Cleaning",    color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/40",       icon: <Sparkles className="w-4 h-4" /> },
  maintenance: { label: "Maintenance", color: "text-slate-400",   bg: "bg-slate-700/50 border-slate-600",        icon: <Wrench className="w-4 h-4" /> },
};

const CHARGE_TYPES = [
  { value: "room_service", label: "🍽 Room Service" },
  { value: "minibar",      label: "🍷 Minibar" },
  { value: "laundry",      label: "👕 Laundry" },
  { value: "restaurant",   label: "🍴 Restaurant" },
  { value: "spa",          label: "💆 Spa / Wellness" },
  { value: "transport",    label: "🚗 Transport" },
  { value: "phone",        label: "📞 Phone" },
  { value: "parking",      label: "🅿 Parking" },
  { value: "other",        label: "📋 Other" },
];

const BOOKING_SOURCES = ["walk_in", "phone", "online", "agent", "corporate"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HotelManager({ tenantCode, isAmharic, staffName = "" }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const fmt = (n: number) => n.toLocaleString();

  const [tab, setTab] = useState<"rooms" | "bookings" | "checkin" | "folio" | "housekeeping">("rooms");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showAddRoom, setShowAddRoom]         = useState(false);
  const [showBooking, setShowBooking]         = useState(false);
  const [showFolio, setShowFolio]             = useState<Booking | null>(null);
  const [showCheckout, setShowCheckout]       = useState<Booking | null>(null);
  const [folioCharges, setFolioCharges]       = useState<RoomCharge[]>([]);
  const [editRoom, setEditRoom]               = useState<HotelRoom | null>(null);
  const [housekeepingRoom, setHousekeepingRoom] = useState<HotelRoom | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/hotel/rooms", tenantCode);
      if (r.ok) setRooms(await r.json());
    } finally { setLoading(false); }
  }, [tenantCode]);

  const fetchBookings = useCallback(async () => {
    try {
      const r = await apiFetch("/api/hotel/bookings", tenantCode);
      if (r.ok) setBookings(await r.json());
    } catch { /* ignore */ }
  }, [tenantCode]);

  useEffect(() => {
    fetchRooms();
    fetchBookings();
    const t = setInterval(() => { fetchRooms(); fetchBookings(); }, 30000);
    return () => clearInterval(t);
  }, [fetchRooms, fetchBookings]);

  const loadFolioCharges = async (bookingId: string) => {
    try {
      const r = await apiFetch(`/api/hotel/bookings/${bookingId}/charges`, tenantCode);
      if (r.ok) setFolioCharges(await r.json());
    } catch { /* ignore */ }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:       rooms.length,
    available:   rooms.filter(r => r.status === "available").length,
    occupied:    rooms.filter(r => r.status === "occupied").length,
    reserved:    rooms.filter(r => r.status === "reserved").length,
    cleaning:    rooms.filter(r => r.status === "cleaning").length,
    maintenance: rooms.filter(r => r.status === "maintenance").length,
    occupancy:   rooms.length ? Math.round((rooms.filter(r => r.status === "occupied").length / rooms.length) * 100) : 0,
    revenue:     bookings.filter(b => b.status === "checked_in").reduce((s, b) => s + Number(b.room_rate), 0),
    outstanding: bookings.filter(b => b.status === "checked_in").reduce((s, b) => s + Number(b.balance_due), 0),
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredRooms = rooms.filter(r => {
    const matchSearch = !search || r.room_number.toLowerCase().includes(search.toLowerCase()) ||
      r.room_type.toLowerCase().includes(search.toLowerCase()) ||
      (r.guest_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredBookings = bookings.filter(b => {
    const s = search.toLowerCase();
    return !s || b.guest_name.toLowerCase().includes(s) || b.room_number.includes(s) ||
      b.guest_phone.includes(s) || b.id.toLowerCase().includes(s);
  });

  // ── Group rooms by floor ───────────────────────────────────────────────────
  const floors = [...new Set(filteredRooms.map(r => r.floor))].sort();

  return (
    <div className="p-4 space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: tc("Total","ጠቅላላ"),       value: stats.total,       color: "text-slate-300" },
          { label: tc("Available","ነፃ"),      value: stats.available,   color: "text-emerald-400" },
          { label: tc("Occupied","ያዘ"),       value: stats.occupied,    color: "text-rose-400" },
          { label: tc("Reserved","ተያዘ"),      value: stats.reserved,    color: "text-amber-400" },
          { label: tc("Cleaning","ንጽህና"),     value: stats.cleaning,    color: "text-blue-400" },
          { label: tc("Occupancy %","ቁጥር%"),  value: `${stats.occupancy}%`, color: "text-purple-400" },
          { label: tc("Outstanding","ቀሪ"),    value: `${fmt(stats.outstanding)} ETB`, color: "text-orange-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab nav + search + actions */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {([
            { key: "rooms",        icon: "🏨", label: tc("Rooms","ክፍሎች") },
            { key: "bookings",     icon: "📋", label: tc("Bookings","ቦታ ያዝ") },
            { key: "checkin",      icon: "✅", label: tc("Check-In/Out","ቼክ") },
            { key: "folio",        icon: "💰", label: tc("Folio","ሂሳብ") },
            { key: "housekeeping", icon: "🧹", label: tc("HK","ንጽህና") },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t.key ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}>
              {t.icon} <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tc("Search rooms, guests…","ፈልግ…")}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50" />
          </div>
          <button onClick={() => { fetchRooms(); fetchBookings(); }} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {tab === "rooms" && (
            <button onClick={() => setShowAddRoom(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all">
              <Plus className="w-3.5 h-3.5" /> {tc("Add Room","ክፍል ጨምር")}
            </button>
          )}
          {(tab === "bookings" || tab === "checkin") && (
            <button onClick={() => setShowBooking(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all">
              <Plus className="w-3.5 h-3.5" /> {tc("New Booking","ቦታ ያዝ")}
            </button>
          )}
        </div>
      </div>

      {/* ── ROOMS tab ─────────────────────────────────────────────────────── */}
      {tab === "rooms" && (
        <div className="space-y-4">
          {/* Status filter chips */}
          <div className="flex gap-2 flex-wrap">
            {["all", "available", "occupied", "reserved", "cleaning", "maintenance"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  statusFilter === s ? "bg-amber-500 border-amber-500 text-slate-950" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                }`}>
                {s === "all" ? tc("All","ሁሉ") : ROOM_STATUS_CONFIG[s as RoomStatus]?.label ?? s}
              </button>
            ))}
          </div>

          {/* Room grid by floor */}
          {floors.map(floor => (
            <div key={floor}>
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                {tc(`Floor ${floor}`, `ፎቅ ${floor}`)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredRooms.filter(r => r.floor === floor).map(room => (
                  <RoomCard key={room.id} room={room} tc={tc} fmt={fmt}
                    onCheckin={async () => {
                      if (room.booking_id) {
                        await apiFetch(`/api/hotel/bookings/${room.booking_id}/checkin`, tenantCode, { method: "POST" });
                        fetchRooms(); fetchBookings();
                      }
                    }}
                    onViewFolio={() => {
                      const b = bookings.find(b => b.id === room.booking_id);
                      if (b) { setShowFolio(b); loadFolioCharges(b.id); }
                    }}
                    onHousekeeping={() => setHousekeepingRoom(room)}
                    onEdit={() => setEditRoom(room)}
                  />
                ))}
              </div>
            </div>
          ))}
          {filteredRooms.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">{tc("No rooms yet. Add your first room.", "ምንም ክፍሎች የሉም። የመጀመሪያ ክፍልዎን ያክሉ።")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── BOOKINGS tab ──────────────────────────────────────────────────── */}
      {tab === "bookings" && (
        <div className="space-y-2">
          {filteredBookings.map(b => (
            <BookingRow key={b.id} booking={b} tc={tc} fmt={fmt}
              onCheckin={async () => {
                await apiFetch(`/api/hotel/bookings/${b.id}/checkin`, tenantCode, { method: "POST" });
                fetchRooms(); fetchBookings();
              }}
              onCheckout={() => setShowCheckout(b)}
              onCancel={async () => {
                if (!confirm(tc("Cancel this booking?","ቦታ ያዝ ይሰርዙ?"))) return;
                await apiFetch(`/api/hotel/bookings/${b.id}/cancel`, tenantCode, { method: "POST" });
                fetchRooms(); fetchBookings();
              }}
              onViewFolio={() => { setShowFolio(b); loadFolioCharges(b.id); setTab("folio"); }}
            />
          ))}
          {filteredBookings.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">{tc("No bookings found.", "ቦታ ያዝ አልተገኘም።")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CHECK-IN/OUT tab ──────────────────────────────────────────────── */}
      {tab === "checkin" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Arrivals today */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-slate-200 flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-emerald-400" />
              {tc("Arrivals Today", "ዛሬ የሚደርሱ")}
            </h3>
            {bookings.filter(b => b.status === "reserved" && b.check_in_date === new Date().toISOString().slice(0,10)).map(b => (
              <div key={b.id} className="flex items-center justify-between bg-slate-800 rounded-xl p-3 gap-3">
                <div>
                  <div className="font-bold text-slate-200 text-sm">{b.guest_name}</div>
                  <div className="text-xs text-slate-500">Room {b.room_number} · {b.adults} adult{b.adults !== 1 ? "s" : ""}</div>
                </div>
                <button
                  onClick={async () => {
                    await apiFetch(`/api/hotel/bookings/${b.id}/checkin`, tenantCode, { method: "POST" });
                    fetchRooms(); fetchBookings();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-black transition-all"
                >
                  <DoorOpen className="w-3.5 h-3.5" /> {tc("Check In","ቼክ ኢን")}
                </button>
              </div>
            ))}
            {bookings.filter(b => b.status === "reserved" && b.check_in_date === new Date().toISOString().slice(0,10)).length === 0 && (
              <p className="text-xs text-slate-600 text-center py-4">{tc("No arrivals today", "ዛሬ መምጣት የለም")}</p>
            )}
          </div>

          {/* Departures today / In-house */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-slate-200 flex items-center gap-2">
              <DoorClosed className="w-4 h-4 text-rose-400" />
              {tc("Departures / In-House", "መለቀቅ / ያሉ")}
            </h3>
            {bookings.filter(b => b.status === "checked_in").map(b => (
              <div key={b.id} className="flex items-center justify-between bg-slate-800 rounded-xl p-3 gap-3">
                <div>
                  <div className="font-bold text-slate-200 text-sm">{b.guest_name}</div>
                  <div className="text-xs text-slate-500">Room {b.room_number} · Out: {b.check_out_date}</div>
                  {Number(b.balance_due) > 0 && (
                    <div className="text-xs text-orange-400 font-bold">Outstanding: {fmt(Number(b.balance_due))} ETB</div>
                  )}
                </div>
                <button
                  onClick={() => setShowCheckout(b)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-black transition-all"
                >
                  <DoorClosed className="w-3.5 h-3.5" /> {tc("Check Out","ቼክ አውት")}
                </button>
              </div>
            ))}
            {bookings.filter(b => b.status === "checked_in").length === 0 && (
              <p className="text-xs text-slate-600 text-center py-4">{tc("No guests in-house", "ያሉ እንግዶች የሉም")}</p>
            )}
          </div>
        </div>
      )}

      {/* ── FOLIO tab ─────────────────────────────────────────────────────── */}
      {tab === "folio" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{tc("Click on a guest's folio to view charges.", "የእንግዳ ሂሳብ ለማየት ጠቅ ያድርጉ።")}</p>
          {bookings.filter(b => b.status === "checked_in" || (b.balance_due > 0 && b.status === "checked_out")).map(b => (
            <div key={b.id}
              onClick={() => { setShowFolio(b); loadFolioCharges(b.id); }}
              className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 cursor-pointer transition-all">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-100">{b.guest_name}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Room {b.room_number}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    b.status === "checked_in" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  }`}>{b.status === "checked_in" ? tc("In-House","ያሉ") : tc("Checked Out","ወጥቷል")}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {b.check_in_date} → {b.check_out_date} · {b.total_nights} {tc("nights","ሌሊቶች")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-orange-400 text-lg">{fmt(Number(b.balance_due))} ETB</div>
                <div className="text-[10px] text-slate-500">{tc("outstanding","ቀሪ")}</div>
              </div>
            </div>
          ))}
          {bookings.filter(b => b.status === "checked_in" || (b.balance_due > 0 && b.status === "checked_out")).length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">{tc("No outstanding balances.", "ቀሪ ሂሳብ የለም።")}</p>
            </div>
          )}
        </div>
      )}

      {/* ── HOUSEKEEPING tab ──────────────────────────────────────────────── */}
      {tab === "housekeeping" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.filter(r => r.status === "cleaning" || r.status === "available" || r.status === "maintenance").map(room => (
              <div key={room.id} className={`rounded-2xl border p-4 space-y-3 ${ROOM_STATUS_CONFIG[room.status].bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-slate-100 text-lg">Room {room.room_number}</div>
                    <div className="text-xs text-slate-400 capitalize">{room.room_type} · Floor {room.floor}</div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ROOM_STATUS_CONFIG[room.status].bg} ${ROOM_STATUS_CONFIG[room.status].color}`}>
                    {ROOM_STATUS_CONFIG[room.status].icon}
                    {ROOM_STATUS_CONFIG[room.status].label}
                  </span>
                </div>
                <div className="flex gap-2">
                  {room.status === "cleaning" && (
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/hotel/rooms/${room.id}/status`, tenantCode, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "available", staffName, notes: "Cleaning completed" })
                        });
                        fetchRooms();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {tc("Mark Clean","ንጹህ ምልክት")}
                    </button>
                  )}
                  {room.status === "available" && (
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/hotel/rooms/${room.id}/status`, tenantCode, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "cleaning", staffName, notes: "Housekeeping started" })
                        });
                        fetchRooms();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> {tc("Start Cleaning","ንጽህና ጀምር")}
                    </button>
                  )}
                  {room.status !== "maintenance" && (
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/hotel/rooms/${room.id}/status`, tenantCode, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "maintenance", staffName, notes: "Maintenance required" })
                        });
                        fetchRooms();
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition-all"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {room.status === "maintenance" && (
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/hotel/rooms/${room.id}/status`, tenantCode, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "cleaning", staffName, notes: "Maintenance done, cleaning" })
                        });
                        fetchRooms();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {tc("Maintenance Done","ጥገና ተጠናቀቀ")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {rooms.filter(r => ["cleaning","available","maintenance"].includes(r.status)).length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">{tc("All occupied rooms are in use.","ሁሉም ክፍሎች ተይዘዋል።")}</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════ */}

      {/* Add/Edit Room Modal */}
      {(showAddRoom || editRoom) && (
        <AddRoomModal
          tc={tc} tenantCode={tenantCode} editRoom={editRoom}
          onClose={() => { setShowAddRoom(false); setEditRoom(null); }}
          onSaved={() => { setShowAddRoom(false); setEditRoom(null); fetchRooms(); }}
        />
      )}

      {/* New Booking Modal */}
      {showBooking && (
        <BookingModal
          tc={tc} tenantCode={tenantCode}
          availableRooms={rooms.filter(r => r.status === "available")}
          onClose={() => setShowBooking(false)}
          onSaved={() => { setShowBooking(false); fetchRooms(); fetchBookings(); }}
        />
      )}

      {/* Guest Folio Modal */}
      {showFolio && (
        <FolioModal
          tc={tc} fmt={fmt} tenantCode={tenantCode}
          booking={showFolio} charges={folioCharges}
          onClose={() => { setShowFolio(null); setFolioCharges([]); }}
          onChargeAdded={() => loadFolioCharges(showFolio.id)}
          onCheckout={() => { setShowCheckout(showFolio); setShowFolio(null); setFolioCharges([]); }}
          staffName={staffName}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          tc={tc} fmt={fmt} tenantCode={tenantCode}
          booking={showCheckout}
          onClose={() => setShowCheckout(null)}
          onDone={() => { setShowCheckout(null); fetchRooms(); fetchBookings(); }}
        />
      )}

      {/* Housekeeping quick modal */}
      {housekeepingRoom && (
        <HousekeepingModal
          tc={tc} tenantCode={tenantCode}
          room={housekeepingRoom}
          staffName={staffName}
          onClose={() => setHousekeepingRoom(null)}
          onDone={() => { setHousekeepingRoom(null); fetchRooms(); }}
        />
      )}
    </div>
  );
}

// ─── Room Card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, tc, fmt, onCheckin, onViewFolio, onHousekeeping, onEdit }: {
  room: HotelRoom; tc: (e:string,a:string)=>string; fmt: (n:number)=>string;
  onCheckin:()=>void; onViewFolio:()=>void; onHousekeeping:()=>void; onEdit:()=>void;
}) {
  const cfg        = ROOM_STATUS_CONFIG[room.status];
  const nightsLeft = room.check_out_date
    ? Math.ceil((new Date(room.check_out_date).getTime() - Date.now()) / 86400000) : null;
  const hasMedia = !!room.image;
  const hasVideo = hasMedia && (room.image!.startsWith("data:video/") || /\.(mp4|webm)$/i.test(room.image!));
  const hasGif   = hasMedia && room.image!.includes("image/gif");

  /* status colour map for the accent bar */
  const accentBar: Record<string, string> = {
    available:   "bg-emerald-500",
    occupied:    "bg-rose-500",
    reserved:    "bg-amber-400",
    cleaning:    "bg-sky-400",
    maintenance: "bg-slate-500",
  };

  return (
    <div className="group rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5">

      {/* ── Media / Header ─────────────────────────────────── */}
      {hasMedia ? (
        /* With image: full-bleed media + overlay */
        <div className="relative w-full h-40 overflow-hidden">
          {hasVideo
            ? <video src={room.image} autoPlay loop muted playsInline className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <img    src={room.image} alt={room.room_number}             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          }
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

          {/* Status pill — top left */}
          <span className={`absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 ${cfg.bg} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>

          {/* Edit button — top right */}
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-950/70 hover:bg-amber-500 border border-white/10 backdrop-blur flex items-center justify-center text-slate-400 hover:text-slate-950 text-[11px] transition-all opacity-0 group-hover:opacity-100">
            ✏
          </button>

          {/* Media type badge */}
          {hasGif   && <span className="absolute bottom-2.5 right-2.5 text-[9px] bg-amber-500/95 text-slate-950 font-black px-2 py-0.5 rounded-full">✨ GIF</span>}
          {hasVideo && <span className="absolute bottom-2.5 right-2.5 text-[9px] bg-purple-600/95 text-white font-black px-2 py-0.5 rounded-full">▶ VIDEO</span>}

          {/* Room number & type over image bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-black text-white text-2xl leading-none drop-shadow-lg">{room.room_number}</div>
                <div className="text-[10px] text-slate-300/80 capitalize mt-0.5">{room.room_type} · Floor {room.floor}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-amber-400 text-sm leading-none">{fmt(Number(room.price_per_night))}</div>
                <div className="text-[9px] text-slate-400">ETB/night</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No image: gradient header */
        <div className={`relative px-4 pt-4 pb-3 ${cfg.bg}`}>
          {/* Thin accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentBar[room.status] ?? "bg-slate-600"}`} />
          <div className="flex items-start justify-between">
            <div>
              <div className="font-black text-white text-2xl leading-none">{room.room_number}</div>
              <div className="text-[10px] text-slate-400 capitalize mt-0.5">{room.room_type} · Floor {room.floor}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-400 hover:text-slate-950 text-[10px] flex items-center justify-center transition-all">
                ✏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Card body ──────────────────────────────────────── */}
      <div className="px-3 py-3 space-y-3">

        {/* Capacity + price row (only show if no media — price already shown in image overlay) */}
        {!hasMedia && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.capacity} {tc("guests","እንግዶች")}</span>
            <span className="font-bold text-amber-400">{fmt(Number(room.price_per_night))} <span className="text-slate-500 font-normal">ETB/night</span></span>
          </div>
        )}

        {hasMedia && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3 h-3" /> <span>{room.capacity} {tc("guests","እንግዶች")}</span>
          </div>
        )}

        {/* Guest info */}
        {room.guest_name && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">👤</div>
              <span className="font-bold text-slate-200 text-xs truncate">{room.guest_name}</span>
            </div>
            {room.check_out_date && (
              <div className={`text-[10px] pl-6.5 ${nightsLeft !== null && nightsLeft <= 1 ? "text-rose-400 font-bold" : "text-slate-500"}`}>
                {tc("Out","ሂድ")}: {room.check_out_date}
                {nightsLeft !== null && nightsLeft <= 1 && (
                  <span className="ml-1 bg-rose-500/20 text-rose-300 px-1.5 rounded-full">⚠ {tc("Due today","ዛሬ")}</span>
                )}
              </div>
            )}
            {Number(room.balance_due) > 0 && (
              <div className="text-[10px] pl-6.5 text-orange-400 font-bold">
                {tc("Owes","ቀሪ")} {fmt(Number(room.balance_due))} ETB
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-1.5 pt-0.5">
          {room.booking_status === "reserved" && (
            <button onClick={e => { e.stopPropagation(); onCheckin(); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 rounded-xl text-[11px] font-black transition-all">
              <DoorOpen className="w-3.5 h-3.5" /> {tc("Check In","ቼክ ኢን")}
            </button>
          )}
          {room.booking_status === "checked_in" && (
            <button onClick={e => { e.stopPropagation(); onViewFolio(); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl text-[11px] font-black transition-all">
              <Receipt className="w-3.5 h-3.5" /> {tc("Folio","ሂሳብ")}
            </button>
          )}
          {(room.status === "cleaning" || room.status === "maintenance") && (
            <button onClick={e => { e.stopPropagation(); onHousekeeping(); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 rounded-xl text-[11px] font-black transition-all">
              <Sparkles className="w-3.5 h-3.5" /> {tc("Update","አዘምን")}
            </button>
          )}
          {/* Edit visible only when no media (otherwise it's in top-right overlay) */}
          {!hasMedia && (
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="px-2.5 py-2 bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/30 border border-slate-700 text-slate-400 hover:text-amber-400 rounded-xl text-[11px] transition-all">
              ✏
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Booking Row ───────────────────────────────────────────────────────────────
function BookingRow({ booking: b, tc, fmt, onCheckin, onCheckout, onCancel, onViewFolio }: {
  booking: Booking; tc:(e:string,a:string)=>string; fmt:(n:number)=>string;
  onCheckin:()=>void; onCheckout:()=>void; onCancel:()=>void; onViewFolio:()=>void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColor: Record<BookingStatus, string> = {
    reserved:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    checked_in:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    checked_out: "bg-slate-700 text-slate-400 border-slate-600",
    cancelled:   "bg-rose-500/20 text-rose-400 border-rose-500/30",
    no_show:     "bg-slate-700 text-slate-500 border-slate-600",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-100">{b.guest_name}</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Room {b.room_number}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor[b.status]}`}>
              {b.status.replace("_"," ").toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {b.check_in_date} → {b.check_out_date} · {b.total_nights} {tc("nights","ሌሊቶች")} · {b.adults} {tc("adults","ትልቅ")}
            {b.children > 0 && `, ${b.children} ${tc("children","ልጆች")}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          {Number(b.balance_due) > 0 && (
            <div className="font-black text-orange-400">{fmt(Number(b.balance_due))} ETB</div>
          )}
          <div className="text-xs text-slate-500">{tc("Total:","ጠቅላላ:")} {fmt(Number(b.total))} ETB</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              [tc("Phone","ስልክ"), b.guest_phone || "—"],
              [tc("ID/Passport","መታወቂያ"), b.guest_id_number || "—"],
              [tc("Nationality","ዜግነት"), b.guest_nationality || "—"],
              [tc("Source","ምንጭ"), b.booking_source.replace("_"," ")],
              [tc("Rate/night","ዋጋ/ሌሊት"), `${fmt(Number(b.room_rate))} ETB`],
              [tc("Subtotal","ንዑስ ድምር"), `${fmt(Number(b.subtotal))} ETB`],
              [tc("Tax (15%)","ቀረጥ 15%"), `${fmt(Number(b.tax))} ETB`],
              [tc("Advance Paid","ቅድሚያ"), `${fmt(Number(b.advance_paid))} ETB`],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-slate-600">{label}</div>
                <div className="font-bold text-slate-300 capitalize">{value}</div>
              </div>
            ))}
          </div>
          {b.special_requests && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
              <span className="font-bold">Special requests: </span>{b.special_requests}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {b.status === "reserved" && (
              <button onClick={onCheckin} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all">
                <DoorOpen className="w-3.5 h-3.5" /> {tc("Check In","ቼክ ኢን")}
              </button>
            )}
            {b.status === "checked_in" && (
              <>
                <button onClick={onViewFolio} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-black transition-all">
                  <Receipt className="w-3.5 h-3.5" /> {tc("View Folio","ሂሳብ ይመልከቱ")}
                </button>
                <button onClick={onCheckout} className="flex items-center gap-1.5 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all">
                  <DoorClosed className="w-3.5 h-3.5" /> {tc("Check Out","ቼክ አውት")}
                </button>
              </>
            )}
            {(b.status === "reserved" || b.status === "checked_in") && (
              <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-all">
                <X className="w-3.5 h-3.5" /> {tc("Cancel","ሰርዝ")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Room Modal ────────────────────────────────────────────────────────────
function AddRoomModal({ tc, tenantCode, editRoom, onClose, onSaved }: {
  tc:(e:string,a:string)=>string; tenantCode?:string;
  editRoom: HotelRoom | null; onClose:()=>void; onSaved:()=>void;
}) {
  const [form, setForm] = useState({
    roomNumber:    editRoom?.room_number ?? "",
    roomType:      editRoom?.room_type ?? "standard",
    floor:         String(editRoom?.floor ?? 1),
    capacity:      String(editRoom?.capacity ?? 2),
    pricePerNight: String(editRoom?.price_per_night ?? ""),
    description:   editRoom?.description ?? "",
    amenities:     (editRoom?.amenities ?? []).join(", "),
    image:         editRoom?.image ?? "",
  });
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const mediaIsVideo = (src: string) => src.startsWith("data:video/") || /\.(mp4|webm|ogg)$/i.test(src);
  const mediaIsGif   = (src: string) => src.includes("image/gif");

  const handleFile = (file: File) => {
    const ok = ["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm"];
    if (!ok.includes(file.type)) { setError(tc("Use JPG, PNG, GIF or MP4/WebM","JPG, PNG, GIF ወይም MP4 ይጠቀሙ")); return; }
    const maxMB = file.type.startsWith("video/") ? 8 : 5;
    if (file.size > maxMB * 1024 * 1024) { setError(tc(`Max ${maxMB}MB allowed`,`ከ${maxMB}MB መብለጥ አይቻልም`)); return; }
    setMediaLoading(true); setError("");
    const r = new FileReader();
    r.onload  = e => { setForm(p => ({ ...p, image: e.target?.result as string })); setMediaLoading(false); };
    r.onerror = () => { setError(tc("Could not read file","ፋይሉን ማንበብ አልቻለም")); setMediaLoading(false); };
    r.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.roomNumber.trim()) { setError(tc("Room number is required","ቁጥሩ ያስፈልጋል")); return; }
    if (!form.pricePerNight || Number(form.pricePerNight) <= 0) { setError(tc("Price per night is required","ዋጋ ያስፈልጋል")); return; }
    setSaving(true); setError("");
    try {
      const body = {
        roomNumber:    form.roomNumber,
        roomType:      form.roomType,
        floor:         Number(form.floor),
        capacity:      Number(form.capacity),
        pricePerNight: Number(form.pricePerNight),
        description:   form.description,
        amenities:     form.amenities.split(",").map(s => s.trim()).filter(Boolean),
        image:         form.image,
      };
      const url    = editRoom ? `/api/hotel/rooms/${editRoom.id}` : "/api/hotel/rooms";
      const method = editRoom ? "PUT" : "POST";
      const res = await apiFetch(url, tenantCode, { method, headers: { "Content-Type":"application/json" }, body: JSON.stringify(body) });
      if (res.ok) onSaved();
      else { const d = await res.json(); setError(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  const AMENITY_CHIPS = ["WiFi","AC","TV","Mini-bar","Safe","Jacuzzi","Balcony","Sea View","Breakfast"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="relative bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl my-4 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              {editRoom ? "✏️ " + tc("Edit Room","ክፍል ቀይር") : "🏨 " + tc("Add New Room","አዲስ ክፍል ጨምር")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{tc("Upload photo, GIF or short video","ፎቶ፣ GIF ወይም ቪዲዮ ጫን")}</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Media Upload Hero ───────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {tc("Room Media","ሚዲያ")}
              </span>
              {form.image && (
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors">
                    {tc("↑ Change","ቀይር")}
                  </button>
                  <span className="text-slate-700">·</span>
                  <button onClick={() => setForm(p => ({ ...p, image: "" }))}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors">
                    {tc("Remove","አስወግድ")}
                  </button>
                </div>
              )}
            </div>

            {form.image ? (
              /* ── Preview ── */
              <div className="relative rounded-2xl overflow-hidden group">
                {mediaIsVideo(form.image) ? (
                  <video src={form.image} autoPlay loop muted playsInline className="w-full h-52 object-cover" />
                ) : (
                  <img src={form.image} alt="room preview" className="w-full h-52 object-cover" />
                )}
                {/* Dark scrim + badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 flex gap-2">
                  {mediaIsVideo(form.image) && (
                    <span className="flex items-center gap-1 bg-purple-600/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                      ▶ VIDEO
                    </span>
                  )}
                  {mediaIsGif(form.image) && (
                    <span className="flex items-center gap-1 bg-amber-500/90 backdrop-blur text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full">
                      ✨ ANIMATED GIF
                    </span>
                  )}
                  {!mediaIsVideo(form.image) && !mediaIsGif(form.image) && (
                    <span className="flex items-center gap-1 bg-emerald-600/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                      📷 PHOTO
                    </span>
                  )}
                </div>
                {/* Click-to-change overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-black bg-black/60 backdrop-blur px-4 py-2 rounded-xl">
                    {tc("Click to change","ቀይር")}
                  </span>
                </div>
              </div>
            ) : (
              /* ── Drop Zone ── */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                  ${isDragging
                    ? "border-2 border-amber-400 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                    : "border-2 border-dashed border-slate-700 hover:border-amber-500/60 hover:bg-slate-900/80"
                  }`}
              >
                {mediaLoading ? (
                  <div className="flex flex-col items-center justify-center h-44 gap-3">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 animate-spin" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">{tc("Processing media…","ሚዲያ እየተዘጋጀ…")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-44 gap-3 px-6">
                    {/* Gradient icon */}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ background: isDragging
                        ? "linear-gradient(135deg, #f59e0b22, #f59e0b44)"
                        : "linear-gradient(135deg, #1e293b, #334155)" }}>
                      {isDragging ? "⬇️" : "🏔️"}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-bold text-slate-300">
                        {isDragging
                          ? tc("Drop it here!","እዚህ ጣሉ!")
                          : tc("Upload room photo or video","ፎቶ ወይም ቪዲዮ ጫን")}
                      </p>
                      <p className="text-xs text-slate-600">
                        {tc("Drag & drop or click to browse","ጎትተው ጣሉ ወይም ጠቅ ያድርጉ")}
                      </p>
                    </div>
                    {/* Format pills */}
                    <div className="flex gap-2 flex-wrap justify-center">
                      {[
                        { label:"📷 Photo", sub:"JPG/PNG/WebP", color:"bg-slate-800 border-slate-700" },
                        { label:"✨ GIF",   sub:"Animated",     color:"bg-amber-950/50 border-amber-800/50" },
                        { label:"🎬 Video", sub:"MP4/WebM",     color:"bg-purple-950/50 border-purple-800/50" },
                      ].map(p => (
                        <span key={p.label} className={`flex items-center gap-1 border text-[10px] font-bold px-2.5 py-1 rounded-full text-slate-400 ${p.color}`}>
                          {p.label} <span className="text-slate-600 font-normal">· {p.sub}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-700">{tc("Max 5MB photo / 8MB video","ፎቶ ከ5MB / ቪዲዮ ከ8MB")}</p>
                  </div>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="hidden" />
          </div>

          {/* ── Room Details ────────────────────────────────── */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tc("Room Details","ዝርዝሮች")}</span>

            {/* Row: number + type */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1.5">{tc("Room Number","ቁጥር")} <span className="text-rose-400">*</span></label>
                <input value={form.roomNumber} onChange={e => setForm(p => ({ ...p, roomNumber: e.target.value }))}
                  placeholder="101" autoFocus
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">{tc("Floor","ፎቅ")}</label>
                <input type="number" min="0" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all" />
              </div>
            </div>

            {/* Row: type + capacity + price */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">{tc("Type","ዓይነት")}</label>
                <select value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all appearance-none cursor-pointer">
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">{tc("Guests","እንግዶች")}</label>
                <input type="number" min="1" max="20" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">{tc("Price/Night","ዋጋ")} <span className="text-rose-400">*</span></label>
                <input type="number" min="0" value={form.pricePerNight} onChange={e => setForm(p => ({ ...p, pricePerNight: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all" />
              </div>
            </div>

            {/* Amenity quick-pick chips */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">{tc("Amenities","አገልግሎቶች")}</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {AMENITY_CHIPS.map(chip => {
                  const active = form.amenities.toLowerCase().includes(chip.toLowerCase());
                  return (
                    <button key={chip} type="button"
                      onClick={() => {
                        const list = form.amenities.split(",").map(s => s.trim()).filter(Boolean);
                        const idx  = list.findIndex(x => x.toLowerCase() === chip.toLowerCase());
                        if (idx === -1) list.push(chip); else list.splice(idx, 1);
                        setForm(p => ({ ...p, amenities: list.join(", ") }));
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        active
                          ? "bg-amber-500 border-amber-500 text-slate-950"
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-400"
                      }`}>
                      {chip}
                    </button>
                  );
                })}
              </div>
              <input value={form.amenities} onChange={e => setForm(p => ({ ...p, amenities: e.target.value }))}
                placeholder={tc("or type custom: Pool, Gym, Sauna…","ወይም ራስዎ ይጻፉ: Pool, Gym…")}
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-slate-600 transition-all" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">{tc("Description","መግለጫ")} <span className="text-slate-600">{tc("(optional)","(አማራጭ)")}</span></label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} placeholder={tc("Spacious room with city view…","ሰፊ ክፍል ከከተማ እይታ ጋር…")}
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none resize-none placeholder-slate-600 transition-all" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
              <span className="text-rose-400 text-lg">⚠</span>
              <p className="text-xs text-rose-400 font-bold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-sm font-bold transition-all">
              {tc("Cancel","ሰርዝ")}
            </button>
            <button onClick={handleSave} disabled={saving || mediaLoading}
              className="flex-2 flex-grow-[2] py-3 rounded-2xl text-sm font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: saving ? "#78350f" : "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1c1917" }}>
              {saving
                ? <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    {tc("Saving…","እየተቀመጠ…")}
                  </span>
                : (editRoom ? "💾 " + tc("Update Room","ቀይር") : "✅ " + tc("Add Room","ጨምር"))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ tc, tenantCode, availableRooms, onClose, onSaved }: {
  tc:(e:string,a:string)=>string; tenantCode?:string;
  availableRooms: HotelRoom[]; onClose:()=>void; onSaved:()=>void;
}) {
  const today = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const [form, setForm] = useState({
    roomId: availableRooms[0]?.id ?? "",
    guestName: "", guestPhone: "", guestIdNumber: "", guestNationality: "",
    adults: 1, children: 0,
    checkInDate: today, checkOutDate: tomorrow,
    bookingSource: "walk_in",
    discount: 0, advancePaid: 0,
    specialRequests: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedRoom = availableRooms.find(r => r.id === form.roomId);
  const nights = Math.max(1, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000));
  const subtotal = (selectedRoom?.price_per_night ?? 0) * nights;
  const tax = (subtotal - Number(form.discount)) * 0.15;
  const total = subtotal - Number(form.discount) + tax;
  const balance = Math.max(0, total - Number(form.advancePaid));

  const handleSave = async () => {
    if (!form.roomId || !form.guestName) { setError(tc("Room and guest name required","ክፍል እና የእንግዳ ስም ያስፈልጋሉ")); return; }
    setSaving(true); setError("");
    try {
      const r = await apiFetch("/api/hotel/bookings", tenantCode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, adults: Number(form.adults), children: Number(form.children), discount: Number(form.discount), advancePaid: Number(form.advancePaid) }),
      });
      if (r.ok) onSaved();
      else { const d = await r.json(); setError(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-100">🛎 {tc("New Booking","አዲስ ቦታ ያዝ")}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        {/* Room selector */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">{tc("Room","ክፍል")}</label>
          <select value={form.roomId} onChange={e => setForm(p => ({ ...p, roomId: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none">
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>
                Room {r.room_number} — {r.room_type} — {Number(r.price_per_night).toLocaleString()} ETB/night
              </option>
            ))}
            {availableRooms.length === 0 && <option value="">No available rooms</option>}
          </select>
        </div>

        {/* Guest details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">{tc("Guest Name *","የእንግዳ ስም *")}</label>
            <input value={form.guestName} onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("Phone","ስልክ")}</label>
            <input value={form.guestPhone} onChange={e => setForm(p => ({ ...p, guestPhone: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("ID / Passport","መታወቂያ")}</label>
            <input value={form.guestIdNumber} onChange={e => setForm(p => ({ ...p, guestIdNumber: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("Nationality","ዜግነት")}</label>
            <input value={form.guestNationality} onChange={e => setForm(p => ({ ...p, guestNationality: e.target.value }))}
              placeholder="Ethiopian"
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("Adults","ትልቅ")}</label>
            <input type="number" min={1} value={form.adults} onChange={e => setForm(p => ({ ...p, adults: Number(e.target.value) }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("Children","ልጆች")}</label>
            <input type="number" min={0} value={form.children} onChange={e => setForm(p => ({ ...p, children: Number(e.target.value) }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("Check-In","ቼክ ኢን")}</label>
            <input type="date" value={form.checkInDate} onChange={e => setForm(p => ({ ...p, checkInDate: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{tc("Check-Out","ቼክ አውት")}</label>
            <input type="date" value={form.checkOutDate} onChange={e => setForm(p => ({ ...p, checkOutDate: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
          </div>
        </div>

        {/* Billing summary */}
        <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>{nights} {tc("night(s)","ሌሊቶች")} × {Number(selectedRoom?.price_per_night ?? 0).toLocaleString()} ETB</span>
            <span>{subtotal.toLocaleString()} ETB</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">{tc("Discount","ቅናሽ")}</label>
              <input type="number" min={0} value={form.discount} onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))}
                className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500">{tc("Advance Paid","ቅድሚያ")}</label>
              <input type="number" min={0} value={form.advancePaid} onChange={e => setForm(p => ({ ...p, advancePaid: Number(e.target.value) }))}
                className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-200 outline-none" />
            </div>
          </div>
          <div className="border-t border-slate-700 pt-2 flex justify-between font-black text-slate-100">
            <span>{tc("Balance Due","ቀሪ ሂሳብ")}</span>
            <span className="text-amber-400">{balance.toLocaleString()} ETB</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">{tc("Source","ምንጭ")}</label>
          <select value={form.bookingSource} onChange={e => setForm(p => ({ ...p, bookingSource: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none">
            {BOOKING_SOURCES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">{tc("Special Requests","ልዩ ጥያቄዎች")}</label>
          <textarea value={form.specialRequests} onChange={e => setForm(p => ({ ...p, specialRequests: e.target.value }))}
            rows={2} placeholder="e.g. high floor, away from elevator, extra pillows…"
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none resize-none placeholder-slate-600" />
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm font-bold">{tc("Cancel","ሰርዝ")}</button>
          <button onClick={handleSave} disabled={saving || availableRooms.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 text-sm font-black transition-all">
            {saving ? tc("Saving…","እየተቀመጠ…") : tc("Confirm Booking","ቦታ ያዝ አረጋግጥ")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Guest Folio Modal ─────────────────────────────────────────────────────────
function FolioModal({ tc, fmt, tenantCode, booking: b, charges, onClose, onChargeAdded, onCheckout, staffName }: {
  tc:(e:string,a:string)=>string; fmt:(n:number)=>string; tenantCode?:string;
  booking: Booking; charges: RoomCharge[]; onClose:()=>void;
  onChargeAdded:()=>void; onCheckout:()=>void; staffName: string;
}) {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [charge, setCharge] = useState({ type: "room_service", description: "", amount: "", quantity: 1 });
  const [adding, setAdding] = useState(false);

  const extraTotal = charges.reduce((s, c) => s + Number(c.amount) * c.quantity, 0);
  const grandTotal = Number(b.total) + extraTotal;
  const outstanding = Math.max(0, grandTotal - Number(b.advance_paid));

  const addCharge = async () => {
    if (!charge.description || !charge.amount) return;
    setAdding(true);
    try {
      await apiFetch(`/api/hotel/bookings/${b.id}/charges`, tenantCode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...charge, amount: Number(charge.amount), quantity: Number(charge.quantity), addedBy: staffName }),
      });
      setCharge({ type: "room_service", description: "", amount: "", quantity: 1 });
      setShowAddCharge(false);
      onChargeAdded();
    } finally { setAdding(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-100">📄 {tc("Guest Folio","የእንግዳ ሂሳብ")}</h2>
            <p className="text-xs text-slate-500">{b.guest_name} · Room {b.room_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        {/* Room charges */}
        <div className="bg-slate-800 rounded-xl divide-y divide-slate-700">
          <div className="p-3 flex justify-between text-sm">
            <span className="text-slate-400">{b.total_nights} {tc("nights","ሌሊቶች")} × {fmt(Number(b.room_rate))} ETB</span>
            <span className="font-bold text-slate-200">{fmt(Number(b.subtotal))} ETB</span>
          </div>
          {Number(b.discount) > 0 && (
            <div className="p-3 flex justify-between text-sm">
              <span className="text-slate-400">{tc("Discount","ቅናሽ")}</span>
              <span className="text-emerald-400">-{fmt(Number(b.discount))} ETB</span>
            </div>
          )}
          <div className="p-3 flex justify-between text-sm">
            <span className="text-slate-400">{tc("Tax (15%)","ቀረጥ 15%")}</span>
            <span className="text-slate-400">{fmt(Number(b.tax))} ETB</span>
          </div>

          {/* Extra charges */}
          {charges.map(c => (
            <div key={c.id} className="p-3 flex justify-between text-sm">
              <span className="text-slate-400">
                {CHARGE_TYPES.find(t => t.value === c.type)?.label ?? c.type} — {c.description}
                {c.quantity > 1 && ` ×${c.quantity}`}
              </span>
              <span className="text-slate-200">{fmt(Number(c.amount) * c.quantity)} ETB</span>
            </div>
          ))}

          <div className="p-3 flex justify-between text-sm font-black">
            <span className="text-slate-200">{tc("Grand Total","ጠቅላላ ድምር")}</span>
            <span className="text-slate-100">{fmt(grandTotal)} ETB</span>
          </div>
          {Number(b.advance_paid) > 0 && (
            <div className="p-3 flex justify-between text-sm">
              <span className="text-slate-400">{tc("Advance Paid","ቅድሚያ")}</span>
              <span className="text-emerald-400">-{fmt(Number(b.advance_paid))} ETB</span>
            </div>
          )}
          <div className="p-3 flex justify-between font-black">
            <span className="text-orange-300">{tc("Outstanding Balance","ቀሪ ሂሳብ")}</span>
            <span className="text-orange-400 text-lg">{fmt(outstanding)} ETB</span>
          </div>
        </div>

        {/* Add extra charge */}
        {b.status === "checked_in" && (
          showAddCharge ? (
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-400">{tc("Add Charge","ሂሳብ ጨምር")}</div>
              <select value={charge.type} onChange={e => setCharge(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none">
                {CHARGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input value={charge.description} onChange={e => setCharge(p => ({ ...p, description: e.target.value }))}
                placeholder={tc("Description","መግለጫ")}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={charge.amount} onChange={e => setCharge(p => ({ ...p, amount: e.target.value }))}
                  placeholder={tc("Amount (ETB)","ዋጋ (ETB)")}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
                <input type="number" min={1} value={charge.quantity} onChange={e => setCharge(p => ({ ...p, quantity: Number(e.target.value) }))}
                  placeholder={tc("Qty","ብዛት")}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddCharge(false)} className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-400 text-sm">{tc("Cancel","ሰርዝ")}</button>
                <button onClick={addCharge} disabled={adding} className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 text-sm font-black">
                  {adding ? "…" : tc("Add","ጨምር")}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddCharge(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl text-sm text-slate-500 hover:text-amber-400 transition-all">
              <Plus className="w-4 h-4" /> {tc("Add Extra Charge","ተጨማሪ ሂሳብ ጨምር")}
            </button>
          )
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm font-bold">{tc("Close","ዝጋ")}</button>
          {b.status === "checked_in" && (
            <button onClick={onCheckout}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-black transition-all">
              <DoorClosed className="w-4 h-4" /> {tc("Check Out","ቼክ አውት")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Checkout Modal ────────────────────────────────────────────────────────────
function CheckoutModal({ tc, fmt, tenantCode, booking: b, onClose, onDone }: {
  tc:(e:string,a:string)=>string; fmt:(n:number)=>string; tenantCode?:string;
  booking: Booking; onClose:()=>void; onDone:()=>void;
}) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [finalPayment, setFinalPayment] = useState(String(b.balance_due));
  const [saving, setSaving] = useState(false);

  const handleCheckout = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/hotel/bookings/${b.id}/checkout`, tenantCode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, finalPayment: Number(finalPayment) }),
      });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-100">🚪 {tc("Check Out","ቼክ አውት")}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>{b.guest_name}</span>
            <span>Room {b.room_number}</span>
          </div>
          <div className="flex justify-between font-black text-slate-100">
            <span>{tc("Outstanding Balance","ቀሪ ሂሳብ")}</span>
            <span className="text-orange-400">{fmt(Number(b.balance_due))} ETB</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">{tc("Final Payment (ETB)","የመጨረሻ ክፍያ")}</label>
          <input type="number" value={finalPayment} onChange={e => setFinalPayment(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">{tc("Payment Method","የክፍያ ዘዴ")}</label>
          <div className="grid grid-cols-3 gap-2">
            {["cash","card","telebirr"].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all capitalize ${
                  paymentMethod === m ? "bg-amber-500 border-amber-500 text-slate-950" : "bg-slate-800 border-slate-700 text-slate-400"
                }`}>
                {m === "telebirr" ? "Telebirr" : m === "cash" ? "💵 Cash" : "💳 Card"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm font-bold">{tc("Cancel","ሰርዝ")}</button>
          <button onClick={handleCheckout} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-black transition-all">
            {saving ? "…" : tc("Confirm Checkout","ቼክ አውት አረጋግጥ")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Housekeeping Modal ────────────────────────────────────────────────────────
function HousekeepingModal({ tc, tenantCode, room, staffName, onClose, onDone }: {
  tc:(e:string,a:string)=>string; tenantCode?:string;
  room: HotelRoom; staffName: string; onClose:()=>void; onDone:()=>void;
}) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const updateStatus = async (status: RoomStatus) => {
    setSaving(true);
    try {
      await apiFetch(`/api/hotel/rooms/${room.id}/status`, tenantCode, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, staffName, notes }),
      });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-100">🧹 Room {room.room_number}</h2>
            <p className="text-xs text-slate-500 capitalize">{ROOM_STATUS_CONFIG[room.status].label}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">{tc("Notes","ማስታወሻ")}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder={tc("e.g. Towels replaced, AC checked…","ለምሳሌ ፎጣ ተቀይሯል…")}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none resize-none placeholder-slate-600" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => updateStatus("available")} disabled={saving}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-950 rounded-xl text-xs font-black transition-all">
            <CheckCircle2 className="w-3.5 h-3.5" /> {tc("Mark Clean","ንጹህ")}
          </button>
          <button onClick={() => updateStatus("cleaning")} disabled={saving}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-xl text-xs font-black transition-all">
            <Sparkles className="w-3.5 h-3.5" /> {tc("In Cleaning","ንጽህና ላይ")}
          </button>
          <button onClick={() => updateStatus("maintenance")} disabled={saving}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-slate-300 rounded-xl text-xs font-bold transition-all">
            <Wrench className="w-3.5 h-3.5" /> {tc("Maintenance","ጥገና")}
          </button>
          <button onClick={onClose}
            className="flex items-center justify-center py-2.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold">
            {tc("Cancel","ሰርዝ")}
          </button>
        </div>
      </div>
    </div>
  );
}

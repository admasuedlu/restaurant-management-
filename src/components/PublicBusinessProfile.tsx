import React, { useState, useEffect } from "react";
import {
  MapPin, Phone, Clock, Star, Users, BedDouble, ChevronLeft,
  Calendar, ArrowRight, CheckCircle2, Utensils, Hotel,
  X, Plus, Minus, ShoppingCart, Info
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  ame_name: string;
  price: number;
  category: string;
  description: string;
  ame_description: string;
  prep_time: number;
  image: string;
  popularity: number;
}

interface HotelRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  description: string;
  status: string;
  image?: string;
}

interface BusinessProfile {
  code: string;
  businessName: string;
  phone: string;
  email: string;
  businessType: string;
  businessSize: string;
  description: string;
  coverImage: string;
  address: string;
  city: string;
  openingHours: string;
  avgRating: number;
  totalReviews: number;
  menu: MenuItem[];
  rooms: HotelRoom[];
}

interface Props {
  code: string;
  isAmharic: boolean;
  onBack: () => void;
}

const ROOM_TYPE_ICONS: Record<string, string> = {
  standard:     "🛏",
  deluxe:       "🛏✨",
  suite:        "🏆",
  presidential: "👑",
  twin:         "🛏🛏",
  family:       "👨‍👩‍👧",
};

export default function PublicBusinessProfile({ code, isAmharic, onBack }: Props) {
  const tc = (en: string, am: string) => isAmharic ? am : en;
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "rooms" | "info">("menu");
  const [menuCategory, setMenuCategory] = useState("All");
  const [showReserve, setShowReserve] = useState(false);
  const [showBookRoom, setShowBookRoom] = useState<HotelRoom | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/directory/${code}/profile`)
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        // Default tab based on business type
        if (d.businessType === "hotel") setActiveTab("rooms");
        else setActiveTab("menu");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm">{tc("Loading…","እየጫነ…")}</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-center p-4">
      <div>
        <p className="text-4xl mb-4">😕</p>
        <p className="text-slate-400 font-bold">{tc("Business not found","ድርጅቱ አልተገኘም")}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold text-sm">
          {tc("← Back","← ተመለስ")}
        </button>
      </div>
    </div>
  );

  const isHotel = profile.businessType === "hotel" || profile.businessType === "hotel_restaurant";
  const hasMenu  = profile.menu.length > 0;
  const hasRooms = profile.rooms.length > 0;

  const categories = ["All", ...Array.from(new Set(profile.menu.map(m => m.category)))];
  const filteredMenu = menuCategory === "All"
    ? profile.menu
    : profile.menu.filter(m => m.category === menuCategory);

  const availableRooms = profile.rooms.filter(r => r.status === "available");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Cover & Header ─────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Cover image or gradient */}
        <div className={`h-48 sm:h-64 w-full relative overflow-hidden ${profile.coverImage ? "" : "bg-gradient-to-br from-amber-900/40 via-slate-900 to-slate-950"}`}>
          {profile.coverImage && (
            <img src={profile.coverImage} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Back button */}
          <button onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all hover:bg-slate-800">
            <ChevronLeft className="w-3.5 h-3.5" /> {tc("Back","ተመለስ")}
          </button>

          {/* Business type badge */}
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${
              isHotel ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-amber-500/20 border-amber-500/40 text-amber-300"
            }`}>
              {isHotel ? "🏨 Hotel" : "🍽 Restaurant"}
            </span>
          </div>
        </div>

        {/* Business info card */}
        <div className="px-4 pb-4 -mt-12 relative z-10">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-100">{profile.businessName}</h1>
                {profile.address && (
                  <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {profile.address}, {profile.city}
                  </p>
                )}
              </div>
              {profile.avgRating > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl shrink-0">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-black text-amber-400">{profile.avgRating.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-500">({profile.totalReviews})</span>
                </div>
              )}
            </div>

            {profile.description && (
              <p className="text-sm text-slate-400 leading-relaxed">{profile.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              {profile.phone && (
                <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {profile.phone}
                </a>
              )}
              {profile.openingHours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {profile.openingHours}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {hasMenu && (
                <button onClick={() => setShowReserve(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-black transition-all">
                  <Calendar className="w-4 h-4" /> {tc("Reserve Table","ጠረጴዛ ያዝ")}
                </button>
              )}
              {hasRooms && availableRooms.length > 0 && (
                <button onClick={() => setActiveTab("rooms")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-black transition-all">
                  <BedDouble className="w-4 h-4" /> {tc("Book Room","ክፍል ያዝ")} ({availableRooms.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-2">
        <div className="flex gap-1">
          {hasMenu && (
            <button onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "menu" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
              }`}>
              <Utensils className="w-4 h-4" /> {tc("Menu","ሜኑ")}
            </button>
          )}
          {hasRooms && (
            <button onClick={() => setActiveTab("rooms")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "rooms" ? "bg-purple-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}>
              <BedDouble className="w-4 h-4" /> {tc("Rooms","ክፍሎች")} ({availableRooms.length} {tc("avail.","ነፃ")})
            </button>
          )}
          <button onClick={() => setActiveTab("info")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "info" ? "bg-slate-700 text-slate-200" : "text-slate-400 hover:text-slate-200"
            }`}>
            <Info className="w-4 h-4" /> {tc("Info","መረጃ")}
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 pb-24 max-w-2xl mx-auto">

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button key={cat} onClick={() => setMenuCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                    menuCategory === cat
                      ? "bg-amber-500 border-amber-500 text-slate-950"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="space-y-3">
              {filteredMenu.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4">
                  {item.image && (
                    <img src={item.image} alt={item.name}
                      className="w-20 h-20 object-cover rounded-xl shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-slate-100">
                          {isAmharic && item.ame_name ? item.ame_name : item.name}
                        </h3>
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{item.category}</span>
                      </div>
                      <span className="font-black text-amber-400 text-lg shrink-0">
                        {Number(item.price).toLocaleString()} ETB
                      </span>
                    </div>
                    {(item.description || item.ame_description) && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {isAmharic && item.ame_description ? item.ame_description : item.description}
                      </p>
                    )}
                    {item.prep_time > 0 && (
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        <Clock className="w-3 h-3 inline mr-1" />{item.prep_time} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredMenu.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{tc("No menu items available","ምንም ምናሌ አልተገኘም")}</p>
              </div>
            )}

            {/* Reserve CTA */}
            <div className="sticky bottom-4 mt-4">
              <button onClick={() => setShowReserve(true)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-base shadow-2xl shadow-amber-500/30 transition-all active:scale-95">
                <Calendar className="w-5 h-5" /> {tc("Reserve a Table","ጠረጴዛ ያዝ")}
              </button>
            </div>
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {availableRooms.length} {tc("rooms available for booking","ክፍሎች ለቦታ ያዝ ዝግጁ ናቸው")}
            </p>
            {profile.rooms.map(room => {
              const roomHasVideo = !!room.image && (room.image.startsWith("data:video/") || /\.(mp4|webm)$/i.test(room.image));
              const roomIsGif   = !!room.image && room.image.includes("image/gif");
              return (
              <div key={room.id} className={`bg-slate-900 border rounded-2xl overflow-hidden space-y-0 ${
                room.status === "available" ? "border-slate-800" : "border-slate-800 opacity-60"
              }`}>

                {/* Room Media */}
                {room.image && (
                  <div className="relative w-full h-52 overflow-hidden">
                    {roomHasVideo ? (
                      <video src={room.image} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={room.image} alt={`Room ${room.roomNumber}`} className="w-full h-full object-cover" />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                    {/* Price badge */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur border border-slate-700 rounded-xl px-3 py-1.5 text-right">
                      <div className="font-black text-purple-400 text-lg leading-none">
                        {Number(room.pricePerNight).toLocaleString()} ETB
                      </div>
                      <div className="text-[10px] text-slate-500">{tc("per night","በሌሊት")}</div>
                    </div>
                    {/* Status badge */}
                    {room.status !== "available" && (
                      <div className="absolute top-3 left-3 bg-rose-500/90 backdrop-blur text-white text-[10px] font-black px-2 py-1 rounded-full capitalize">
                        {room.status}
                      </div>
                    )}
                    {roomIsGif && <span className="absolute top-3 right-3 text-[9px] bg-amber-500/90 text-slate-950 font-black px-1.5 py-0.5 rounded-full">✨ GIF</span>}
                    {roomHasVideo && <span className="absolute top-3 right-3 text-[9px] bg-purple-500/90 text-white font-black px-1.5 py-0.5 rounded-full">▶ VIDEO</span>}
                    {/* Room name overlay */}
                    <div className="absolute bottom-3 left-3">
                      <h3 className="font-black text-white text-lg leading-none capitalize">
                        {room.roomType} {room.roomNumber}
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Floor {room.floor} · <Users className="w-3 h-3 inline" /> {room.capacity} guests
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-4">
                {!room.image && (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{ROOM_TYPE_ICONS[room.roomType] ?? "🛏"}</span>
                      <div>
                        <h3 className="font-black text-slate-100 capitalize">
                          {room.roomType} Room {room.roomNumber}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Floor {room.floor} · <Users className="w-3 h-3 inline" /> Up to {room.capacity} guests
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-purple-400 text-xl">
                      {Number(room.pricePerNight).toLocaleString()} ETB
                    </div>
                    <div className="text-[10px] text-slate-500">{tc("per night"," በሌሊት")}</div>
                  </div>
                </div>
                )}

                {room.description && (
                  <p className="text-sm text-slate-400 leading-relaxed">{room.description}</p>
                )}

                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.map(a => (
                      <span key={a} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {room.status === "available" ? (
                  <button onClick={() => setShowBookRoom(room)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-black text-sm transition-all active:scale-95">
                    <BedDouble className="w-4 h-4" /> {tc("Book This Room","ይህን ክፍል ያዝ")}
                  </button>
                ) : (
                  <div className="w-full py-3 text-center bg-slate-800 rounded-xl text-slate-500 text-sm font-bold">
                    {tc("Not Available","ዝግ")}
                  </div>
                )}
                </div>{/* end p-5 */}
              </div>
            );})}{/* end rooms.map */}

            {profile.rooms.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                <BedDouble className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{tc("No rooms listed yet","ምንም ክፍሎች አልተዘረዘሩም")}</p>
              </div>
            )}
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === "info" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              {[
                { label: tc("Business Name","ድርጅት ስም"), value: profile.businessName },
                { label: tc("Type","ዓይነት"), value: profile.businessType },
                { label: tc("Address","አድራሻ"), value: profile.address || tc("Not specified","አልተጠቀሰም") },
                { label: tc("City","ከተማ"), value: profile.city },
                { label: tc("Phone","ስልክ"), value: profile.phone },
                { label: tc("Opening Hours","የሥራ ሰዓታት"), value: profile.openingHours },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-bold text-slate-200 text-right capitalize">{item.value}</span>
                </div>
              ))}
            </div>

            {profile.avgRating > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center">
                <div className="text-5xl font-black text-amber-400">{profile.avgRating.toFixed(1)}</div>
                <div className="flex justify-center gap-0.5 mt-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-5 h-5 ${s <= Math.round(profile.avgRating) ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">{tc(`Based on ${profile.totalReviews} reviews`,`${profile.totalReviews} ግምገማዎች ላይ ተመስርቶ`)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Table Reservation Modal ─────────────────────────────────────────── */}
      {showReserve && (
        <ReserveModal
          tc={tc}
          businessName={profile.businessName}
          tenantCode={code}
          onClose={() => setShowReserve(false)}
        />
      )}

      {/* ── Room Booking Modal ──────────────────────────────────────────────── */}
      {showBookRoom && (
        <BookRoomModal
          tc={tc}
          room={showBookRoom}
          tenantCode={code}
          onClose={() => setShowBookRoom(null)}
        />
      )}
    </div>
  );
}

// ─── Table Reservation Modal ───────────────────────────────────────────────────
function ReserveModal({ tc, businessName, tenantCode, onClose }: {
  tc:(e:string,a:string)=>string; businessName: string;
  tenantCode: string; onClose:()=>void;
}) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ guestName: "", phone: "", guests: 2, date: today, time: "19:00", note: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.guestName || !form.phone) { setError(tc("Name and phone required","ስም እና ስልክ ያስፈልጋሉ")); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(`/api/public/directory/${tenantCode}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: Number(form.guests) }),
      });
      const d = await r.json();
      if (r.ok) setDone(true);
      else setError(d.error ?? "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
        {done ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-slate-100">{tc("Reservation Sent!","ቦታ ያዝ ተላከ!")}</h3>
            <p className="text-sm text-slate-400">{tc(`${businessName} will confirm your table soon.`,`${businessName} ቶሎ ጠረጴዛዎን ያረጋግጣሉ።`)}</p>
            <button onClick={onClose} className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl font-black">{tc("Done","ተጠናቀቀ")}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-100">🍽 {tc("Reserve a Table","ጠረጴዛ ያዝ")}</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <p className="text-xs text-slate-500">{businessName}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{tc("Your Name *","ስምዎ *")}</label>
                <input value={form.guestName} onChange={e => setForm(p => ({...p,guestName:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{tc("Phone *","ስልክ *")}</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({...p,phone:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Date","ቀን")}</label>
                  <input type="date" value={form.date} min={today} onChange={e => setForm(p => ({...p,date:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Time","ሰዓት")}</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({...p,time:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{tc("Number of Guests","የእንግዶች ቁጥር")}</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(p => ({...p,guests:Math.max(1,p.guests-1)}))}
                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-xl text-slate-100 w-8 text-center">{form.guests}</span>
                  <button onClick={() => setForm(p => ({...p,guests:Math.min(20,p.guests+1)}))}
                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{tc("Special Request","ልዩ ጥያቄ")}</label>
                <input value={form.note} onChange={e => setForm(p => ({...p,note:e.target.value}))}
                  placeholder={tc("e.g. window seat, birthday…","ለምሳሌ የመስኮት ወንበር, ልደት…")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-600" />
              </div>
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 rounded-xl text-slate-400 text-sm font-bold">{tc("Cancel","ሰርዝ")}</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 rounded-xl text-slate-950 text-sm font-black transition-all">
                {saving ? "…" : tc("Confirm","አረጋግጥ")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Book Room Modal ───────────────────────────────────────────────────────────
function BookRoomModal({ tc, room, tenantCode, onClose }: {
  tc:(e:string,a:string)=>string; room: HotelRoom;
  tenantCode: string; onClose:()=>void;
}) {
  const today = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const [form, setForm] = useState({
    guestName: "", guestPhone: "", guestIdNumber: "", guestNationality: "",
    adults: 1, children: 0, checkInDate: today, checkOutDate: tomorrow, specialRequests: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState("");

  const nights = Math.max(1, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000));
  const subtotal = room.pricePerNight * nights;
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (!form.guestName || !form.guestPhone) { setError(tc("Name and phone required","ስም እና ስልክ ያስፈልጋሉ")); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(`/api/public/directory/${tenantCode}/book-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roomId: room.id, adults: Number(form.adults), children: Number(form.children) }),
      });
      const d = await r.json();
      if (r.ok) setDone(d);
      else setError(d.error ?? "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 my-4">
        {done ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-slate-100">{tc("Room Reserved!","ክፍል ታዘዘ!")}</h3>
            <div className="bg-slate-800 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">{tc("Room","ክፍል")}</span><span className="font-bold">{done.roomNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{tc("Nights","ሌሊቶች")}</span><span className="font-bold">{done.nights}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{tc("Total","ጠቅላላ")}</span><span className="font-black text-amber-400">{Number(done.total).toLocaleString()} ETB</span></div>
            </div>
            <p className="text-xs text-slate-400">{done.message}</p>
            <button onClick={onClose} className="w-full py-3 bg-purple-500 text-white rounded-xl font-black">{tc("Done","ተጠናቀቀ")}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-100">🛏 {tc("Book Room","ክፍል ያዝ")} {room.roomNumber}</h2>
                <p className="text-xs text-slate-500 capitalize">{room.roomType} · {room.pricePerNight.toLocaleString()} ETB/night</p>
              </div>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{tc("Full Name *","ሙሉ ስም *")}</label>
                <input value={form.guestName} onChange={e => setForm(p => ({...p,guestName:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Phone *","ስልክ *")}</label>
                  <input type="tel" value={form.guestPhone} onChange={e => setForm(p => ({...p,guestPhone:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("ID / Passport","መታወቂያ")}</label>
                  <input value={form.guestIdNumber} onChange={e => setForm(p => ({...p,guestIdNumber:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Check-In","ቼክ ኢን")}</label>
                  <input type="date" value={form.checkInDate} min={today} onChange={e => setForm(p => ({...p,checkInDate:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Check-Out","ቼክ አውት")}</label>
                  <input type="date" value={form.checkOutDate} min={form.checkInDate} onChange={e => setForm(p => ({...p,checkOutDate:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Adults","ትልቅ")}</label>
                  <input type="number" min={1} max={room.capacity} value={form.adults} onChange={e => setForm(p => ({...p,adults:Number(e.target.value)}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{tc("Children","ልጆች")}</label>
                  <input type="number" min={0} value={form.children} onChange={e => setForm(p => ({...p,children:Number(e.target.value)}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{nights} {tc("night(s)","ሌሊቶች")} × {room.pricePerNight.toLocaleString()} ETB</span>
                <span>{subtotal.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{tc("Tax (15%)","ቀረጥ 15%")}</span>
                <span>{Math.round(tax).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between font-black border-t border-slate-700 pt-2 text-slate-100">
                <span>{tc("Total","ጠቅላላ")}</span>
                <span className="text-purple-400">{Math.round(total).toLocaleString()} ETB</span>
              </div>
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 rounded-xl text-slate-400 text-sm font-bold">{tc("Cancel","ሰርዝ")}</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-60 rounded-xl text-white text-sm font-black transition-all">
                {saving ? "…" : tc("Reserve Room","ክፍል ያዝ")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

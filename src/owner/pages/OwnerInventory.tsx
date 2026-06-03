import { useState } from "react";
import { useOwner } from "../owner-context";
import {
  Building2, MapPin, X, Star, Navigation, ArrowRight,
  Shield, Check, User, Mail, Phone, Calendar, Compass, ShieldCheck,
  Copy, ExternalLink, MessageSquare, TrendingUp, Zap, BarChart2,
  Bed, ChevronRight, ChevronLeft, Activity
} from "lucide-react";
import { PGS } from "@/supply-hub/data/pgs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Helper to compile and filter valid property and room photos
function getPropertyImages(p: any, propRooms: any[], media: any[]) {
  const propPhotos = p.photos || [];
  
  // Find media associated with any room of this property
  const roomPhotos = media
    .filter((m) => propRooms.some((r) => r.id === m.roomId))
    .flatMap((m) => m.photos || []);

  // Filter out invalid placeholder paths
  const validPhotos = [...propPhotos, ...roomPhotos].filter(
    (url) => url && typeof url === "string" && !url.includes("placeholder.svg") && !url.includes("example.com")
  );

  if (validPhotos.length > 0) {
    return validPhotos;
  }

  // Pre-seed premium visual fallback images if no images are found
  const seedNum = (p.id ? parseInt(p.id.replace(/[^0-9]/g, ""), 10) : 0) || p.name.charCodeAt(0) || 0;

  const fallbackGalleries = [
    [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80"
    ],
    [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80"
    ],
    [
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&w=800&q=80"
    ]
  ];

  return fallbackGalleries[seedNum % fallbackGalleries.length];
}

interface PropertyCardProps {
  property: any;
  idx: number;
  rooms: any[];
  media: any[];
  onClick: () => void;
}

function PropertyCard({ property, idx, rooms, media, onClick }: PropertyCardProps) {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const pgMatched = PGS.find((x) => x.id === property.id || x.name === property.name || x.actualName === property.name);
  const basePrice = property.pricePerBed || property.basePrice || 12000;
  const minPrice = pgMatched ? pgMatched.prices.min : basePrice;
  const maxPrice = pgMatched ? pgMatched.prices.max : basePrice;
  const priceRangeStr = minPrice === maxPrice
    ? `₹${minPrice.toLocaleString()}`
    : `₹${minPrice.toLocaleString()} – ₹${maxPrice.toLocaleString()}`;
  const iqScore = pgMatched ? pgMatched.iq : 85;
  const mapsUrl = pgMatched ? pgMatched.mapsLink : "";
  const propGender = pgMatched ? pgMatched.gender : property.genderCategory || "Co-live";
  const propTier = pgMatched ? pgMatched.tier : "Mid";

  const propRooms = rooms.filter((r) => r.propertyId === property.id);
  const totalBedsCount = propRooms.reduce((sum, r) => sum + r.bedsTotal, 0) || property.totalBeds || 0;
  const occupiedBedsCount = propRooms.reduce((sum, r) => sum + r.bedsOccupied, 0) || (property.totalBeds - property.vacantBeds) || 0;
  const vacantBedsCount = Math.max(0, totalBedsCount - occupiedBedsCount);
  const occRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  const images = getPropertyImages(property, propRooms, media);

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const genderPill =
    propGender === "Boys"
      ? "bg-blue-50/90 text-blue-700 border-blue-100/50 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-900/30"
      : propGender === "Girls"
      ? "bg-rose-50/90 text-rose-700 border-rose-100/50 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900/30"
      : "bg-amber-50/90 text-amber-700 border-amber-100/50 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-900/30";

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border border-border bg-white dark:bg-slate-900/60 backdrop-blur-xs shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Image Gallery Header */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 select-none">
        <img
          src={images[currentImgIdx]}
          alt={`${property.name} room view`}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Carousel controls - visible on hover */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-90"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-90"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Index indicator */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/50 text-[10px] text-white px-2 py-0.5 rounded-full font-mono font-medium tracking-wider">
          {currentImgIdx + 1} / {images.length}
        </div>

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider shadow-sm ${genderPill}`}>
            {propGender}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider bg-white/90 text-slate-800 border-slate-200/50 dark:bg-slate-900/90 dark:text-slate-200 dark:border-slate-800 shadow-sm">
            {propTier}
          </span>
        </div>

        {/* IQ Badge Overlay */}
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-gradient-to-r from-warning to-amber-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md">
            IQ {iqScore}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-warning font-mono text-[9px] font-black tracking-widest uppercase">
            <span>Property {String(idx + 1).padStart(2, "0")}</span>
          </div>
          <h3 className="font-display font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-warning transition-colors text-[16px] leading-tight line-clamp-1">
            {property.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-warning/70 shrink-0" />
            <span className="truncate">{property.area} · {pgMatched?.locality || property.address || "Bengaluru"}</span>
          </p>
        </div>

        {/* Stats segment */}
        <div className="grid grid-cols-3 gap-2 border-y border-border/60 py-2.5 my-1 text-center">
          <div>
            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono">{totalBedsCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Beds</div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{vacantBedsCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Vacant</div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">{occRate}%</div>
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Occupancy</div>
          </div>
        </div>

        {/* Bottom pricing and action buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Starting from</span>
            <span className="font-display font-black text-slate-900 dark:text-slate-100 text-[15px] mt-0.5 leading-none">
              ₹{minPrice.toLocaleString()}<span className="text-[10px] font-bold text-muted-foreground">/mo</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95 shadow-2xs"
                title="Open in Maps"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button className="inline-flex items-center gap-1 bg-warning/10 hover:bg-warning/20 text-warning text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all group-hover:bg-warning group-hover:text-white active:scale-95 shadow-2xs">
              Inspect <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OwnerInventory() {
  const { owners, currentOwnerId, properties, rooms, media } = useOwner();
  const owner = owners.find((o) => o.id === currentOwnerId) ?? owners[0];
  const myProps = properties.filter((p) => owner.propertyIds.includes(p.id));

  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "owner" | "landmarks">("details");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const uniqueAreas = Array.from(new Set(myProps.map((p) => p.area).filter(Boolean)));
  const uniqueGenders = Array.from(
    new Set(
      myProps.map((p) => {
        const matched = PGS.find((x) => x.id === p.id || x.name === p.name);
        return matched ? matched.gender : (p as any).genderCategory || "Co-live";
      })
    )
  );

  // Aggregate stats from actual rooms
  const ownerPropIds = myProps.map((p) => p.id);
  const ownerRooms = rooms.filter((r) => ownerPropIds.includes(r.propertyId));

  const totalBeds = ownerRooms.reduce((sum, r) => sum + (r.bedsTotal || 0), 0) || myProps.reduce((s, p) => s + ((p as any).totalBeds || 0), 0);
  const occupiedBeds = ownerRooms.reduce((sum, r) => sum + (r.bedsOccupied || 0), 0) || myProps.reduce((s, p) => s + (((p as any).totalBeds || 0) - ((p as any).vacantBeds || 0)), 0);
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const avgIQ = myProps.length > 0
    ? Math.round(myProps.reduce((s, p) => {
        const pg = PGS.find((x) => x.id === p.id || x.name === p.name);
        return s + (pg ? pg.iq : 85);
      }, 0) / myProps.length)
    : 85;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const getLandmarks = (property: any) => {
    const isKoramangala = (property.area || "").toLowerCase().includes("koramangala");
    if (isKoramangala) {
      return [
        { name: "Christ University Back Gate", distance: "84m", time: "1 min walk", type: "Education" },
        { name: "Nexus Mall Koramangala", distance: "450m", time: "5 min walk", type: "Shopping" },
        { name: "Silk Board Junction", distance: "1.8km", time: "6 min drive", type: "Transit" },
        { name: "Koramangala 4th Block Park", distance: "200m", time: "2 min walk", type: "Recreation" },
      ];
    }
    return [
      { name: "HSR Sector 3 Metro Station", distance: "400m", time: "4 min walk", type: "Transit" },
      { name: "NIFT Bengaluru Campus", distance: "600m", time: "7 min walk", type: "Education" },
      { name: "BDA Complex HSR", distance: "1.2km", time: "4 min drive", type: "Shopping" },
      { name: "Local Green Park", distance: "150m", time: "2 min walk", type: "Recreation" },
    ];
  };

  const landmarkTypeColors: Record<string, string> = {
    Education: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30",
    Shopping: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/30",
    Transit: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
    Recreation: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30",
  };

  return (
    <div className="space-y-6 relative">
      {/* Page Header */}
      <header>
        <div className="text-[10px] uppercase tracking-widest text-warning font-bold mb-1 flex items-center gap-1.5">
          <Zap className="h-3 w-3" /> Owner Portal
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">My Inventory Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your manager contact profile and managed properties listed in the Gharpayy network.
        </p>
      </header>

      {myProps.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No properties linked to this owner profile yet.
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Manager Profile Card ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-warning/25 overflow-hidden bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-lg">
            {/* Gradient header strip */}
            <div className="bg-gradient-to-r from-warning/12 via-amber-400/6 to-transparent px-6 py-5 border-b border-warning/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-warning to-amber-400 flex items-center justify-center text-white font-display font-bold text-xl shadow-md shrink-0 select-none">
                    {owner.name?.charAt(0)?.toUpperCase() || "O"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-warning">
                      <User className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-widest font-mono font-bold">Manager Profile</span>
                    </div>
                    <h2 className="text-xl font-display font-bold mt-0.5 text-slate-900 dark:text-slate-100">
                      {owner.name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{owner.phone || "NO_CONTACT"}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {owner.phone && owner.phone !== "NO_CONTACT" && (
                    <>
                      <button
                        onClick={() => copyToClipboard(owner.phone, "Phone number")}
                        className="inline-flex items-center gap-1.5 border border-border bg-white dark:bg-slate-800 hover:bg-muted text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-xs active:scale-95"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy Phone
                      </button>
                      <a
                        href={`https://wa.me/${owner.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-xs active:scale-95"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Area / Gender Tags */}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground pt-4 border-t border-warning/10">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-warning/70" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Areas:</span>
                  <span>{uniqueAreas.join(", ") || "All Areas"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-warning/70" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Gender Types:</span>
                  <span>{uniqueGenders.join(", ") || "Mixed"}</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/60 border-b border-border/60">
              {[
                { label: "Properties", value: myProps.length, color: "text-warning", icon: Building2 },
                { label: "Total Beds", value: totalBeds, color: "text-blue-600 dark:text-blue-400", icon: Bed },
                { label: "Occupancy", value: `${occupancyPct}%`, color: "text-emerald-600 dark:text-emerald-400", icon: BarChart2 },
                { label: "Avg IQ Score", value: avgIQ, color: "text-violet-600 dark:text-violet-400", icon: TrendingUp },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <div className={`text-base font-extrabold font-display leading-none ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Properties Section (Embedded Inside Card) */}
            <div className="p-6 bg-card/45 dark:bg-slate-900/40 border-t border-border/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-warning" />
                  <span>Managed Properties ({myProps.length})</span>
                </h3>
                <span className="text-[10px] text-muted-foreground bg-muted dark:bg-slate-800 px-2.5 py-1 rounded-md font-semibold border border-border/40">
                  Swipeable room photo galleries
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProps.map((p, idx) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    idx={idx}
                    rooms={rooms}
                    media={media}
                    onClick={() => {
                      const pgMatched = PGS.find((x) => x.id === p.id || x.name === p.name || x.actualName === p.name);
                      const basePrice = (p as any).pricePerBed || (p as any).basePrice || 12000;
                      const minPrice = pgMatched ? pgMatched.prices.min : basePrice;
                      const maxPrice = pgMatched ? pgMatched.prices.max : basePrice;
                      const priceRangeStr = minPrice === maxPrice
                        ? `₹${minPrice.toLocaleString()}`
                        : `₹${minPrice.toLocaleString()} – ₹${maxPrice.toLocaleString()}`;
                      const iqScore = pgMatched ? pgMatched.iq : 85;
                      const mapsUrl = pgMatched ? pgMatched.mapsLink : "";
                      const propGender = pgMatched ? pgMatched.gender : (p as any).genderCategory || "Co-live";
                      const propTier = pgMatched ? pgMatched.tier : "Mid";

                      setSelectedProperty({ ...p, pgMatched, iqScore, mapsUrl, propGender, propTier, priceRangeStr });
                      setActiveTab("details");
                    }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── PREMIUM PROPERTY DRAWER ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex justify-end"
            onClick={() => setSelectedProperty(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-background border-l border-border w-full max-w-2xl h-full shadow-2xl flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Floating Buttons */}
              <button className="absolute top-4 right-14 z-30 h-9 w-9 rounded-full border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-muted flex items-center justify-center transition-all text-muted-foreground hover:text-warning hover:scale-105">
                <Star className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 z-30 h-9 w-9 rounded-full border bg-background/90 backdrop-blur-sm shadow-sm hover:bg-muted flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:scale-105"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1">

                {/* Drawer Header */}
                <div className="p-6 pr-28 border-b bg-gradient-to-r from-warning/5 to-transparent space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-warning/10 text-warning border border-warning/20 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
                      IQ {selectedProperty.iqScore || 85}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      {selectedProperty.propTier || "Mid"} · {selectedProperty.propGender || "Co-live"}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                    {selectedProperty.name}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-warning/70 shrink-0" />
                    <span>{selectedProperty.area} · {selectedProperty.address || "Bengaluru, Karnataka"}</span>
                  </p>
                  {selectedProperty.priceRangeStr && (
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {selectedProperty.priceRangeStr}
                      <span className="text-xs font-normal text-muted-foreground ml-1">/ month per bed</span>
                    </div>
                  )}
                </div>

                {/* Vector Map Section */}
                <div className="p-5 bg-muted/5 border-b space-y-3">
                  <div className="h-[230px] w-full rounded-xl overflow-hidden border border-border shadow-inner relative">
                    <svg viewBox="0 0 800 230" className="w-full h-full bg-[#f8fafc] dark:bg-[#0f172a] select-none">
                      <defs>
                        <pattern id="grid-inv" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                        </pattern>
                        {/* Pulsing beacon animation */}
                        <style>{`
                          @keyframes beacon-pulse {
                            0% { r: 10; opacity: 0.8; }
                            100% { r: 26; opacity: 0; }
                          }
                          .beacon-ring { animation: beacon-pulse 1.6s ease-out infinite; transform-origin: 390px 165px; }
                        `}</style>
                      </defs>
                      <rect width="800" height="230" fill="url(#grid-inv)" />

                      {/* Green zones */}
                      <rect x="40" y="18" width="130" height="145" rx="6" fill="#dcfce7" stroke="#bbf7d0" strokeWidth="1.5" />
                      <text x="105" y="65" fontFamily="sans-serif" fontSize="10" fill="#166534" fontWeight="bold" textAnchor="middle">Christ University</text>
                      <text x="105" y="80" fontFamily="sans-serif" fontSize="8" fill="#166534" textAnchor="middle">Central Block</text>
                      <rect x="40" y="185" width="130" height="40" rx="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
                      <text x="105" y="209" fontFamily="sans-serif" fontSize="8" fill="#475569" fontWeight="bold" textAnchor="middle">Basketball Court</text>

                      {/* Main roads */}
                      <line x1="500" y1="0" x2="800" y2="230" stroke="#fef08a" strokeWidth="26" strokeLinecap="round" />
                      <line x1="600" y1="0" x2="520" y2="230" stroke="#fef08a" strokeWidth="20" strokeLinecap="round" />
                      <line x1="170" y1="38" x2="560" y2="38" stroke="#ffffff" strokeWidth="8" />
                      <line x1="170" y1="76" x2="550" y2="76" stroke="#ffffff" strokeWidth="8" />
                      <line x1="170" y1="114" x2="540" y2="114" stroke="#ffffff" strokeWidth="8" />
                      <line x1="170" y1="152" x2="530" y2="152" stroke="#ffffff" strokeWidth="8" />
                      <line x1="170" y1="192" x2="520" y2="192" stroke="#ffffff" strokeWidth="8" />
                      <line x1="310" y1="38" x2="310" y2="230" stroke="#ffffff" strokeWidth="10" />

                      {/* Road labels */}
                      <text x="210" y="35" fontFamily="sans-serif" fontSize="7" fill="#64748b">1st Cross Road</text>
                      <text x="210" y="73" fontFamily="sans-serif" fontSize="7" fill="#64748b">2nd Cross Road</text>
                      <text x="210" y="111" fontFamily="sans-serif" fontSize="7" fill="#64748b">3rd Cross Road</text>
                      <text x="210" y="149" fontFamily="sans-serif" fontSize="7" fill="#64748b">4th Cross Road</text>
                      <text x="210" y="189" fontFamily="sans-serif" fontSize="7" fill="#64748b">5th Cross Road</text>

                      {/* Pulsing beacon for property */}
                      <circle cx="390" cy="165" r="10" fill="#f59e0b" fillOpacity="0.15" className="beacon-ring" />
                      <circle cx="390" cy="165" r="10" fill="#f59e0b" fillOpacity="0.1" className="beacon-ring" style={{ animationDelay: "0.5s" }} />
                      <circle cx="390" cy="165" r="9" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx="390" cy="165" r="4" fill="#ffffff" />
                      <rect x="305" y="177" width="170" height="18" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                      <text x="390" y="190" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#0f172a" textAnchor="middle">{selectedProperty.name}</text>

                      {/* Landmark markers */}
                      <circle cx="310" cy="85" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      <rect x="235" y="96" width="150" height="14" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" opacity="0.92" />
                      <text x="310" y="107" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#0f172a" textAnchor="middle">Christ University Back Gate · 84m</text>
                      <circle cx="480" cy="120" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      <rect x="415" y="131" width="130" height="14" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" opacity="0.92" />
                      <text x="480" y="142" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#0f172a" textAnchor="middle">Chi Dairy Circle · 100m</text>

                      {/* Watermark */}
                      <rect x="710" y="208" width="80" height="18" rx="4" fill="#000000" fillOpacity="0.6" />
                      <text x="750" y="221" fontFamily="sans-serif" fontSize="8" fill="#ffffff" fontWeight="bold" textAnchor="middle">© OpenStreetMap</text>
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="flex items-center gap-1.5">
                      <Compass className="h-4 w-4 text-warning" />
                      <span>3 closest landmarks · zoom 17</span>
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(selectedProperty.area + ", Bengaluru")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 border px-2.5 py-1.5 rounded-lg bg-background hover:bg-muted font-semibold transition-colors active:scale-95"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Open in OSM</span>
                    </a>
                  </div>

                  <div className="text-xs bg-warning/5 border border-warning/15 rounded-lg p-2.5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning animate-pulse shrink-0" />
                    <span>
                      <strong className="text-slate-800 dark:text-slate-200">Nearest:</strong>{" "}
                      Christ University Back Gate
                      <span className="text-muted-foreground ml-1 font-mono">· 84m · 1 min walk</span>
                    </span>
                  </div>
                </div>

                {/* Sticky Tab Bar */}
                <div className="border-b bg-background/95 backdrop-blur-sm flex px-2 sticky top-0 z-20 shadow-xs">
                  {(["details", "owner", "landmarks"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative py-3 px-4 font-semibold text-xs uppercase tracking-wider transition-all ${
                        activeTab === tab
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "details" ? "Property Details" : tab === "owner" ? "Owner Details" : "Nearby Landmarks"}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-warning rounded-full"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">

                  {/* DETAILS TAB */}
                  <AnimatePresence mode="wait">
                    {activeTab === "details" && (
                      <motion.div
                        key="details"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-6"
                      >
                        {/* 1. Header Badges & Quick Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="border border-border rounded-xl p-3.5 bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wide block">Gender Preference</span>
                            <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 capitalize">
                              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                              {selectedProperty.propGender || "Girls Only"}
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 italic">Preference rules apply</span>
                          </div>

                          <div className="border border-border rounded-xl p-3.5 bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wide block">Property Tier</span>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                              {selectedProperty.propTier || "Mid"} Range
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 italic">Quality standard classification</span>
                          </div>

                          <div className="border border-border rounded-xl p-3.5 bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wide block">Trust Score</span>
                            <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span>IQ {selectedProperty.iqScore || 94}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 italic">Compliance rating index</span>
                          </div>

                          <div className="border border-border rounded-xl p-3.5 bg-muted/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wide block">Food/Catering</span>
                            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                              {selectedProperty.pgMatched?.foodType || "Veg Only"}
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 italic">{selectedProperty.pgMatched?.mealsIncluded || "3 Meals/ Day"}</span>
                          </div>
                        </div>

                        {/* 2. Room Sharing Availability & Pricing Matrix */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                            <Bed className="h-4 w-4 text-warning" />
                            <span>Room Types & Bed Vacancies</span>
                          </h4>

                          <div className="border border-border rounded-xl overflow-hidden bg-muted/5 divide-y divide-border">
                            {/* Header */}
                            <div className="grid grid-cols-4 bg-muted/15 px-4 py-2 text-[10px] uppercase font-black text-muted-foreground tracking-wider">
                              <div>Sharing Option</div>
                              <div className="text-center">Monthly Price</div>
                              <div className="text-center">Beds Occupied</div>
                              <div className="text-right">Availability Status</div>
                            </div>

                            {/* Row for single room type */}
                            {(() => {
                              const propRooms = rooms.filter((r) => r.propertyId === selectedProperty.id);
                              
                              // Helper to generate room type row
                              const renderRoomRow = (type: "single" | "double" | "triple" | "studio", label: string) => {
                                const matchedRooms = propRooms.filter((r) => r.type === type);
                                const totalBeds = matchedRooms.reduce((sum, r) => sum + r.bedsTotal, 0);
                                const occupiedBeds = matchedRooms.reduce((sum, r) => sum + r.bedsOccupied, 0);
                                const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
                                
                                const roomPrice = matchedRooms[0]?.currentPrice || 0;
                                const price = selectedProperty.pgMatched?.prices?.[type] || roomPrice;
                                
                                const isOffered = totalBeds > 0 || (
                                  selectedProperty.pgMatched?.prices && 
                                  type in selectedProperty.pgMatched.prices && 
                                  selectedProperty.pgMatched.prices[type] > 0
                                );

                                return (
                                  <div 
                                    key={type} 
                                    className={`grid grid-cols-4 px-4 py-3 text-xs items-center hover:bg-muted/10 transition-colors ${
                                      !isOffered ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/10" : ""
                                    }`}
                                  >
                                    <div className={`font-bold capitalize ${!isOffered ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>
                                      {label}
                                    </div>
                                    <div className={`text-center font-mono ${!isOffered ? "text-slate-400 dark:text-slate-500 font-medium" : "font-extrabold text-slate-900 dark:text-slate-100"}`}>
                                      {isOffered && price > 0 ? `₹${price.toLocaleString()}/mo` : "N/A"}
                                    </div>
                                    <div className="text-center font-bold text-muted-foreground font-mono">
                                      {totalBeds > 0 ? `${occupiedBeds} / ${totalBeds} Beds` : "0 / 0 Beds"}
                                    </div>
                                    <div className="text-right">
                                      {isOffered ? (
                                        totalBeds > 0 ? (
                                          vacantBeds > 0 ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                                              {vacantBeds} Available
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-100 dark:border-rose-900/20">
                                              Fully Occupied
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground/60 italic">Inquire Price</span>
                                        )
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200 dark:border-slate-700/30">
                                          Not Available
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              };

                              const rows = [
                                renderRoomRow("single", "Single Sharing"),
                                renderRoomRow("double", "Double Sharing"),
                                renderRoomRow("triple", "Triple Sharing"),
                                renderRoomRow("studio", "Studio / Premium"),
                              ].filter(Boolean);

                              return rows.length > 0 ? rows : (
                                <div className="p-4 text-center text-xs text-muted-foreground italic">
                                  No room types defined for this property.
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* 3. Description & Localities */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">About this property</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border">
                            {selectedProperty.pgMatched?.vibe || selectedProperty.description || "Premium co-living facility designed for young professionals. High comfort, regular cleaning, healthy home-style meals, and a vibrant community."}
                          </p>
                          <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border/50 text-muted-foreground flex items-center gap-1.5">
                            <Compass className="h-4 w-4 text-warning shrink-0" />
                            <span>
                              <strong className="text-slate-700 dark:text-slate-300">USP/Location detail:</strong> {selectedProperty.pgMatched?.usp || "Located in the heart of Koramangala"}
                            </span>
                          </div>
                        </div>

                        {/* 4. Terms, Catering, and Rules Grids */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Terms & Policies */}
                          <div className="border border-border rounded-xl p-4 bg-muted/5 space-y-3">
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                              <Shield className="h-4 w-4 text-warning" />
                              <span>Lease & Curfew Policies</span>
                            </h4>
                            <div className="text-xs space-y-2.5 text-slate-600 dark:text-slate-400">
                              <div className="flex justify-between border-b border-border/40 pb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Security Deposit:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono capitalize">
                                  {selectedProperty.pgMatched?.deposit || "1 Month Rent"}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border/40 pb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Minimum Contract:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                  {selectedProperty.pgMatched?.minStay || "3 Months"}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border/40 pb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Gate Curfew:</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {selectedProperty.pgMatched?.rules || "No curfew restrictions"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Property Security:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                                  {selectedProperty.pgMatched?.safety?.join(", ") || "CCTV, Guard"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Services & Utilities */}
                          <div className="border border-border rounded-xl p-4 bg-muted/5 space-y-3">
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                              <Activity className="h-4 w-4 text-warning" />
                              <span>Services & Comforts</span>
                            </h4>
                            <div className="text-xs space-y-2.5 text-slate-600 dark:text-slate-400">
                              <div className="flex justify-between border-b border-border/40 pb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Housekeeping:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {selectedProperty.pgMatched?.cleaning || "Every Alternate Day"}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border/40 pb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Utilities Bill:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {selectedProperty.pgMatched?.utilities || "All Inclusive"}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border/40 pb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Noise Level:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                                  {selectedProperty.pgMatched?.noise || "Low"} Noise
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Furnishing:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]" title={selectedProperty.pgMatched?.furnishing}>
                                  {selectedProperty.pgMatched?.furnishing || "Fully Furnished"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5. Amenities Pill List */}
                        <div className="space-y-2.5 border border-border rounded-xl p-4 bg-muted/5">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Infrastructure & Amenities</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(selectedProperty.pgMatched?.amenities || selectedProperty.amenities || ["WiFi", "Laundry Area", "Power Backup", "Elevator"]).map((a: string) => (
                              <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-background text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs border-border/80">
                                <Check className="h-3.5 w-3.5 text-warning shrink-0" />
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* OWNER TAB */}
                    {activeTab === "owner" && (
                      <motion.div
                        key="owner"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center gap-4 bg-warning/5 border border-warning/15 rounded-xl p-4">
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-warning to-amber-400 flex items-center justify-center text-white font-display font-bold text-xl shadow-md shrink-0">
                            {owner.name?.charAt(0)?.toUpperCase() || "O"}
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Portfolio Owner</div>
                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{owner.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warning font-mono bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full uppercase">
                                {(owner as any).tier || "Priority"} Tier
                              </span>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <span className="text-[10px] text-muted-foreground">Joined {(owner as any).joinedAt || "2024-08-01"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border border-border rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Contact Profiles</h4>
                            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <span className="font-mono select-all">{(owner as any).email || "owner@gharpayy.com"}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <span className="font-mono">{owner.phone || "+91 —"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border border-border rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Compliance Record</h4>
                            <div className="space-y-2.5 text-xs">
                              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                <span className="font-semibold">Trust Verification: Approved</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-muted-foreground">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>Account Status: Active</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* LANDMARKS TAB */}
                    {activeTab === "landmarks" && (
                      <motion.div
                        key="landmarks"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-4"
                      >
                        <p className="text-xs text-muted-foreground">
                          Landmarks verified by the Tour Operations and Sales mapping systems:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {getLandmarks(selectedProperty).map((l, idx) => (
                            <div key={idx} className="border border-border rounded-xl p-3.5 flex items-start justify-between bg-card hover:bg-muted/10 transition-colors group">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${landmarkTypeColors[l.type] || ""}`}>
                                  {l.type}
                                </span>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug mt-1">
                                  {l.name}
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <div className="text-xs font-extrabold text-warning font-mono">{l.distance}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{l.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

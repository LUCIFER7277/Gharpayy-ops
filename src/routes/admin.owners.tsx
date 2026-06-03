import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AdminShell } from "@/admin/components/AdminShell";
import { useApp } from "@/lib/store";
import { useAuthUser } from "@/lib/auth-store";
import { api } from "@/lib/api/client";
import { PGS } from "@/supply-hub/data/pgs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, User, Mail, Phone, Search, Filter,
  ExternalLink, Copy, MessageSquare, ChevronDown, ChevronUp,
  Layers, Table, LogIn, Award, Sparkles, Percent, Activity, ArrowRight
} from "lucide-react";

export const Route = createFileRoute("/admin/owners")({
  beforeLoad: () => {
    const role = useAuthUser.getState().user?.role;
    if (role !== "super_admin") throw redirect({ to: "/" });
  },
  component: AdminOwners,
});

function AdminOwners() {
  const { properties, leads } = useApp();
  const [viewMode, setViewMode] = useState<"directory" | "table">("directory");
  const [search, setSearch] = useState("");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedTier, setSelectedTier] = useState("All");
  const [selectedContact, setSelectedContact] = useState("All");
  const [selectedArea, setSelectedArea] = useState("All");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [impersonatingEmail, setImpersonatingEmail] = useState<string | null>(null);

  // Fetch properties from MongoDB on mount to hydrate store
  useEffect(() => {
    let active = true;
    api.properties.list()
      .then((data) => {
        if (active) {
          useApp.setState({ properties: data });
        }
      })
      .catch((err) => {
        console.warn("[AdminOwners] failed to fetch properties:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Group properties by unique manager contact details
  const managerGroups = useMemo(() => {
    const groups: Record<string, {
      name: string;
      phone: string;
      email: string;
      properties: any[];
      areas: string[];
      genders: string[];
      tiers: string[];
      index: number;
    }> = {};

    const getManagerKey = (name: string, phone: string) => {
      return `${(name || "Unknown").trim().toLowerCase()}::${(phone || "NO_CONTACT").trim().toLowerCase()}`;
    };

    // Build the stable ordered list of unique keys matching the backend order of PGS
    const uniqueKeys: string[] = [];
    PGS.forEach((pg) => {
      let mName = (pg.manager?.name || "").trim();
      let mPhone = (pg.manager?.phone || "").trim();
      if (!mName && !mPhone) {
        mName = (pg.owner?.name || "").trim();
        mPhone = (pg.owner?.phone || "").trim();
      }
      if (!mName) mName = "Unknown";
      if (!mPhone) mPhone = "NO_CONTACT";
      const key = `${mName.toLowerCase()}::${mPhone.toLowerCase()}`;
      if (!uniqueKeys.includes(key)) {
        uniqueKeys.push(key);
      }
    });

    properties.forEach((p) => {
      const pgMatched = PGS.find((x) => x.id === p.id || x.name === p.name || x.actualName === p.name);
      
      let mName = "";
      let mPhone = "";
      let mEmail = "";
      let pgGender = (p as any).genderCategory || "Co-live";
      let pgTier = (p as any).tier || "Mid";
      let pgActualName = p.name;
      let pgPrices = { min: p.pricePerBed || 12000, max: p.pricePerBed || 12000 };
      let pgMaps = "";
      let pgIq = 85;

      if (pgMatched) {
        mName = (pgMatched.manager?.name || "").trim();
        mPhone = (pgMatched.manager?.phone || "").trim();
        if (!mName && !mPhone) {
          mName = (pgMatched.owner?.name || "").trim();
          mPhone = (pgMatched.owner?.phone || "").trim();
        }
        pgGender = pgMatched.gender;
        pgTier = pgMatched.tier;
        pgActualName = pgMatched.actualName;
        pgPrices = pgMatched.prices;
        pgMaps = pgMatched.mapsLink;
        pgIq = pgMatched.iq;
      } else {
        // Legacy mock properties
        if (p.id === "p-koramangala-1" || p.name.includes("Tranquil Nest")) {
          mName = "Rakesh Sharma";
          mPhone = "+919876543210";
          mEmail = "rakesh@propertyplay.com";
          pgGender = "Co-live";
          pgTier = "Premium";
        } else if (p.id === "p-indiranagar-1" || p.name.includes("Meera Oasis")) {
          mName = "Meera Iyer";
          mPhone = "+919812345678";
          mEmail = "meera@propertyplay.com";
          pgGender = "Girls";
          pgTier = "Premium";
        } else if (p.id === "p-hsr-1" || p.name.includes("HSR Elite")) {
          mName = "Ankit Verma";
          mPhone = "+919900112233";
          mEmail = "ankit@propertyplay.com";
          pgGender = "Boys";
          pgTier = "Mid";
        } else if (p.id === "p-whitefield-1" || p.name.includes("Whitefield Manor")) {
          mName = "Deepa Krishnan";
          mPhone = "+919876501122";
          mEmail = "deepa@propertyplay.com";
          pgGender = "Co-live";
          pgTier = "Premium";
        }
      }

      if (!mName) mName = (p as any).ownerName || "Unknown";
      if (!mPhone) mPhone = "NO_CONTACT";

      const key = getManagerKey(mName, mPhone);
      
      let idx = uniqueKeys.indexOf(key) + 1;
      if (idx === 0) {
        idx = uniqueKeys.length + Object.keys(groups).length + 1;
      }

      if (!mEmail) {
        // Legacy or Seeded Email
        if (mName === "Rakesh Sharma" || mEmail === "rakesh@propertyplay.com") mEmail = "rakesh@propertyplay.com";
        else if (mName === "Meera Iyer" || mEmail === "meera@propertyplay.com") mEmail = "meera@propertyplay.com";
        else if (mName === "Ankit Verma" || mEmail === "ankit@propertyplay.com") mEmail = "ankit@propertyplay.com";
        else if (mName === "Deepa Krishnan" || mEmail === "deepa@propertyplay.com") mEmail = "deepa@propertyplay.com";
        else {
          const cleanName = mName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanPhone = mPhone.replace(/[^0-9]/g, "");
          if (cleanName && !["nil", "unknown", "-"].includes(cleanName)) {
            mEmail = `${cleanName}_${cleanPhone || idx}@gharpayy.com`;
          } else if (cleanPhone) {
            mEmail = `owner_${cleanPhone}@gharpayy.com`;
          } else {
            mEmail = `owner_unknown_${idx}@gharpayy.com`;
          }
        }
      }

      if (!groups[key]) {
        groups[key] = {
          name: mName,
          phone: mPhone,
          email: mEmail,
          properties: [],
          areas: [],
          genders: [],
          tiers: [],
          index: idx,
        };
      }

      const g = groups[key];
      g.properties.push({
        ...p,
        actualName: pgActualName,
        gender: pgGender,
        tier: pgTier,
        prices: pgPrices,
        mapsLink: pgMaps,
        iq: pgIq,
      });

      if (p.area && !g.areas.includes(p.area)) g.areas.push(p.area);
      if (pgGender && !g.genders.includes(pgGender)) g.genders.push(pgGender);
      if (pgTier && !g.tiers.includes(pgTier)) g.tiers.push(pgTier);
    });

    return Object.values(groups).sort((a, b) => a.index - b.index);
  }, [properties]);

  // Derived Stats
  const totalProperties = properties.length;
  const totalManagers = managerGroups.length;
  const propertiesWithContact = useMemo(() => {
    return properties.filter((p) => {
      const pgMatched = PGS.find((x) => x.id === p.id || x.name === p.name || x.actualName === p.name);
      if (pgMatched) {
        const phone = (pgMatched.manager?.phone || pgMatched.owner?.phone || "").trim();
        return phone && phone !== "NO_CONTACT";
      }
      return ["p-koramangala-1", "p-indiranagar-1", "p-hsr-1", "p-whitefield-1"].includes(p.id);
    }).length;
  }, [properties]);

  // Unique Areas list for filtering
  const allAreas = useMemo(() => {
    const areas = new Set<string>();
    managerGroups.forEach((g) => g.areas.forEach((a) => a && areas.add(a)));
    return Array.from(areas).sort();
  }, [managerGroups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return managerGroups.filter((g) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const matchesName = g.name.toLowerCase().includes(query);
        const matchesPhone = g.phone.toLowerCase().includes(query);
        const matchesEmail = g.email.toLowerCase().includes(query);
        const matchesProp = g.properties.some(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query) ||
            p.actualName.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesProp) return false;
      }

      if (selectedGender !== "All" && !g.genders.includes(selectedGender)) return false;
      if (selectedTier !== "All" && !g.tiers.includes(selectedTier)) return false;
      if (selectedArea !== "All" && !g.areas.includes(selectedArea)) return false;

      if (selectedContact !== "All") {
        const hasContact = g.phone && g.phone !== "NO_CONTACT";
        if (selectedContact === "With Contact" && !hasContact) return false;
        if (selectedContact === "No Contact" && hasContact) return false;
      }

      return true;
    });
  }, [managerGroups, search, selectedGender, selectedTier, selectedContact, selectedArea]);

  // Impersonation Login helper
  const impersonate = async (email: string) => {
    setImpersonatingEmail(email);
    try {
      const r = await api.login(email, "Password123");
      const setUser = useAuthUser.getState().setUser;
      setUser(r.user);
      toast.success(`Successfully logged in as ${r.user.fullName || r.user.username}`);
      
      setTimeout(() => {
        window.location.href = "/owner/inventory";
      }, 300);
    } catch (err) {
      toast.error(`Login failed: ${(err as Error).message}`);
    } finally {
      setImpersonatingEmail(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Expand / Collapse all
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => {
      next[`${g.name.toLowerCase()}::${g.phone.toLowerCase()}`] = true;
    });
    setExpandedGroups(next);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Original list table stats logic
  const originalStats = useMemo(() => {
    return properties.map((p) => {
      const propLeads = leads.filter((l) => l.preferredArea === p.area || l.propertyName === p.name);
      const activeVisits = propLeads.filter((l) => l.stage === "on-tour" || l.stage === "tour-scheduled").length;
      const bookedThisMonth = propLeads.filter((l) => l.stage === "booked").length;
      return {
        id: p.id,
        name: p.name,
        area: p.area,
        ownerName: (p as any).ownerName ?? (p as any).contactName ?? "—",
        vacantBeds: p.vacantBeds,
        totalBeds: p.totalBeds,
        totalLeads: propLeads.length,
        activeVisits,
        bookedThisMonth,
      };
    });
  }, [properties, leads]);

  return (
    <AdminShell title="Master Owner Console" sub={`${totalProperties} properties · full owner directory`}>
      <div className="space-y-6">
        
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group rounded-xl border border-border/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Total Properties</span>
              <div className="text-3xl font-extrabold font-display mt-1 text-slate-800 dark:text-slate-100 flex items-baseline gap-1">
                {totalProperties}
                <span className="text-xs font-normal text-emerald-500 animate-pulse">●</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <Sparkles className="h-3 w-3" /> Mapped in CRM Database
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="group rounded-xl border border-border/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Total Seeded Managers</span>
              <div className="text-3xl font-extrabold font-display mt-1 text-slate-800 dark:text-slate-100">{totalManagers}</div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                <Award className="h-3 w-3" /> Deterministic Login Profiles
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <User className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <div className="group rounded-xl border border-border/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex-1 mr-4">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Properties with Contact</span>
              <div className="text-3xl font-extrabold font-display mt-1 text-slate-800 dark:text-slate-100 flex items-baseline gap-1.5">
                {propertiesWithContact}
                <span className="text-xs text-muted-foreground font-normal">/ {totalProperties}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                  style={{ width: `${(propertiesWithContact / totalProperties) * 100}%` }}
                />
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* View Toggle and Filter Control Center */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search owner, phone, email, properties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-full bg-muted/40 border border-input rounded-lg text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* View Mode & Expand-Collapse Toggles */}
            <div className="flex items-center gap-2">
              {viewMode === "directory" && (
                <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/30 mr-2">
                  <button 
                    onClick={expandAll} 
                    className="text-[10px] font-bold uppercase px-2 py-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Expand All
                  </button>
                  <span className="text-muted-foreground/30">|</span>
                  <button 
                    onClick={collapseAll} 
                    className="text-[10px] font-bold uppercase px-2 py-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
              )}

              <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
                <button
                  onClick={() => setViewMode("directory")}
                  className={`flex items-center gap-1 text-[11px] px-3 py-1 rounded-md transition-all font-semibold ${
                    viewMode === "directory"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" /> Directory
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1 text-[11px] px-3 py-1 rounded-md transition-all font-semibold ${
                    viewMode === "table"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Table className="h-3.5 w-3.5" /> Property List
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          {viewMode === "directory" && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-muted-foreground">Filters:</span>
              </div>

              {/* Area Filter */}
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 py-1 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="All">All Areas</option>
                {allAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>

              {/* Gender Filter */}
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 py-1 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="All">All Gender Types</option>
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Co-live">Co-live</option>
              </select>

              {/* Tier Filter */}
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 py-1 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="All">All Tiers</option>
                <option value="Premium">Premium</option>
                <option value="Mid">Mid</option>
                <option value="Budget">Budget</option>
              </select>

              {/* Contact Status Filter */}
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 py-1 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="All">All Contact Statuses</option>
                <option value="With Contact">With Contact</option>
                <option value="No Contact">No Contact</option>
              </select>

              {/* Active Pills Summary */}
              {(selectedGender !== "All" || selectedTier !== "All" || selectedContact !== "All" || selectedArea !== "All" || search) && (
                <button
                  onClick={() => {
                    setSelectedGender("All");
                    setSelectedTier("All");
                    setSelectedContact("All");
                    setSelectedArea("All");
                    setSearch("");
                  }}
                  className="ml-auto text-[10px] text-accent hover:underline font-bold uppercase"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Directory View Mode */}
        {viewMode === "directory" ? (
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground bg-card">
                No managers or contacts match your filters.
              </div>
            ) : (
              filteredGroups.map((g) => {
                const groupKey = `${g.name.toLowerCase()}::${g.phone.toLowerCase()}`;
                const isExpanded = !!expandedGroups[groupKey];
                const hasContact = g.phone && g.phone !== "NO_CONTACT";

                // Compute manager performance tier
                const avgIQ = g.properties.length > 0 
                  ? Math.round(g.properties.reduce((sum, p) => sum + (p.iq || 85), 0) / g.properties.length)
                  : 85;
                const totalBeds = g.properties.reduce((sum, p) => sum + (p.totalBeds || 0), 0);
                const totalVacant = g.properties.reduce((sum, p) => sum + (p.vacantBeds || 0), 0);
                const occupancyRate = totalBeds > 0 ? Math.round(((totalBeds - totalVacant) / totalBeds) * 100) : 0;

                const partnerTier = g.properties.length >= 5 || avgIQ >= 90
                  ? { label: "Elite Partner", styles: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30" }
                  : g.properties.length >= 2
                  ? { label: "Premium Provider", styles: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30" }
                  : { label: "Standard Partner", styles: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30" };

                return (
                  <div 
                    key={groupKey}
                    className={`rounded-xl border transition-all duration-300 overflow-hidden bg-card/85 backdrop-blur-md shadow-xs ${
                      isExpanded 
                        ? "border-warning/50 ring-1 ring-warning/20 shadow-md translate-x-0.5" 
                        : "border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                    }`}
                  >
                    {/* Card Header Accordion Trigger */}
                    <div 
                      onClick={() => toggleGroup(groupKey)}
                      className="px-5 py-4 cursor-pointer flex flex-wrap items-center justify-between gap-4 select-none"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                            #{g.index}
                          </span>
                          <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {g.name}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${partnerTier.styles}`}>
                            {partnerTier.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span>{g.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span>{g.email}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {g.properties.map((p) => {
                            const genderColor = 
                              p.gender === "Boys" ? "bg-blue-50/70 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40" : 
                              p.gender === "Girls" ? "bg-rose-50/70 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40" : 
                              "bg-amber-50/70 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40";
                            return (
                              <span 
                                key={p.id} 
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${genderColor}`}
                              >
                                {p.name} {p.actualName && p.actualName !== p.name && (
                                  <span className="text-[9px] opacity-75 font-normal ml-1">({p.actualName})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Header Metrics & Collapse Icon */}
                      <div className="flex items-center gap-4 ml-auto sm:ml-0">
                        <div className="text-right hidden md:block border-l pl-4 border-border/80">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Properties</div>
                          <div className="text-sm font-bold font-mono text-warning mt-0.5">{g.properties.length}</div>
                        </div>

                        <div className="text-right hidden sm:block border-l pl-4 border-border/80">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Avg IQ</div>
                          <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{avgIQ}</div>
                        </div>

                        <div className="text-right hidden sm:block border-l pl-4 border-border/80">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Occupancy</div>
                          <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{occupancyRate}%</div>
                        </div>

                        {/* Impersonate Quick Action */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await impersonate(g.email);
                          }}
                          disabled={impersonatingEmail !== null}
                          className="inline-flex items-center gap-1.5 border border-warning/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-warning hover:text-white disabled:opacity-50 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {impersonatingEmail === g.email ? "Logging in..." : "Login as Owner"}
                        </button>

                        <div className="h-7 w-7 rounded-lg border border-border hover:bg-muted/40 flex items-center justify-center text-muted-foreground transition-colors shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Accordion Panel (Framer Motion) */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border bg-slate-50/50 dark:bg-slate-900/10 p-5 space-y-5">
                            
                            {/* Manager Profile Quick Copy Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card border border-border/80 p-4 rounded-xl text-xs shadow-xs">
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Credentials Detail</span>
                                <div className="flex items-center justify-between border border-border bg-muted/40 px-3 py-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors rounded-lg">
                                  <span className="font-mono truncate mr-2 select-all text-slate-800 dark:text-slate-200">{g.email}</span>
                                  <button 
                                    onClick={() => copyToClipboard(g.email, "Owner email")}
                                    className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded hover:bg-muted"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between border border-border bg-muted/40 px-3 py-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors rounded-lg">
                                  <span className="font-mono select-all text-slate-800 dark:text-slate-200">PASSWORD: Password123</span>
                                  <button 
                                    onClick={() => copyToClipboard("Password123", "Owner password")}
                                    className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded hover:bg-muted"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2 md:pt-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Managed Areas</span>
                                <div className="flex flex-wrap gap-1">
                                  {g.areas.map((a) => (
                                    <span key={a} className="bg-muted px-2.5 py-0.5 rounded text-[10px] font-semibold border text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700/50">
                                      {a}
                                    </span>
                                  ))}
                                  {g.areas.length === 0 && <span className="text-muted-foreground font-mono">No Areas Mapped</span>}
                                </div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block pt-1">Managed Genders</span>
                                <div className="flex flex-wrap gap-1">
                                  {g.genders.map((gen) => (
                                    <span key={gen} className="bg-blue-50/70 text-blue-700 px-2.5 py-0.5 rounded text-[10px] font-semibold border border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30">
                                      {gen}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col justify-between pt-2 md:pt-0">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Quick Contact Actions</span>
                                  <div className="flex gap-2 mt-1.5">
                                    {hasContact && (
                                      <>
                                        <button 
                                          onClick={() => copyToClipboard(g.phone, "Phone number")}
                                          className="inline-flex items-center justify-center gap-1 border border-border bg-card hover:bg-muted font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-1 shadow-xs hover:border-slate-300 active:scale-95"
                                        >
                                          <Copy className="h-3.5 w-3.5 shrink-0" /> Copy Phone
                                        </button>
                                        <a 
                                          href={`https://wa.me/${g.phone.replace(/[^0-9]/g, "")}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-1 shadow-xs active:scale-95 text-center"
                                        >
                                          <MessageSquare className="h-3.5 w-3.5 shrink-0" /> WhatsApp
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground/60 italic mt-3 leading-snug">
                                  Seeded profile active in main users collection. Authenticated with standard JWT session token.
                                </div>
                              </div>
                            </div>

                            {/* Managed Properties Accordion Grid List */}
                            <div className="space-y-3">
                              <div className="text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-warning" />
                                <span>Managed Properties ({g.properties.length})</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {g.properties.map((p) => {
                                  const basePrice = p.pricePerBed || 12000;
                                  const minPrice = p.prices ? p.prices.min : basePrice;
                                  const maxPrice = p.prices ? p.prices.max : basePrice;
                                  const priceRangeStr = minPrice === maxPrice 
                                    ? `₹${minPrice.toLocaleString()}` 
                                    : `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`;

                                  // Beds occupancy calculations
                                  const bedsTotal = p.totalBeds || 20;
                                  const bedsVacant = p.vacantBeds || 0;
                                  const bedsOccupied = Math.max(0, bedsTotal - bedsVacant);
                                  const fillPercent = bedsTotal > 0 ? Math.round((bedsOccupied / bedsTotal) * 100) : 0;

                                  return (
                                    <div 
                                      key={p.id}
                                      className="group/card border border-border/80 bg-card p-4.5 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all duration-300 space-y-3.5"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover/card:text-warning transition-colors">
                                            {p.name}
                                          </h4>
                                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block leading-none">
                                            ID: {p.id} | Actual: {p.actualName || p.name}
                                          </span>
                                        </div>
                                        <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 shadow-2xs">
                                          IQ {p.iq || 85}
                                        </span>
                                      </div>

                                      {/* Occupancy Indicator Bar */}
                                      <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-muted-foreground uppercase font-bold tracking-wider">Occupancy Rate</span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{fillPercent}% ({bedsOccupied}/{bedsTotal} beds filled)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/30">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              fillPercent >= 80 ? "bg-emerald-500" : fillPercent >= 40 ? "bg-amber-500" : "bg-rose-500"
                                            }`}
                                            style={{ width: `${fillPercent}%` }}
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1">
                                        <div>
                                          <span className="font-medium text-foreground dark:text-slate-300">Area:</span> {p.area}
                                        </div>
                                        <div>
                                          <span className="font-medium text-foreground dark:text-slate-300">Gender:</span> {p.gender}
                                        </div>
                                        <div>
                                          <span className="font-medium text-foreground dark:text-slate-300">Tier:</span> {p.tier}
                                        </div>
                                        <div>
                                          <span className="font-medium text-foreground dark:text-slate-300">Price:</span> {priceRangeStr}
                                        </div>
                                        
                                        <div className="col-span-2 flex items-center justify-between border-t border-border/40 pt-2.5 mt-1.5">
                                          <span className="text-[10px] text-muted-foreground/80 font-mono">MAPS LINK & CRM DETAILS</span>
                                          
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {p.mapsLink && (
                                              <a 
                                                href={p.mapsLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-muted-foreground hover:text-foreground shrink-0 border p-1 rounded-lg hover:bg-muted transition-colors"
                                                title="View Map Link"
                                              >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                              </a>
                                            )}
                                            <Link
                                              to="/admin/leads"
                                              search={{ area: p.area }}
                                              className="text-accent hover:underline font-bold text-xs flex items-center gap-0.5"
                                            >
                                              View Leads <ArrowRight className="h-3 w-3" />
                                            </Link>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Original Table View Mode */
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b">
                  <tr className="text-left font-semibold text-slate-700">
                    <th className="p-3">Property</th>
                    <th className="p-3">Area</th>
                    <th className="p-3">Owner / Manager</th>
                    <th className="p-3 text-right">Beds</th>
                    <th className="p-3 text-right">Vacant</th>
                    <th className="p-3 text-right">Leads</th>
                    <th className="p-3 text-right">Active Visits</th>
                    <th className="p-3 text-right">Booked (Mo)</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {originalStats.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-slate-900">{s.name}</td>
                      <td className="p-3 text-muted-foreground">{s.area}</td>
                      <td className="p-3 font-medium">{s.ownerName}</td>
                      <td className="p-3 text-right font-mono">{s.totalBeds}</td>
                      <td className="p-3 text-right font-mono">{s.vacantBeds}</td>
                      <td className="p-3 text-right font-mono">{s.totalLeads}</td>
                      <td className="p-3 text-right font-mono">{s.activeVisits}</td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-bold">{s.bookedThisMonth}</td>
                      <td className="p-3">
                        <Link
                          to="/admin/leads"
                          search={{ area: s.area }}
                          className="text-accent underline hover:text-accent/80 font-bold"
                        >
                          View Leads
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!originalStats.length && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        No properties loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}

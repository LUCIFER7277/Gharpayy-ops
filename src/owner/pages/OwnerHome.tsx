import { useMemo, useState, useEffect } from 'react';
import { useOwner } from '@/owner/owner-context';
import { Link } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { RoomStatusKind } from '@/owner/types';
import {
  Building2, Lock, Inbox, Clock, AlertTriangle,
  User, Phone, ArrowRight, Bell, BellOff, ChevronRight,
  XCircle, Users, CalendarCheck, MessageSquare, Sparkles,
  Trophy, CheckCircle2, BarChart2, Camera, ShieldCheck,
  ChevronUp, ChevronDown, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNowStrict } from 'date-fns';

// ── helpers ───────────────────────────────────────────────────────────────────
function roomLabel(roomId: string) {
  const n = parseInt(roomId.match(/(\d+)/)?.[0] || '1', 10);
  return `Room ${100 + n}`;
}

function timeAgo(iso: string) {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export function OwnerHome() {
  const {
    currentOwnerId, setCurrentOwnerId, owners,
    properties, rooms, roomStatuses, blocks, tenants, messages, insights,
    updateRoomStatus, updateRoomSharing, decideBlock, markMessageRead, complianceFor, toggleDedicated,
    addRoom
  } = useOwner();

  // inline form edit tracking
  const [editedRooms, setEditedRooms] = useState<Record<string, {
    kind: RoomStatusKind;
    actualRent: string;
    expectedRent: string;
    lowestAcceptableRent: string;
    notes: string;
    vacatingDate: string;
  }>>({});

  const owner = currentOwnerId ? (owners.find((o) => o.id === currentOwnerId) ?? null) : null;

  // Show loading state while auth is resolving (currentOwnerId starts as null)
  if (!owner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono">Loading your dashboard…</p>
      </div>
    );
  }

  const compliance = complianceFor(owner.id);
  const myProps = properties.filter((p) => owner.propertyIds.includes(p.id));
  const myStatuses = roomStatuses.filter((r) => r.ownerId === owner.id);
  const myRooms = rooms.filter((r) => myProps.some((p) => p.id === r.propertyId));
  const myTenants = tenants.filter((t) => t.ownerId === owner.id);
  const myMessages = messages.filter((m) => m.ownerId === owner.id);
  const myPendingBlocks = blocks.filter((b) => b.ownerId === owner.id && b.state === 'pending');
  const insight = insights.find((i) => i.ownerId === owner.id);


  // ── Single Property Selection ──
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const activePropertyId = selectedPropertyId || myProps[0]?.id || '';
  const selectedProp = myProps.find((p) => p.id === activePropertyId) ?? myProps[0];

  // Collapsible properties state
  const [expandedProps, setExpandedProps] = useState<Record<string, boolean>>({});
  const togglePropertyExpanded = (propertyId: string) => {
    setExpandedProps((prev) => ({
      ...prev,
      [propertyId]: prev[propertyId] === false ? true : false,
    }));
  };

  // Add room dialog states
  const [addRoomFor, setAddRoomFor] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    type: 'double' as 'single' | 'double' | 'triple' | 'studio',
    bedsTotal: '2',
    price: '',
    floorPrice: '',
    actualRent: '',
  });

  const submitAddRoom = () => {
    if (!addRoomFor || !roomForm.price) {
      toast.error('Property and price required');
      return;
    }
    addRoom({
      propertyId: addRoomFor,
      type: roomForm.type,
      bedsTotal: Number(roomForm.bedsTotal) || 1,
      price: Number(roomForm.price),
      floorPrice: roomForm.floorPrice ? Number(roomForm.floorPrice) : undefined,
      actualRent: roomForm.actualRent ? Number(roomForm.actualRent) : undefined,
      expectedRent: Number(roomForm.price),
      lowestAcceptableRent: roomForm.floorPrice ? Number(roomForm.floorPrice) : undefined,
    });
    toast.success(`Room added`, { description: 'Now visible to your sales team.' });
    setRoomForm({ type: 'double', bedsTotal: '2', price: '', floorPrice: '', actualRent: '' });
    setAddRoomFor(null);
  };

  useEffect(() => {
    setSelectedRoomId('');
    setExpandedProps({});
  }, [currentOwnerId]);

  // ── Filtered data based on active property ──
  const propStatuses = myStatuses.filter((s) => s.propertyId === activePropertyId);
  const propRooms = myRooms.filter((r) => r.propertyId === activePropertyId);
  const propTenants = myTenants.filter((t) => t.propertyId === activePropertyId);
  const propMessages = myMessages.filter((m) => m.propertyId === activePropertyId);
  const propPendingBlocks = myPendingBlocks.filter((b) => b.propertyId === activePropertyId);

  // ── Stats Computations ──
  const totalRoomsCount = propStatuses.length;
  const sellableRoomsCount = propStatuses.filter((s) => !s.lockedUnsellable).length;
  const vacantSellableCount = propStatuses.filter((s) => !s.lockedUnsellable && s.kind === 'vacant').length;
  const vacancyPct = totalRoomsCount > 0 ? Math.round((vacantSellableCount / totalRoomsCount) * 100) : 0;

  const dedicatedCount = propStatuses.filter((s) => s.isDedicated).length;
  const selfManagedCount = totalRoomsCount - dedicatedCount;

  const lockedCount = propStatuses.filter((s) => s.lockedUnsellable).length;
  const pendingCount = propPendingBlocks.length;

  // ── Dropdown What Gharpayy did stats ──
  const [statsOpen, setStatsOpen] = useState(false);
  const propAllBlocks = useMemo(() => {
    return blocks.filter((b) => b.ownerId === owner.id && b.propertyId === activePropertyId);
  }, [blocks, owner.id, activePropertyId]);

  const leadsPitchedCount = insight?.leadsPitched ?? 0;
  const visitsScheduledCount = useMemo(() => {
    return Math.max(
      propMessages.filter((m) => m.kind === 'visit_scheduled').length,
      insight?.visitsDone ? insight.visitsDone + 1 : 0
    );
  }, [propMessages, insight]);
  const visitsCompletedCount = insight?.visitsDone ?? 0;
  const toursOutreachCount = leadsPitchedCount + visitsScheduledCount + visitsCompletedCount;

  const blocksRequestedCount = propAllBlocks.length;
  const blocksApprovedCount = useMemo(() => {
    return propAllBlocks.filter((b) => b.state === 'approved').length;
  }, [propAllBlocks]);
  const blocksRejectedCount = useMemo(() => {
    return propAllBlocks.filter((b) => b.state === 'rejected').length;
  }, [propAllBlocks]);

  const lastActivityLabel = useMemo(() => {
    const times: number[] = [];
    propAllBlocks.forEach((b) => times.push(new Date(b.requestedAt).getTime()));
    propMessages.forEach((m) => times.push(new Date(m.sentAt).getTime()));
    if (times.length === 0) return '—';
    const maxTime = Math.max(...times);
    return timeAgo(new Date(maxTime).toISOString());
  }, [propAllBlocks, propMessages]);

  // ── Unified Enriched Rooms for All Properties of the Owner ──
  const allRoomsEnriched = useMemo(() => {
    const enriched = myStatuses.map((s) => {
      const room = myRooms.find((r) => r.id === s.roomId);
      const pendingBlock = myPendingBlocks.find((b) => b.roomId === s.roomId);
      const upcomingTenant = myTenants.find((t) => t.roomId === s.roomId && new Date(t.moveInDate).getTime() > Date.now());

      let virtualKind: 'occupied' | 'vacating' | 'vacant' | 'blocked' | 'logged' | 'pending' = s.kind;
      if (pendingBlock) {
        virtualKind = 'pending';
      } else if (upcomingTenant) {
        virtualKind = 'logged';
      }

      const activeTenant = myTenants.find((t) => t.roomId === s.roomId && (!t.moveInDate || new Date(t.moveInDate).getTime() <= Date.now()));

      return {
        roomId: s.roomId,
        propertyId: s.propertyId,
        roomNo: roomLabel(s.roomId),
        kind: s.kind,
        virtualKind,
        isDedicated: !!s.isDedicated,
        bedsTotal: room?.bedsTotal ?? 1,
        bedsOccupied: room?.bedsOccupied ?? 0,
        type: room?.type ?? 'single',
        tenant: activeTenant ?? null,
        upcomingTenant: upcomingTenant ?? null,
        pendingBlock: pendingBlock ?? null,
        rentConfirmed: s.rentConfirmed,
        expectedRent: s.expectedRent,
        actualRent: s.actualRent,
        floorPrice: s.floorPrice,
        lowestAcceptableRent: s.lowestAcceptableRent,
        vacatingDate: s.vacatingDate,
        notes: s.notes,
        lockedUnsellable: s.lockedUnsellable,
      };
    });

    return enriched;
  }, [myStatuses, myRooms, myTenants, myPendingBlocks]);

  const markReady = (roomId: string) => {
    updateRoomStatus(roomId, { kind: 'vacant' });
    toast.success('Room marked as vacant (ready to sell)');
  };

  const todayLabel = format(new Date(), 'EEE, MMM d');

  return (
    <div className="space-y-5 pb-12">
      {/* ══════════════════════════════════════════════════════════════════════
          1. HEADER (Dropdown selector & Wisely Displayed Property Name)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 shrink-0" /> Host Control Room
          </div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
            <Building2 className="h-5 w-5 text-orange-500 shrink-0" />
            {selectedProp ? selectedProp.name : 'Your inventory'}
          </h2>
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
            {selectedProp ? `${selectedProp.area} · ${selectedProp.genderCategory || 'Co-live'}` : 'Verify supply to maximize occupancy.'}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Active Property Dropdown Switcher */}
          {myProps.length > 1 && (
            <div className="flex flex-col space-y-1">
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Active Property</Label>
              <Select value={activePropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-full sm:w-56 h-9 bg-background text-xs">
                  <SelectValue placeholder="Select Property" />
                </SelectTrigger>
                <SelectContent>
                  {myProps.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      🏢 {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Owner Profile & Tier Info Display */}
          <div className="flex flex-col space-y-1">
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Owner Profile & Tier</Label>
            <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-muted/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
              👤 {owner.name} ({owner.tier === 'priority' ? 'Gold' : owner.tier === 'standard' ? 'Silver' : 'Bronze'} Tier)
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. COMPLIANCE & TRUST BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-muted/20 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 grid place-items-center shrink-0">
              <ShieldCheck className="h-5.5 w-5.5 text-orange-500" />
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Compliance Score</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{compliance.score}/100</div>
            </div>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${compliance.score}%`,
                  background: 'linear-gradient(90deg, #F59E0B, #EF4444)'
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
              <span>Goal: Keep above 90 to secure Priority Leads Routing</span>
              <span>{compliance.mediaFreshRooms} / {totalRoomsCount} rooms verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. 4 STAT CARDS (Restructured: vacancy percentage, dedicated division)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
          label="Sellable Capacity"
          value={`${sellableRoomsCount} / ${totalRoomsCount} Rooms`}
          sub={`${vacancyPct}% vacant inventory left`}
          accent="emerald"
        />
        <StatCard
          icon={<Users className="h-4.5 w-4.5 text-blue-500" />}
          label="Supply Division"
          value={`${dedicatedCount} Dedicated`}
          sub={`${selfManagedCount} Self-Managed`}
          accent="blue"
        />
        <StatCard
          icon={<Lock className="h-4.5 w-4.5 text-destructive" />}
          label="Locked Rooms"
          value={lockedCount}
          sub={lockedCount > 0 ? 'Unverified by 11 AM' : 'All rooms sellable'}
          accent={lockedCount > 0 ? 'red' : 'none'}
        />
        <StatCard
          icon={<Inbox className="h-4.5 w-4.5 text-amber-500" />}
          label="Pending Approvals"
          value={pendingCount}
          sub="Block / visit holds"
          accent={pendingCount > 0 ? 'amber' : 'none'}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. ACTION TILES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionTile
          to="/owner/rooms"
          icon={<Building2 className="h-5 w-5" />}
          title="Manage Rooms Registry"
          sub={lockedCount > 0 ? `${lockedCount} locked — fix now` : 'All rooms verified'}
          urgent={lockedCount > 0}
        />
        <ActionTile
          to="/owner/blocks"
          icon={<Inbox className="h-5 w-5" />}
          title="Visit Block Holds"
          sub={pendingCount > 0 ? `${pendingCount} approvals pending` : 'All holds resolved'}
          success={pendingCount === 0}
        />
        <ActionTile
          to="/owner/insights"
          icon={<Camera className="h-5 w-5" />}
          title="Tours Activity Log"
          sub="Realtime client visit feed"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Dropdown Accordion: What Gharpayy did for you
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setStatsOpen(!statsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Activity className="h-4.5 w-4.5 text-orange-500 shrink-0" />
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">What Gharpayy did for you</span>
            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 dark:bg-slate-800/80 px-2 py-0.5 rounded">live · last 200 events</span>
          </div>
          <div className="text-muted-foreground font-semibold text-xs flex items-center gap-1">
            {statsOpen ? 'Hide Activity' : 'Show Activity'}
            {statsOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {statsOpen && (
          <div className="p-4 border-t border-border bg-muted/5 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Leads Pitched</div>
              <div className="text-lg font-semibold font-mono text-slate-800 dark:text-slate-100">{leadsPitchedCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Visits Scheduled</div>
              <div className="text-lg font-semibold font-mono text-slate-800 dark:text-slate-100">{visitsScheduledCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Visits Completed</div>
              <div className="text-lg font-semibold font-mono text-slate-800 dark:text-slate-100">{visitsCompletedCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Tours / Outreach</div>
              <div className="text-lg font-semibold font-mono text-slate-800 dark:text-slate-100">{toursOutreachCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Blocks Requested</div>
              <div className="text-lg font-semibold font-mono text-slate-800 dark:text-slate-100">{blocksRequestedCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Blocks Approved</div>
              <div className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400">{blocksApprovedCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-medium tracking-wider font-mono">Blocks Rejected</div>
              <div className="text-lg font-semibold font-mono text-slate-800 dark:text-slate-100">{blocksRejectedCount}</div>
            </div>
            <div className="bg-background rounded-xl border border-border/60 p-3 space-y-1.5 shadow-sm">
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Last Activity</div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mt-1">
                {lastActivityLabel}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. DEMAND PULSE (Simplified summary)
      ══════════════════════════════════════════════════════════════════════ */}
      {insight && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Demand Summary · {todayLabel}</span>
            <Link to="/owner/insights" className="text-[10px] text-orange-500 hover:underline">
              Detailed breakdown →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/30 rounded-xl p-2.5">
              <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">{insight.leadsPitched}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Leads Pitched</div>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5">
              <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">{insight.visitsDone}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Visits Completed</div>
            </div>
            <div className="bg-muted/30 rounded-xl p-2.5 text-left flex flex-col justify-center">
              <div className="text-xs font-semibold text-rose-500 truncate" title={insight.topObjection}>
                {insight.topObjection ?? 'None'}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Top Objection</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          6. GHARPAYY INBOX & VISITOR ALERTS
      ══════════════════════════════════════════════════════════════════════ */}
      {propPendingBlocks.length > 0 && (
        <section className="space-y-2">
          <SectionTitle
            icon={<Inbox className="h-4 w-4" />}
            title="Pending Supply Holds"
            badge={propPendingBlocks.length}
            badgeColor="amber"
          />
          <div className="space-y-2">
            {propPendingBlocks.map((req) => (
              <div key={req.id} className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 grid place-items-center shrink-0">
                    <Bell className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Hold request for Room {roomLabel(req.roomId)}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Lead: {req.leadName} · Requested {timeAgo(req.requestedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      decideBlock(req.id, 'rejected');
                      toast.error('Block rejected');
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => {
                      decideBlock(req.id, 'approved');
                      toast.success('Block approved');
                    }}
                  >
                    Approve Hold
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          7. ROOMS REGISTRY DIRECTORY
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionTitle
          icon={<Building2 className="h-4 w-4" />}
          title="Rooms Registry Directory"
          badge={allRoomsEnriched.length}
          right="Direct inline edit & sync"
        />

        {myProps.length === 0 ? (
          <EmptyState icon={<Building2 className="h-10 w-10 text-muted-foreground" />} message="No properties found for this owner." />
        ) : (
          <div className="space-y-4">
            {myProps.map((p) => {
              const propertyRooms = allRoomsEnriched.filter((r) => r.propertyId === p.id);
              const isExpanded = expandedProps[p.id] !== false; // default to true
              
              const totalRooms = propertyRooms.length;
              const vacantRooms = propertyRooms.filter((r) => r.kind === 'vacant').length;

              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* Property Header Banner */}
                  <div
                    onClick={() => togglePropertyExpanded(p.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/5 transition-colors cursor-pointer border-b border-border/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-orange-500/10 grid place-items-center shrink-0">
                        <Building2 className="h-5.5 w-5.5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {p.name} · {p.area}
                        </h3>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {p.id} · hub:pg · {totalRooms} rooms · {vacantRooms}/{totalRooms} vacant
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-semibold flex items-center gap-1 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        onClick={() => {
                          const vacantRoomIds = propertyRooms
                            .filter((r) => r.kind === 'vacant' && !r.isDedicated)
                            .map((r) => r.roomId);
                          if (vacantRoomIds.length === 0) {
                            toast.info('No vacant self-managed rooms to hold.');
                            return;
                          }
                          vacantRoomIds.forEach((id) => toggleDedicated(id));
                          toast.success(`Held all ${vacantRoomIds.length} vacant rooms for Gharpayy!`);
                        }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Hold all vacant
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 flex items-center gap-1"
                        onClick={() => {
                          setAddRoomFor(p.id);
                        }}
                      >
                        <span className="text-base font-normal leading-none">+</span> Add rooms
                      </Button>

                      {/* Collapse/Expand chevron indicator */}
                      <button
                        onClick={() => togglePropertyExpanded(p.id)}
                        className="p-1 hover:bg-muted/50 rounded-lg transition-colors ml-1"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4.5 w-4.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4.5 w-4.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Property Rooms Grid */}
                  {isExpanded && (
                    <div className="p-4 bg-muted/5">
                      {propertyRooms.length === 0 ? (
                        <EmptyState icon={<Building2 className="h-8 w-8 text-muted-foreground" />} message="No rooms matching this property." />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {propertyRooms.map((room) => {
                            const formVal = editedRooms[room.roomId] || {
                              kind: room.kind,
                              actualRent: room.actualRent?.toString() || '',
                              expectedRent: (room.expectedRent ?? room.rentConfirmed)?.toString() || '',
                              lowestAcceptableRent: (room.lowestAcceptableRent ?? room.floorPrice)?.toString() || '',
                              notes: room.notes || '',
                              vacatingDate: room.vacatingDate || '',
                            };

                            const setFormVal = (key: keyof typeof formVal, val: string) => {
                              setEditedRooms((prev) => ({
                                ...prev,
                                [room.roomId]: {
                                  ...formVal,
                                  [key]: val,
                                },
                              }));
                            };

                            // Determine config using the selected form kind
                            const config = STATUS_CONFIG[formVal.kind as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[room.virtualKind];

                            return (
                              <div
                                key={room.roomId}
                                className={cn(
                                  "rounded-xl border bg-card p-2 space-y-1.5 flex flex-col hover:shadow-md transition-all duration-200 overflow-hidden",
                                  room.lockedUnsellable ? "border-destructive/30 bg-destructive/2" : "border-border"
                                )}
                              >
                                {/* Card Header: Room Labels, Dedicated Toggle, Badges */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-[13px] text-slate-900 dark:text-slate-100">{room.roomNo}</div>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                      <span className="text-[9px] font-mono text-muted-foreground bg-muted dark:bg-slate-800/80 px-1 py-0.5 rounded whitespace-nowrap w-fit">
                                        {room.roomId}
                                      </span>
                                      {/* Dedicated supply tag */}
                                      <div className="flex items-center">
                                        <span
                                          className={cn(
                                            "text-[8px] font-semibold border rounded py-0.5 w-[76px] text-center inline-block shrink-0",
                                            room.isDedicated
                                              ? "bg-orange-500/10 text-orange-600 border-orange-400/20"
                                              : "bg-slate-100 text-slate-500 border-slate-200/50"
                                          )}
                                        >
                                          {room.isDedicated ? "Dedicated" : "Self-Managed"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1 items-end shrink-0">
                                    {/* Inline Status Dropdown Select */}
                                    <Select
                                      value={formVal.kind}
                                      onValueChange={(val) => setFormVal('kind', val as RoomStatusKind)}
                                    >
                                      <SelectTrigger className={cn("h-6 text-[9.5px] font-semibold px-2 py-0.5 border w-[108px] bg-background transition-colors", config.bg)}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="occupied">🔵 Occupied</SelectItem>
                                        <SelectItem value="vacating">🟡 On Notice</SelectItem>
                                        <SelectItem value="vacant">🟢 Ready to Sell</SelectItem>
                                        <SelectItem value="blocked">🔴 Blocked</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {/* Inline Sharing Dropdown Select */}
                                    <Select
                                      value={String(room.bedsTotal)}
                                      onValueChange={(val) => {
                                        const beds = Number(val);
                                        const typeMap: Record<number, 'single' | 'double' | 'triple' | 'studio'> = {
                                          1: 'single',
                                          2: 'double',
                                          3: 'triple',
                                          4: 'studio',
                                        };
                                        updateRoomSharing(room.roomId, beds, typeMap[beds]);
                                      }}
                                    >
                                      <SelectTrigger className="h-6 text-[9.5px] font-semibold px-2 py-0.5 border w-[108px] bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">🙋‍♂️ Single</SelectItem>
                                        <SelectItem value="2">👥 Double</SelectItem>
                                        <SelectItem value="3">👥 Triple</SelectItem>
                                        <SelectItem value="4">👥 Four</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Middle Row: Details and Pricing side-by-side */}
                                <div className="grid grid-cols-12 gap-1.5 items-stretch flex-1">
                                  {/* Left Column: Virtual States and Details Panel */}
                                  <div className="col-span-6 text-[10.5px] space-y-1 bg-muted/20 dark:bg-slate-900/30 rounded-lg p-1.5 flex flex-col justify-center min-h-[72px]">
                                    {/* Vacating inline inputs */}
                                    {formVal.kind === 'vacating' && (
                                      <div className="space-y-0.5">
                                        <div className="font-semibold text-orange-500 flex items-center gap-1 text-[9.5px]">
                                          <AlertTriangle className="h-3 w-3 shrink-0" />
                                          <span>Notice Given</span>
                                        </div>
                                        <div className="space-y-0.5">
                                          <Label className="text-[8px] uppercase tracking-widest text-muted-foreground font-mono">Vacating Date *</Label>
                                          <Input
                                            type="date"
                                            className="h-5.5 text-[10px] px-1.5 py-0.5 bg-background w-full max-w-[130px]"
                                            value={formVal.vacatingDate}
                                            onChange={(e) => setFormVal('vacatingDate', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Blocked inline inputs */}
                                    {formVal.kind === 'blocked' && (
                                      <div className="space-y-0.5">
                                        <div className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1 text-[9.5px]">
                                          <Lock className="h-3 w-3 shrink-0" />
                                          <span>Blocked Hold</span>
                                        </div>
                                        <div className="space-y-0.5">
                                          <Label className="text-[8px] uppercase tracking-widest text-muted-foreground font-mono">Reason</Label>
                                          <Input
                                            placeholder="Reason..."
                                            className="h-5.5 text-[10px] px-1.5 py-0.5 bg-background"
                                            value={formVal.notes}
                                            onChange={(e) => setFormVal('notes', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Normal view for Occupied */}
                                    {formVal.kind === 'occupied' && (
                                      room.tenant ? (
                                        <div className="space-y-0.5">
                                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                                            <User className="h-3 w-3 text-blue-500 shrink-0" />
                                            <span>{room.tenant.name}</span>
                                          </div>
                                          <div className="text-muted-foreground flex items-center gap-1 text-[9.5px]">
                                            <Phone className="h-2.5 w-2.5" /> {room.tenant.phone}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-0.5">
                                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            <User className="h-3 w-3 text-blue-500 shrink-0" />
                                            <span>Occupied Lease</span>
                                          </div>
                                          <div className="text-muted-foreground text-[9.5px]">
                                            Details pending sync
                                          </div>
                                        </div>
                                      )
                                    )}

                                    {/* Normal view for Vacant */}
                                    {formVal.kind === 'vacant' && !room.upcomingTenant && !room.pendingBlock && (
                                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[9.5px]">
                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                        <span>Ready to sell</span>
                                      </div>
                                    )}

                                    {/* Upcoming move-in */}
                                    {room.upcomingTenant && formVal.kind === 'vacant' && (
                                      <div className="space-y-0.5">
                                        <div className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 text-[9.5px]">
                                          <CalendarCheck className="h-3 w-3 shrink-0" />
                                          <span>Logged Move-in</span>
                                        </div>
                                        <div className="text-[9.5px] text-slate-700 dark:text-slate-300 font-medium truncate">
                                          👤 {room.upcomingTenant.name}
                                        </div>
                                        <div className="text-muted-foreground text-[8px] font-mono">
                                          {format(new Date(room.upcomingTenant.moveInDate), 'dd MMM yyyy')}
                                        </div>
                                      </div>
                                    )}

                                    {/* Pending Block Request hold */}
                                    {room.pendingBlock && formVal.kind === 'vacant' && (
                                      <div className="space-y-1">
                                        <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[9.5px]">
                                          <Clock className="h-3 w-3 shrink-0" />
                                          <span>Visit Hold Pending</span>
                                        </div>
                                        <div className="text-[9px] text-slate-600 dark:text-slate-400 truncate">
                                          For: <strong>{room.pendingBlock.leadName}</strong>
                                        </div>
                                        <div className="flex items-center gap-1 pt-0.5">
                                          <Button size="sm" variant="outline" className="h-5 text-[8.5px] px-1.5 text-destructive border-destructive/20 bg-destructive/2 hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); decideBlock(room.pendingBlock!.id, 'rejected'); toast.error('Rejected request'); }}>
                                            Reject
                                          </Button>
                                          <Button size="sm" className="h-5 text-[8.5px] px-1.5 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={(e) => { e.stopPropagation(); decideBlock(room.pendingBlock!.id, 'approved'); toast.success('Approved lock'); }}>
                                            Approve
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right Column: Pricing Matrix (Writable Inputs stacked) */}
                                  <div className="col-span-6 flex flex-col justify-center gap-1 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-1.5">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-muted-foreground font-medium text-[8px] uppercase tracking-wider">Actual</span>
                                      <Input
                                        type="number"
                                        className="h-[21px] w-[72px] text-right font-mono font-semibold text-[10px] bg-background p-1"
                                        value={formVal.actualRent}
                                        onChange={(e) => setFormVal('actualRent', e.target.value)}
                                        placeholder="—"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-orange-500 font-medium text-[8px] uppercase tracking-wider">Expected</span>
                                      <Input
                                        type="number"
                                        className="h-[21px] w-[72px] text-right font-mono font-semibold text-[10px] text-orange-500 bg-background p-1 border-orange-200"
                                        value={formVal.expectedRent}
                                        onChange={(e) => setFormVal('expectedRent', e.target.value)}
                                        placeholder="—"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-slate-500 flex items-center gap-0.5 text-[8px] uppercase tracking-wider">
                                        <Lock className="h-2 w-2" /> Min
                                      </span>
                                      <Input
                                        type="number"
                                        className="h-[21px] w-[72px] text-right font-mono font-semibold text-[10px] text-slate-500 bg-background p-1"
                                        value={formVal.lowestAcceptableRent}
                                        onChange={(e) => setFormVal('lowestAcceptableRent', e.target.value)}
                                        placeholder="—"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Action Row */}
                                <div className="flex items-center gap-1 pb-0.5 border-t border-border/30 mt-auto pt-1">
                                  {/* Secondary Context actions */}
                                  {formVal.kind === 'vacating' && (
                                    <Button size="sm" className="h-6 text-[9.5px] px-1.5 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setFormVal('kind', 'vacant'); toast.info('Changed status kind to vacant'); }}>
                                      Mark Ready
                                    </Button>
                                  )}
                                  {formVal.kind === 'blocked' && (
                                    <Button size="sm" variant="outline" className="h-6 text-[9.5px] px-1.5" onClick={() => { setFormVal('kind', 'vacant'); toast.info('Changed status kind to vacant'); }}>
                                      Unblock
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                      "h-6 text-[9.5px] w-[105px] justify-center flex items-center gap-1 shrink-0",
                                      room.isDedicated
                                        ? "border-orange-500/30 text-orange-600 bg-orange-500/5 hover:bg-orange-500/10 dark:text-orange-400"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDedicated(room.roomId);
                                      toast.success(room.isDedicated ? 'Removed from dedicated supply' : 'Room is now dedicated to Gharpayy for selling!');
                                    }}
                                    disabled={formVal.kind === 'occupied'}
                                  >
                                    <ShieldCheck className="h-3 w-3 shrink-0" />
                                    <span>{room.isDedicated ? 'Release hold' : 'Hold for Gharpayy'}</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2.5 bg-slate-900 hover:bg-slate-800 text-white ml-auto flex items-center gap-1"
                                    onClick={() => {
                                      if (formVal.kind === 'vacating' && (!formVal.vacatingDate || !formVal.expectedRent)) {
                                        toast.error('Vacating status requires date & expected rent');
                                        return;
                                      }
                                      updateRoomStatus(room.roomId, {
                                        kind: formVal.kind,
                                        actualRent: formVal.actualRent ? Number(formVal.actualRent) : undefined,
                                        expectedRent: formVal.expectedRent ? Number(formVal.expectedRent) : undefined,
                                        rentConfirmed: formVal.expectedRent ? Number(formVal.expectedRent) : undefined,
                                        lowestAcceptableRent: formVal.lowestAcceptableRent ? Number(formVal.lowestAcceptableRent) : undefined,
                                        floorPrice: formVal.lowestAcceptableRent ? Number(formVal.lowestAcceptableRent) : undefined,
                                        vacatingDate: formVal.kind === 'vacating' ? formVal.vacatingDate : undefined,
                                        notes: formVal.notes || undefined,
                                      });
                                      toast.success('Room changes saved & synced!');
                                    }}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ADD ROOM DIALOG */}
      <Dialog open={!!addRoomFor} onOpenChange={(o) => !o && setAddRoomFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add room</DialogTitle>
            <DialogDescription>{properties.find((p) => p.id === addRoomFor)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Room type</Label>
                <Select value={roomForm.type} onValueChange={(v) => setRoomForm((f) => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Beds total</Label>
                <Input type="number" value={roomForm.bedsTotal} onChange={(e) => setRoomForm((f) => ({ ...f, bedsTotal: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Actual Rent ₹</Label>
                <Input type="number" value={roomForm.actualRent} onChange={(e) => setRoomForm((f) => ({ ...f, actualRent: e.target.value }))} placeholder="Last tenant" />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Rent ₹</Label>
                <Input type="number" value={roomForm.price} onChange={(e) => setRoomForm((f) => ({ ...f, price: e.target.value }))} placeholder="Owner ask" />
              </div>
              <div className="space-y-1.5">
                <Label>Lowest Acceptable ₹</Label>
                <Input type="number" value={roomForm.floorPrice} onChange={(e) => setRoomForm((f) => ({ ...f, floorPrice: e.target.value }))} placeholder="Private" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddRoomFor(null)}>Cancel</Button>
            <Button onClick={submitAddRoom}>Add room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  occupied: { label: 'Occupied', bg: 'bg-blue-50/80 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30' },
  vacating: { label: 'On Notice', bg: 'bg-amber-50/80 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30' },
  vacant: { label: 'Ready to Sell', bg: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30' },
  blocked: { label: 'Blocked', bg: 'bg-slate-50/80 text-slate-700 border-slate-200/60 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/30' },
  logged: { label: 'Logged / Booked', bg: 'bg-purple-50/80 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/30' },
  pending: { label: 'Pending Approval', bg: 'bg-rose-50/80 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30 animate-pulse' },
};

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string;
  accent: 'emerald' | 'blue' | 'amber' | 'red' | 'none';
}) {
  const borderCls = {
    emerald: 'border-emerald-200 dark:border-emerald-800',
    blue: 'border-blue-200 dark:border-blue-800',
    amber: 'border-amber-200 dark:border-amber-800',
    red: 'border-destructive/30',
    none: 'border-border',
  }[accent];
  return (
    <div className={cn('rounded-xl border bg-card p-3.5 space-y-1.5', borderCls)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className="text-[15px] sm:text-base font-bold text-slate-800 dark:text-slate-200">{value}</div>
      <div className="text-[10px] text-muted-foreground font-medium leading-tight">{sub}</div>
    </div>
  );
}

function ActionTile({ to, icon, title, sub, urgent, success }: {
  to: string; icon: React.ReactNode; title: string; sub: string;
  urgent?: boolean; success?: boolean;
}) {
  const borderCls = urgent ? 'border-destructive/30 hover:border-destructive/60'
    : success ? 'border-emerald-200 dark:border-emerald-800'
      : 'border-border hover:border-border/80';
  return (
    <Link to={to} className={cn('block rounded-xl border bg-card p-3 hover:shadow-md transition-all active:scale-[0.98]', borderCls)}>
      <div className="flex items-center gap-2.5">
        <span className={cn(urgent ? 'text-destructive' : success ? 'text-emerald-500' : 'text-muted-foreground')}>
          {icon}
        </span>
        <div>
          <div className="font-semibold text-xs">{title}</div>
          <div className={cn('text-[10px] mt-0.5 font-medium', urgent ? 'text-destructive' : success ? 'text-emerald-600' : 'text-muted-foreground')}>
            {sub}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionTitle({ icon, title, badge, badgeColor = 'blue', right }: {
  icon: React.ReactNode; title: string; badge?: number;
  badgeColor?: 'blue' | 'amber'; right?: string;
}) {
  const badgeCls = badgeColor === 'amber'
    ? 'bg-amber-500/10 text-amber-600 border-amber-400/30'
    : 'bg-blue-500/10 text-blue-600 border-blue-400/30';
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">{title}</h2>
        {badge !== undefined && (
          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold font-mono', badgeCls)}>{badge}</span>
        )}
      </div>
      {right && <span className="text-[10px] text-muted-foreground">{right}</span>}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-2 text-muted-foreground text-center">
      <span className="opacity-25">{icon}</span>
      <p className="text-xs">{message}</p>
    </div>
  );
}

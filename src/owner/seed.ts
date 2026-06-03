import type { OwnerProfile, OwnerRoomStatus, OwnerRoomMedia, OwnerBlockRequest, OwnerInsightDaily, OwnerObjection, OwnerTenant, OwnerMessage } from './types';
import { generateRooms } from '@/myt/lib/properties-seed';
import { todayKey } from './compliance';

const now = new Date();
const iso = (offsetMin = 0) => new Date(Date.now() + offsetMin * 60_000).toISOString();

export const seedOwners: OwnerProfile[] = [
  { id: 'own-1', name: 'Rakesh Sharma',  phone: '+919876543210', propertyIds: ['p-koramangala-1'], isDedicated: true,  tier: 'priority',  joinedAt: '2024-08-01' },
  { id: 'own-2', name: 'Meera Iyer',     phone: '+919812345678', propertyIds: ['p-indiranagar-1'], isDedicated: true,  tier: 'standard',  joinedAt: '2024-09-12' },
  { id: 'own-3', name: 'Ankit Verma',    phone: '+919900112233', propertyIds: ['p-hsr-1'],         isDedicated: false, tier: 'throttled', joinedAt: '2025-01-20' },
  { id: 'own-4', name: 'Deepa Krishnan', phone: '+919876501122', propertyIds: ['p-whitefield-1'],  isDedicated: true,  tier: 'priority',  joinedAt: '2024-11-04' },
];

const ownerByProperty: Record<string, string> = {
  'p-koramangala-1': 'own-1',
  'p-indiranagar-1': 'own-2',
  'p-hsr-1': 'own-3',
  'p-whitefield-1': 'own-4',
};

// MYT properties use ids like `p1`, `p2`, ... - distribute them across the
// 4 owners so we can switch between owners on the home page and see
// genuinely different inventory.
const ownerIdsRR = ['own-1', 'own-2', 'own-3', 'own-4'];
function ownerForProperty(propertyId: string, fallbackIndex: number): string {
  if (ownerByProperty[propertyId]) return ownerByProperty[propertyId];
  // Stable mapping based on numeric suffix of property id (`p1`, `p12`, ...).
  const m = propertyId.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : fallbackIndex;
  return ownerIdsRR[n % ownerIdsRR.length];
}

function generateSeedRoomStatuses(): OwnerRoomStatus[] {
  const mytRooms = generateRooms();
  return (mytRooms || []).map((r, idx) => {
  const ownerId = ownerForProperty(r.propertyId, idx);
  const free = r.bedsTotal - r.bedsOccupied;
  const kind: OwnerRoomStatus['kind'] = free === 0 ? 'occupied' : free === r.bedsTotal ? 'vacant' : 'occupied';
  const verifiedToday = (r.id.charCodeAt(r.id.length - 1) % 3) !== 0;
  return {
    roomId: r.id,
    propertyId: r.propertyId,
    ownerId,
    kind,
    rentConfirmed: r.currentPrice,
    floorPrice: Math.round(r.currentPrice * 0.9),
    updatedAt: iso(-30),
    verifiedToday,
    lockedUnsellable: false,
    isDedicated: idx % 4 === 0,
    views: ((idx * 13) % 60) + 2,
  };
  });
}

export const seedRoomStatuses: OwnerRoomStatus[] = generateSeedRoomStatuses();

// Lazy-generate seed data after rooms are available
export function generateSeedObjections(roomStatuses: OwnerRoomStatus[]): OwnerObjection[] {
  return roomStatuses.slice(0, 8).map((r, i) => ({
  id: `obj-${i + 1}`,
  roomId: r.roomId,
  ownerId: r.ownerId,
  reason: (['price', 'location', 'price', 'amenities', 'price', 'timing', 'location', 'price'] as const)[i],
  notes: i % 2 === 0 ? 'Asked for ₹1k less' : undefined,
  loggedAt: iso(-60 * (i + 1)),
  loggedBy: 'Anil (Sales)',
  }));
}

export function generateSeedMedia(roomStatuses: OwnerRoomStatus[]): OwnerRoomMedia[] {
  return roomStatuses
  .filter((r) => r.kind === 'vacant')
  .slice(0, 6)
  .map((r) => ({
    roomId: r.roomId,
    ownerId: r.ownerId,
    photos: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
    videoUrl: 'https://example.com/room-video.mp4',
    uploadedAt: iso(-60 * 24 * 2),
    expiresAt: iso(60 * 24 * 5), // 5 days left
    }));
}

export function generateSeedBlocks(roomStatuses: OwnerRoomStatus[]): OwnerBlockRequest[] {
  return [
  {
    id: 'blk-1',
      roomId: roomStatuses[0]?.roomId ?? 'r-1',
      propertyId: roomStatuses[0]?.propertyId ?? 'p-koramangala-1',
    ownerId: 'own-1',
    leadId: 'l-101',
    leadName: 'Priya Reddy',
    intent: 'hard',
    requestedAt: iso(-8),
    expiresAt: iso(7),
    state: 'pending',
  },
  ];
}

// Exported constants for compatibility
export const seedObjections: OwnerObjection[] = generateSeedObjections(seedRoomStatuses);
export const seedMedia: OwnerRoomMedia[] = generateSeedMedia(seedRoomStatuses);
export const seedBlocks: OwnerBlockRequest[] = generateSeedBlocks(seedRoomStatuses);
export const seedInsights: OwnerInsightDaily[] = seedOwners.map((o) => ({
  ownerId: o.id,
  date: todayKey(now),
  leadsPitched: Math.round(Math.random() * 18) + 4,
  visitsDone: Math.round(Math.random() * 4),
  highIntent: Math.round(Math.random() * 3),
  topObjection: ['Price ₹1.5k high', 'Wants AC', 'Far from metro', 'Food not preferred'][Math.floor(Math.random() * 4)],
  priceMismatchSignal: Math.random() > 0.6 ? 'Asking ₹2k below median' : undefined,
}));

// ─── Tenant Seed ───────────────────────────────────────────────────────────

const TENANT_NAMES = [
  'Arjun Mehta', 'Sneha Rao', 'Vikram Singh', 'Priya Nair',
  'Rohit Gupta', 'Anjali Sharma', 'Karan Joshi', 'Divya Kumar',
  'Suresh Babu', 'Nisha Pillai',
];

export function generateSeedTenants(roomStatuses: OwnerRoomStatus[]): OwnerTenant[] {
  const occupied = roomStatuses.filter((s) => s.kind === 'occupied' || s.kind === 'vacating');
  const list = occupied.map((s, i) => ({
    id: `ten-${i + 1}`,
    roomId: s.roomId,
    propertyId: s.propertyId,
    ownerId: s.ownerId,
    name: TENANT_NAMES[i % TENANT_NAMES.length],
    phone: `+9198765${String(43200 + i).padStart(5, '0')}`,
    moveInDate: new Date(Date.now() - (90 + i * 30) * 86400000).toISOString().split('T')[0],
    noticeDate: s.kind === 'vacating' ? s.vacatingDate : undefined,
    onNoticePeriod: s.kind === 'vacating',
  }));

  // Seed a future tenant for a vacant room to simulate a Logged status
  const vacantRoom = roomStatuses.find(r => r.kind === 'vacant');
  if (vacantRoom) {
    list.push({
      id: 'ten-logged-seed',
      roomId: vacantRoom.roomId,
      propertyId: vacantRoom.propertyId,
      ownerId: vacantRoom.ownerId,
      name: 'Aditya Sen',
      phone: '+919999888877',
      moveInDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // 5 days in future
      noticeDate: undefined,
      onNoticePeriod: false,
    });
  }

  return list;
}

export const seedTenants: OwnerTenant[] = generateSeedTenants(seedRoomStatuses);

// ─── Message Seed ──────────────────────────────────────────────────────────

const isoMin = (offsetMin = 0) => new Date(Date.now() + offsetMin * 60_000).toISOString();

export function generateSeedMessages(roomStatuses: OwnerRoomStatus[]): OwnerMessage[] {
  const occupied = roomStatuses.filter((s) => s.kind === 'occupied');
  const vacant   = roomStatuses.filter((s) => s.kind === 'vacant');
  const vacating = roomStatuses.filter((s) => s.kind === 'vacating');

  const messages: OwnerMessage[] = [];

  // Visit scheduled messages
  vacant.slice(0, 3).forEach((s, i) => {
    const roomNo = `Room ${100 + parseInt(s.roomId.match(/(\d+)/)?.[0] || String(i + 1), 10)}`;
    const visitTimes = ['Tomorrow at 11:00 AM', 'Today at 3:30 PM', 'Thursday at 2:00 PM'];
    messages.push({
      id: `msg-visit-${i + 1}`,
      ownerId: s.ownerId,
      propertyId: s.propertyId,
      roomId: s.roomId,
      kind: 'visit_scheduled',
      title: 'Visit Scheduled',
      body: `A prospect will visit ${roomNo} at your property ${visitTimes[i]}. Please ensure the room is accessible.`,
      sentAt: isoMin(-(i + 1) * 60),
      read: i > 0,
    });
  });

  // Tenant notice messages
  vacating.slice(0, 2).forEach((s, i) => {
    const roomNo = `Room ${100 + parseInt(s.roomId.match(/(\d+)/)?.[0] || String(i + 1), 10)}`;
    messages.push({
      id: `msg-notice-${i + 1}`,
      ownerId: s.ownerId,
      propertyId: s.propertyId,
      roomId: s.roomId,
      kind: 'tenant_notice',
      title: 'Tenant on Notice Period',
      body: `The tenant in ${roomNo} has given notice and will vacate by ${s.vacatingDate || 'end of month'}. We'll start showing the room.`,
      sentAt: isoMin(-(i + 3) * 120),
      read: false,
    });
  });

  // General messages
  if (occupied.length > 0) {
    messages.push({
      id: 'msg-general-1',
      ownerId: occupied[0].ownerId,
      propertyId: occupied[0].propertyId,
      kind: 'general',
      title: 'Rent Collection Reminder',
      body: 'Monthly rent collection is due in 3 days. Please confirm receipt once tenants pay.',
      sentAt: isoMin(-48 * 60),
      read: true,
    });
  }

  return messages.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export const seedMessages: OwnerMessage[] = generateSeedMessages(seedRoomStatuses);


// Owner Portal types - Daily Truth + Compliance Engine

export type RoomStatusKind = 'occupied' | 'vacating' | 'vacant' | 'blocked';

export interface OwnerRoomStatus {
  roomId: string;
  propertyId: string;
  ownerId: string;
  kind: RoomStatusKind;
  vacatingDate?: string; // ISO, required when kind='vacating'
  rentConfirmed?: number; // required when kind='vacating'
  floorPrice?: number;          // private - owner's minimum acceptable rent
  actualRent?: number;          // Actual rent (last tenant)
  expectedRent?: number;        // Expected rent (owner ask)
  lowestAcceptableRent?: number; // Lowest acceptable rent (private to owner)
  notes?: string;
  updatedAt: string; // ISO
  verifiedToday: boolean;
  lockedUnsellable: boolean; // auto-flipped after 11 AM if not verified
  isDedicated?: boolean;        // gharpayy-controlled, auto-bookable
  views?: number;               // demand signal
}

// Demand objections logged by sales/TCM
export type ObjectionReason = 'price' | 'location' | 'timing' | 'amenities' | 'other';
export interface OwnerObjection {
  id: string;
  roomId: string;
  ownerId: string;
  reason: ObjectionReason;
  notes?: string;
  loggedAt: string;
  loggedBy: string;
}

export const OBJECTION_LABELS: Record<ObjectionReason, string> = {
  price: 'Price too high',
  location: 'Location',
  timing: 'Timing mismatch',
  amenities: 'Amenities',
  other: 'Other',
};

export interface OwnerRoomMedia {
  roomId: string;
  ownerId: string;
  photos: string[]; // urls or data refs (max 3+)
  videoUrl?: string;
  uploadedAt: string;
  expiresAt: string; // 7 days after upload
}

export type OwnerBlockState = 'pending' | 'approved' | 'rejected' | 'auto_released';

export interface OwnerBlockRequest {
  id: string;
  roomId: string;
  propertyId: string;
  ownerId: string;
  leadId: string;
  leadName: string;
  intent: 'hard' | 'medium' | 'soft';
  requestedAt: string;
  expiresAt: string; // requestedAt + 15 min
  state: OwnerBlockState;
  decidedAt?: string;
  customId?: string;
}

export interface ComplianceSnapshot {
  ownerId: string;
  date: string; // YYYY-MM-DD
  totalRooms: number;
  verifiedRooms: number;
  mediaFreshRooms: number;
  blocksRespondedInTime: number;
  blocksTotal: number;
  score: number; // 0-100
  tier: 'priority' | 'standard' | 'throttled';
}

export interface OwnerInsightDaily {
  ownerId: string;
  date: string;
  leadsPitched: number;
  visitsDone: number;
  highIntent: number;
  topObjection?: string;
  priceMismatchSignal?: string;
}

export interface OwnerProfile {
  id: string;
  name: string;
  phone: string;
  propertyIds: string[];
  isDedicated: boolean; // dedicated supply layer (3+ rooms / 20+ beds)
  tier: 'priority' | 'standard' | 'throttled';
  joinedAt: string;
  email?: string;
}

export type DailyTruthPhase = 'idle' | 'open' | 'warning' | 'locked';

export interface DailyTruthState {
  phase: DailyTruthPhase;
  msToNextTransition: number;
  todayKey: string; // YYYY-MM-DD
}

// Tenant occupying a room
export interface OwnerTenant {
  id: string;
  roomId: string;
  propertyId: string;
  ownerId: string;
  name: string;
  phone: string;
  moveInDate: string;   // YYYY-MM-DD
  noticeDate?: string;  // set when tenant gives notice
  onNoticePeriod: boolean;
}

// Message from Gharpayy team to owner (visit alerts, notices, etc.)
export type OwnerMessageKind = 'visit_scheduled' | 'visit_cancelled' | 'tenant_notice' | 'rent_update' | 'general';
export interface OwnerMessage {
  id: string;
  ownerId: string;
  propertyId: string;
  roomId?: string;
  kind: OwnerMessageKind;
  title: string;
  body: string;
  sentAt: string; // ISO
  read: boolean;
}


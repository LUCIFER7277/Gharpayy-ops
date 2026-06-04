import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  OwnerProfile, OwnerRoomStatus, OwnerRoomMedia, OwnerBlockRequest,
  ComplianceSnapshot, OwnerInsightDaily, RoomStatusKind, DailyTruthState,
  OwnerObjection, ObjectionReason, OwnerTenant, OwnerMessage,
} from './types';
import { seedOwners, seedRoomStatuses, seedMedia, seedBlocks, seedInsights, seedObjections, seedTenants, seedMessages } from './seed';
import { dailyTruthPhase, msUntilNextPhase, scoreOwnerCompliance, todayKey } from './compliance';
import { glueBus } from './event-bus';
import { properties as mytProperties, rooms as mytRooms } from '@/myt/lib/properties-seed';
import type { Property as MytProperty, Room as MytRoom } from '@/myt/lib/types';
import { registerOwnerBridge } from './team-bridge';
import { useApp } from '@/lib/store';
import { apiClient } from '@/lib/api-client';

type OwnerRole = 'owner' | null;

function getOwnerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gharpayy.access_token') || localStorage.getItem('gharpayy.token');
}

interface OwnerCtxValue {
  // identity
  currentOwnerId: string | null;
  setCurrentOwnerId: (id: string | null) => void;
  ownerRole: OwnerRole;
  setOwnerRole: (r: OwnerRole) => void;

  // data
  owners: OwnerProfile[];
  properties: MytProperty[];
  rooms: MytRoom[];
  roomStatuses: OwnerRoomStatus[];
  media: OwnerRoomMedia[];
  blocks: OwnerBlockRequest[];
  insights: OwnerInsightDaily[];
  objections: OwnerObjection[];
  tenants: OwnerTenant[];
  messages: OwnerMessage[];
  violations: number;

  // daily truth
  truth: DailyTruthState;

  // mutators
  updateRoomStatus: (roomId: string, patch: Partial<Omit<OwnerRoomStatus, 'roomId' | 'propertyId' | 'ownerId'>>) => void;
  updateRoomSharing: (roomId: string, bedsTotal: number, type: 'single' | 'double' | 'triple' | 'studio') => void;
  markRoomVerified: (roomId: string) => void;
  uploadMedia: (roomId: string, photos: (string | Blob | File)[], videoUrlOrFile: string | Blob | File) => void;
  decideBlock: (blockId: string, decision: 'approved' | 'rejected') => void;
  requestBlock: (input: Omit<OwnerBlockRequest, 'id' | 'requestedAt' | 'expiresAt' | 'state'>) => void;
  toggleDedicated: (roomId: string) => void;
  bulkVerify: (roomIds: string[]) => void;
  bulkRentDelta: (roomIds: string[], delta: number) => void;
  markMessageRead: (messageId: string) => void;
  addProperty: (input: {
    name: string;
    area: string;
    address?: string;
    basePrice?: number;
    foodRating?: number;
    hygieneRating?: number;
    amenities?: string[];
    description?: string;
    gateRules?: string;
    securityInfo?: string;
    photos?: string[];
    propertyType?: string;
    genderCategory?: string;
    sharingTypes?: string[];
    flatConfig?: string;
  }) => void;
  addRoom: (input: {
    propertyId: string;
    type: 'single' | 'double' | 'triple' | 'studio';
    bedsTotal: number;
    price: number;
    floorPrice?: number;
    actualRent?: number;
    expectedRent?: number;
    lowestAcceptableRent?: number;
  }) => void;
  logObjection: (input: { roomId: string; reason: ObjectionReason; notes?: string; loggedBy?: string }) => void;
  overrideBooking: (roomId: string, reason: string) => void;

  // selectors
  complianceFor: (ownerId: string) => ComplianceSnapshot;
}

const OwnerCtx = createContext<OwnerCtxValue | null>(null);

const STORAGE_KEY = 'gharpayy.owner.v1';

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState<OwnerRole>('owner');
  const [owners, setOwners] = useState<OwnerProfile[]>(seedOwners);
  const [properties, setProperties] = useState<MytProperty[]>(mytProperties);
  const [rooms, setRooms] = useState<MytRoom[]>(mytRooms);
  const [roomStatuses, setRoomStatuses] = useState<OwnerRoomStatus[]>(seedRoomStatuses);
  const [media, setMedia] = useState<OwnerRoomMedia[]>(seedMedia);
  const [blocks, setBlocks] = useState<OwnerBlockRequest[]>(seedBlocks);
  const [insights] = useState<OwnerInsightDaily[]>(seedInsights);
  const [objections, setObjections] = useState<OwnerObjection[]>(seedObjections);
  const [tenants] = useState<OwnerTenant[]>(seedTenants);
  const [messages, setMessages] = useState<OwnerMessage[]>(seedMessages);
  const [violations, setViolations] = useState<number>(0);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Truth phase ticker — client only
  const [truth, setTruth] = useState<DailyTruthState>({
    phase: 'idle', msToNextTransition: 0, todayKey: todayKey(),
  });

  // Ticker for transitions & locks
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const phase = dailyTruthPhase(d);
      setTruth({ phase, msToNextTransition: msUntilNextPhase(d), todayKey: todayKey(d) });

      // 11 AM auto-lock: flip lockedUnsellable=true on rooms not verified today
      if (phase === 'locked') {
        setRoomStatuses((prev) => {
          let changed = false;
          const next = prev.map((r) => {
            if (!r.verifiedToday && !r.lockedUnsellable) {
              changed = true;
              glueBus.publish({ type: 'owner.room.locked', roomId: r.roomId, propertyId: r.propertyId, ownerId: r.ownerId, reason: 'unverified_by_11am' });
              return { ...r, lockedUnsellable: true };
            }
            return r;
          });
          return changed ? next : prev;
        });
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch backend data handler
  const loadData = async (token: string) => {
    try {
      console.log("[API Context] Syncing state with backend...");
      
      const mapOwnerId = (oid: string) => {
        if (!oid) return oid;
        if (oid === 'mock-own-own-1') return 'own-1';
        if (oid === 'mock-own-own-2') return 'own-2';
        if (oid === 'mock-own-own-3') return 'own-3';
        if (oid === 'mock-own-own-4') return 'own-4';
        if (oid.startsWith('own-custom-')) return oid;
        return `own-custom-${oid}`;
      };

      // 0. Fetch current owner details to sync propertyIds & stats
      const ownerRes = await apiClient.get("/owner/current-owner", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const ownerJson = await (ownerRes as any); // cast since it yields response
      if (ownerJson.success && ownerJson.data) {
        const backendOwner = ownerJson.data;
        const emailMapInverse: Record<string, string> = {
          'rakesh@propertyplay.com': 'own-1',
          'meera@propertyplay.com': 'own-2',
          'ankit@propertyplay.com': 'own-3',
          'deepa@propertyplay.com': 'own-4'
        };
        const backendId = emailMapInverse[backendOwner.email] || `own-custom-${backendOwner._id}`;
        
        setOwners((prev) => {
          const exists = prev.some((o) => o.id === backendId || o.email === backendOwner.email);
          if (exists) {
            return prev.map((o) => {
              if (o.id === backendId || o.email === backendOwner.email) {
                return {
                  ...o,
                  id: backendId,
                  propertyIds: backendOwner.propertyIds || [],
                  name: backendOwner.fullName || backendOwner.username,
                  phone: backendOwner.phone || o.phone,
                  tier: backendOwner.tier || o.tier,
                  isDedicated: backendOwner.isDedicated ?? o.isDedicated,
                  email: backendOwner.email
                };
              }
              return o;
            });
          } else {
            const newOwner = {
              id: backendId,
              name: backendOwner.fullName || backendOwner.username,
              phone: backendOwner.phone || "",
              propertyIds: backendOwner.propertyIds || [],
              isDedicated: backendOwner.isDedicated ?? false,
              tier: backendOwner.tier || "standard",
              joinedAt: new Date(backendOwner.createdAt || Date.now()).toISOString().split('T')[0],
              email: backendOwner.email
            };
            return [...prev, newOwner];
          }
        });
        
        // Bind the current active owner ID to the real backend owner's custom ID
        setCurrentOwnerId(backendId);
      }

      // 1. Fetch properties
      const propRes = await apiClient.get("/owner/properties", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const propJson = await (propRes as any);
      if (propJson.success && propJson.data.length > 0) {
        const mappedProps = propJson.data.map((p: any) => ({
          ...p,
          id: p.customId || p._id,
          ownerId: mapOwnerId(p.ownerId)
        }));
        setProperties(mappedProps);
      }

      // 2. Fetch rooms
      const roomRes = await apiClient.get("/owner/rooms", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const roomJson = await (roomRes as any);
      if (roomJson.success) {
        const mappedRooms = roomJson.data.rooms.map((r: any) => ({
          ...r,
          id: r.customId || r._id
        }));
        setRooms(mappedRooms);
        const mappedStatuses = roomJson.data.roomStatuses.map((s: any) => ({
          ...s,
          ownerId: mapOwnerId(s.ownerId)
        }));
        setRoomStatuses(mappedStatuses);
        if (roomJson.data.roomMedia) {
          const mappedMedia = roomJson.data.roomMedia.map((m: any) => ({
            ...m,
            ownerId: mapOwnerId(m.ownerId)
          }));
          setMedia(mappedMedia);
        }
      }

      // 3. Fetch block requests
      const blockRes = await apiClient.get("/owner/blocks", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const blockJson = await (blockRes as any);
      if (blockJson.success) {
        const mappedBlocks = blockJson.data.map((b: any) => ({
          ...b,
          ownerId: mapOwnerId(b.ownerId)
        }));
        setBlocks(mappedBlocks);
      }

      // 4. Fetch objections
      const objRes = await apiClient.get("/owner/insights/objections", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const objJson = await (objRes as any);
      if (objJson.success) {
        const mappedObjections = objJson.data.map((o: any) => ({
          ...o,
          ownerId: mapOwnerId(o.ownerId)
        }));
        setObjections(mappedObjections);
      }
    } catch (err) {
      console.error("[API Context] Failed to fetch backend data:", err);
    }
  };

  // Session check & silent login handler
  useEffect(() => {
    const initSession = async () => {
      if (!sessionChecked) {
        const token = getOwnerToken();
        if (token) {
          try {
            const res = await apiClient.get("/owner/current-owner", {
              headers: { "Authorization": `Bearer ${token}` }
            });
            const json = await (res as any);
            if (json.success && json.data) {
              const backendOwner = json.data;
              const emailMapInverse: Record<string, string> = {
                'rakesh@propertyplay.com': 'own-1',
                'meera@propertyplay.com': 'own-2',
                'ankit@propertyplay.com': 'own-3',
                'deepa@propertyplay.com': 'own-4'
              };
              const existingId = emailMapInverse[backendOwner.email];
              if (existingId) {
                setCurrentOwnerId(existingId);
                await loadData(token);
              } else {
                const newId = `own-custom-${backendOwner._id}`;
                const customProfile = {
                  id: newId,
                  name: backendOwner.username,
                  phone: backendOwner.phone || "",
                  propertyIds: backendOwner.propertyIds || [],
                  isDedicated: backendOwner.isDedicated ?? false,
                  tier: backendOwner.tier || "standard",
                  joinedAt: new Date(backendOwner.createdAt || Date.now()).toISOString().split('T')[0],
                  email: backendOwner.email
                };
                setOwners((prev) => {
                  if (prev.some((o) => o.id === newId)) return prev;
                  return [...prev, customProfile];
                });
                setCurrentOwnerId(newId);
                await loadData(token);
              }
              setSessionChecked(true);
              return;
            }
          } catch (e) {
            console.warn("[API Context] Session restoration failed, falling back to silent login", e);
          }
        }
        setSessionChecked(true);
      }

      // Silent mock login fallback
      if (!currentOwnerId) return;
      if (currentOwnerId.startsWith('own-custom-')) {
        const token = getOwnerToken();
        if (token) loadData(token);
        return;
      }

      try {
        const emailMap: Record<string, string> = {
          'own-1': 'rakesh@propertyplay.com',
          'own-2': 'meera@propertyplay.com',
          'own-3': 'ankit@propertyplay.com',
          'own-4': 'deepa@propertyplay.com'
        };
        const email = emailMap[currentOwnerId];
        // Only do silent mock login for known seed owners - never override a real logged-in owner
        if (!email) {
          console.warn(`[API Context] Unknown seed owner ID "${currentOwnerId}", skipping silent login.`);
          return;
        }

        const res = await apiClient.post("/owner/login", { email, password: "Password123" });
        const json = await (res as any);
        if (json.success) {
          const token = json.data.accessToken;
          localStorage.setItem("gharpayy.token", token);
          localStorage.setItem("gharpayy.access_token", token);
          console.log(`[API Context] Silently logged in as ${json.data.owner.username}`);
          loadData(token);
        }
      } catch (err) {
        console.error("[API Context] Silent authentication failed:", err);
      }
    };

    initSession();
  }, [currentOwnerId, sessionChecked]);

  // Synchronize custom properties with the main app Zustand store (useApp)
  useEffect(() => {
    const customProps = properties.filter((p) => p.id.startsWith('p-custom-') || p.id.startsWith('p-custom'));
    
    const customAppProps = customProps.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      address: "",
      zoneId: "zone-1",
      totalBeds: 20,
      vacantBeds: 10,
      daysSinceLastBooking: 0,
      pricePerBed: p.basePrice || 10000,
    }));

    const storeProps = useApp.getState().properties || [];
    const nonCustomProps = storeProps.filter((p) => !p.id.startsWith('p-custom-') && !p.id.startsWith('p-custom'));
    useApp.setState({ properties: [...customAppProps, ...nonCustomProps] });
  }, [properties]);

  const updateRoomStatus: OwnerCtxValue['updateRoomStatus'] = async (roomId, patch) => {
    // Optimistic UI update
    setRoomStatuses((prev) => prev.map((r) => {
      if (r.roomId !== roomId) return r;
      return { ...r, ...patch, updatedAt: new Date().toISOString(), verifiedToday: true, lockedUnsellable: false };
    }));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.put(`/owner/rooms/${roomId}/status`, patch, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
        const r = roomStatuses.find((x) => x.roomId === roomId);
        if (r) glueBus.publish({ type: 'owner.room.updated', roomId, propertyId: r.propertyId, status: json.data.kind, ownerId: r.ownerId });
      }
    } catch (err) {
      console.error("[API Context] Failed to update room status on backend:", err);
    }
  };

  const updateRoomSharing: OwnerCtxValue['updateRoomSharing'] = async (roomId, bedsTotal, type) => {
    // Optimistic UI update
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, bedsTotal, type } : r));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.put(`/owner/rooms/${roomId}/sharing`, { bedsTotal, type }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Failed to update room sharing configuration on backend:", err);
    }
  };

  const markRoomVerified: OwnerCtxValue['markRoomVerified'] = async (roomId) => {
    // Optimistic UI update
    setRoomStatuses((prev) => prev.map((r) =>
      r.roomId === roomId ? { ...r, verifiedToday: true, lockedUnsellable: false, updatedAt: new Date().toISOString() } : r
    ));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.post(`/owner/rooms/${roomId}/verify`, null, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
        const r = roomStatuses.find((x) => x.roomId === roomId);
        if (r) glueBus.publish({ type: 'owner.room.updated', roomId, propertyId: r.propertyId, status: r.kind, ownerId: r.ownerId });
      }
    } catch (err) {
      console.error("[API Context] Failed to verify room status on backend:", err);
    }
  };

  const uploadMedia: OwnerCtxValue['uploadMedia'] = async (roomId, photosList, videoUrlOrFile) => {
    try {
      const token = getOwnerToken();
      if (!token) return;

      const formData = new FormData();

      // Mapped Base64 photos or files to multipart Binary Blobs
      for (let i = 0; i < photosList.length; i++) {
        const val = photosList[i];
        if (typeof val === "string" && val.startsWith("data:")) {
          const mimeType = val.match(/[^:]\w+\/[\w-+\d.]+(?=;)/)?.[0] || "image/jpeg";
          const byteString = atob(val.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let k = 0; k < byteString.length; k++) {
            ia[k] = byteString.charCodeAt(k);
          }
          const blob = new Blob([ab], { type: mimeType });
          formData.append("photos", blob, `photo_${i + 1}.jpg`);
        } else if ((val as any) instanceof Blob || (val as any) instanceof File) {
          formData.append("photos", val as any, (val as any).name || `photo_${i + 1}.jpg`);
        } else {
          const dummy = new Blob(["photo_proof"], { type: "image/jpeg" });
          formData.append("photos", dummy, `photo_${i + 1}.jpg`);
        }
      }

      // Convert or append video walkthrough file
      if ((videoUrlOrFile as any) instanceof Blob || (videoUrlOrFile as any) instanceof File) {
        formData.append("video", videoUrlOrFile as any, (videoUrlOrFile as any).name || "walkthrough_video.mp4");
      } else if (typeof videoUrlOrFile === "string") {
        if (videoUrlOrFile.startsWith("data:")) {
          const byteString = atob(videoUrlOrFile.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let k = 0; k < byteString.length; k++) {
            ia[k] = byteString.charCodeAt(k);
          }
          const blob = new Blob([ab], { type: "video/mp4" });
          formData.append("video", blob, "walkthrough_video.mp4");
        } else {
          const dummy = new Blob(["video_walkthrough"], { type: "video/mp4" });
          formData.append("video", dummy, "walkthrough_video.mp4");
        }
      }

      console.log(`[API Context] Uploading multi-part room proof for ${roomId} to Bunny.net...`);
      const res = await apiClient.post(`/owner/media/${roomId}/upload`, formData, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        console.log("[API Context] Bunny.net upload success! Pull Zone asset mapped successfully.");
        
        // Optimistic media array update
        setMedia((prev) => {
          const filtered = prev.filter((m) => m.roomId !== roomId);
          return [...filtered, {
            roomId,
            ownerId: json.data.media.ownerId,
            photos: json.data.media.photos,
            videoUrl: json.data.media.videoUrl,
            uploadedAt: json.data.media.uploadedAt,
            expiresAt: json.data.media.expiresAt
          }];
        });
        
        const room = roomStatuses.find((r) => r.roomId === roomId);
        if (room) {
          glueBus.publish({ type: 'owner.media.uploaded', roomId, ownerId: room.ownerId, expiresAt: json.data.media.expiresAt });
        }
        
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Room proof upload failed:", err);
    }
  };

  const decideBlock: OwnerCtxValue['decideBlock'] = async (blockId, decision) => {
    // Optimistic UI update
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId && b.customId !== blockId) return b;
      return { ...b, state: decision, decidedAt: new Date().toISOString() };
    }));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.post(`/owner/blocks/${blockId}/decide`, { decision }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
        const b = blocks.find((x) => x.id === blockId || x.customId === blockId);
        if (b) {
          if (decision === 'approved') {
            glueBus.publish({ type: 'owner.block.approved', blockId, roomId: b.roomId, leadId: b.leadId });
          } else {
            glueBus.publish({ type: 'owner.block.rejected', blockId, roomId: b.roomId, leadId: b.leadId });
          }
        }
      }
    } catch (err) {
      console.error("[API Context] Failed to decide block request on backend:", err);
    }
  };

  const requestBlock: OwnerCtxValue['requestBlock'] = (input) => {
    const id = `blk-${Math.random().toString(36).slice(2, 8)}`;
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const block: OwnerBlockRequest = { ...input, id, requestedAt, expiresAt, state: 'pending' };
    setBlocks((prev) => [block, ...prev]);
    glueBus.publish({ type: 'team.block.requested', blockId: id, roomId: input.roomId, leadId: input.leadId, ownerId: input.ownerId });
  };

  const toggleDedicated: OwnerCtxValue['toggleDedicated'] = async (roomId) => {
    // Optimistic UI update
    setRoomStatuses((prev) => prev.map((r) =>
      r.roomId === roomId
        ? { ...r, isDedicated: !r.isDedicated, updatedAt: new Date().toISOString(), verifiedToday: true }
        : r
    ));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.put(`/owner/rooms/${roomId}/toggle-dedicated`, null, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Failed to toggle dedicated room status on backend:", err);
    }
  };

  const bulkVerify: OwnerCtxValue['bulkVerify'] = async (roomIds) => {
    if (!roomIds.length) return;
    
    // Optimistic UI update
    const set = new Set(roomIds);
    setRoomStatuses((prev) => prev.map((r) =>
      set.has(r.roomId) ? { ...r, verifiedToday: true, lockedUnsellable: false, updatedAt: new Date().toISOString() } : r
    ));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.post("/owner/rooms/bulk-verify", { roomIds }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Failed to bulk verify rooms on backend:", err);
    }
  };

  const bulkRentDelta: OwnerCtxValue['bulkRentDelta'] = async (roomIds, delta) => {
    if (!roomIds.length || !delta) return;

    // Optimistic UI update
    const set = new Set(roomIds);
    setRoomStatuses((prev) => prev.map((r) =>
      set.has(r.roomId)
        ? { ...r, rentConfirmed: Math.max(0, (r.rentConfirmed ?? 0) + delta), updatedAt: new Date().toISOString(), verifiedToday: true }
        : r
    ));

    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.post("/owner/rooms/bulk-rent-delta", { roomIds, delta }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Failed to adjust bulk rent deltas on backend:", err);
    }
  };

  const addProperty: OwnerCtxValue['addProperty'] = async (input) => {
    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.post("/owner/properties", input, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Failed to upload property to backend:", err);
    }
  };

  const addRoom: OwnerCtxValue['addRoom'] = async (input) => {
    try {
      const token = getOwnerToken();
      if (!token) return;

      const res = await apiClient.post("/owner/rooms", input, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await (res as any);
      if (json.success) {
        loadData(token);
      }
    } catch (err) {
      console.error("[API Context] Failed to add room to backend:", err);
    }
  };

  const logObjection: OwnerCtxValue['logObjection'] = ({ roomId, reason, notes, loggedBy = 'Sales' }) => {
    const room = roomStatuses.find((r) => r.roomId === roomId);
    if (!room) return;
    setObjections((prev) => [
      { id: `obj-${Math.random().toString(36).slice(2, 7)}`, roomId, ownerId: room.ownerId, reason, notes, loggedAt: new Date().toISOString(), loggedBy },
      ...prev,
    ]);
  };

  const overrideBooking: OwnerCtxValue['overrideBooking'] = (_roomId, _reason) => {
    setViolations((v) => v + 1);
  };

  const markMessageRead = (messageId: string) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, read: true } : m));
  };

  const bumpRoomViews = (roomId: string, by = 1) => {
    setRoomStatuses((prev) => prev.map((r) =>
      r.roomId === roomId ? { ...r, views: (r.views ?? 0) + by } : r
    ));
  };

  // Register the team↔owner bridge so post-tour objections + tour completions
  // from the Team store push into the Owner store.
  useEffect(() => {
    registerOwnerBridge({
      logObjection: (input) => logObjection(input),
      bumpRoomViews,
      resolveRoomIdByPropertyKey: (key) => {
        if (!roomStatuses.length) return null;
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        return roomStatuses[h % roomStatuses.length]?.roomId ?? null;
      },
    });
  }, [roomStatuses]);

  const complianceFor = (ownerId: string): ComplianceSnapshot => {
    const owner = owners.find((o) => o.id === ownerId) ?? owners[0];
    return scoreOwnerCompliance(owner, roomStatuses, media, blocks);
  };

  const value: OwnerCtxValue = {
    currentOwnerId, setCurrentOwnerId,
    ownerRole, setOwnerRole,
    owners, properties, rooms, roomStatuses, media, blocks, insights, objections,
    tenants, messages,
    violations,
    truth,
    updateRoomStatus, updateRoomSharing, markRoomVerified, uploadMedia, decideBlock, requestBlock,
    toggleDedicated, bulkVerify, bulkRentDelta, addProperty, addRoom, logObjection, overrideBooking,
    markMessageRead,
    complianceFor,
  };

  return <OwnerCtx.Provider value={value}>{children}</OwnerCtx.Provider>;
}

export function useOwner() {
  const ctx = useContext(OwnerCtx);
  if (!ctx) throw new Error('useOwner must be used within OwnerProvider');
  return ctx;
}

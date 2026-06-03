import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import argon2 from "argon2";
import { col } from "../../db/mongo.js";
import { requireAuth } from "../../middleware/auth.js";
import { signAccessToken, buildClaims, type UserDoc } from "../../auth/auth.js";
import { env } from "../../config/env.js";
import { PGS } from "../../../../src/supply-hub/data/pgs.js";


// Schemas & Types
const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RoomStatusFields = z.object({
  kind: z.enum(["occupied", "vacating", "vacant", "blocked"]),
  rentConfirmed: z.number().optional(),
  floorPrice: z.number().optional(),
  vacatingDate: z.string().optional(),
  notes: z.string().optional(),
  actualRent: z.number().optional(),
  expectedRent: z.number().optional(),
  lowestAcceptableRent: z.number().optional(),
});

// Seed function to ensure mock owners and their properties exist in the DB
export async function seedOwnersAndProperties() {
  const usersCol = col<UserDoc>("users");
  const propertiesCol = col<any>("properties");
  const roomsCol = col<any>("rooms");
  const roomStatusesCol = col<any>("room_statuses");

  const defaultTenant = env.DEFAULT_TENANT || "t-gharpayy";
  const passwordHash = await argon2.hash("Password123");
  const now = new Date().toISOString();

  // Helper to generate deterministic credentials
  function getSeededCredentials(name: string, phone: string, index: number) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    let email = "";
    if (cleanName && !["nil", "unknown", "-"].includes(cleanName)) {
      email = `${cleanName}_${cleanPhone || index}@gharpayy.com`;
    } else if (cleanPhone) {
      email = `owner_${cleanPhone}@gharpayy.com`;
    } else {
      email = `owner_unknown_${index}@gharpayy.com`;
    }
    return {
      email,
      password: "Password123"
    };
  }

  // Pre-seed the legacy mock owners first
  const mockOwners = [
    { id: "own-1", username: "rakesh@propertyplay.com", email: "rakesh@propertyplay.com", fullName: "Rakesh Sharma", phone: "+919876543210", propertyIds: ["p-koramangala-1"], isDedicated: true, tier: "priority" as const },
    { id: "own-2", username: "meera@propertyplay.com", email: "meera@propertyplay.com", fullName: "Meera Iyer", phone: "+919812345678", propertyIds: ["p-indiranagar-1"], isDedicated: true, tier: "standard" as const },
    { id: "own-3", username: "ankit@propertyplay.com", email: "ankit@propertyplay.com", fullName: "Ankit Verma", phone: "+919900112233", propertyIds: ["p-hsr-1"], isDedicated: false, tier: "throttled" as const },
    { id: "own-4", username: "deepa@propertyplay.com", email: "deepa@propertyplay.com", fullName: "Deepa Krishnan", phone: "+919876501122", propertyIds: ["p-whitefield-1"], isDedicated: true, tier: "priority" as const },
  ];

  for (const owner of mockOwners) {
    const exists = await usersCol.findOne({ email: owner.email });
    const mongoId = `mock-own-${owner.id}`;
    if (!exists) {
      const doc: UserDoc = {
        _id: mongoId,
        username: owner.username,
        email: owner.email,
        phone: owner.phone,
        passwordHash,
        fullName: owner.fullName,
        role: "owner",
        status: "active",
        zones: ["zone-1"],
        tenantId: defaultTenant,
        createdAt: now,
        updatedAt: now,
      };
      (doc as any).propertyIds = owner.propertyIds;
      (doc as any).isDedicated = owner.isDedicated;
      (doc as any).tier = owner.tier;
      await usersCol.insertOne(doc);
    }
  }

  // Group properties from PGS by unique manager contact details
  const managerMap = new Map<string, {
    name: string;
    phone: string;
    propertyIds: string[];
    properties: typeof PGS;
  }>();

  PGS.forEach((pg) => {
    let mName = (pg.manager.name || "").trim();
    let mPhone = (pg.manager.phone || "").trim();
    if (!mName && !mPhone) {
      mName = (pg.owner.name || "").trim();
      mPhone = (pg.owner.phone || "").trim();
    }
    if (!mName) mName = "Unknown";
    if (!mPhone) mPhone = "NO_CONTACT";

    const key = `${mName.toLowerCase()}::${mPhone.toLowerCase()}`;
    if (!managerMap.has(key)) {
      managerMap.set(key, {
        name: mName,
        phone: mPhone,
        propertyIds: [],
        properties: [],
      });
    }
    const m = managerMap.get(key)!;
    m.propertyIds.push(pg.id);
    m.properties.push(pg);
  });

  // Seed all unique managers (135 approx.) as owners
  let index = 0;
  for (const [_, m] of managerMap.entries()) {
    index++;
    const creds = getSeededCredentials(m.name, m.phone, index);
    const mongoId = `mock-own-seeded-${index}`;

    // Skip the main mock owners if duplicate
    const isLegacy = mockOwners.some(x => x.email === creds.email);
    if (isLegacy) continue;

    const exists = await usersCol.findOne({ email: creds.email });
    let ownerMongoId = mongoId;
    if (!exists) {
      const doc: UserDoc = {
        _id: mongoId,
        username: creds.email,
        email: creds.email,
        phone: m.phone,
        passwordHash,
        fullName: m.name === "Unknown" ? `Owner ${creds.email.split('@')[0]}` : m.name,
        role: "owner",
        status: "active",
        zones: ["zone-1"],
        tenantId: defaultTenant,
        createdAt: now,
        updatedAt: now,
      };
      (doc as any).propertyIds = m.propertyIds;
      (doc as any).isDedicated = true;
      (doc as any).tier = "standard";
      await usersCol.insertOne(doc);
    } else {
      ownerMongoId = exists._id;
      await usersCol.updateOne(
        { email: creds.email },
        { $set: { propertyIds: m.propertyIds, updatedAt: now } as any }
      );
    }

    // Seed properties for this owner in database properties collection
    for (const pg of m.properties) {
      const propExists = await propertiesCol.findOne({ _id: pg.id });
      const basePrice = pg.prices.single || pg.prices.double || pg.prices.triple || 12000;
      
      const propDoc = {
        _id: pg.id,
        customId: pg.id,
        tenantId: defaultTenant,
        ownerId: ownerMongoId,
        ownerName: m.name,
        name: pg.name,
        area: pg.area,
        address: pg.locality || pg.area,
        basePrice: basePrice,
        pricePerBed: basePrice,
        foodRating: 4,
        hygieneRating: 4,
        amenities: pg.amenities || [],
        photos: [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"
        ],
        description: pg.usp || "Premium co-living facility.",
        gateRules: pg.rules || "Curfew rules apply",
        securityInfo: pg.safety?.join(", ") || "CCTV",
        propertyType: "pg",
        genderCategory: pg.gender,
        sharingTypes: pg.rooms?.split(", ") || [],
        flatConfig: "studio",
        pageViews: 0,
        shares: 0,
        photoCount: 1,
        createdAt: now,
        updatedAt: now,
        zoneId: "zone-1",
        totalBeds: 6,
        vacantBeds: 5,
      };

      if (!propExists) {
        await propertiesCol.insertOne(propDoc);
      } else {
        await propertiesCol.updateOne(
          { _id: pg.id },
          { $set: { ownerId: ownerMongoId, ownerName: m.name, name: pg.name, area: pg.area, basePrice, totalBeds: 6, vacantBeds: 5 } }
        );
      }

      // Seed 3 rooms (single, double, triple)
      const roomTypes: Array<"single" | "double" | "triple"> = ["single", "double", "triple"];
      for (let rIdx = 0; rIdx < roomTypes.length; rIdx++) {
        const type = roomTypes[rIdx];
        const bedsTotal = type === "single" ? 1 : type === "double" ? 2 : 3;
        const roomId = `r-${pg.id}-${type}`;
        const roomExists = await roomsCol.findOne({ _id: roomId });
        if (!roomExists) {
          await roomsCol.insertOne({
            _id: roomId,
            customId: roomId,
            propertyId: pg.id,
            type,
            bedsTotal,
            bedsOccupied: rIdx === 0 ? 1 : 0,
            currentPrice: pg.prices[type] || basePrice,
          });

          await roomStatusesCol.insertOne({
            roomId,
            propertyId: pg.id,
            ownerId: ownerMongoId,
            kind: rIdx === 0 ? "occupied" : "vacant",
            rentConfirmed: pg.prices[type] || basePrice,
            floorPrice: Math.round((pg.prices[type] || basePrice) * 0.9),
            actualRent: pg.prices[type] || basePrice,
            expectedRent: pg.prices[type] || basePrice,
            lowestAcceptableRent: Math.round((pg.prices[type] || basePrice) * 0.9),
            updatedAt: now,
            verifiedToday: true,
            lockedUnsellable: false,
            isDedicated: rIdx === 1,
            views: 5 * rIdx,
          });
        }
      }
    }
  }

  // Pre-seed some default properties/rooms for mock owners if they don't exist
  const mockProperties = [
    { id: "p-koramangala-1", ownerId: "mock-own-own-1", ownerName: "Rakesh Sharma", name: "Tranquil Nest Koramangala", area: "Koramangala", address: "12th Main, Koramangala 4th Block, Bengaluru, Karnataka 560034", basePrice: 15000 },
    { id: "p-indiranagar-1", ownerId: "mock-own-own-2", ownerName: "Meera Iyer", name: "Meera Oasis Indiranagar", area: "Indiranagar", address: "100 Feet Road, Indiranagar", basePrice: 18000 },
    { id: "p-hsr-1", ownerId: "mock-own-own-3", ownerName: "Ankit Verma", name: "HSR Elite Residency", area: "HSR Layout", address: "Sector 3, HSR Layout", basePrice: 12000 },
    { id: "p-whitefield-1", ownerId: "mock-own-own-4", ownerName: "Deepa Krishnan", name: "Whitefield Manor", area: "Whitefield", address: "ITPL Main Road, Whitefield", basePrice: 16000 },
  ];

  for (const prop of mockProperties) {
    if (prop.id === "p-koramangala-1") {
      await propertiesCol.deleteOne({ _id: prop.id });
      await roomsCol.deleteMany({ propertyId: prop.id });
      await roomStatusesCol.deleteMany({ propertyId: prop.id });
    }
    const exists = await propertiesCol.findOne({ _id: prop.id });
    if (!exists) {
      if (prop.id === "p-koramangala-1") {
        await propertiesCol.insertOne({
          _id: prop.id,
          customId: prop.id,
          tenantId: defaultTenant,
          ownerId: prop.ownerId,
          ownerName: prop.ownerName,
          name: prop.name,
          area: prop.area,
          address: prop.address,
          basePrice: prop.basePrice,
          pricePerBed: prop.basePrice,
          foodRating: 4,
          hygieneRating: 4,
          amenities: ["WiFi", "Laundry", "AC", "Daily housekeeping"],
          photos: [
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"
          ],
          description: "Premium co-living facility designed for young professionals. High comfort, regular cleaning, healthy home-style meals, and a vibrant community.",
          gateRules: "Gate curfew at 11:30 PM",
          securityInfo: "24/7 guard, biometric gate",
          propertyType: "pg",
          pgSubtype: "Co-living Space",
          genderCategory: "Co-live (Mixed / Any)",
          sharingTypes: ["Single Sharing", "Double Sharing"],
          flatConfig: "studio",
          pageViews: 124,
          shares: 12,
          photoCount: 2,
          createdAt: now,
          updatedAt: now,
          zoneId: "zone-1",
          totalBeds: 6,
          vacantBeds: 5,
        });

        const roomsToSeed = [
          { roomId: "r-koramangala-1", type: "single", bedsTotal: 1, bedsOccupied: 1, kind: "occupied", views: 12, isDedicated: false },
          { roomId: "r-koramangala-2", type: "double", bedsTotal: 2, bedsOccupied: 0, kind: "vacant", views: 24, isDedicated: true },
          { roomId: "r-koramangala-3", type: "triple", bedsTotal: 3, bedsOccupied: 0, kind: "vacant", views: 36, isDedicated: false },
        ];

        for (const rSeed of roomsToSeed) {
          await roomsCol.insertOne({
            _id: rSeed.roomId,
            customId: rSeed.roomId,
            propertyId: prop.id,
            type: rSeed.type,
            bedsTotal: rSeed.bedsTotal,
            bedsOccupied: rSeed.bedsOccupied,
            currentPrice: prop.basePrice,
          });

          await roomStatusesCol.insertOne({
            roomId: rSeed.roomId,
            propertyId: prop.id,
            ownerId: prop.ownerId,
            kind: rSeed.kind,
            rentConfirmed: prop.basePrice,
            floorPrice: 13500,
            actualRent: prop.basePrice,
            expectedRent: prop.basePrice,
            lowestAcceptableRent: 13500,
            updatedAt: now,
            verifiedToday: true,
            lockedUnsellable: false,
            isDedicated: rSeed.isDedicated,
            views: rSeed.views,
          });
        }
      } else {
        await propertiesCol.insertOne({
          _id: prop.id,
          customId: prop.id,
          tenantId: defaultTenant,
          ownerId: prop.ownerId,
          ownerName: prop.ownerName,
          name: prop.name,
          area: prop.area,
          address: prop.address,
          basePrice: prop.basePrice,
          pricePerBed: prop.basePrice,
          foodRating: 4,
          hygieneRating: 4,
          amenities: ["WiFi", "Laundry", "AC"],
          photos: [],
          description: "Pre-seeded property for Gharpayy mock owners.",
          gateRules: "No gates rules.",
          securityInfo: "24/7 Security",
          propertyType: "pg",
          genderCategory: "unisex",
          sharingTypes: ["single", "double"],
          flatConfig: "studio",
          pageViews: 124,
          shares: 12,
          photoCount: 0,
          createdAt: now,
          updatedAt: now,
          zoneId: "zone-1",
          totalBeds: 6,
          vacantBeds: 5,
        });

        const roomTypes: ("single" | "double" | "triple" | "studio")[] = ["single", "double", "triple", "studio"];
        for (let i = 1; i <= 3; i++) {
          const roomId = `r-${prop.id.split("-")[1]}-${i}`;
          const roomType = roomTypes[(i - 1) % roomTypes.length];
          const bedsTotal = roomType === "single" ? 1 : roomType === "double" ? 2 : roomType === "triple" ? 3 : 1;
          
          await roomsCol.insertOne({
            _id: roomId,
            customId: roomId,
            propertyId: prop.id,
            type: roomType,
            bedsTotal,
            bedsOccupied: i === 1 ? bedsTotal : 0,
            currentPrice: prop.basePrice,
          });

          await roomStatusesCol.insertOne({
            roomId,
            propertyId: prop.id,
            ownerId: prop.ownerId,
            kind: i === 1 ? "occupied" : "vacant",
            rentConfirmed: prop.basePrice,
            floorPrice: Math.round(prop.basePrice * 0.9),
            actualRent: prop.basePrice,
            expectedRent: prop.basePrice,
            lowestAcceptableRent: Math.round(prop.basePrice * 0.9),
            updatedAt: now,
            verifiedToday: true,
            lockedUnsellable: false,
            isDedicated: i === 2,
            views: 12 * i,
          });
        }
      }
    } else {
      await propertiesCol.updateOne(
        { _id: prop.id },
        { $set: { totalBeds: 6, vacantBeds: 5 } }
      );
    }
  }

  const blockRequestsCol = col<any>("block_requests");
  await blockRequestsCol.deleteOne({ id: "blk-1" });
  await blockRequestsCol.insertOne({
    _id: "blk-1",
    id: "blk-1",
    roomId: "r-koramangala-2",
    propertyId: "p-koramangala-1",
    ownerId: "mock-own-own-1",
    leadId: "l-101",
    leadName: "Priya Reddy",
    intent: "hard",
    requestedAt: "2026-06-02T17:36:42.000Z",
    expiresAt: "2026-06-02T17:51:42.000Z",
    state: "pending",
  });

  const objectionsCol = col<any>("objections");
  await objectionsCol.deleteMany({ id: { $in: ["obj-1", "obj-2", "obj-3", "obj-4"] } });
  await objectionsCol.insertMany([
    {
      _id: "obj-1",
      id: "obj-1",
      roomId: "r-koramangala-1",
      ownerId: "mock-own-own-1",
      reason: "price",
      notes: "Asked for ₹1k less on the double sharing option.",
      loggedAt: "2026-06-02T17:44:42.000Z",
      loggedBy: "Anil (Sales)",
    },
    {
      _id: "obj-2",
      id: "obj-2",
      roomId: "r-indiranagar-1",
      ownerId: "mock-own-own-2",
      reason: "location",
      notes: "Too far from Metro station.",
      loggedAt: "2026-06-02T18:12:00.000Z",
      loggedBy: "Anil (Sales)",
    },
    {
      _id: "obj-3",
      id: "obj-3",
      roomId: "r-hsr-1",
      ownerId: "mock-own-own-3",
      reason: "price",
      notes: "Budget mismatch, wanted ₹1.5k discount.",
      loggedAt: "2026-06-02T19:05:00.000Z",
      loggedBy: "Sanjay (Sales)",
    },
    {
      _id: "obj-4",
      id: "obj-4",
      roomId: "r-whitefield-1",
      ownerId: "mock-own-own-4",
      reason: "amenities",
      notes: "Requested AC unit in room.",
      loggedAt: "2026-06-02T20:30:00.000Z",
      loggedBy: "Sanjay (Sales)",
    }
  ]);

  const mediaCol = col<any>("room_media");
  await mediaCol.deleteOne({ roomId: "r-koramangala-2" });
  await mediaCol.insertOne({
    _id: "m-koramangala-2-seed",
    roomId: "r-koramangala-2",
    ownerId: "mock-own-own-1",
    photos: [
      "/placeholder.svg",
      "/placeholder.svg",
      "/placeholder.svg"
    ],
    videoUrl: "https://example.com/room-video.mp4",
    uploadedAt: "2026-05-31T17:44:42.000Z",
    expiresAt: "2026-06-07T17:44:42.000Z"
  });
}


export function registerOwnerRoutes(app: FastifyInstance) {
  // Trigger seeding on module registration
  seedOwnersAndProperties().catch((err) => {
    app.log.warn({ err }, "seedOwnersAndProperties failed on startup");
  });

  // ---------- OWNER LOGIN ----------
  app.post("/api/v1/owner/login", async (req, reply) => {
    const { email, password } = LoginBody.parse(req.body);
    const users = col<UserDoc>("users");
    const owner = await users.findOne({ email: email.trim().toLowerCase(), role: "owner" });
    
    if (!owner) {
      return reply.code(401).send({ success: false, message: "Invalid credentials" });
    }

    // Accept seed password "Password123"
    const isOk = await argon2.verify(owner.passwordHash, password);
    if (!isOk) {
      return reply.code(401).send({ success: false, message: "Invalid credentials" });
    }

    const claims = buildClaims(owner);
    const token = await signAccessToken(claims);

    return reply.send({
      success: true,
      data: {
        accessToken: token,
        owner: {
          _id: owner._id,
          username: owner.username,
          email: owner.email,
          fullName: owner.fullName,
          phone: owner.phone ?? "",
          propertyIds: (owner as any).propertyIds ?? [],
          isDedicated: (owner as any).isDedicated ?? false,
          tier: (owner as any).tier ?? "standard",
        },
      },
    });
  });

  // ---------- CURRENT OWNER ----------
  app.get("/api/v1/owner/current-owner", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.sub;
    const users = col<UserDoc>("users");
    const owner = await users.findOne({ _id: userId });
    
    if (!owner) {
      return reply.code(404).send({ success: false, message: "Owner not found" });
    }

    return reply.send({
      success: true,
      data: {
        _id: owner._id,
        email: owner.email,
        username: owner.username,
        fullName: owner.fullName,
        phone: owner.phone ?? "",
        propertyIds: (owner as any).propertyIds ?? [],
        isDedicated: (owner as any).isDedicated ?? false,
        tier: (owner as any).tier ?? "standard",
        createdAt: owner.createdAt,
      },
    });
  });

  // ---------- OWNER PROPERTIES ----------
  app.get("/api/v1/owner/properties", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.sub;
    const propertiesCol = col<any>("properties");
    const list = await propertiesCol.find({ ownerId: userId }).toArray();
    return reply.send({ success: true, data: list });
  });

  // ---------- OWNER ROOMS ----------
  app.get("/api/v1/owner/rooms", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.sub;
    const propertiesCol = col<any>("properties");
    const roomsCol = col<any>("rooms");
    const roomStatusesCol = col<any>("room_statuses");
    const mediaCol = col<any>("room_media");

    const ownerProps = await propertiesCol.find({ ownerId: userId }).toArray();
    const propIds = ownerProps.map((p) => p.customId || p._id);

    const rooms = await roomsCol.find({ propertyId: { $in: propIds } }).toArray();
    const roomIds = rooms.map((r) => r.customId || r._id);
    const roomStatuses = await roomStatusesCol.find({ roomId: { $in: roomIds } }).toArray();
    const roomMedia = await mediaCol.find({ roomId: { $in: roomIds } }).toArray();

    return reply.send({
      success: true,
      data: {
        rooms,
        roomStatuses,
        roomMedia,
      },
    });
  });

  // ---------- OWNER BLOCKS ----------
  app.get("/api/v1/owner/blocks", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.sub;
    const blockRequestsCol = col<any>("block_requests");
    const blocks = await blockRequestsCol.find({ ownerId: userId }).toArray();
    return reply.send({ success: true, data: blocks });
  });

  // ---------- OWNER INSIGHTS OBJECTIONS ----------
  app.get("/api/v1/owner/insights/objections", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.sub;
    const objectionsCol = col<any>("objections");
    const objections = await objectionsCol.find({ ownerId: userId }).toArray();
    return reply.send({ success: true, data: objections });
  });

  // ---------- UPDATE ROOM STATUS ----------
  app.put("/api/v1/owner/rooms/:roomId/status", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const body = RoomStatusFields.partial().parse(req.body);
    const roomStatusesCol = col<any>("room_statuses");
    
    const update: Record<string, any> = {
      ...body,
      verifiedToday: true,
      lockedUnsellable: false,
      updatedAt: new Date().toISOString(),
    };

    const r = await roomStatusesCol.findOneAndUpdate(
      { roomId },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!r) {
      return reply.code(404).send({ success: false, message: "Room status not found" });
    }

    return reply.send({ success: true, data: r });
  });

  // ---------- UPDATE ROOM SHARING ----------
  app.put("/api/v1/owner/rooms/:roomId/sharing", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const { bedsTotal, type } = req.body as { bedsTotal: number; type: string };
    const roomsCol = col<any>("rooms");

    // Update in the rooms collection
    let r = await roomsCol.findOneAndUpdate(
      { _id: roomId },
      { $set: { bedsTotal: Number(bedsTotal), type } },
      { returnDocument: "after" }
    );

    if (!r) {
      r = await roomsCol.findOneAndUpdate(
        { customId: roomId },
        { $set: { bedsTotal: Number(bedsTotal), type } },
        { returnDocument: "after" }
      );
    }

    if (!r) {
      return reply.code(404).send({ success: false, message: "Room not found" });
    }

    return reply.send({ success: true, data: r });
  });

  // ---------- VERIFY ROOM ----------
  app.post("/api/v1/owner/rooms/:roomId/verify", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const roomStatusesCol = col<any>("room_statuses");

    const r = await roomStatusesCol.findOneAndUpdate(
      { roomId },
      { $set: { verifiedToday: true, lockedUnsellable: false, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );

    if (!r) {
      return reply.code(404).send({ success: false, message: "Room status not found" });
    }

    return reply.send({ success: true, data: r });
  });

  // ---------- TOGGLE DEDICATED ----------
  app.put("/api/v1/owner/rooms/:roomId/toggle-dedicated", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const roomStatusesCol = col<any>("room_statuses");

    const statusDoc = await roomStatusesCol.findOne({ roomId });
    if (!statusDoc) {
      return reply.code(404).send({ success: false, message: "Room status not found" });
    }

    const nextVal = !statusDoc.isDedicated;
    const r = await roomStatusesCol.findOneAndUpdate(
      { roomId },
      { $set: { isDedicated: nextVal, verifiedToday: true, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );

    return reply.send({ success: true, data: r });
  });

  // ---------- BULK VERIFY ----------
  app.post("/api/v1/owner/rooms/bulk-verify", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomIds } = req.body as { roomIds: string[] };
    if (!roomIds || !roomIds.length) {
      return reply.code(400).send({ success: false, message: "No room ids provided" });
    }

    const roomStatusesCol = col<any>("room_statuses");
    await roomStatusesCol.updateMany(
      { roomId: { $in: roomIds } },
      { $set: { verifiedToday: true, lockedUnsellable: false, updatedAt: new Date().toISOString() } }
    );

    return reply.send({ success: true });
  });

  // ---------- BULK RENT DELTA ----------
  app.post("/api/v1/owner/rooms/bulk-rent-delta", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomIds, delta } = req.body as { roomIds: string[]; delta: number };
    if (!roomIds || !roomIds.length || !delta) {
      return reply.code(400).send({ success: false, message: "No room ids or delta provided" });
    }

    const roomStatusesCol = col<any>("room_statuses");
    const statuses = await roomStatusesCol.find({ roomId: { $in: roomIds } }).toArray();

    for (const s of statuses) {
      const nextRent = Math.max(0, (s.rentConfirmed ?? 0) + delta);
      await roomStatusesCol.updateOne(
        { roomId: s.roomId },
        { $set: { rentConfirmed: nextRent, verifiedToday: true, updatedAt: new Date().toISOString() } }
      );
    }

    return reply.send({ success: true });
  });

  // ---------- ADD ROOM ----------
  app.post("/api/v1/owner/rooms", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.sub;
    const body = req.body as any;
    const { propertyId, type, bedsTotal, price, floorPrice, actualRent, expectedRent, lowestAcceptableRent } = body;

    if (!propertyId || !type || !bedsTotal || !price) {
      return reply.code(400).send({ success: false, message: "Missing required fields" });
    }

    const roomsCol = col<any>("rooms");
    const roomStatusesCol = col<any>("room_statuses");
    
    const roomId = `r-custom-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await roomsCol.insertOne({
      _id: roomId,
      customId: roomId,
      propertyId,
      type,
      bedsTotal: Number(bedsTotal),
      bedsOccupied: 0,
      currentPrice: Number(price),
    });

    await roomStatusesCol.insertOne({
      roomId,
      propertyId,
      ownerId: userId,
      kind: "vacant",
      rentConfirmed: Number(price),
      floorPrice: floorPrice ? Number(floorPrice) : Math.round(Number(price) * 0.9),
      actualRent: actualRent ? Number(actualRent) : Number(price),
      expectedRent: expectedRent ? Number(expectedRent) : Number(price),
      lowestAcceptableRent: lowestAcceptableRent ? Number(lowestAcceptableRent) : (floorPrice ? Number(floorPrice) : Math.round(Number(price) * 0.9)),
      updatedAt: now,
      verifiedToday: true,
      lockedUnsellable: false,
      isDedicated: false,
      views: 0,
    });

    return reply.send({ success: true, data: { roomId } });
  });

  // ---------- DECIDE BLOCK HOLD ----------
  app.post("/api/v1/owner/blocks/:blockId/decide", { preHandler: [requireAuth] }, async (req, reply) => {
    const { blockId } = req.params as { blockId: string };
    const { decision } = req.body as { decision: "approved" | "rejected" };

    if (decision !== "approved" && decision !== "rejected") {
      return reply.code(400).send({ success: false, message: "Invalid decision" });
    }

    const blockRequestsCol = col<any>("block_requests");
    const r = await blockRequestsCol.findOneAndUpdate(
      { $or: [{ id: blockId }, { _id: blockId }] },
      { $set: { state: decision, decidedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );

    if (!r) {
      return reply.code(404).send({ success: false, message: "Block request not found" });
    }

    return reply.send({ success: true, data: r });
  });

  // ---------- WALKTHROUGH MEDIA UPLOAD ----------
  app.post("/api/v1/owner/media/:roomId/upload", { preHandler: [requireAuth] }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const userId = req.user!.sub;

    if (!req.isMultipart()) {
      return reply.code(400).send({ success: false, message: "Expected multipart request" });
    }

    const parts = req.files();
    const photos: string[] = [];
    let videoUrl = "https://example.com/mock-upload-video.mp4"; // Default mock video link

    for await (const part of parts) {
      if (part.fieldname === "photos") {
        // In local mock, we just generate a placeholder asset path
        const fileId = crypto.randomUUID().slice(0, 8);
        const assetUrl = `/uploads/${fileId}_${part.filename}`;
        photos.push(assetUrl);
      } else if (part.fieldname === "video") {
        const fileId = crypto.randomUUID().slice(0, 8);
        videoUrl = `/uploads/${fileId}_${part.filename}`;
      }
    }

    // If photos list is empty, fill with standard templates
    if (photos.length === 0) {
      photos.push("/placeholder.svg", "/placeholder.svg", "/placeholder.svg");
    }

    const now = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const mediaCol = col<any>("room_media");
    const newMedia = {
      _id: `m-${crypto.randomUUID().slice(0, 8)}`,
      roomId,
      ownerId: userId,
      photos,
      videoUrl,
      uploadedAt: now.toISOString(),
      expiresAt,
    };

    await mediaCol.updateOne({ roomId }, { $set: newMedia }, { upsert: true });

    return reply.send({
      success: true,
      data: {
        media: newMedia,
      },
    });
  });
}

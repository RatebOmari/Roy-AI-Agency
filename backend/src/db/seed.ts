import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index.js";
import {
  users, agencyClients, conversations, messages,
  platformPermissions, agencyConfig, teamMembers,
} from "./schema.js";
import { eq } from "drizzle-orm";

// Fixed UUID for Roy AI Agency — single-agency platform
const AGENCY_ID = "00000000-0000-0000-0000-000000000001";

const hash = (p: string) => bcrypt.hash(p, 10);

async function upsertClient(
  email: string, name: string, businessName: string,
): Promise<string> {
  let [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) {
    [u] = await db.insert(users).values({
      email, passwordHash: await hash("demo123"),
      role: "client", name, businessName,
    }).returning();
    console.log(`  ✅ Created ${email}`);
  }
  return u.id;
}

async function linkClientToAgency(clientId: string, status: "active" | "paused" | "setup" = "active") {
  const [existing] = await db.select().from(agencyClients)
    .where(eq(agencyClients.clientId, clientId)).limit(1);
  if (!existing) {
    await db.insert(agencyClients).values({ agencyId: AGENCY_ID, clientId, status });
  }
}

async function grantPlatformPerms(clientId: string, perms: { platform: string; comments: boolean; messages: boolean }[]) {
  const [existing] = await db.select().from(platformPermissions)
    .where(eq(platformPermissions.clientId, clientId)).limit(1);
  if (!existing) {
    for (const p of perms) {
      await db.insert(platformPermissions).values({
        clientId, grantedBy: AGENCY_ID,
        platform:        p.platform as any,
        commentsEnabled: p.comments,
        messagesEnabled: p.messages,
      });
    }
  }
}

async function seed() {
  console.log("🌱 Seeding Roy AI Agency database…");

  // ── 1. Agency user ────────────────────────────────────────────────────────────
  let [agencyUser] = await db.select().from(users).where(eq(users.email, "agency@demo.com")).limit(1);
  if (!agencyUser) {
    [agencyUser] = await db.insert(users).values({
      id:           AGENCY_ID,
      email:        "agency@demo.com",
      passwordHash: await hash("demo123"),
      role:         "agency",
      name:         "Roy Agency",
      businessName: "Roy AI Agency",
    }).returning();
    console.log("  ✅ Created agency@demo.com");
  }

  // ── 2. Agency config (global blocked words) ───────────────────────────────────
  const [existingConfig] = await db.select().from(agencyConfig)
    .where(eq(agencyConfig.agencyId, AGENCY_ID)).limit(1);
  if (!existingConfig) {
    await db.insert(agencyConfig).values({
      agencyId:      AGENCY_ID,
      globalBlocked: "competitor, spam, free money",
    });
    console.log("  ✅ Seeded agency config");
  }

  // ── 3. Clients ────────────────────────────────────────────────────────────────
  console.log("\n🏪 Seeding clients…");

  // Client 1 — active, all channels
  const client1Id = await upsertClient("client@demo.com", "Demo Business", "Raleigh Eats");
  await linkClientToAgency(client1Id, "active");
  await grantPlatformPerms(client1Id, [
    { platform: "tiktok",    comments: true,  messages: false },
    { platform: "instagram", comments: true,  messages: true  },
    { platform: "facebook",  comments: true,  messages: true  },
    { platform: "whatsapp",  comments: false, messages: true  },
    { platform: "sms",       comments: false, messages: true  },
    { platform: "phone",     comments: false, messages: false },
  ]);

  // Client 2 — active, Instagram + TikTok focus
  const client2Id = await upsertClient("nour@demo.com", "Nour Al-Rashid", "Nour Sweets");
  await linkClientToAgency(client2Id, "active");
  await grantPlatformPerms(client2Id, [
    { platform: "tiktok",    comments: true,  messages: false },
    { platform: "instagram", comments: true,  messages: true  },
    { platform: "facebook",  comments: false, messages: false },
    { platform: "whatsapp",  comments: false, messages: false },
    { platform: "sms",       comments: false, messages: false },
    { platform: "phone",     comments: false, messages: false },
  ]);

  // Client 3 — active, Facebook + Instagram
  const client3Id = await upsertClient("techhub@demo.com", "Faisal Al-Ghamdi", "Tech Hub SA");
  await linkClientToAgency(client3Id, "active");
  await grantPlatformPerms(client3Id, [
    { platform: "tiktok",    comments: false, messages: false },
    { platform: "instagram", comments: true,  messages: true  },
    { platform: "facebook",  comments: true,  messages: true  },
    { platform: "whatsapp",  comments: false, messages: true  },
    { platform: "sms",       comments: false, messages: false },
    { platform: "phone",     comments: false, messages: false },
  ]);

  // Client 4 — paused (shows status variety on agency dashboard)
  const client4Id = await upsertClient("vista@demo.com", "Hana Al-Otaibi", "Vista Cafe");
  await linkClientToAgency(client4Id, "paused");
  await grantPlatformPerms(client4Id, [
    { platform: "tiktok",    comments: false, messages: false },
    { platform: "instagram", comments: true,  messages: false },
    { platform: "facebook",  comments: false, messages: false },
    { platform: "whatsapp",  comments: false, messages: false },
    { platform: "sms",       comments: false, messages: false },
    { platform: "phone",     comments: false, messages: false },
  ]);

  // ── 4. Team members for demo client (Raleigh Eats) ───────────────────────────
  console.log("\n👥 Seeding team members…");
  const [existingTeam] = await db.select().from(teamMembers)
    .where(eq(teamMembers.userId, client1Id)).limit(1);
  if (!existingTeam) {
    await db.insert(teamMembers).values([
      { userId: client1Id, name: "Sara Al-Zahrani", email: "sara@raleigheats.com",   role: "agent",  status: "active"  },
      { userId: client1Id, name: "Khalid Mansour",  email: "khalid@raleigheats.com", role: "agent",  status: "active"  },
      { userId: client1Id, name: "Nada Ibrahim",    email: "nada@raleigheats.com",   role: "viewer", status: "invited" },
    ]);
    console.log("  ✅ Seeded 3 team members for Raleigh Eats");
  }

  // ── 5. Demo conversations for Client 1 ───────────────────────────────────────
  console.log("\n💬 Seeding conversations…");
  const existingConvs = await db.select({ id: conversations.id })
    .from(conversations).where(eq(conversations.userId, client1Id));

  if (existingConvs.length === 0) {
    const convData = [
      {
        contactId: "ig_user_1", contactName: "Layla Hassan", contactHandle: "@layla.h",
        channel: "instagram_dm" as const, lastMessage: "Do you deliver to Malaz?",
        unreadCount: 1, status: "pending" as const, priority: "normal" as const,
        messages: [
          { direction: "inbound" as const, content: "Do you deliver to Malaz?", aiReply: "Yes! We deliver to Malaz, Nakheel, and Sulaimaniyah. Minimum order is 60 SAR.", aiConfidence: 88, replyStatus: "pending" as const },
        ],
      },
      {
        contactId: "tt_user_1", contactName: "Ahmed Khalid", contactHandle: "@ahmed.k",
        channel: "tiktok_comment" as const, lastMessage: "What are your hours?",
        unreadCount: 1, status: "pending" as const, priority: "urgent" as const,
        messages: [
          { direction: "inbound" as const, content: "What are your hours? 😋", aiReply: "We're open daily from 12pm to 12am! Come visit us 🍽️", aiConfidence: 92, replyStatus: "pending" as const },
        ],
      },
      {
        contactId: "sms_user_1", contactName: "+966 50 234 5678", contactHandle: "+966502345678",
        channel: "sms" as const, lastMessage: "Is the shawarma available?",
        unreadCount: 0, status: "open" as const, priority: "normal" as const,
        messages: [
          { direction: "inbound" as const, content: "Is the shawarma available today?", aiReply: "Yes! Our shawarma is available every day. Would you like to place an order?", aiConfidence: 78, replyStatus: "approved" as const },
          { direction: "outbound" as const, content: "Yes! Our shawarma is available every day. Would you like to place an order?", sentBy: "ai" as const },
        ],
      },
      {
        contactId: "fb_user_1", contactName: "Sara Al-Otaibi", contactHandle: "@sara.ot",
        channel: "facebook_comment" as const, lastMessage: "Amazing food! 5 stars",
        unreadCount: 0, status: "resolved" as const, priority: "low" as const,
        messages: [
          { direction: "inbound" as const, content: "Amazing food! 5 stars 🌟", aiReply: "Thank you so much Sara! Your kind words mean everything to us. We look forward to serving you again! 😊", aiConfidence: 95, replyStatus: "auto_sent" as const },
        ],
      },
    ];

    for (const data of convData) {
      const [conv] = await db.insert(conversations).values({
        userId:        client1Id,
        contactId:     data.contactId,
        contactName:   data.contactName,
        contactHandle: data.contactHandle,
        channel:       data.channel,
        lastMessage:   data.lastMessage,
        unreadCount:   data.unreadCount,
        status:        data.status,
        priority:      data.priority,
        tags:          [],
      }).returning();

      for (const msg of data.messages) {
        await db.insert(messages).values({
          convId:       conv.id,
          direction:    msg.direction,
          content:      msg.content,
          aiReply:      "aiReply" in msg ? msg.aiReply : undefined,
          aiConfidence: "aiConfidence" in msg ? msg.aiConfidence : undefined,
          replyStatus:  "replyStatus" in msg ? msg.replyStatus : undefined,
          sentBy:       "sentBy" in msg ? msg.sentBy : undefined,
        });
      }
    }

    console.log("  ✅ Seeded 4 demo conversations for Raleigh Eats");
  }

  console.log("\n🎉 Seed complete — Roy AI Agency is ready!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index.js";
import { users, agencyClients, conversations, messages, platformPermissions } from "./schema.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const hash = (p: string) => bcrypt.hash(p, 10);

  // Upsert demo users
  const clientEmail = "client@demo.com";
  const agencyEmail = "agency@demo.com";

  let [clientUser] = await db.select().from(users).where(eq(users.email, clientEmail)).limit(1);
  if (!clientUser) {
    [clientUser] = await db.insert(users).values({
      email:        clientEmail,
      passwordHash: await hash("demo123"),
      role:         "client",
      name:         "Demo Business",
      businessName: "Raleigh Eats",
    }).returning();
    console.log("✅ Created client@demo.com");
  }

  let [agencyUser] = await db.select().from(users).where(eq(users.email, agencyEmail)).limit(1);
  if (!agencyUser) {
    [agencyUser] = await db.insert(users).values({
      email:        agencyEmail,
      passwordHash: await hash("demo123"),
      role:         "agency",
      name:         "Roy Agency",
      businessName: "Roy AI Agency",
    }).returning();
    console.log("✅ Created agency@demo.com");
  }

  // Link client to agency
  const [existingLink] = await db.select().from(agencyClients)
    .where(eq(agencyClients.clientId, clientUser.id)).limit(1);

  if (!existingLink) {
    await db.insert(agencyClients).values({
      agencyId: agencyUser.id,
      clientId: clientUser.id,
      status:   "active",
    });
    console.log("✅ Linked client to agency");
  }

  // Seed platform permissions for client
  const platformPerms = [
    { platform: "tiktok",    comments: true,  messages: false },
    { platform: "instagram", comments: true,  messages: true  },
    { platform: "facebook",  comments: true,  messages: true  },
    { platform: "whatsapp",  comments: false, messages: true  },
    { platform: "sms",       comments: false, messages: true  },
    { platform: "phone",     comments: false, messages: false },
  ] as const;

  for (const p of platformPerms) {
    const [existing] = await db.select().from(platformPermissions)
      .where(eq(platformPermissions.clientId, clientUser.id)).limit(1);
    if (!existing) {
      await db.insert(platformPermissions).values({
        clientId:        clientUser.id,
        grantedBy:       agencyUser.id,
        platform:        p.platform,
        commentsEnabled: p.comments,
        messagesEnabled: p.messages,
      });
    }
  }
  console.log("✅ Seeded platform permissions");

  // Seed demo conversations
  const existingConvs = await db.select({ id: conversations.id })
    .from(conversations).where(eq(conversations.userId, clientUser.id));

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
        userId:        clientUser.id,
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

    console.log("✅ Seeded 4 demo conversations");
  }

  console.log("🎉 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

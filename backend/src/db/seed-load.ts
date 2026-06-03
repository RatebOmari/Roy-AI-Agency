import "dotenv/config";
import bcrypt from "bcryptjs";
import { inArray, eq, sql } from "drizzle-orm";
import { db, sqlClient } from "./index.js";
import { users, agencyClients, contacts, conversations, messages } from "./schema.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHUNK = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Data pools ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "William", "Barbara", "David", "Susan", "Richard", "Jessica", "Joseph", "Sarah",
  "Thomas", "Karen", "Charles", "Lisa", "Christopher", "Nancy", "Daniel", "Betty",
  "Matthew", "Margaret", "Anthony", "Sandra", "Mark", "Ashley", "Donald", "Dorothy",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Melissa", "George", "Deborah",
  "Timothy", "Stephanie", "Ronald", "Rebecca", "Edward", "Sharon", "Jason", "Laura",
  "Jeffrey", "Cynthia", "Ryan", "Kathleen", "Jacob", "Amy", "Gary", "Angela",
  "Nicholas", "Shirley", "Eric", "Anna", "Jonathan", "Brenda", "Stephen", "Pamela",
  "Larry", "Emma", "Justin", "Nicole", "Scott", "Helen", "Brandon", "Samantha",
  "Benjamin", "Katherine", "Samuel", "Christine", "Raymond", "Debra", "Gregory", "Rachel",
  "Frank", "Carolyn", "Alexander", "Janet", "Patrick", "Catherine", "Jack", "Maria",
  "Dennis", "Heather", "Jerry", "Diane", "Tyler", "Julie", "Aaron", "Joyce",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
  "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
  "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
  "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza",
  "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers",
];

const TAGS            = ["vip", "regular", "new", "inactive", "wholesale"] as const;
const CONTACT_CHANNELS = ["whatsapp_business", "sms", "instagram"] as const;

const CONV_CHANNELS = [
  "instagram_dm", "facebook_messenger", "whatsapp_business", "tiktok_dm",
] as const;
const CONV_STATUSES = ["open", "pending", "resolved"] as const;

const CUSTOMER_MESSAGES = [
  "Hi! Do you have any specials today?",
  "What are your hours on weekends?",
  "Can I make a reservation for 4 people?",
  "Is the pasta dish gluten-free?",
  "Do you offer takeout?",
  "How long is the wait time right now?",
  "What's your most popular dish?",
  "Do you have vegan options on the menu?",
  "Is parking available nearby?",
  "Can I get a birthday cake with my order?",
  "Do you cater for large events?",
  "Is there a kids menu available?",
  "Do you accept credit cards?",
  "Can I see the full menu online?",
  "Are you open on Thanksgiving?",
  "I'd like to place a large order for pickup.",
  "Do you have a loyalty rewards program?",
  "What's the minimum order for delivery?",
  "How do I cancel my reservation?",
  "Can I bring my dog to the patio?",
  "Are there any allergen-free options?",
  "Do you have a happy hour?",
  "Is the fish fresh or frozen?",
  "How do I apply a promo code?",
] as const;

const AGENT_MESSAGES = [
  "Thanks for reaching out! We'd be happy to help.",
  "Great question! Let me check that for you.",
  "We're open Monday through Sunday, 11am to 10pm.",
  "Yes, we do offer that option! Would you like more details?",
  "We appreciate your interest! Our team will follow up shortly.",
  "Absolutely, we can accommodate your request.",
  "Thanks for your patience while we look into this.",
  "That's a great choice! You won't be disappointed.",
  "We look forward to seeing you soon!",
  "Your reservation has been confirmed. See you then!",
  "We have several great options for that. Can I ask a few questions?",
  "Thank you for being a loyal customer!",
  "Feel free to call us at any time if you need more help.",
  "We'll make sure everything is ready for you.",
  "Happy to assist — here's the info you need!",
] as const;

// ── Phone generator: +1-919-xxx-xxxx ─────────────────────────────────────────

function generatePhone(index: number): string {
  const area       = 919;
  const exchange   = 200 + Math.floor(index / 10000) % 800;
  const subscriber = (2000000 + index) % 10000;
  return `+1-${area}-${String(exchange).padStart(3, "0")}-${String(subscriber).padStart(4, "0")}`;
}

// ── Seed function ─────────────────────────────────────────────────────────────

async function seedLoad() {
  console.log("Starting load-test data seed...\n");

  // ── 1. Agency user ────────────────────────────────────────────────────────

  console.log("Checking for agency user loadtest@agency.com...");
  let [agencyUser] = await db.select().from(users)
    .where(eq(users.email, "loadtest@agency.com")).limit(1);

  if (!agencyUser) {
    [agencyUser] = await db.insert(users).values({
      email:        "loadtest@agency.com",
      passwordHash: await bcrypt.hash("loadtest123", 10),
      role:         "agency",
      name:         "Load Test Agency",
      businessName: "Load Test Agency",
    }).returning();
    console.log("  Created agency user loadtest@agency.com");
  } else {
    console.log("  Agency user already exists — skipping");
  }

  const agencyId = agencyUser.id;

  // ── 2. Client user ────────────────────────────────────────────────────────

  console.log("\nChecking for client Raleigh Test Restaurant...");
  let [clientUser] = await db.select().from(users)
    .where(eq(users.email, "loadtest-client@raleightest.com")).limit(1);

  if (!clientUser) {
    [clientUser] = await db.insert(users).values({
      email:        "loadtest-client@raleightest.com",
      passwordHash: await bcrypt.hash("loadtest123", 10),
      role:         "client",
      name:         "Raleigh Test Restaurant",
      businessName: "Raleigh Test Restaurant",
    }).returning();

    await db.insert(agencyClients).values({
      agencyId,
      clientId: clientUser.id,
      status:   "active",
    });

    console.log("  Created client: Raleigh Test Restaurant (linked to agency)");
  } else {
    console.log("  Client already exists — skipping");
  }

  const clientUserId = clientUser.id;

  // ── 3. Contacts (5,000) ───────────────────────────────────────────────────

  const CONTACT_TARGET = 5000;

  console.log("\nChecking existing contacts...");
  const [{ contactCount }] = await db
    .select({ contactCount: sql<number>`count(*)::int` })
    .from(contacts)
    .where(eq(contacts.userId, clientUserId));

  let createdContacts = 0;

  if (contactCount >= CONTACT_TARGET) {
    console.log(`  ${contactCount} contacts already exist — skipping`);
  } else {
    const startIdx  = contactCount;
    const remaining = CONTACT_TARGET - contactCount;
    console.log(`  Found ${contactCount} contacts. Inserting ${remaining} more...\n`);

    const allContactRows = Array.from({ length: remaining }, (_, i) => {
      const idx       = startIdx + i;
      const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
      const lastName  = LAST_NAMES[Math.floor(idx / FIRST_NAMES.length) % LAST_NAMES.length];
      const name      = `${firstName} ${lastName}`;
      const slug      = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}`;
      const email     = `${slug}@gmail.com`;
      const phone     = generatePhone(idx);
      // 1 or 2 tags, deduplicated
      const tagSet    = new Set([pick(TAGS), ...(Math.random() > 0.6 ? [pick(TAGS)] : [])]);
      const tags      = JSON.stringify([...tagSet]);
      const channel   = pick(CONTACT_CHANNELS);
      const handles   = JSON.stringify([{ channel, username: `@${slug}` }]);

      return { userId: clientUserId, name, phone, email, handles, tags };
    });

    for (const [bi, batch] of chunk(allContactRows, CHUNK).entries()) {
      const start = startIdx + bi * CHUNK;
      const end   = start + batch.length - 1;
      console.log(`  Inserting contacts ${start}–${end}...`);
      await db.insert(contacts).values(batch);
      createdContacts += batch.length;
    }

    console.log(`  Contacts done: ${createdContacts} inserted`);
  }

  // ── 4. Conversations (500) ────────────────────────────────────────────────

  const CONV_TARGET = 500;

  console.log("\nChecking existing conversations...");
  const [{ convCount }] = await db
    .select({ convCount: sql<number>`count(*)::int` })
    .from(conversations)
    .where(eq(conversations.userId, clientUserId));

  let createdConversations = 0;
  let allConvIds: string[] = [];

  if (convCount >= CONV_TARGET) {
    console.log(`  ${convCount} conversations already exist — skipping`);
    const rows = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, clientUserId))
      .limit(CONV_TARGET);
    allConvIds = rows.map((r) => r.id);
  } else {
    // Collect any pre-existing conv IDs
    if (convCount > 0) {
      const existing = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.userId, clientUserId));
      allConvIds = existing.map((r) => r.id);
    }

    const startIdx  = convCount;
    const remaining = CONV_TARGET - convCount;
    console.log(`  Found ${convCount} conversations. Inserting ${remaining} more...\n`);

    const allConvRows = Array.from({ length: remaining }, (_, i) => {
      const idx         = startIdx + i;
      const firstName   = FIRST_NAMES[(idx * 3) % FIRST_NAMES.length];
      const lastName    = LAST_NAMES[(idx * 7) % LAST_NAMES.length];
      const contactName = `${firstName} ${lastName}`;
      const channel     = pick(CONV_CHANNELS);
      const status      = CONV_STATUSES[idx % CONV_STATUSES.length];
      const handle      = `@${firstName.toLowerCase()}${idx}`;
      const lastMsg     = pick(CUSTOMER_MESSAGES);

      return {
        userId:        clientUserId,
        contactId:     `lt_contact_${idx}`,
        contactName,
        contactHandle: handle,
        channel,
        lastMessage:   lastMsg,
        unreadCount:   status === "open" || status === "pending" ? randInt(0, 5) : 0,
        status,
        priority:      pick(["urgent", "normal", "low"] as const),
        tags:          [] as string[],
      };
    });

    for (const [bi, batch] of chunk(allConvRows, CHUNK).entries()) {
      const start = startIdx + bi * CHUNK;
      const end   = start + batch.length - 1;
      console.log(`  Inserting conversations ${start}–${end}...`);
      const returned = await db
        .insert(conversations)
        .values(batch)
        .returning({ id: conversations.id });
      allConvIds.push(...returned.map((r) => r.id));
      createdConversations += batch.length;
    }

    console.log(`  Conversations done: ${createdConversations} inserted`);
  }

  // ── 5. Messages (1,000 — 2 per conversation) ──────────────────────────────

  const MSG_TARGET = 1000;

  console.log("\nChecking existing messages...");

  // Count messages belonging to this client's conversations
  let existingMsgCount = 0;
  if (allConvIds.length > 0) {
    for (const idBatch of chunk(allConvIds, CHUNK)) {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(messages)
        .where(inArray(messages.convId, idBatch));
      existingMsgCount += cnt;
    }
  }

  let createdMessages = 0;

  if (existingMsgCount >= MSG_TARGET) {
    console.log(`  ${existingMsgCount} messages already exist — skipping`);
  } else {
    const remaining = MSG_TARGET - existingMsgCount;
    console.log(`  Found ${existingMsgCount} messages. Inserting ${remaining} more...\n`);

    // Build 2-message pairs (inbound then outbound) across available convs
    type MsgRow = {
      convId:      string;
      direction:   "inbound" | "outbound";
      content:     string;
      replyStatus: "pending" | "approved" | null;
      sentBy:      "ai" | "human" | null;
    };

    const msgRows: MsgRow[] = [];
    for (let i = 0; msgRows.length < remaining && i < allConvIds.length; i++) {
      const convId = allConvIds[i];
      if (msgRows.length < remaining) {
        msgRows.push({
          convId,
          direction:   "inbound",
          content:     pick(CUSTOMER_MESSAGES),
          replyStatus: "pending",
          sentBy:      null,
        });
      }
      if (msgRows.length < remaining) {
        msgRows.push({
          convId,
          direction:   "outbound",
          content:     pick(AGENT_MESSAGES),
          replyStatus: "approved",
          sentBy:      Math.random() > 0.4 ? "ai" : "human",
        });
      }
    }

    for (const [bi, batch] of chunk(msgRows, CHUNK).entries()) {
      const start = existingMsgCount + bi * CHUNK;
      const end   = start + batch.length - 1;
      console.log(`  Inserting messages ${start}–${end}...`);
      await db.insert(messages).values(
        batch.map((m) => ({
          convId:      m.convId,
          direction:   m.direction,
          content:     m.content,
          replyStatus: m.replyStatus ?? undefined,
          sentBy:      m.sentBy ?? undefined,
        })),
      );
      createdMessages += batch.length;
    }

    console.log(`  Messages done: ${createdMessages} inserted`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const totalContacts      = createdContacts      || contactCount;
  const totalConversations = createdConversations || convCount;
  const totalMessages      = createdMessages      || existingMsgCount;

  console.log(
    `\nLoad test data: ${totalContacts} contacts, ${totalConversations} conversations, ${totalMessages} messages created`,
  );

  await sqlClient.end();
  process.exit(0);
}

seedLoad().catch((err) => {
  console.error("Load seed failed:", err);
  sqlClient.end().finally(() => process.exit(1));
});

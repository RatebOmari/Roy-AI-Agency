/**
 * Presentation-ready demo seed — run AFTER seed.ts.
 * Adds realistic scheduled posts, Knowledge Base entries, outreach campaign,
 * contacts, listening mentions, and Instagram/TikTok comments for client1 (Raleigh Eats).
 *
 * Usage: npm run seed:demo
 */
import "dotenv/config";
import { db, sqlClient } from "./index.js";
import {
  users, scheduledPosts, resources, outreachMessages, contacts,
  listeningMentions, comments,
} from "./schema.js";
import { eq, count } from "drizzle-orm";

async function getClientId(email: string): Promise<string> {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!u) throw new Error(`User ${email} not found — run seed.ts first`);
  return u.id;
}

async function rowCount(table: Parameters<typeof db.select>[0], userId: string): Promise<number> {
  // @ts-ignore — generic count helper
  const [{ n }] = await db.select({ n: count() }).from(table).where(eq((table as any).userId, userId));
  return Number(n);
}

async function seedDemo() {
  console.log("🎬 Seeding presentation demo data…");

  const client1Id = await getClientId("client@demo.com");
  const client2Id = await getClientId("nour@demo.com");

  // ── Scheduled Posts ───────────────────────────────────────────────────────────
  console.log("\n📅 Seeding scheduled posts…");
  const postsExist = await db.select({ n: count() }).from(scheduledPosts).where(eq(scheduledPosts.userId, client1Id));
  if (Number(postsExist[0].n) === 0) {
    const now = new Date();
    const inOneHour   = new Date(now.getTime() + 3_600_000);
    const tomorrow10  = new Date(now); tomorrow10.setDate(tomorrow10.getDate() + 1); tomorrow10.setHours(10, 0, 0, 0);
    const tomorrow18  = new Date(now); tomorrow18.setDate(tomorrow18.getDate() + 1); tomorrow18.setHours(18, 0, 0, 0);
    const nextWeek    = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);

    await db.insert(scheduledPosts).values([
      {
        userId:      client1Id,
        platforms:   ["instagram", "facebook"],
        content:     "🍽️ Friday is for feasts! Our weekend special is here — Grilled Lamb Machboos with slow-cooked rice and fresh salad. Limited plates available. Reserve yours now! #RaleighEats #FridaySpecial #SaudiFood",
        mediaUrl:    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=1080",
        scheduledAt: inOneHour,
        status:      "scheduled",
        approvalStatus: "approved",
        aiGenerated: true,
      },
      {
        userId:      client1Id,
        platforms:   ["instagram"],
        content:     "Behind the scenes 👨‍🍳 Our chef has been perfecting this shawarma recipe for 15 years. Every wrap is made to order with fresh-baked bread. Come taste the difference! 🌯 #BehindTheScenes #Shawarma #RaleighEats",
        mediaUrl:    "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=1080",
        scheduledAt: tomorrow10,
        status:      "scheduled",
        approvalStatus: "approved",
        aiGenerated: false,
      },
      {
        userId:      client1Id,
        platforms:   ["tiktok", "instagram"],
        content:     "✨ New on the menu: Truffle Hummus with warm pita! The creamiest hummus you've ever tasted, drizzled with premium truffle oil. Available this week only — tag a friend who needs to try this 👇",
        scheduledAt: tomorrow18,
        status:      "pending_approval",
        approvalStatus: "pending",
        approvalRequired: true,
        aiGenerated: true,
      },
      {
        userId:      client1Id,
        platforms:   ["instagram", "facebook", "tiktok"],
        content:     "🎉 We're turning 5! To celebrate our 5th anniversary, we're offering 50% off ALL orders this Saturday from 12pm–4pm. No code needed — just walk in! Share this with everyone you know 🙌 #RaleighEats5Years",
        scheduledAt: nextWeek,
        status:      "draft",
        approvalStatus: "not_required",
        aiGenerated: false,
      },
    ]);
    // One published post with metrics visible on analytics
    const yesterday = new Date(now.getTime() - 86_400_000);
    await db.insert(scheduledPosts).values({
      userId:      client1Id,
      platforms:   ["instagram"],
      content:     "Good morning Riyadh! 🌅 Start your week right with our breakfast platter — eggs, foul, cheese, and fresh juice. Open 7am daily. #Breakfast #RaleighEats #GoodMorning",
      mediaUrl:    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1080",
      scheduledAt: yesterday,
      publishedAt: yesterday,
      status:      "published",
      approvalStatus: "approved",
      aiGenerated: false,
    });
    console.log("  ✅ Seeded 5 scheduled posts for Raleigh Eats");
  } else {
    console.log("  ⏭️  Posts already exist, skipping");
  }

  // ── Knowledge Base ────────────────────────────────────────────────────────────
  console.log("\n📚 Seeding knowledge base…");
  const kbExist = await db.select({ n: count() }).from(resources).where(eq(resources.userId, client1Id));
  if (Number(kbExist[0].n) === 0) {
    await db.insert(resources).values([
      {
        userId:   client1Id,
        type:     "info",
        title:    "About Raleigh Eats",
        content:  "Raleigh Eats is a family-owned restaurant in Riyadh founded in 2020 specializing in Najdi and Levantine cuisine. We pride ourselves on using fresh, locally-sourced ingredients and traditional recipes passed down through generations.",
      },
      {
        userId:   client1Id,
        type:     "hours",
        title:    "Operating Hours",
        content:  "Sunday–Thursday: 12:00 PM – 12:00 AM\nFriday–Saturday: 12:00 PM – 1:00 AM\nWe are open all public holidays except Eid Al-Fitr (closed first 2 days).",
      },
      {
        userId:   client1Id,
        type:     "faq",
        title:    "Delivery & Ordering",
        content:  "We deliver within Riyadh via Jahez and HungerStation. Minimum order: 60 SAR. Free delivery for orders above 150 SAR. Average delivery time: 30–45 minutes. We also accept pre-orders for events with 48 hours notice.",
      },
      {
        userId:   client1Id,
        type:     "faq",
        title:    "Dietary Options",
        content:  "All our meat is halal-certified. We offer vegetarian options clearly marked on the menu. Vegan options are available on request. Please inform us of any allergies when ordering — we can accommodate most dietary restrictions.",
      },
      {
        userId:   client1Id,
        type:     "offer",
        title:    "Current Promotions",
        content:  "Friday Family Meal: 4-person set for 189 SAR (save 60 SAR).\nLoyalty program: Earn 1 point per SAR, redeem 100 points for 10 SAR off.\nBirthday treat: Free dessert for birthday guests (show ID).",
      },
      {
        userId:   client2Id,
        type:     "info",
        title:    "About Nour Sweets",
        content:  "Nour Sweets specializes in handmade Gulf sweets and pastries including Luqaimat, Baklava, Qatayef, and seasonal specialty desserts. Founded in Jeddah in 2021, now shipping across the Kingdom.",
      },
      {
        userId:   client2Id,
        type:     "hours",
        title:    "Hours & Ordering",
        content:  "Online orders: 24/7 via our website and Instagram (@noursweets). Physical pickup: Daily 10am–10pm at Al-Andalus Mall, Jeddah. Custom orders for weddings and events require 3 days advance notice.",
      },
    ]);
    console.log("  ✅ Seeded knowledge base for Raleigh Eats + Nour Sweets");
  } else {
    console.log("  ⏭️  Knowledge base already exists, skipping");
  }

  // ── Contacts ──────────────────────────────────────────────────────────────────
  console.log("\n👥 Seeding contacts…");
  const contactsExist = await db.select({ n: count() }).from(contacts).where(eq(contacts.userId, client1Id));
  if (Number(contactsExist[0].n) === 0) {
    await db.insert(contacts).values([
      {
        userId: client1Id,
        name:   "Layla Hassan",
        phone:  "+966501234567",
        email:  "layla.hassan@gmail.com",
        tags:   JSON.stringify(["vip", "regular"]),
        handles: JSON.stringify([{ channel: "instagram", username: "@layla.h" }, { channel: "whatsapp_business", username: "+966501234567" }]),
        notes: "Prefers vegetarian options. Has ordered 12+ times.",
      },
      {
        userId: client1Id,
        name:   "Ahmed Khalid",
        phone:  "+966509876543",
        email:  "ahmed.k@hotmail.com",
        tags:   JSON.stringify(["regular"]),
        handles: JSON.stringify([{ channel: "tiktok", username: "@ahmed.k" }]),
        notes: "Very active on TikTok. Frequently comments on new menu items.",
      },
      {
        userId: client1Id,
        name:   "Sara Al-Otaibi",
        phone:  "+966555111222",
        email:  "sara.ot@gmail.com",
        tags:   JSON.stringify(["vip"]),
        handles: JSON.stringify([{ channel: "facebook", username: "Sara Al-Otaibi" }, { channel: "sms", username: "+966555111222" }]),
        notes: "Event coordinator — has booked private dining twice.",
      },
      {
        userId: client1Id,
        name:   "Mohammed Al-Rasheed",
        phone:  "+966503334444",
        email:  "m.rasheed@company.sa",
        tags:   JSON.stringify(["wholesale", "vip"]),
        handles: JSON.stringify([{ channel: "whatsapp_business", username: "+966503334444" }]),
        notes: "Corporate catering client. Monthly standing order.",
      },
      {
        userId: client1Id,
        name:   "Fatima Zahra",
        phone:  "+966507778888",
        email:  "fatima.zahra@icloud.com",
        tags:   JSON.stringify(["new"]),
        handles: JSON.stringify([{ channel: "instagram", username: "@fatimazahra_ruh" }]),
      },
    ]);
    console.log("  ✅ Seeded 5 contacts for Raleigh Eats");
  } else {
    console.log("  ⏭️  Contacts already exist, skipping");
  }

  // ── Outreach Message ──────────────────────────────────────────────────────────
  console.log("\n📤 Seeding outreach messages…");
  const outreachExist = await db.select({ n: count() }).from(outreachMessages).where(eq(outreachMessages.userId, client1Id));
  if (Number(outreachExist[0].n) === 0) {
    await db.insert(outreachMessages).values([
      {
        userId:        client1Id,
        title:         "Friday Special Announcement",
        channel:       "whatsapp",
        messageBody:   "🍽️ This Friday only — Family Feast for 189 SAR! Grilled lamb, rice, salad & drinks for 4 people. Order before 10pm Thursday to guarantee your spot. Reply to this message to reserve now!",
        audienceFilter: JSON.stringify({ type: "tag", tagValue: "vip" }),
        status:        "sent",
        sentAt:        new Date(Date.now() - 86_400_000),
        sentCount:     48,
        deliveredCount: 45,
        actualReach:   48,
      },
      {
        userId:        client1Id,
        title:         "Anniversary Email Blast",
        channel:       "email",
        subject:       "🎉 We're turning 5 — You're invited to celebrate!",
        messageBody:   "Dear valued customer,\n\nFive years ago we opened our doors in Riyadh with a simple dream: to bring authentic Najdi flavors to every table. Today, thanks to you, we're celebrating 5 incredible years.\n\nAs a thank you, we're offering 50% off all orders this Saturday (12pm–4pm). No code needed — just show this email.\n\nWe hope to see you there.\n\nWith gratitude,\nThe Raleigh Eats Family",
        audienceFilter: JSON.stringify({ type: "all" }),
        status:        "draft",
      },
    ]);
    console.log("  ✅ Seeded 2 outreach messages for Raleigh Eats");
  } else {
    console.log("  ⏭️  Outreach already exists, skipping");
  }

  // ── Listening Mentions ────────────────────────────────────────────────────────
  console.log("\n📡 Seeding listening mentions…");
  const mentionsExist = await db.select({ n: count() }).from(listeningMentions).where(eq(listeningMentions.userId, client1Id));
  if (Number(mentionsExist[0].n) === 0) {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
    await db.insert(listeningMentions).values([
      { userId: client1Id, platform: "instagram", keyword: "Raleigh Eats", username: "@foodie_riyadh", content: "Just tried @raleigheats for the first time and WOW 🤩 The shawarma is on another level. Definitely coming back!", sentiment: "positive", url: "https://instagram.com/p/demo1", timestamp: hoursAgo(2) },
      { userId: client1Id, platform: "tiktok", keyword: "Raleigh Eats", username: "@riyadh_foodie_tv", content: "rating every restaurant in Riyadh — Raleigh Eats gets a 9/10 from me 🔥 the lamb machboos is 🤌", sentiment: "positive", url: "https://tiktok.com/@demo/video/1", timestamp: hoursAgo(5), isHandled: false },
      { userId: client1Id, platform: "instagram", keyword: "raleigheats", username: "@disappointed_customer", content: "Waited 90 minutes for my delivery from Raleigh Eats tonight. No communication, food was cold. Very disappointed.", sentiment: "negative", timestamp: hoursAgo(8) },
      { userId: client1Id, platform: "facebook", keyword: "Raleigh Eats", username: "Khalid Bin Saleh", content: "Question — does Raleigh Eats offer catering for weddings? Looking for something authentic for my sister's event.", sentiment: "neutral", timestamp: hoursAgo(12) },
      { userId: client1Id, platform: "instagram", keyword: "raleigheats", username: "@mama_cooking_sa", content: "Finally found a restaurant that tastes like homemade 😭❤️ Raleigh Eats you are keeping our traditions alive. Thank you!", sentiment: "positive", url: "https://instagram.com/p/demo2", timestamp: hoursAgo(18), isHandled: true },
      { userId: client1Id, platform: "tiktok", keyword: "Raleigh Eats", username: "@reviews_riyadh", content: "Raleigh Eats review: Great food, decent prices, but the parking situation needs improvement.", sentiment: "neutral", url: "https://tiktok.com/@demo/video/2", timestamp: hoursAgo(24) },
    ]);
    console.log("  ✅ Seeded 6 listening mentions for Raleigh Eats");
  } else {
    console.log("  ⏭️  Listening mentions already exist, skipping");
  }

  // ── Instagram Comments (for Comments page) ────────────────────────────────────
  console.log("\n💬 Seeding platform comments…");
  const commentsExist = await db.select({ n: count() }).from(comments).where(eq(comments.userId, client1Id));
  if (Number(commentsExist[0].n) === 0) {
    const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
    await db.insert(comments).values([
      { userId: client1Id, platform: "instagram", username: "@layla.h", content: "This looks amazing! What time do you open?", postCaption: "🌅 Good morning Riyadh!", aiReply: "Thank you Layla! We open at 12pm daily. Can't wait to have you in 😊", status: "pending", sentiment: "positive", timestamp: daysAgo(1) },
      { userId: client1Id, platform: "instagram", username: "@ahmed.k", content: "Best shawarma in Riyadh no cap 🔥🔥🔥", postCaption: "Behind the scenes 👨‍🍳", aiReply: "Thank you Ahmed, that means a lot to us! See you soon 🌯", status: "approved", sentiment: "positive", timestamp: daysAgo(1) },
      { userId: client1Id, platform: "tiktok", username: "@riyadh_foodie_tv", content: "Do you deliver to north Riyadh?", postCaption: "✨ New on the menu: Truffle Hummus", aiReply: "Yes! We deliver all over Riyadh via Jahez and HungerStation. Drop us a DM to confirm your area 🙌", status: "pending", sentiment: "neutral", timestamp: daysAgo(2) },
      { userId: client1Id, platform: "instagram", username: "@mama_cooking_sa", content: "The lamb machboos looks exactly like my grandma used to make 😭❤️", postCaption: "Friday is for feasts! 🍽️", aiReply: "That's the highest compliment we could receive — we use traditional recipes passed down through generations. Thank you! ❤️", status: "auto_sent", sentiment: "positive", timestamp: daysAgo(2) },
      { userId: client1Id, platform: "facebook", username: "Sara Al-Otaibi", content: "Is the truffle hummus available for takeaway?", postCaption: "New menu item! Truffle Hummus", aiReply: "Absolutely, Sara! All our menu items are available for takeaway and delivery. Order through Jahez or DM us directly 😊", status: "approved", sentiment: "neutral", timestamp: daysAgo(3) },
      { userId: client1Id, platform: "instagram", username: "@disappointed_user_22", content: "Waited 2 hours for delivery last week and the food was cold 😤", postCaption: "We deliver across Riyadh!", aiReply: "We're so sorry to hear about your experience. Please DM us your order details and we will make it right immediately.", status: "pending", sentiment: "negative", timestamp: daysAgo(3) },
      { userId: client1Id, platform: "tiktok", username: "@food_reviewer_ksa", content: "What's the price for the family meal?", postCaption: "🎉 Anniversary celebration!", aiReply: "Our Family Feast is 189 SAR for 4 people — includes main dish, rice, salad and drinks! Great value 😊", status: "pending", sentiment: "neutral", timestamp: daysAgo(4) },
    ]);
    console.log("  ✅ Seeded 7 platform comments for Raleigh Eats");
  } else {
    console.log("  ⏭️  Comments already exist, skipping");
  }

  console.log("\n🎬 Demo seed complete — presentation-ready!\n");
  console.log("  Login with:");
  console.log("    Agency:  agency@demo.com / demo123");
  console.log("    Client:  client@demo.com / demo123");
  console.log("    Client2: nour@demo.com   / demo123");

  await sqlClient.end();
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("Demo seed failed:", err);
  sqlClient.end().catch(() => {}).finally(() => process.exit(1));
});

/**
 * contactSync.ts
 *
 * Keeps the contacts CRM table in sync with inbound conversations.
 * Called every time a new inbound message arrives — creates or updates
 * the contact record so the Contacts page reflects real engagement data.
 */

import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { contacts } from "../db/schema.js";

interface Handle {
  channel: string;
  username: string;
}

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/**
 * Upsert a contact from an inbound message event.
 * Matches by userId + contactId (the platform's user ID / phone).
 * Creates on first contact; updates name, adds the channel handle,
 * increments totalConversations, and updates lastSeenAt on subsequent ones.
 */
export async function syncContact(
  userId:    string,
  contactId: string,    // platform user ID / phone number
  name:      string,
  handle:    string,    // @username / phone / display handle
  channel:   string,
): Promise<void> {
  // Look up by contactId stored as the first handle's username
  // We use the `notes` field as a surrogate "platform contact ID" key.
  // The canonical approach: find contacts whose handles array includes this contactId.
  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId));

  const existing = allContacts.find(c => {
    const handles = parseJSON<Handle[]>(c.handles, []);
    return handles.some(h => h.username === contactId || h.username === handle);
  });

  const newHandle: Handle = { channel, username: handle };

  if (existing) {
    const handles  = parseJSON<Handle[]>(existing.handles, []);
    // Add this channel/handle if not already present
    const hasHandle = handles.some(h => h.channel === channel && h.username === handle);
    const updatedHandles = hasHandle ? handles : [...handles, newHandle];

    await db
      .update(contacts)
      .set({
        name:               name || existing.name,
        handles:            JSON.stringify(updatedHandles),
        totalConversations: existing.totalConversations + 1,
        lastSeenAt:         new Date(),
      })
      .where(eq(contacts.id, existing.id));
  } else {
    await db.insert(contacts).values({
      userId,
      name:               name || handle,
      handles:            JSON.stringify([newHandle]),
      tags:               "[]",
      notes:              "",
      totalConversations: 1,
      lastSeenAt:         new Date(),
    });
  }
}

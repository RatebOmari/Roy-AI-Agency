import { db } from "../db/index.js";
import { resources, replyTemplates } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function buildKnowledgeContext(userId: string, platform?: string): Promise<string> {
  const [rows, templates] = await Promise.all([
    db
      .select({ id: resources.id, type: resources.type, title: resources.title, content: resources.content, active: resources.active })
      .from(resources)
      .where(and(eq(resources.userId, userId), eq(resources.active, true))),
    db
      .select({ title: replyTemplates.title, content: replyTemplates.content, platforms: replyTemplates.platforms, category: replyTemplates.category })
      .from(replyTemplates)
      .where(and(eq(replyTemplates.userId, userId), eq(replyTemplates.active, true))),
  ]);

  const lines: string[] = [];

  // ── Business info ──────────────────────────────────────────────────────────
  const info = rows.find(r => r.type === "info");
  if (info) {
    const d = parseJSON<{ name?: string; description?: string; address?: string; phone?: string; email?: string }>(info.content, {});
    lines.push("## Business Information");
    if (d.name)        lines.push(`Name: ${d.name}`);
    if (d.description) lines.push(`About: ${d.description}`);
    if (d.address)     lines.push(`Address: ${d.address}`);
    if (d.phone)       lines.push(`Phone: ${d.phone}`);
    if (d.email)       lines.push(`Email: ${d.email}`);
  }

  // ── Working hours ──────────────────────────────────────────────────────────
  const hours = rows.find(r => r.type === "hours");
  if (hours) {
    const entries = parseJSON<{ day: string; open: boolean; from: string; to: string }[]>(hours.content, []);
    if (entries.length) {
      lines.push("\n## Working Hours");
      entries.forEach(e => lines.push(e.open ? `${e.day}: ${e.from} – ${e.to}` : `${e.day}: Closed`));
    }
  }

  // ── Products / menu items ──────────────────────────────────────────────────
  const products = rows.filter(r => r.type === "menu_item");
  if (products.length) {
    lines.push("\n## Products & Services");
    products.forEach(r => {
      const m = parseJSON<{ name?: string; description?: string; price?: string }>(r.content, { name: r.title });
      lines.push(`- ${m.name ?? r.title}${m.price ? ` (${m.price})` : ""}${m.description ? `: ${m.description}` : ""}`);
    });
  }

  // ── Current offers ─────────────────────────────────────────────────────────
  const offers = rows.filter(r => r.type === "offer");
  if (offers.length) {
    lines.push("\n## Current Offers & Promotions");
    offers.forEach(r => {
      const o = parseJSON<{ title?: string; description?: string; expiresAt?: string }>(r.content, { title: r.title });
      lines.push(`- ${o.title ?? r.title}${o.description ? `: ${o.description}` : ""}${o.expiresAt ? ` (expires ${o.expiresAt})` : ""}`);
    });
  }

  // ── FAQs ───────────────────────────────────────────────────────────────────
  const faqs = rows.filter(r => r.type === "faq");
  if (faqs.length) {
    lines.push("\n## Frequently Asked Questions");
    faqs.forEach(r => {
      const f = parseJSON<{ question?: string; answer?: string }>(r.content, { question: r.title });
      lines.push(`Q: ${f.question ?? r.title}`);
      if (f.answer) lines.push(`A: ${f.answer}`);
    });
  }

  // ── Uploaded documents ─────────────────────────────────────────────────────
  const docs = rows.filter(r => r.type === "document");
  if (docs.length) {
    lines.push("\n## Reference Documents");
    docs.forEach(r => lines.push(`- ${r.title}`));
  }

  // ── Active reply templates (style examples) ────────────────────────────────
  // Filter to templates that apply to this platform (or universal ones)
  const relevantTemplates = platform
    ? templates.filter(t => t.platforms.length === 0 || t.platforms.includes(platform))
    : templates;

  if (relevantTemplates.length > 0) {
    lines.push("\n## Your Established Reply Style (use these as tone/format examples)");
    relevantTemplates.slice(0, 8).forEach(t => {
      // Truncate long templates to keep context size manageable
      const preview = t.content.length > 200 ? t.content.slice(0, 200) + "…" : t.content;
      const cat = t.category ? ` [${t.category}]` : "";
      lines.push(`- ${t.title}${cat}: "${preview}"`);
    });
  }

  return lines.join("\n");
}

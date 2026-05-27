import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useResources, useCreateResource, useUpdateResource, useDeleteResource, useUploadDocument,
} from "@/hooks/useResources";
import type { Resource, BusinessInfo, WorkingHoursEntry, MenuItem, OfferItem, FaqEntry } from "@/types";
import {
  BookOpen, Clock, ListChecks, Tag, FileText, Sparkles, Plus,
  Trash2, ChevronDown, ChevronUp, X, Upload, HelpCircle, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5",
          on ? "translate-x-4.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionBadge {
  count?: number;
  active?: boolean;
}

function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: SectionBadge;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="flex-1 text-left text-sm font-semibold text-foreground">{title}</span>
        {!open && badge && (
          <div className="flex items-center gap-2 mr-1">
            {badge.count !== undefined && (
              <span className="text-xs text-muted-foreground">
                {badge.count === 0
                  ? t("resources.section.empty")
                  : t("resources.section.items", { count: badge.count })}
              </span>
            )}
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                badge.active ? "bg-green-500" : "bg-muted-foreground/30"
              )}
            />
          </div>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Knowledge completeness bar ───────────────────────────────────────────────

function CompletenessBar({ configured, total }: { configured: number; total: number }) {
  const { t } = useTranslation();
  const pct = total === 0 ? 0 : Math.round((configured / total) * 100);
  const label =
    pct === 100 ? t("resources.completeness.complete") :
    pct >= 60   ? t("resources.completeness.good") :
                  t("resources.completeness.poor");

  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{t("resources.completeness.title")}</p>
        <span className="text-xs font-medium text-muted-foreground">
          {t("resources.completeness.sections", { configured, total })}
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── AI Context snapshot card ─────────────────────────────────────────────────

function ContextSnapshotCard({ resources, onViewFull }: { resources: Resource[]; onViewFull: () => void }) {
  const { t } = useTranslation();
  const activeCount = resources.filter(r => r.active).length;
  const info = resources.find(r => r.type === "info" && r.active);
  const infoData = info ? parseJSON<BusinessInfo>(info.content, { name: "", description: "", address: "", phone: "", email: "" }) : null;

  const snippetLines: string[] = [];
  if (infoData?.name) snippetLines.push(`Business: ${infoData.name}`);
  if (infoData?.description) snippetLines.push(infoData.description.slice(0, 80) + (infoData.description.length > 80 ? "…" : ""));
  const menuItems = resources.filter(r => r.type === "menu_item" && r.active);
  if (menuItems.length) snippetLines.push(`${menuItems.length} products/services · ${resources.filter(r => r.type === "offer" && r.active).length} offers`);

  const snippet = snippetLines.length
    ? snippetLines.join(" · ")
    : t("resources.snapshot.empty");

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{t("resources.snapshot.title")}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{snippet}</p>
        {activeCount > 0 && (
          <p className="text-xs text-primary/70 mt-1">
            {t("resources.snapshot.activeCount", { count: activeCount })}
          </p>
        )}
      </div>
      <button
        onClick={onViewFull}
        className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline flex-shrink-0 mt-0.5"
      >
        <Eye className="w-3.5 h-3.5" />
        {t("resources.snapshot.fullPreview")}
      </button>
    </div>
  );
}

// ─── Business Info section ────────────────────────────────────────────────────

function BusinessInfoSection({ resource }: { resource?: Resource }) {
  const { t } = useTranslation();
  const create = useCreateResource();
  const update = useUpdateResource();
  const defaults: BusinessInfo = { name: "", description: "", address: "", phone: "", email: "" };
  const [form, setForm] = useState<BusinessInfo>(
    resource ? parseJSON<BusinessInfo>(resource.content, defaults) : defaults
  );
  const [active, setActive] = useState(resource?.active ?? true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const payload = { type: "info" as const, title: "Business Info", content: JSON.stringify(form), active };
    if (resource) {
      update.mutate({ id: resource.id, ...payload });
    } else {
      create.mutate(payload);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const FIELD_LABELS: Record<string, string> = {
    name:    t("resources.info.fieldName"),
    phone:   t("resources.info.fieldPhone"),
    email:   t("resources.info.fieldEmail"),
    address: t("resources.info.fieldAddress"),
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("resources.info.description")}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("resources.toggle.active")}</span>
          <Toggle on={active} onChange={v => { setActive(v); if (resource) update.mutate({ id: resource.id, active: v }); }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["name", "phone", "email", "address"] as const).map(field => (
          <div key={field} className={field === "address" ? "sm:col-span-2" : ""}>
            <label className="block text-xs text-muted-foreground mb-1">{FIELD_LABELS[field]}</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">{t("resources.info.descriptionLabel")}</label>
          <textarea
            rows={3}
            placeholder={t("resources.info.descriptionPlaceholder")}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          {saved ? t("common.saved") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

// ─── Working Hours section ────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function WorkingHoursSection({ resource }: { resource?: Resource }) {
  const { t } = useTranslation();
  const create = useCreateResource();
  const update = useUpdateResource();
  const defaultHours: WorkingHoursEntry[] = DAYS.map(day => ({ day, open: true, from: "09:00", to: "17:00" }));
  const [hours, setHours] = useState<WorkingHoursEntry[]>(
    resource ? parseJSON<WorkingHoursEntry[]>(resource.content, defaultHours) : defaultHours
  );
  const [active, setActive] = useState(resource?.active ?? true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const payload = { type: "hours" as const, title: "Working Hours", content: JSON.stringify(hours), active };
    if (resource) update.mutate({ id: resource.id, ...payload });
    else create.mutate(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("resources.hours.description")}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("resources.toggle.active")}</span>
          <Toggle on={active} onChange={v => { setActive(v); if (resource) update.mutate({ id: resource.id, active: v }); }} />
        </div>
      </div>
      <div className="space-y-2">
        {hours.map((row, i) => (
          <div key={row.day} className="flex items-center gap-3 py-1">
            <span className="w-24 text-sm text-foreground flex-shrink-0">
              {t(`resources.days.${row.day.toLowerCase()}`)}
            </span>
            <Toggle
              on={row.open}
              onChange={v => setHours(h => h.map((x, j) => j === i ? { ...x, open: v } : x))}
            />
            <span className="text-xs text-muted-foreground w-12">
              {row.open ? t("resources.hours.open") : t("resources.hours.closed")}
            </span>
            {row.open && (
              <>
                <input
                  type="time"
                  className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={row.from}
                  onChange={e => setHours(h => h.map((x, j) => j === i ? { ...x, from: e.target.value } : x))}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="time"
                  className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={row.to}
                  onChange={e => setHours(h => h.map((x, j) => j === i ? { ...x, to: e.target.value } : x))}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-1">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          {saved ? t("common.saved") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

// ─── Products & Services section ──────────────────────────────────────────────

function ProductsSection({ resources }: { resources: Resource[] }) {
  const { t } = useTranslation();
  const create = useCreateResource();
  const update = useUpdateResource();
  const del = useDeleteResource();
  const [newItem, setNewItem] = useState<MenuItem>({ name: "", description: "", price: "" });
  const [adding, setAdding] = useState(false);

  const items = resources.filter(r => r.type === "menu_item");

  const handleAdd = () => {
    if (!newItem.name.trim()) return;
    create.mutate({ type: "menu_item", title: newItem.name, content: JSON.stringify(newItem), active: true });
    setNewItem({ name: "", description: "", price: "" });
    setAdding(false);
  };

  return (
    <div className="pt-4 space-y-3">
      <p className="text-xs text-muted-foreground">{t("resources.products.description")}</p>
      {items.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <ListChecks className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{t("resources.products.empty")}</p>
        </div>
      )}
      {items.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">{t("resources.table.name")}</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">{t("resources.table.description")}</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium w-20">{t("resources.table.price")}</th>
                <th className="px-3 py-2 w-10">{t("resources.toggle.active")}</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map(r => {
                const item = parseJSON<MenuItem>(r.content, { name: r.title, description: "", price: "" });
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell max-w-xs truncate">{item.description}</td>
                    <td className="px-3 py-2 text-foreground">{item.price || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Toggle on={r.active} onChange={v => update.mutate({ id: r.id, active: v })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => del.mutate(r.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding ? (
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.table.name")}</label>
            <input
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Premium Membership, Logo Design, 1-hr Consultation"
              value={newItem.name}
              onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.table.description")}</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Short description"
              value={newItem.description}
              onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.table.priceOptional")}</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. $49/mo"
              value={newItem.price}
              onChange={e => setNewItem(n => ({ ...n, price: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              {t("common.add")}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-xs hover:bg-muted/80 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> {t("resources.products.addItem")}
        </button>
      )}
    </div>
  );
}

// ─── Offers section ───────────────────────────────────────────────────────────

function OffersSection({ resources }: { resources: Resource[] }) {
  const { t } = useTranslation();
  const create = useCreateResource();
  const update = useUpdateResource();
  const del = useDeleteResource();
  const [newOffer, setNewOffer] = useState<OfferItem>({ title: "", description: "", expiresAt: "" });
  const [adding, setAdding] = useState(false);

  const offers = resources.filter(r => r.type === "offer");

  const handleAdd = () => {
    if (!newOffer.title.trim()) return;
    create.mutate({ type: "offer", title: newOffer.title, content: JSON.stringify(newOffer), active: true });
    setNewOffer({ title: "", description: "", expiresAt: "" });
    setAdding(false);
  };

  return (
    <div className="pt-4 space-y-3">
      <p className="text-xs text-muted-foreground">{t("resources.offers.description")}</p>
      {offers.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Tag className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{t("resources.offers.empty")}</p>
        </div>
      )}
      {offers.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">{t("resources.offers.titleLabel")}</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">{t("resources.table.description")}</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium w-24 hidden md:table-cell">{t("resources.offers.expiresLabel")}</th>
                <th className="px-3 py-2 w-10">{t("resources.toggle.active")}</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {offers.map(r => {
                const offer = parseJSON<OfferItem>(r.content, { title: r.title, description: "" });
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{offer.title}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell max-w-xs truncate">{offer.description}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{offer.expiresAt || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Toggle on={r.active} onChange={v => update.mutate({ id: r.id, active: v })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => del.mutate(r.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding ? (
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.offers.titleLabel")}</label>
            <input
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. 20% off first order, Free trial, Summer bundle"
              value={newOffer.title}
              onChange={e => setNewOffer(o => ({ ...o, title: e.target.value }))}
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.offers.detailsLabel")}</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Terms, conditions, or how to redeem"
              value={newOffer.description}
              onChange={e => setNewOffer(o => ({ ...o, description: e.target.value }))}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.offers.expiresOptional")}</label>
            <input
              type="date"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={newOffer.expiresAt ?? ""}
              onChange={e => setNewOffer(o => ({ ...o, expiresAt: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              {t("common.add")}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-xs hover:bg-muted/80 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> {t("resources.offers.addOffer")}
        </button>
      )}
    </div>
  );
}

// ─── FAQ section ──────────────────────────────────────────────────────────────

const FAQ_PLACEHOLDERS = [
  "Do you offer refunds or returns?",
  "Do you provide delivery or shipping?",
  "Is parking available?",
  "Do you accept appointments or walk-ins?",
  "What payment methods do you accept?",
];

function FaqSection({ resources }: { resources: Resource[] }) {
  const { t } = useTranslation();
  const create = useCreateResource();
  const update = useUpdateResource();
  const del = useDeleteResource();
  const [newFaq, setNewFaq] = useState<FaqEntry>({ question: "", answer: "" });
  const [adding, setAdding] = useState(false);

  const faqs = resources.filter(r => r.type === "faq");
  const placeholder = FAQ_PLACEHOLDERS[faqs.length % FAQ_PLACEHOLDERS.length];

  const handleAdd = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    create.mutate({
      type: "faq" as const,
      title: newFaq.question,
      content: JSON.stringify(newFaq),
      active: true,
    });
    setNewFaq({ question: "", answer: "" });
    setAdding(false);
  };

  return (
    <div className="pt-4 space-y-3">
      <p className="text-xs text-muted-foreground">{t("resources.faq.description")}</p>
      {faqs.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <HelpCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground mb-1">{t("resources.faq.empty")}</p>
          <p className="text-xs text-muted-foreground/60">e.g. &quot;{FAQ_PLACEHOLDERS[0]}&quot;</p>
        </div>
      )}
      {faqs.length > 0 && (
        <div className="space-y-2">
          {faqs.map(r => {
            const faq = parseJSON<FaqEntry>(r.content, { question: r.title, answer: "" });
            return (
              <div key={r.id} className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3 bg-muted/20">
                  <span className="text-xs font-semibold text-primary mt-0.5 flex-shrink-0">Q</span>
                  <p className="text-sm text-foreground font-medium flex-1 min-w-0">{faq.question}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle on={r.active} onChange={v => update.mutate({ id: r.id, active: v })} />
                    <button
                      onClick={() => del.mutate(r.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5 flex-shrink-0">A</span>
                  <p className="text-xs text-muted-foreground flex-1">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {adding ? (
        <div className="space-y-2 rounded-xl border border-border p-4 bg-muted/10">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.faq.questionLabel")}</label>
            <input
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={`e.g. "${placeholder}"`}
              value={newFaq.question}
              onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("resources.faq.answerLabel")}</label>
            <textarea
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Write the exact answer the AI should give…"
              value={newFaq.answer}
              onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-xs hover:bg-muted/80 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleAdd}
              disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("resources.faq.addFaq")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> {t("resources.faq.addFaq")}
        </button>
      )}
    </div>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

function DocumentsSection({ resources }: { resources: Resource[] }) {
  const { t } = useTranslation();
  const upload = useUploadDocument();
  const del = useDeleteResource();
  const update = useUpdateResource();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const docs = resources.filter(r => r.type === "document");

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => upload.mutate(f));
  };

  return (
    <div className="pt-4 space-y-4">
      <p className="text-xs text-muted-foreground">{t("resources.documents.description")}</p>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{t("resources.documents.dropHint")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("resources.documents.fileTypes")}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      {upload.isPending && (
        <p className="text-xs text-muted-foreground animate-pulse">{t("resources.documents.uploading")}</p>
      )}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <Toggle on={r.active} onChange={v => update.mutate({ id: r.id, active: v })} />
              <button
                onClick={() => del.mutate(r.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Context Preview modal ─────────────────────────────────────────────────

function buildPromptContext(resources: Resource[]): string {
  const active = resources.filter(r => r.active);
  const lines: string[] = [];

  const info = active.find(r => r.type === "info");
  if (info) {
    const d = parseJSON<BusinessInfo>(info.content, { name: "", description: "", address: "", phone: "", email: "" });
    lines.push("## Business Information");
    if (d.name) lines.push(`Name: ${d.name}`);
    if (d.description) lines.push(`About: ${d.description}`);
    if (d.address) lines.push(`Address: ${d.address}`);
    if (d.phone) lines.push(`Phone: ${d.phone}`);
    if (d.email) lines.push(`Email: ${d.email}`);
  }

  const hours = active.find(r => r.type === "hours");
  if (hours) {
    const entries = parseJSON<WorkingHoursEntry[]>(hours.content, []);
    if (entries.length) {
      lines.push("\n## Working Hours");
      entries.forEach(e => {
        lines.push(e.open ? `${e.day}: ${e.from} – ${e.to}` : `${e.day}: Closed`);
      });
    }
  }

  const products = active.filter(r => r.type === "menu_item");
  if (products.length) {
    lines.push("\n## Products & Services");
    products.forEach(r => {
      const m = parseJSON<MenuItem>(r.content, { name: r.title, description: "", price: "" });
      lines.push(`- ${m.name}${m.price ? ` (${m.price})` : ""}${m.description ? `: ${m.description}` : ""}`);
    });
  }

  const offers = active.filter(r => r.type === "offer");
  if (offers.length) {
    lines.push("\n## Current Offers");
    offers.forEach(r => {
      const o = parseJSON<OfferItem>(r.content, { title: r.title, description: "" });
      lines.push(`- ${o.title}${o.description ? `: ${o.description}` : ""}${o.expiresAt ? ` (expires ${o.expiresAt})` : ""}`);
    });
  }

  const faqs = active.filter(r => r.type === "faq");
  if (faqs.length) {
    lines.push("\n## Frequently Asked Questions");
    faqs.forEach(r => {
      const f = parseJSON<FaqEntry>(r.content, { question: r.title, answer: "" });
      lines.push(`Q: ${f.question}`);
      lines.push(`A: ${f.answer}`);
    });
  }

  const docs = active.filter(r => r.type === "document");
  if (docs.length) {
    lines.push("\n## Uploaded Documents");
    docs.forEach(r => lines.push(`- ${r.title}`));
  }

  return lines.length ? lines.join("\n") : "(No active resources — add business info, hours, or items above to power AI replies)";
}

function ContextPreviewModal({ resources, onClose }: { resources: Resource[]; onClose: () => void }) {
  const { t } = useTranslation();
  const text = buildPromptContext(resources);
  const activeCount = resources.filter(r => r.active).length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{t("resources.preview.title")}</p>
            <p className="text-xs text-muted-foreground">{t("resources.preview.subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-xl p-4 border border-border">
            {text}
          </pre>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {t("resources.preview.activeCount", { count: activeCount })}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Resources() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: resources = [] } = useResources();
  const [showPreview, setShowPreview] = useState(false);

  const infoResource  = resources.find(r => r.type === "info");
  const hoursResource = resources.find(r => r.type === "hours");
  const menuItems     = resources.filter(r => r.type === "menu_item");
  const offers        = resources.filter(r => r.type === "offer");
  const faqs          = resources.filter(r => r.type === "faq");
  const docs          = resources.filter(r => r.type === "document");

  const configured = [
    !!infoResource,
    !!hoursResource,
    menuItems.length > 0,
    offers.length > 0,
    faqs.length > 0,
    docs.length > 0,
  ].filter(Boolean).length;

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="p-6 max-w-3xl mx-auto space-y-4 pb-10">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">{t("resources.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("resources.subtitle")}</p>
        </div>

        <CompletenessBar configured={configured} total={6} />

        <ContextSnapshotCard resources={resources} onViewFull={() => setShowPreview(true)} />

        <Section
          icon={BookOpen}
          title={t("resources.info.title")}
          badge={{ active: infoResource?.active ?? false }}
        >
          <BusinessInfoSection resource={infoResource} />
        </Section>

        <Section
          icon={Clock}
          title={t("resources.hours.title")}
          badge={{ active: hoursResource?.active ?? false }}
        >
          <WorkingHoursSection resource={hoursResource} />
        </Section>

        <Section
          icon={ListChecks}
          title={t("resources.products.title")}
          badge={{ count: menuItems.length, active: menuItems.some(r => r.active) }}
        >
          <ProductsSection resources={resources} />
        </Section>

        <Section
          icon={Tag}
          title={t("resources.offers.title")}
          badge={{ count: offers.length, active: offers.some(r => r.active) }}
        >
          <OffersSection resources={resources} />
        </Section>

        <Section
          icon={HelpCircle}
          title={t("resources.faq.title")}
          badge={{ count: faqs.length, active: faqs.some(r => r.active) }}
          defaultOpen={false}
        >
          <FaqSection resources={resources} />
        </Section>

        <Section
          icon={FileText}
          title={t("resources.documents.title")}
          badge={{ count: docs.length, active: docs.some(r => r.active) }}
          defaultOpen={false}
        >
          <DocumentsSection resources={resources} />
        </Section>
      </div>

      {showPreview && <ContextPreviewModal resources={resources} onClose={() => setShowPreview(false)} />}
    </AppLayout>
  );
}

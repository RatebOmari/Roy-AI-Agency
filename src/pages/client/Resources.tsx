import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useResources, useCreateResource, useUpdateResource, useDeleteResource, useUploadDocument,
} from "@/hooks/useResources";
import type { Resource, BusinessInfo, WorkingHoursEntry, MenuItem, OfferItem } from "@/types";
import {
  BookOpen, Clock, ListChecks, Tag, FileText, Sparkles, Plus,
  Trash2, ChevronDown, ChevronUp, X, Upload,
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

function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
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
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Business Info section ────────────────────────────────────────────────────

function BusinessInfoSection({ resource }: { resource?: Resource }) {
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

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">AI uses this info when answering customer questions</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Active</span>
          <Toggle on={active} onChange={v => { setActive(v); if (resource) update.mutate({ id: resource.id, active: v }); }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["name", "phone", "email", "address"] as const).map(field => (
          <div key={field} className={field === "address" ? "sm:col-span-2" : ""}>
            <label className="block text-xs text-muted-foreground mb-1 capitalize">{field}</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Description</label>
          <textarea
            rows={3}
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
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Working Hours section ────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function WorkingHoursSection({ resource }: { resource?: Resource }) {
  const create = useCreateResource();
  const update = useUpdateResource();
  const defaultHours: WorkingHoursEntry[] = DAYS.map(day => ({ day, open: true, from: "09:00", to: "21:00" }));
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
        <p className="text-xs text-muted-foreground">AI includes these hours in availability responses</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Active</span>
          <Toggle on={active} onChange={v => { setActive(v); if (resource) update.mutate({ id: resource.id, active: v }); }} />
        </div>
      </div>
      <div className="space-y-2">
        {hours.map((row, i) => (
          <div key={row.day} className="flex items-center gap-3 py-1">
            <span className="w-24 text-sm text-foreground flex-shrink-0">{row.day}</span>
            <Toggle
              on={row.open}
              onChange={v => setHours(h => h.map((x, j) => j === i ? { ...x, open: v } : x))}
            />
            <span className="text-xs text-muted-foreground w-12">{row.open ? "Open" : "Closed"}</span>
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
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Menu / Services section ──────────────────────────────────────────────────

function MenuSection({ resources }: { resources: Resource[] }) {
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
      <p className="text-xs text-muted-foreground">AI mentions these items when customers ask about food/services</p>
      {items.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">Description</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium w-20">Price</th>
                <th className="px-3 py-2 w-10">Active</th>
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
                    <td className="px-3 py-2 text-foreground">{item.price}</td>
                    <td className="px-3 py-2 text-center">
                      <Toggle
                        on={r.active}
                        onChange={v => update.mutate({ id: r.id, active: v })}
                      />
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
            <label className="block text-xs text-muted-foreground mb-1">Name</label>
            <input
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Grilled Lamb Chops"
              value={newItem.name}
              onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">Description</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Short description"
              value={newItem.description}
              onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-muted-foreground mb-1">Price</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="$0.00"
              value={newItem.price}
              onChange={e => setNewItem(n => ({ ...n, price: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-xs hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      )}
    </div>
  );
}

// ─── Offers section ───────────────────────────────────────────────────────────

function OffersSection({ resources }: { resources: Resource[] }) {
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
      <p className="text-xs text-muted-foreground">AI mentions active offers when customers ask about deals or discounts</p>
      {offers.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Title</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">Description</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium w-24 hidden md:table-cell">Expires</th>
                <th className="px-3 py-2 w-10">Active</th>
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
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{offer.expiresAt ?? "—"}</td>
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
            <label className="block text-xs text-muted-foreground mb-1">Title</label>
            <input
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Weekend Family Deal"
              value={newOffer.title}
              onChange={e => setNewOffer(o => ({ ...o, title: e.target.value }))}
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs text-muted-foreground mb-1">Description</label>
            <input
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Details"
              value={newOffer.description}
              onChange={e => setNewOffer(o => ({ ...o, description: e.target.value }))}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-muted-foreground mb-1">Expires (optional)</label>
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
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-xs hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add Offer
        </button>
      )}
    </div>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

function DocumentsSection({ resources }: { resources: Resource[] }) {
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
      <p className="text-xs text-muted-foreground">AI reads active documents (menus, PDFs) for detailed context</p>
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
        <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT — up to 10 MB</p>
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
        <p className="text-xs text-muted-foreground animate-pulse">Uploading…</p>
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

  const menuItems = active.filter(r => r.type === "menu_item");
  if (menuItems.length) {
    lines.push("\n## Menu / Services");
    menuItems.forEach(r => {
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

  const docs = active.filter(r => r.type === "document");
  if (docs.length) {
    lines.push("\n## Uploaded Documents");
    docs.forEach(r => lines.push(`- ${r.title}`));
  }

  return lines.length ? lines.join("\n") : "(No active resources — add business info, hours, or menu items above)";
}

function ContextPreviewModal({ resources, onClose }: { resources: Resource[]; onClose: () => void }) {
  const text = buildPromptContext(resources);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">AI Context Preview</p>
            <p className="text-xs text-muted-foreground">This is exactly what the AI reads before generating a reply</p>
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
          <p className="text-xs text-muted-foreground">{resources.filter(r => r.active).length} active resources</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Resources() {
  const { user } = useAuth();
  const { data: resources = [] } = useResources();
  const [showPreview, setShowPreview] = useState(false);

  const infoResource = resources.find(r => r.type === "info");
  const hoursResource = resources.find(r => r.type === "hours");

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="p-6 max-w-3xl mx-auto space-y-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Resources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add your business info, menu, and offers — the AI uses these as knowledge when responding to customers.
          </p>
        </div>

        <Section icon={BookOpen} title="Business Info">
          <BusinessInfoSection resource={infoResource} />
        </Section>

        <Section icon={Clock} title="Working Hours">
          <WorkingHoursSection resource={hoursResource} />
        </Section>

        <Section icon={ListChecks} title="Menu / Services">
          <MenuSection resources={resources} />
        </Section>

        <Section icon={Tag} title="Offers & Promotions">
          <OffersSection resources={resources} />
        </Section>

        <Section icon={FileText} title="Documents" defaultOpen={false}>
          <DocumentsSection resources={resources} />
        </Section>
      </div>

      {/* Floating AI Context Preview button */}
      <button
        onClick={() => setShowPreview(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-2xl shadow-lg hover:bg-primary/90 transition-all hover:shadow-xl text-sm font-medium z-40"
      >
        <Sparkles className="w-4 h-4" />
        AI Context Preview
      </button>

      {showPreview && <ContextPreviewModal resources={resources} onClose={() => setShowPreview(false)} />}
    </AppLayout>
  );
}

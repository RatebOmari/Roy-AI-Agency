import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import type { Contact } from "@/types";
import { Users, Search, AtSign, Smartphone, MessageCircle, MessageSquare, Phone } from "lucide-react";

const MOCK_CONTACTS: Contact[] = [
  {
    id: "u1", name: "Jessica Martinez", phone: undefined, email: "jessica@email.com",
    handles: [{ channel: "instagram_dm", username: "@jessica_nc" }],
    totalConversations: 4, lastSeenAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    tags: ["vip", "order-inquiry"], notes: "Loves the custom cake menu",
  },
  {
    id: "u2", name: "Marcus Thompson", phone: "9197550234",
    handles: [{ channel: "sms", username: "9197550234" }, { channel: "facebook_comment", username: "marcus.thompson" }],
    totalConversations: 7, lastSeenAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    tags: ["regular"], notes: "",
  },
  {
    id: "u3", name: "Priya Patel", phone: undefined,
    handles: [{ channel: "tiktok_comment", username: "@priya.eats.raleigh" }, { channel: "instagram_comment", username: "@priya.nc" }],
    totalConversations: 2, lastSeenAt: new Date(Date.now() - 28 * 60_000).toISOString(),
    tags: ["dietary"], notes: "Halal only",
  },
  {
    id: "u4", name: "David Kim", phone: undefined,
    handles: [{ channel: "facebook_comment", username: "david.kim.clt" }],
    totalConversations: 3, lastSeenAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    tags: ["complaint"], notes: "Had a bad experience 5/20 — follow up",
  },
  {
    id: "u5", name: "Ashley Brooks", phone: undefined,
    handles: [{ channel: "instagram_comment", username: "@ashleyb_beauty" }],
    totalConversations: 1, lastSeenAt: new Date(Date.now() - 62 * 60_000).toISOString(),
    tags: ["purchase-intent"], notes: "",
  },
  {
    id: "u6", name: "Robert Johnson", phone: "9196440087",
    handles: [{ channel: "sms", username: "9196440087" }],
    totalConversations: 5, lastSeenAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    tags: ["appointment"], notes: "",
  },
  {
    id: "u7", name: "Sofia Ramirez", phone: undefined,
    handles: [{ channel: "instagram_dm", username: "@sofia_charlotte" }],
    totalConversations: 2, lastSeenAt: new Date(Date.now() - 120 * 60_000).toISOString(),
    tags: ["spanish"], notes: "Prefers Spanish",
  },
];

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram_dm: AtSign,
  instagram_comment: AtSign,
  tiktok_comment: MessageCircle,
  tiktok_dm: MessageCircle,
  facebook_comment: MessageSquare,
  facebook_messenger: MessageSquare,
  sms: Smartphone,
  whatsapp_business: Phone,
  phone_call: Phone,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function Contacts() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = MOCK_CONTACTS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.handles.some(h => h.username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout role="client" businessName={user?.businessName}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground text-sm mt-1">{MOCK_CONTACTS.length} contacts across all channels</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Channels</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Tags</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden sm:table-cell">Conversations</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                    <Users className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No contacts found
                  </td>
                </tr>
              ) : filtered.map(contact => (
                <tr key={contact.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{contact.name}</p>
                        {contact.phone && (
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      {contact.handles.map(h => {
                        const Icon = CHANNEL_ICONS[h.channel] ?? MessageSquare;
                        return (
                          <div key={h.channel + h.username} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <Icon className="w-3 h-3" />
                            <span className="truncate max-w-[80px]">{h.username}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-sm text-foreground font-medium">{contact.totalConversations}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{timeAgo(contact.lastSeenAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

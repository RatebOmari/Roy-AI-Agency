import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, Globe, Bell, Shield, CreditCard } from "lucide-react";

const SECTIONS = [
  { key: "agency", label: "Agency Profile", icon: Building2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "billing", label: "Billing & Plan", icon: CreditCard },
  { key: "security", label: "Security", icon: Shield },
  { key: "integrations", label: "Integrations", icon: Globe },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

export default function AgencySettings() {
  const [active, setActive] = useState<Section>("agency");

  return (
    <AppLayout role="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your agency account and preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Left nav */}
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-0.5">
              {SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                    active === s.key
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-card rounded-2xl border border-border p-6">
            {active === "agency" && (
              <div className="space-y-5">
                <h2 className="font-semibold text-foreground">Agency Profile</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Agency Name", placeholder: "Roy AI Agency", type: "text" },
                    { label: "Website", placeholder: "https://royaiagency.com", type: "url" },
                    { label: "Contact Email", placeholder: "contact@royaiagency.com", type: "email" },
                    { label: "Phone", placeholder: "+1 (919) 555-0100", type: "tel" },
                  ].map(f => (
                    <div key={f.label} className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
                <button className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            )}

            {active === "billing" && (
              <div className="space-y-5">
                <h2 className="font-semibold text-foreground">Billing & Plan</h2>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Agency Pro Plan</p>
                    <p className="text-sm text-muted-foreground">Up to 20 clients · $199 / month</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Active</span>
                </div>
                <p className="text-sm text-muted-foreground">Next billing date: June 1, 2026</p>
                <button className="px-5 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-muted transition-colors">
                  Manage Subscription
                </button>
              </div>
            )}

            {(active === "notifications" || active === "security" || active === "integrations") && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  {(() => {
                    const s = SECTIONS.find(x => x.key === active);
                    return s ? <s.icon className="w-6 h-6 text-muted-foreground" /> : null;
                  })()}
                </div>
                <p className="text-sm font-medium text-foreground">{SECTIONS.find(x => x.key === active)?.label}</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Globe, Bell, Shield } from "lucide-react";
import { AGENCY_NAME } from "@/lib/constants";

const SECTIONS = [
  { key: "contact",       label: "Contact Info",  icon: Globe  },
  { key: "notifications", label: "Notifications", icon: Bell   },
  { key: "security",      label: "Security",      icon: Shield },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

export default function AgencySettings() {
  const [active, setActive] = useState<Section>("contact");

  return (
    <AppLayout role="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your agency preferences</p>
        </div>

        {/* Agency identity — read-only */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <p className="font-semibold text-foreground">{AGENCY_NAME}</p>
            <p className="text-xs text-muted-foreground">Agency account · single-tenant</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Left nav — horizontal scrollable on mobile, vertical sidebar on md+ */}
          <div className="md:w-52 md:flex-shrink-0">
            <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0 md:flex-col md:space-y-0.5">
              {SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 md:shrink md:w-full md:text-left transition-colors ${
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
            {active === "contact" && (
              <div className="space-y-5">
                <h2 className="font-semibold text-foreground">Contact Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Website",       placeholder: "https://royaiagency.com",   type: "url"   },
                    { label: "Contact Email", placeholder: "contact@royaiagency.com",   type: "email" },
                    { label: "Phone",         placeholder: "+1 (919) 555-0100",         type: "tel"   },
                  ].map(f => (
                    <div key={f.label} className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
                <button className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            )}

            {(active === "notifications" || active === "security") && (
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

import { useState } from "react";
import { motion } from "framer-motion";
import { X, CalendarClock, Loader2 } from "lucide-react";
import { useCreateBooking, type BookingSource } from "@/hooks/useBookings";

interface BookingDialogProps {
  /** Where this booking is being taken from. */
  source:       BookingSource;
  contactName:  string;
  contactPhone?: string;
  convId?:      string | null;
  callId?:      string | null;
  onClose:      () => void;
  onCreated?:   () => void;
}

/** Rounds to the next half hour — a sensible default for "book something". */
function defaultWhen() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  // datetime-local wants local time without a zone suffix
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingDialog({
  source, contactName, contactPhone, convId, callId, onClose, onCreated,
}: BookingDialogProps) {
  // A table booking needs party size; an appointment needs duration/staff.
  const [kind, setKind]           = useState<"table" | "appointment">("table");
  const [service, setService]     = useState("Table");
  const [when, setWhen]           = useState(defaultWhen());
  const [partySize, setPartySize] = useState("2");
  const [duration, setDuration]   = useState("30");
  const [staff, setStaff]         = useState("");
  const [notes, setNotes]         = useState("");

  const create = useCreateBooking();

  const pickKind = (k: "table" | "appointment") => {
    setKind(k);
    setService(prev => (prev === "Table" || prev === "") && k === "appointment" ? "" : k === "table" ? "Table" : prev);
  };

  const submit = () => {
    if (!service.trim() || !when) return;
    create.mutate(
      {
        source,
        convId: convId ?? null,
        callId: callId ?? null,
        contactName,
        contactPhone: contactPhone ?? "",
        service: service.trim(),
        partySize:    kind === "table"       ? Number(partySize) || null : null,
        durationMins: kind === "appointment" ? Number(duration)  || null : null,
        staffName:    kind === "appointment" ? staff.trim() : "",
        // datetime-local is local time; send it as a real instant
        scheduledFor: new Date(when).toISOString(),
        notes: notes.trim(),
      },
      { onSuccess: () => { onCreated?.(); onClose(); } }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[85vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">New booking</p>
              <p className="text-xs text-muted-foreground">for {contactName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Table vs appointment */}
          <div className="flex gap-2">
            {([["table", "Table"], ["appointment", "Appointment"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => pickKind(k)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  kind === k
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {kind === "table" ? "What for" : "Service"}
            </label>
            <input
              value={service}
              onChange={e => setService(e.target.value)}
              placeholder={kind === "table" ? "Table" : "e.g. Haircut, Consultation"}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date &amp; time</label>
            <input
              type="datetime-local"
              value={when}
              onChange={e => setWhen(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {kind === "table" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">People</label>
              <input
                type="number" min={1}
                value={partySize}
                onChange={e => setPartySize(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Minutes</label>
                <input
                  type="number" min={5} step={5}
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">With (optional)</label>
                <input
                  value={staff}
                  onChange={e => setStaff(e.target.value)}
                  placeholder="Staff name"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Window seat, allergy, etc."
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Saved as a request — you confirm it, and can message the customer when you do.
          </p>

          {create.isError && (
            <p className="text-sm text-red-500">Couldn&apos;t save the booking. Please try again.</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={create.isPending || !service.trim() || !when}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save booking"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

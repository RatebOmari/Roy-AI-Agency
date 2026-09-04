import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BookingDialog } from "@/components/shared/BookingDialog";
import { useBookingsRange, useUpdateBooking, type Booking } from "@/hooks/useBookings";
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus, Check, X,
  Users, Clock, Phone, MessageSquare, Bot, Hand,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Date helpers ──────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
/** Week starting Sunday — the working week in Saudi and the Gulf. */
function startOfWeek(d: Date) {
  const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  confirmed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40",
  declined:  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  no_show:   "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",
};

const SOURCE_ICON: Record<string, React.ElementType> = {
  message: MessageSquare, call: Phone, chatbot: Bot, manual: Hand,
};

function detailLine(b: Booking) {
  const bits: string[] = [b.service];
  if (b.partySize)    bits.push(`${b.partySize} people`);
  if (b.durationMins) bits.push(`${b.durationMins} min`);
  if (b.staffName)    bits.push(`with ${b.staffName}`);
  return bits.join(" · ");
}

// ── One booking row ───────────────────────────────────────────────────────────

function BookingRow({ booking, onConfirm, onDecline, busy }: {
  booking: Booking;
  onConfirm: (b: Booking) => void;
  onDecline: (b: Booking) => void;
  busy: boolean;
}) {
  const SourceIcon = SOURCE_ICON[booking.source] ?? Hand;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-14 shrink-0 pt-0.5">
        <p className="text-sm font-semibold text-foreground tabular-nums">{timeFmt(booking.scheduledFor)}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{booking.contactName}</p>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize", STATUS_STYLE[booking.status])}>
            {booking.status.replace("_", " ")}
          </span>
          <SourceIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{detailLine(booking)}</p>
        {booking.notes && <p className="text-xs text-muted-foreground/80 mt-0.5 italic truncate">{booking.notes}</p>}
      </div>

      {booking.status === "requested" && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onConfirm(booking)}
            disabled={busy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            <Check className="w-3 h-3" /> Confirm
          </button>
          <button
            onClick={() => onDecline(booking)}
            disabled={busy}
            title="Decline"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Bookings() {
  const { user } = useAuth();
  const [view, setView]     = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);

  const rangeStart = view === "day" ? anchor : startOfWeek(anchor);
  const rangeEnd   = view === "day" ? addDays(anchor, 1) : addDays(startOfWeek(anchor), 7);

  const { data: bookings = [], isLoading } = useBookingsRange(rangeStart, rangeEnd);
  const update = useUpdateBooking();

  const confirm = (b: Booking) =>
    update.mutate({
      id: b.id,
      status: "confirmed",
      notifyMessage: `Your booking on ${new Date(b.scheduledFor).toLocaleString(undefined, {
        weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      })} is confirmed. See you then!`,
    });

  const decline = (b: Booking) => update.mutate({ id: b.id, status: "declined" });

  // Group into the days of the current range so empty days still show.
  const days = useMemo(() => {
    const count = view === "day" ? 1 : 7;
    return Array.from({ length: count }, (_, i) => {
      const date = addDays(rangeStart, i);
      return {
        date,
        items: bookings
          .filter(b => isSameDay(new Date(b.scheduledFor), date))
          .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor)),
      };
    });
  }, [bookings, rangeStart, view]);

  const pendingCount = bookings.filter(b => b.status === "requested").length;

  const rangeLabel = view === "day"
    ? anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : `${rangeStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(rangeEnd, -1).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  const step = (dir: 1 | -1) => setAnchor(a => addDays(a, dir * (view === "day" ? 1 : 7)));

  return (
    <AppLayout role="client" businessName={user?.businessName ?? "Royto Social"}>
      <div className="space-y-5 max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              Bookings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} waiting for you to confirm`
                : "Tables and appointments, in time order"}
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New booking
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => step(-1)} className="p-2 rounded-lg border border-border hover:bg-muted" title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAnchor(startOfDay(new Date()))}
              className="px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              Today
            </button>
            <button onClick={() => step(1)} className="p-2 rounded-lg border border-border hover:bg-muted" title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="ml-2 text-sm font-semibold text-foreground">{rangeLabel}</span>
          </div>

          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(["day", "week"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
                  view === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Days — stacked, so it reads the same on a phone as on a laptop */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
            Loading bookings…
          </div>
        ) : (
          <div className="space-y-3">
            {days.map(({ date, items }) => {
              const today = isSameDay(date, new Date());
              return (
                <div key={date.toISOString()} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className={cn(
                    "flex items-center justify-between px-4 py-2.5 border-b border-border",
                    today && "bg-primary/5"
                  )}>
                    <p className={cn("text-sm font-semibold", today ? "text-primary" : "text-foreground")}>
                      {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      {today && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide">Today</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {items.length === 0 ? "—" : `${items.length} booking${items.length > 1 ? "s" : ""}`}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nothing booked</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {items.map(b => (
                        <BookingRow
                          key={b.id}
                          booking={b}
                          onConfirm={confirm}
                          onDecline={decline}
                          busy={update.isPending}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> party size</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> duration</span>
          <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> from a message</span>
          <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> from a call</span>
        </div>
      </div>

      <AnimatePresence>
        {dialogOpen && (
          <BookingDialog
            source="manual"
            contactName=""
            defaultDate={anchor}
            onClose={() => setDialogOpen(false)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

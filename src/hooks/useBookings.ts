import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type BookingStatus = "requested" | "confirmed" | "declined" | "cancelled" | "completed" | "no_show";
export type BookingSource = "message" | "call" | "chatbot" | "manual";

export interface Booking {
  id:           string;
  source:       BookingSource;
  convId:       string | null;
  callId:       string | null;
  contactId:    string | null;
  contactName:  string;
  contactPhone: string;
  service:      string;
  partySize:    number | null;
  durationMins: number | null;
  staffName:    string;
  scheduledFor: string;
  status:       BookingStatus;
  notes:        string;
  confirmedAt:  string | null;
  createdAt:    string;
}

export interface NewBooking {
  source:        BookingSource;
  convId?:       string | null;
  callId?:       string | null;
  contactName:   string;
  contactPhone?: string;
  service:       string;
  partySize?:    number | null;
  durationMins?: number | null;
  staffName?:    string;
  scheduledFor:  string;
  notes?:        string;
}

export function useBookings(scope: "upcoming" | "requested" | "all" = "upcoming") {
  return useQuery({
    queryKey: ["bookings", scope],
    queryFn: async () => {
      try {
        return await api.get<Booking[]>(`/bookings?scope=${scope}`);
      } catch {
        return [] as Booking[];
      }
    },
    staleTime: 30_000,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (booking: NewBooking) => api.post<Booking>("/bookings", booking),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

/** Confirm / decline / reschedule. `notifyMessage` messages the customer back. */
export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<Booking> & { notifyMessage?: string }) =>
      api.patch<Booking>(`/bookings/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Call } from "@/types";

const now = new Date();
const mins = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();

const MOCK_CALLS: Call[] = [
  {
    id: "cl1", userId: "u1", convId: null, twilioSid: "CA001",
    direction: "outbound", toNumber: "+9715551234", fromNumber: "+1919000111",
    contactName: "Ahmad Al-Rashid", status: "completed", duration: 165,
    recordingUrl: null, notes: "Customer asked about order status. Resolved.",
    startedAt: mins(20), endedAt: mins(17), createdAt: mins(20),
  },
  {
    id: "cl2", userId: "u1", convId: null, twilioSid: "CA002",
    direction: "outbound", toNumber: "+19195500871", fromNumber: "+1919000111",
    contactName: "Robert Johnson", status: "no-answer", duration: null,
    recordingUrl: null, notes: "",
    startedAt: mins(45), endedAt: mins(44), createdAt: mins(45),
  },
  {
    id: "cl3", userId: "u1", convId: null, twilioSid: "CA003",
    direction: "inbound", toNumber: "+1919000111", fromNumber: "+9715559876",
    contactName: "Fatima Al-Zahra", status: "completed", duration: 240,
    recordingUrl: null, notes: "New customer inquiry — follow up next week.",
    startedAt: mins(90), endedAt: mins(86), createdAt: mins(90),
  },
  {
    id: "cl4", userId: "u1", convId: null, twilioSid: "CA004",
    direction: "outbound", toNumber: "+16045554321", fromNumber: "+1919000111",
    contactName: "David Chen", status: "busy", duration: null,
    recordingUrl: null, notes: "",
    startedAt: mins(150), endedAt: mins(149), createdAt: mins(150),
  },
  {
    id: "cl5", userId: "u1", convId: null, twilioSid: "CA005",
    direction: "inbound", toNumber: "+1919000111", fromNumber: "+9718887766",
    contactName: "Mohammed Al-Farsi", status: "missed", duration: null,
    recordingUrl: null, notes: "",
    startedAt: mins(200), endedAt: null, createdAt: mins(200),
  },
  {
    id: "cl6", userId: "u1", convId: null, twilioSid: "CA006",
    direction: "outbound", toNumber: "+447700900123", fromNumber: "+1919000111",
    contactName: "Sarah Mitchell", status: "completed", duration: 98,
    recordingUrl: null, notes: "Confirmed appointment for next Monday.",
    startedAt: mins(320), endedAt: mins(318), createdAt: mins(320),
  },
];

export function useCalls(filter?: { direction?: string; status?: string }) {
  return useQuery({
    queryKey: ["calls", filter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filter?.direction) params.set("direction", filter.direction);
        if (filter?.status)    params.set("status",    filter.status);
        const qs = params.toString();
        return await api.get<Call[]>(qs ? `/calls?${qs}` : "/calls");
      } catch {
        let data = MOCK_CALLS;
        if (filter?.direction) data = data.filter(c => c.direction === filter.direction);
        if (filter?.status)    data = data.filter(c => c.status    === filter.status);
        return data;
      }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useInitiateOutboundCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { toNumber: string; contactName?: string; message?: string; convId?: string }) =>
      api.post<{ ok: boolean; callId: string; status: string }>("/calls/outbound", data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["calls"] }),
  });
}

export function useUpdateCallNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.put<{ ok: boolean }>(`/calls/${id}/notes`, { notes }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["calls"] }),
  });
}

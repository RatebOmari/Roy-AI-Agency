import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TeamMember, InternalNote, TeamRole, TeamMemberStatus } from "@/types";

const now = new Date();
const past = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const pastHours = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm1",
    name: "Sara Al-Ahmad",
    email: "sara@raleigheats.com",
    role: "admin" as TeamRole,
    status: "active" as TeamMemberStatus,
    createdAt: past(30),
  },
  {
    id: "tm2",
    name: "Mohammed Hassan",
    email: "mohammed@raleigheats.com",
    role: "agent" as TeamRole,
    status: "active" as TeamMemberStatus,
    createdAt: past(20),
  },
  {
    id: "tm3",
    name: "Layla Nour",
    email: "layla@raleigheats.com",
    role: "viewer" as TeamRole,
    status: "invited" as TeamMemberStatus,
    createdAt: past(2),
  },
];

const getMockNotes = (conversationId: string): InternalNote[] => [
  {
    id: "n1",
    conversationId,
    authorName: "Sara Al-Ahmad",
    content: "Customer asked about gluten-free options. We have 3 dishes. Need to update menu.",
    createdAt: pastHours(2),
  },
  {
    id: "n2",
    conversationId,
    authorName: "Mohammed Hassan",
    content: "Follow up needed — customer wants to book for 10 people this Friday.",
    createdAt: pastHours(1),
  },
];

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      try {
        const result = await api.get<TeamMember[]>("/team/members");
        return Array.isArray(result) ? result : MOCK_TEAM_MEMBERS;
      } catch {
        return MOCK_TEAM_MEMBERS;
      }
    },
    staleTime: 30_000,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TeamMember, "id" | "createdAt">) =>
      api.post<TeamMember>("/team/members", data),
    onMutate: async (newMember) => {
      await queryClient.cancelQueries({ queryKey: ["team"] });
      const prev = queryClient.getQueryData<TeamMember[]>(["team"]);
      const optimistic: TeamMember = {
        ...newMember,
        id: "optimistic-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<TeamMember[]>(["team"], old => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["team"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TeamMember> & { id: string }) =>
      api.put<TeamMember>(`/team/members/${id}`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/team/members/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["team"] });
      const prev = queryClient.getQueryData<TeamMember[]>(["team"]);
      queryClient.setQueryData<TeamMember[]>(["team"], old => (old ?? []).filter(m => m.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["team"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useInternalNotes(conversationId: string) {
  return useQuery({
    queryKey: ["notes", conversationId],
    queryFn: async () => {
      try {
        const result = await api.get<InternalNote[]>(`/team/notes/${conversationId}`);
        return Array.isArray(result) ? result : getMockNotes(conversationId);
      } catch {
        return getMockNotes(conversationId);
      }
    },
    staleTime: 30_000,
    enabled: Boolean(conversationId),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InternalNote, "id" | "createdAt">) =>
      api.post<InternalNote>("/team/notes", data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; conversationId: string }) =>
      api.delete<void>(`/team/notes/${id}`),
    onMutate: async ({ id, conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ["notes", conversationId] });
      const prev = queryClient.getQueryData<InternalNote[]>(["notes", conversationId]);
      queryClient.setQueryData<InternalNote[]>(["notes", conversationId], old =>
        (old ?? []).filter(n => n.id !== id)
      );
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notes", vars.conversationId], ctx.prev);
    },
    onSettled: (_data, _err, vars) =>
      queryClient.invalidateQueries({ queryKey: ["notes", vars.conversationId] }),
  });
}

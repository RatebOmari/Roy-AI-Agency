import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AutomationRule } from "@/types";

type RuleInput = Omit<AutomationRule, "id">;

export function useAutomationRules() {
  return useQuery({
    queryKey: ["automationRules"],
    queryFn: () => api.get<AutomationRule[]>("/automation"),
    staleTime: 30_000,
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: RuleInput) => api.post<AutomationRule>("/automation", rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automationRules"] }),
  });
}

export function useUpdateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rule }: AutomationRule) =>
      api.patch<AutomationRule>(`/automation/${id}`, rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automationRules"] }),
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/automation/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automationRules"] }),
  });
}

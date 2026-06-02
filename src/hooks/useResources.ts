import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Resource } from "@/types";

const MOCK_RESOURCES: Resource[] = [
  {
    id: "r1",
    type: "info",
    title: "Business Info",
    content: JSON.stringify({
      name: "Raleigh Eats",
      description: "A family-owned restaurant serving authentic Arabic and fusion cuisine in the heart of Raleigh since 2018.",
      address: "123 Fayetteville St, Raleigh, NC 27601",
      phone: "+1 (919) 555-0142",
      email: "hello@raleigheats.com",
    }),
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "r2",
    type: "hours",
    title: "Working Hours",
    content: JSON.stringify([
      { day: "Monday",    open: true,  from: "11:00", to: "22:00" },
      { day: "Tuesday",   open: true,  from: "11:00", to: "22:00" },
      { day: "Wednesday", open: true,  from: "11:00", to: "22:00" },
      { day: "Thursday",  open: true,  from: "11:00", to: "23:00" },
      { day: "Friday",    open: true,  from: "11:00", to: "23:00" },
      { day: "Saturday",  open: true,  from: "10:00", to: "23:00" },
      { day: "Sunday",    open: false, from: "12:00", to: "21:00" },
    ]),
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "r3",
    type: "menu_item",
    title: "Grilled Lamb Chops",
    content: JSON.stringify({ name: "Grilled Lamb Chops", description: "Premium lamb chops marinated in Arabic spices, served with saffron rice and grilled vegetables", price: "$28" }),
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "r4",
    type: "menu_item",
    title: "Mezze Platter",
    content: JSON.stringify({ name: "Mezze Platter", description: "Assorted dips (hummus, baba ghanoush, mutabal), fresh pita, olives and pickles", price: "$16" }),
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "r5",
    type: "offer",
    title: "Weekend Family Deal",
    content: JSON.stringify({ title: "Weekend Family Deal", description: "4 mains + 2 appetizers + dessert for $89. Available Fri–Sun only.", expiresAt: "2025-12-31" }),
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      try {
        const result = await api.get<Resource[]>("/resources");
        return Array.isArray(result) ? result : MOCK_RESOURCES;
      } catch {
        return MOCK_RESOURCES;
      }
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resource: Omit<Resource, "id" | "createdAt" | "updatedAt">) =>
      api.post<Resource>("/resources", resource),
    onMutate: async (newResource) => {
      await queryClient.cancelQueries({ queryKey: ["resources"] });
      const prev = queryClient.getQueryData<Resource[]>(["resources"]);
      const optimistic: Resource = {
        ...newResource,
        id: "optimistic-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Resource[]>(["resources"], old => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["resources"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Resource> & { id: string }) =>
      api.put<Resource>(`/resources/${id}`, data),
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: ["resources"] });
      const prev = queryClient.getQueryData<Resource[]>(["resources"]);
      queryClient.setQueryData<Resource[]>(["resources"], old =>
        (old ?? []).map(r => r.id === id ? { ...r, ...data } : r)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["resources"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/resources/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["resources"] });
      const prev = queryClient.getQueryData<Resource[]>(["resources"]);
      queryClient.setQueryData<Resource[]>(["resources"], old => (old ?? []).filter(r => r.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["resources"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/resources/upload`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        return res.json() as Promise<{ url: string; name: string; size: number }>;
      } catch {
        return { url: `/uploads/demo-${file.name}`, name: file.name, size: file.size };
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

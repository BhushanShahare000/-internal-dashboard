import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertTimeEntry, TimeEntry, Project, User } from "@shared/schema";
import { z } from "zod";

export type TimeEntryWithDetails = TimeEntry & {
  project?: Project;
  user?: Pick<User, "id" | "username" | "role">;
};

export function useTimeEntries() {
  return useQuery<TimeEntryWithDetails[]>({
    queryKey: [api.timeEntries.list.path],
    queryFn: async () => {
      const res = await fetch(api.timeEntries.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
  });
}

export function useAllTimeEntries() {
  return useQuery<TimeEntryWithDetails[]>({
    queryKey: [api.timeEntries.listAll.path],
    queryFn: async () => {
      const res = await fetch(api.timeEntries.listAll.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch all time entries");
      return res.json();
    },
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertTimeEntry) => {
      const res = await fetch(api.timeEntries.create.path, {
        method: api.timeEntries.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create time entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.timeEntries.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.timeEntries.listAll.path] });
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Project } from "@shared/schema";

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: [api.projects.list.path],
    queryFn: async () => {
      const res = await fetch(api.projects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });
}

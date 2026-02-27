import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Seed projects if empty
  const seedProjects = async () => {
    try {
      const projects = await storage.getProjects();
      if (projects.length === 0) {
        await storage.createProject({ name: "Internal R&D" });
        await storage.createProject({ name: "Client A" });
        await storage.createProject({ name: "Client B" });
        await storage.createProject({ name: "Marketing" });
      }
    } catch (e) {
      console.log("Could not seed projects yet", e);
    }
  };
  
  // Give DB a moment to initialize before seeding
  setTimeout(seedProjects, 2000);

  app.get(api.projects.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get(api.timeEntries.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const entries = await storage.getTimeEntriesByUser(req.user.id);
    res.json(entries);
  });

  app.get(api.timeEntries.listAll.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.sendStatus(401);
    }
    const entries = await storage.getAllTimeEntries();
    res.json(entries);
  });

  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.sendStatus(401);
    }
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post(api.timeEntries.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.timeEntries.create.input.parse(req.body);
      
      // Enforce: Total per date per user cannot exceed 1 day
      const existingEntries = await storage.getTimeEntriesByUserAndDate(req.user.id, input.date);
      const currentTotal = existingEntries.reduce((sum, entry) => sum + Number(entry.timeSpent), 0);
      
      if (currentTotal + input.timeSpent > 1.0) {
        return res.status(400).json({ 
          message: `Cannot exceed 1 day per date. You already logged ${currentTotal} days for ${input.date}.` 
        });
      }

      const entry = await storage.createTimeEntry({
        ...input,
        userId: req.user.id
      });
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

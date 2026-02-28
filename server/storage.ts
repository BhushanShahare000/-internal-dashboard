import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { users, projects, timeEntries, type User, type InsertUser, type Project, type TimeEntry, type InsertTimeEntry } from "@shared/schema";
import { googleSheets } from "./google-sheets";

import MemoryStoreConstructor from "memorystore";
const MemoryStore = MemoryStoreConstructor(session);


const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  getProjects(): Promise<Project[]>;
  createProject(project: { name: string }): Promise<Project>;
  getTimeEntriesByUser(userId: number): Promise<(TimeEntry & { project: Project })[]>;
  getAllTimeEntries(): Promise<(TimeEntry & { user: User, project: Project })[]>;
  getTimeEntriesByUserAndDate(userId: number, date: string): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry & { userId: number }): Promise<TimeEntry>;
  getAllUsers(): Promise<User[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private timeEntries: Map<number, TimeEntry>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.timeEntries = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });


    // Add some default data
    this.initializeData();
  }

  private async initializeData() {
    await this.createProject({ name: "Internal Dashboard" });
    await this.createProject({ name: "Client Project A" });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, role: insertUser.role || "user" };
    this.users.set(id, user);
    return user;
  }

  async getProjects(): Promise<Project[]> {
    const sheetProjectNames = await googleSheets.getProjects();
    if (sheetProjectNames.length > 0) {
      // Sync names into maps
      for (const name of sheetProjectNames) {
        const existing = Array.from(this.projects.values()).find(p => p.name === name);
        if (!existing) {
          await this.createProject({ name });
        }
      }
    }
    return Array.from(this.projects.values());
  }

  async createProject(project: { name: string }): Promise<Project> {
    const id = this.currentId++;
    const newProject: Project = { id, name: project.name, isActive: true };
    this.projects.set(id, newProject);
    return newProject;
  }

  async getTimeEntriesByUser(userId: number): Promise<(TimeEntry & { project: Project })[]> {
    const entries = Array.from(this.timeEntries.values())
      .filter((e) => e.userId === userId)
      .map((e) => ({
        ...e,
        project: this.projects.get(e.projectId)!,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }

  async getAllTimeEntries(): Promise<(TimeEntry & { user: User, project: Project })[]> {
    const entries = Array.from(this.timeEntries.values())
      .map((e) => ({
        ...e,
        user: this.users.get(e.userId)!,
        project: this.projects.get(e.projectId)!,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }

  async getTimeEntriesByUserAndDate(userId: number, date: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(
      (e) => e.userId === userId && e.date === date
    );
  }

  async createTimeEntry(entry: InsertTimeEntry & { userId: number }): Promise<TimeEntry> {
    const id = this.currentId++;
    const newEntry: TimeEntry = {
      ...entry,
      id,
      createdAt: new Date(),
      timeSpent: entry.timeSpent.toString()
    };
    this.timeEntries.set(id, newEntry);

    // Non-blocking background sync to Google Sheets
    const user = this.users.get(entry.userId);
    const project = this.projects.get(entry.projectId);
    if (user && project) {
      console.log(`[Background Sync] Starting sync for entry ${newEntry.id} to Google Sheets...`);
      googleSheets.appendTimeEntry({
        id: newEntry.id,
        userEmail: user.username,
        projectName: project.name,
        date: newEntry.date,
        timeSpent: newEntry.timeSpent,
        createdAt: newEntry.createdAt!
      }).then(() => {
        console.log(`[Background Sync] Successfully synced entry ${newEntry.id}`);
      }).catch((err) => {
        console.error(`[Background Sync] Failed to sync entry ${newEntry.id}:`, err);
      });
    }

    return newEntry;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: pool!,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db!.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db!.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const [user] = await db!.insert(users).values(insertUser).returning();
    return user;
  }

  async getProjects(): Promise<Project[]> {
    const sheetProjectNames = await googleSheets.getProjects();
    if (sheetProjectNames.length > 0) {
      for (const name of sheetProjectNames) {
        await db!.insert(projects)
          .values({ name, isActive: true })
          .onConflictDoUpdate({
            target: projects.name,
            set: { isActive: true }
          });
      }
    }
    return await db!.select().from(projects).where(eq(projects.isActive, true));
  }

  async createProject(project: { name: string }): Promise<Project> {
    const [newProject] = await db!.insert(projects).values(project).returning();
    return newProject;
  }

  async getTimeEntriesByUser(userId: number): Promise<(TimeEntry & { project: Project })[]> {
    const entries = await db!.query.timeEntries.findMany({
      where: eq(timeEntries.userId, userId),
      with: {
        project: true,
      },
      orderBy: (timeEntries, { desc }) => [desc(timeEntries.date), desc(timeEntries.createdAt)]
    });
    return entries as any;
  }

  async getAllTimeEntries(): Promise<(TimeEntry & { user: User, project: Project })[]> {
    const entries = await db!.query.timeEntries.findMany({
      with: {
        user: true,
        project: true,
      },
      orderBy: (timeEntries, { desc }) => [desc(timeEntries.date), desc(timeEntries.createdAt)]
    });
    return entries as any;
  }

  async getTimeEntriesByUserAndDate(userId: number, date: string): Promise<TimeEntry[]> {
    return await db!.select().from(timeEntries).where(
      and(
        eq(timeEntries.userId, userId),
        eq(timeEntries.date, date)
      )
    );
  }

  async createTimeEntry(entry: InsertTimeEntry & { userId: number }): Promise<TimeEntry> {
    // Verify project exists
    const [project] = await db!.select().from(projects).where(eq(projects.id, entry.projectId));
    if (!project) {
      throw new Error(`Project with ID ${entry.projectId} does not exist`);
    }

    const [newEntry] = await db!.insert(timeEntries).values({
      ...entry,
      timeSpent: entry.timeSpent.toString()
    }).returning();

    // Non-blocking background sync to Google Sheets
    const user = await this.getUser(entry.userId);
    if (user && project) {
      console.log(`[Background Sync] Starting sync for entry ${newEntry.id} to Google Sheets...`);
      googleSheets.appendTimeEntry({
        id: newEntry.id,
        userEmail: user.username,
        projectName: project.name,
        date: newEntry.date,
        timeSpent: newEntry.timeSpent,
        createdAt: newEntry.createdAt!
      }).then(() => {
        console.log(`[Background Sync] Successfully synced entry ${newEntry.id}`);
      }).catch((err) => {
        console.error(`[Background Sync] Failed to sync entry ${newEntry.id}:`, err);
      });
    }

    return newEntry;
  }

  async getAllUsers(): Promise<User[]> {
    return await db!.select().from(users);
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();



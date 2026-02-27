import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { users, projects, timeEntries, type User, type InsertUser, type Project, type TimeEntry, type InsertTimeEntry } from "@shared/schema";

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

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.isActive, true));
  }
  
  async createProject(project: { name: string }): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getTimeEntriesByUser(userId: number): Promise<(TimeEntry & { project: Project })[]> {
    const entries = await db.query.timeEntries.findMany({
      where: eq(timeEntries.userId, userId),
      with: {
        project: true,
      },
      orderBy: (timeEntries, { desc }) => [desc(timeEntries.date), desc(timeEntries.createdAt)]
    });
    return entries as any;
  }

  async getAllTimeEntries(): Promise<(TimeEntry & { user: User, project: Project })[]> {
    const entries = await db.query.timeEntries.findMany({
      with: {
        user: true,
        project: true,
      },
      orderBy: (timeEntries, { desc }) => [desc(timeEntries.date), desc(timeEntries.createdAt)]
    });
    return entries as any;
  }

  async getTimeEntriesByUserAndDate(userId: number, date: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(
      and(
        eq(timeEntries.userId, userId),
        eq(timeEntries.date, date)
      )
    );
  }

  async createTimeEntry(entry: InsertTimeEntry & { userId: number }): Promise<TimeEntry> {
    const [newEntry] = await db.insert(timeEntries).values(entry).returning();
    return newEntry;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
}

export const storage = new DatabaseStorage();

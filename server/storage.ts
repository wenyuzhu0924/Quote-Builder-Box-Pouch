import { type User, type InsertUser, type SharedQuote, type InsertSharedQuote, sharedQuotes } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getSharedQuote(id: string): Promise<SharedQuote | undefined>;
  createSharedQuote(quote: InsertSharedQuote): Promise<SharedQuote>;
}

export class DatabaseStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getSharedQuote(id: string): Promise<SharedQuote | undefined> {
    const [quote] = await db.select().from(sharedQuotes).where(eq(sharedQuotes.id, id));
    return quote;
  }

  async createSharedQuote(quote: InsertSharedQuote): Promise<SharedQuote> {
    const [created] = await db.insert(sharedQuotes).values(quote).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

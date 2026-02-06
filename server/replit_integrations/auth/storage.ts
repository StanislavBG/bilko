import { users, type User, type UpsertUser } from "@shared/models/auth";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser, hasAdminRole?: boolean): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser, hasAdminRole: boolean = false): Promise<User> {
    const isAdminByEnv = Boolean(process.env.ADMIN_USER_ID) && userData.id === process.env.ADMIN_USER_ID;
    let isAdmin = isAdminByEnv || hasAdminRole;

    // Single-user phase: when ADMIN_USER_ID is not configured,
    // auto-promote if this is the only user in the system.
    if (!isAdmin && !process.env.ADMIN_USER_ID) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      if (count <= 1) {
        isAdmin = true;
      }
    }

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: isAdmin,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          // Always write the computed value — never skip the update
          isAdmin: isAdmin,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();

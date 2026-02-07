import { users, type User, type UpsertUser } from "@shared/models/auth";
import { eq } from "drizzle-orm";
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
    // Admin is determined by ADMIN_USER_ID env var or OIDC role.
    // The is_admin flag persists in the DB — set it once, it sticks.
    const isAdminByEnv = Boolean(process.env.ADMIN_USER_ID) && userData.id === process.env.ADMIN_USER_ID;
    const shouldPromote = isAdminByEnv || hasAdminRole;

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: shouldPromote,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          // Only promote to admin, never demote — the DB flag is the source of truth.
          // To demote, update the DB directly.
          ...(shouldPromote ? { isAdmin: true } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();

import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { createLogger } from "../../logger";

const log = createLogger("auth");

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      log.error("Error fetching user", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

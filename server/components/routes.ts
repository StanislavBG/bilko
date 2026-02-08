/**
 * Component Definitions Routes
 *
 * Serves the step type component catalog from shared/component-definitions.ts.
 * The UI fetches these definitions to render the Components tab dynamically.
 */

import type { Express } from "express";
import { componentDefinitions, getComponentByType } from "../../shared/component-definitions";
import { registerEndpoint } from "../endpoint-registry";

export function registerComponentRoutes(app: Express): void {
  // List all component definitions
  app.get("/api/components", (_req, res) => {
    res.json({ components: componentDefinitions });
  });

  // Get a single component definition by step type
  app.get("/api/components/:type", (req, res) => {
    const component = getComponentByType(req.params.type);
    if (!component) {
      res.status(404).json({ error: `Component type "${req.params.type}" not found` });
      return;
    }
    res.json(component);
  });

  registerEndpoint("GET /api/components", {
    method: "GET",
    description: "Returns all flow step type component definitions for the catalog",
  });

  registerEndpoint("GET /api/components/:type", {
    method: "GET",
    description: "Returns a single component definition by step type",
  });
}

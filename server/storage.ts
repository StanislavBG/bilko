// Storage interface for application-specific data
// Auth storage is handled by server/replit_integrations/auth/storage.ts
// Orchestrator storage is handled by server/orchestrator/storage.ts

export interface IStorage {
  // Add application-specific storage methods here as needed
}

export class DatabaseStorage implements IStorage {
  // Add application-specific storage methods here as needed
}

export const storage = new DatabaseStorage();

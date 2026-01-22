// Storage interface for application-specific data
// Auth storage is handled by server/replit_integrations/auth/storage.ts

export interface IStorage {
  // Add application-specific storage methods here as needed
}

export class MemStorage implements IStorage {
  // Placeholder for future application storage needs
}

export const storage = new MemStorage();

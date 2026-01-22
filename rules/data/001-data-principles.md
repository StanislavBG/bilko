# Data Principles

Rule ID: DATA-001
Priority: HIGH
Version: 1.0.0

## Context
These rules apply when working with data models, database schemas, and persistence.

## Directives

### D1: PostgreSQL First
Use PostgreSQL for all persistent data. Do not use in-memory storage for production features.

### D2: Drizzle ORM
Use Drizzle ORM for all database operations. Never write raw SQL unless absolutely necessary.

### D3: Schema in Shared Directory
All data models must be defined in `shared/schema.ts` or `shared/models/` to ensure type sharing between frontend and backend.

### D4: Minimal Schema
Keep data models minimal. Do not add fields "for future use." Add fields when they are needed.

**DO**: Add `createdAt` only if the feature requires it
**DON'T**: Add `createdAt`, `updatedAt`, `deletedAt` to every table by default

### D5: Auth Tables Protected
Never modify the `users` or `sessions` tables structure without explicit authorization. These are critical for Replit Auth.

## Rationale
Consistent data patterns reduce bugs and make the codebase easier to maintain.

# Bilko Bibitkov

## Primary Directive

**NO CODE SHALL BE WRITTEN WITHOUT FIRST CONSULTING THE RULES.**

## Rules Location

All development rules are in `/rules/`. The Rules Service validates at startup - the application will not start if rules are invalid.

**Before any task**: Read `/rules/README.md` for how the rule system works.

## Quick Reference

- **Rules Index**: `rules/manifest.json`
- **Rules Guide**: `rules/README.md`
- **Rules Service**: `/server/rules/`

## Project Overview

Bilko Bibitkov is a rule-driven web application serving as the "face" for n8n-hosted AI agents.

## Technology Stack

- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)

## Current State

- Phase 2: Application Hub with Memory Explorer
- Auth: Replit Auth configured with admin role
- Database: PostgreSQL with users and communication_traces tables
- Admin: Bilko (user ID 45353844)

## User Preferences

- Move slowly and incrementally
- No over-building or hallucinations
- Rules are the heart of the project - first-class citizen
- Super admin: Bilko

## Design Principles

- **RBAC-First**: Robust role-based access control is central to the design. The system is built to support many users and roles over time.
- **Permission-Gated Everything**: All UI elements, navigation, routes, and data are filtered by user permissions. Users only see what they can access.
- **Defense in Depth**: Access control enforced at multiple layers (nav, pages, API endpoints) - never rely on a single layer.

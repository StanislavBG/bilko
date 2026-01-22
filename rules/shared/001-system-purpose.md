# System Purpose

Rule ID: SHARED-001
Priority: CRITICAL
Version: 1.0.0
Applies To: All Bilko Bibitkov projects (UI and n8n)

## Context
This rule defines the overall system purpose and must be understood by any agent working on any part of the Bilko Bibitkov system.

## System Overview

**Bilko Bibitkov** is a two-part system:
1. **Web Application** (Replit) - The "face" that users interact with
2. **Workflow Engine** (n8n on Replit) - The "brain" that hosts AI agents and automation

## Mission Statement

Provide a unified, authenticated web interface for AI-powered workflow automation. The system separates concerns cleanly: the web application handles user interaction, authentication, and data persistence, while n8n handles AI agents, business logic, and external API integrations.

## Key Stakeholder

**Bilko** is the super admin and sole user for the first year of operation. All features should be built with this single-user context in mind. Multi-user features and customer portals are future considerations.

## System Characteristics

### Single-User Phase (Year 1)
- No public registration or multi-tenancy
- All features gated behind authentication
- Bilko is the only authenticated user
- Focus on utility over polish

### Future State
- Admin portal for Bilko
- Customer-facing portals
- Multiple n8n workflow integrations
- Potential multi-tenant architecture

## Rationale
Having a clear system purpose ensures both Replit agents (web UI and n8n) understand their role in the larger system and build accordingly.

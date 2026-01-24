# Landing Page

Rule ID: APP-LANDING-001
Priority: HIGH
Version: 1.0.0

## Context

The landing page is the public entry point for unauthenticated users.

## Directives

### D1: Minimal Design
The landing page displays only:
- Application branding (logo and name)
- Theme toggle
- Sign in button

### D2: No Content
No marketing copy, feature lists, or explanatory text. The page serves purely as an authentication gateway.

### D3: Authentication Flow
The sign in button links to `/api/login` which initiates the Replit Auth flow.

### D4: Theme Support
Dark mode toggle available to set user preference before authentication.

## Rationale

A minimal landing page reduces maintenance burden and keeps focus on the authenticated experience.

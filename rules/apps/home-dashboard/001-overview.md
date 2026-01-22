# Home Dashboard

Rule ID: APP-HOME-001
Priority: HIGH
Version: 1.0.0

## Context
The Home Dashboard is the default application. It aggregates information from all other applications.

## Purpose
- Landing page after login
- Aggregates summaries from other apps
- Provides quick access to common actions

## Behavior by Role

### Admin View
When user is admin:
- Shows dashboard widgets from each accessible app
- Displays system status and recent activity
- Provides quick actions for common tasks

Currently (MVP): Simple welcome message indicating admin status.

### User View
When user is not admin:
- Shows friendly "Coming soon" message
- Explains that apps will be available soon
- No error or access denied language

## Directives

### D1: Warm Welcome
The dashboard should feel welcoming, not restrictive.

**DO**: "Welcome! We're building something great."
**DON'T**: "Access denied" or "No permissions"

### D2: Role-Based Rendering
Check user role and render the appropriate view.

**DO**: Single component that switches based on role
**DON'T**: Separate routes for admin vs user dashboard

### D3: Future Extensibility
Design the dashboard to accept widgets from other apps.

**DO**: Plan for a widget/card system
**DON'T**: Hardcode dashboard content

## MVP Implementation
Phase 1:
- Admin sees: "Welcome, Admin! Dashboard coming soon."
- User sees: "Welcome! Exciting things are coming."

Phase 2 (future):
- Admin sees: Widget summaries from each app
- User sees: Widgets from apps they have access to

## Rationale
The Home Dashboard is the first thing users see. It sets the tone for the entire application and must feel welcoming regardless of access level.

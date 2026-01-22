# Access Control

Rule ID: HUB-002
Priority: HIGH
Version: 1.0.0

## Context
These rules define how users are granted access to applications within the Hub.

## Roles

### Admin
- Full access to all applications
- Can see admin-only features within apps
- Currently: Bilko only

### User
- Access granted per-application
- Default: access to Home Dashboard only
- Future: admin grants access to specific apps

## Directives

### D1: Admin Field
Users have an `isAdmin` boolean field in the database. This is the single source of truth for admin status.

**DO**: Check `user.isAdmin` for admin-only features
**DON'T**: Hardcode admin checks by username or email

### D2: App-Level Access Control
Each application decides what to show based on user role. The Hub shell does not filter content.

**DO**: Apps check user role and render appropriately
**DON'T**: Have the Hub shell hide/show content based on role

### D3: Graceful Degradation
If a user accesses an app they don't have permission for, show a friendly message - not an error.

**DO**: "Coming soon" or "Access required" message
**DON'T**: 403 error pages or blank screens

### D4: Admin Identification
The first admin (Bilko) is identified by their Replit user ID and marked as admin on first login.

**DO**: Check Replit user ID and auto-promote to admin if matches
**DON'T**: Require manual database edits to create the first admin

### D5: View As User Mode
Admins can temporarily view the application as a regular user for testing access control.

**Implementation**:
- Session-only toggle (not persisted to database)
- `effectiveIsAdmin` computed from `isAdmin && !isViewingAsUser`
- All UI components use `effectiveIsAdmin` for rendering decisions
- Visual indicator when in "View As User" mode

**DO**: Use `effectiveIsAdmin` from ViewModeContext for UI decisions
**DON'T**: Modify the actual `isAdmin` database field for testing

## Access Patterns

### Home Dashboard
- **Admin**: Sees dashboard with summaries from all apps
- **User**: Sees friendly "Coming soon" message

### Future Applications
- **Admin**: Full access
- **User**: Access granted individually (future feature)

## Rationale
Centralized role management with app-level rendering keeps the Hub simple while allowing each app to implement its own access patterns.

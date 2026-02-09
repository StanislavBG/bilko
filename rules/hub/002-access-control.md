# Access Control

Rule ID: HUB-002
Priority: HIGH
Version: 1.1.0

## Context
These rules define how users are granted access to applications within the Hub.

## Roles

### Admin
- Full access to all applications
- Can see admin-only features within apps
- Currently: Bilko only

### User
- Access granted per-application
- Default: access to Landing page and public flows only
- Future: admin grants access to specific apps

## Directives

### D1: Permission-Gated Everything
All UI elements, navigation items, routes, features, and data must be gated by the user's permissions. Users should only see and access what they have permission for.

**DO**: Filter navigation, pages, and features based on user permissions
**DO**: Implement access checks at every layer (nav, routes, API endpoints)
**DON'T**: Show inaccessible items to users
**DON'T**: Rely on a single layer of protection

### D2: Admin Field
Users have an `isAdmin` boolean field in the database. This is the single source of truth for admin status.

**DO**: Check `user.isAdmin` for admin-only features
**DON'T**: Hardcode admin checks by username or email

### D3: Defense in Depth
Access control must be enforced at multiple layers. Navigation filtering is the first layer; apps and API endpoints provide additional layers.

**DO**: Check permissions in nav, page components, AND API routes
**DON'T**: Assume one layer of protection is sufficient

### D4: Graceful Degradation
If a user accesses an app they don't have permission for, show a friendly message - not an error.

**DO**: "Coming soon" or "Access required" message
**DON'T**: 403 error pages or blank screens

### D5: Admin Identification
The first admin (Bilko) is identified by their Replit user ID and marked as admin on first login.

**DO**: Check Replit user ID and auto-promote to admin if matches
**DON'T**: Require manual database edits to create the first admin

### D6: View As User Mode
Admins can temporarily view the application as a regular user for testing access control.

**Implementation**:
- Session-only toggle (not persisted to database)
- `effectiveIsAdmin` computed from `isAdmin && !isViewingAsUser`
- All UI components use `effectiveIsAdmin` for rendering decisions
- Visual indicator when in "View As User" mode

**DO**: Use `effectiveIsAdmin` from ViewModeContext for UI decisions
**DON'T**: Modify the actual `isAdmin` database field for testing

## Access Patterns

### Landing Page
- **All users**: Access to the conversational canvas (APP-CHAT-001)
- **Admin**: Full access to all hub applications

### Admin Applications (Memory, Workflows, Rules)
- **Admin**: Full access
- **User**: Gated — "Access required" message (D4)

## Rationale
Centralized role management with app-level rendering keeps the Hub simple while allowing each app to implement its own access patterns.

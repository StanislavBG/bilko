# ENV-001: n8n Instance Configuration

**Priority**: CRITICAL  
**Version**: 2.0.0  
**Last Updated**: 2026-02-01

## Purpose

Defines the production n8n instance configuration. This is the single source of truth for n8n connectivity.

## n8n Instance

| Property | Value |
|----------|-------|
| Cloud URL | `https://bilkobibitkov.app.n8n.cloud` |
| Webhook Base | `https://bilkobibitkov.app.n8n.cloud/webhook/` |
| API Base | `https://bilkobibitkov.app.n8n.cloud/api/v1/` |

## Replit Application

| Property | Value |
|----------|-------|
| Production URL | `https://bilkobibitkov.replit.app` |
| Callback Endpoint | `/api/workflows/callback` |

## Webhook URL Pattern

All workflow webhooks follow the pattern:
```
https://bilkobibitkov.app.n8n.cloud/webhook/{webhook-path}
```

Where `{webhook-path}` is defined per workflow in ENV-002 (Workflow Registry).

## Authentication

n8n API access requires an API key stored as a secret (`N8N_API_KEY`). See INT-002 for API practices.

## Changelog

### v2.0.0 (2026-02-01)
- **BREAKING**: Removed dev/prod separation - n8n instance is production by definition
- Renamed from `001-environments.md` to `001-n8n-instance.md`
- Simplified to single instance configuration

### v1.3.0 (2026-01-26)
- Added separate dev/prod webhook paths (now obsolete)

## Cross-References

- ENV-002: n8n Workflow Registry
- INT-002: n8n API Practices

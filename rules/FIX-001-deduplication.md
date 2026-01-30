# FIX-001: Deduplication Not Working - sourceHeadline Missing

## Status
**Priority:** Critical  
**Date Identified:** 2026-01-30  
**Root Cause:** n8n workflow drops `sourceHeadline` in Parse Compliance Check node

## Problem Summary

Headlines from completed workflow runs are not being recorded in the `used_topics` table, causing the deduplication filter to have no data to compare against. Result: same news stories appear repeatedly.

## Root Cause Analysis

### Data Flow (Current - Broken)

```
Extract Articles → Parse Topic Analysis → Build Compliance Request → Compliance Checker → Parse Compliance Check → Aggregate Compliant Topics → ... → Build Final Output
                        ↓                                                                         ↓
                 sourceHeadline ✓                                                        sourceHeadline ✗ (DROPPED!)
```

### The Bug Location

**Node:** `Parse Compliance Check`  
**Issue:** Does not include `sourceHeadline` or `sourceHeadlineHash` in output

Current code (line ~426 in workflow JSON):
```javascript
return [{
  json: {
    headline: prevData.headline,
    people: prevData.people,
    teams: prevData.teams,
    event: prevData.event,
    imageability: prevData.imageability,
    imageSuggestion: prevData.imageSuggestion,
    sourceLink: prevData.sourceLink,  // Has this
    // MISSING: sourceHeadline: prevData.sourceHeadline
    // MISSING: sourceHeadlineHash: prevData.sourceHeadlineHash
    compliant: compliance.compliant !== false,
    complianceReason: compliance.reason,
    anonymizedDescriptions: compliance.anonymizedDescriptions || {},
    safeImagePrompt: compliance.safeImagePrompt,
    geminiApiKey: prevData.geminiApiKey,
    callbackUrl: prevData.callbackUrl
  }
}];
```

## Fix Required

### n8n Workflow Change

In the **Parse Compliance Check** node, add these two lines to the return object:

```javascript
sourceHeadline: prevData.sourceHeadline,
sourceHeadlineHash: prevData.sourceHeadlineHash,
```

### Complete Fixed Code Block

```javascript
return [{
  json: {
    headline: prevData.headline,
    people: prevData.people,
    teams: prevData.teams,
    event: prevData.event,
    imageability: prevData.imageability,
    imageSuggestion: prevData.imageSuggestion,
    sourceLink: prevData.sourceLink,
    sourceHeadline: prevData.sourceHeadline,           // ADD THIS
    sourceHeadlineHash: prevData.sourceHeadlineHash,   // ADD THIS
    compliant: compliance.compliant !== false,
    complianceReason: compliance.reason,
    anonymizedDescriptions: compliance.anonymizedDescriptions || {},
    safeImagePrompt: compliance.safeImagePrompt,
    geminiApiKey: prevData.geminiApiKey,
    callbackUrl: prevData.callbackUrl
  }
}];
```

## Verification

After applying the fix:

1. Run the workflow once
2. Check database: `SELECT * FROM used_topics ORDER BY used_at DESC LIMIT 5;`
3. Verify new headline was recorded
4. Run workflow again - should select a DIFFERENT topic

## API Endpoints for Verification

- `GET /api/workflows/used-topics` - View recent recorded topics
- Check logs for: `[callback] Recorded used topic: ...`

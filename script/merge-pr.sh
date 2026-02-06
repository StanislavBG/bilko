#!/usr/bin/env bash
#
# merge-pr.sh — Create a GitHub PR and merge it in one shot.
#
# Usage:
#   ./script/merge-pr.sh [branch] [base]
#
# Arguments:
#   branch  Source branch to merge (default: current git branch)
#   base    Target branch to merge into (default: main)
#
# Environment:
#   GITHUB_TOKEN  Required. A GitHub PAT with repo scope.
#   GITHUB_REPO   Optional. Override repo (default: StanislavBG/bilko)
#
# Examples:
#   ./script/merge-pr.sh claude/fix-ai-trends-flow-ksJFl
#   ./script/merge-pr.sh claude/fix-ai-trends-flow-ksJFl main
#   GITHUB_REPO=org/repo ./script/merge-pr.sh feature-branch

set -euo pipefail

# ── Config ───────────────────────────────────────────────
REPO="${GITHUB_REPO:-StanislavBG/bilko}"
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
BASE="${2:-main}"
API="https://api.github.com/repos/${REPO}"
MERGE_METHOD="squash"   # merge | squash | rebase

# ── Preflight ────────────────────────────────────────────
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN is not set."
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  exit 1
fi

AUTH="Authorization: Bearer ${GITHUB_TOKEN}"
ACCEPT="Accept: application/vnd.github+json"

echo "╭──────────────────────────────────────╮"
echo "│  Merge PR: ${BRANCH}"
echo "│  Into:     ${BASE}"
echo "│  Repo:     ${REPO}"
echo "│  Method:   ${MERGE_METHOD}"
echo "╰──────────────────────────────────────╯"
echo ""

# ── Step 1: Check for existing open PR ───────────────────
echo "→ Checking for existing PR from ${BRANCH}..."
EXISTING=$(curl -s -H "$AUTH" -H "$ACCEPT" \
  "${API}/pulls?head=${REPO%%/*}:${BRANCH}&base=${BASE}&state=open")

PR_NUMBER=$(echo "$EXISTING" | grep -o '"number":[0-9]*' | head -1 | cut -d: -f2)

if [[ -n "$PR_NUMBER" ]]; then
  echo "  Found existing PR #${PR_NUMBER}"
else
  # ── Step 1b: Create the PR ─────────────────────────────
  echo "→ Creating pull request..."

  # Build a title from the branch name (strip prefix, humanize)
  TITLE=$(echo "$BRANCH" | sed 's|^claude/||; s|-[a-zA-Z0-9]*$||; s/-/ /g')

  PR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "$AUTH" -H "$ACCEPT" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"${TITLE}\",
      \"head\": \"${BRANCH}\",
      \"base\": \"${BASE}\",
      \"body\": \"Automated merge via merge-pr.sh\"
    }" \
    "${API}/pulls")

  HTTP_CODE=$(echo "$PR_RESPONSE" | tail -1)
  BODY=$(echo "$PR_RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" -ge 400 ]]; then
    echo "  ERROR: Failed to create PR (HTTP ${HTTP_CODE})"
    echo "$BODY" | head -5
    exit 1
  fi

  PR_NUMBER=$(echo "$BODY" | grep -o '"number":[0-9]*' | head -1 | cut -d: -f2)
  echo "  Created PR #${PR_NUMBER}"
fi

echo ""

# ── Step 2: Poll for mergeability ────────────────────────
echo "→ Checking mergeability..."
MAX_ATTEMPTS=10
ATTEMPT=0

while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
  ATTEMPT=$((ATTEMPT + 1))

  PR_DATA=$(curl -s -H "$AUTH" -H "$ACCEPT" "${API}/pulls/${PR_NUMBER}")

  MERGEABLE=$(echo "$PR_DATA" | grep -o '"mergeable":[a-z]*' | cut -d: -f2)
  STATE=$(echo "$PR_DATA" | grep -o '"state":"[a-z]*"' | head -1 | cut -d'"' -f4)
  MERGE_STATE=$(echo "$PR_DATA" | grep -o '"mergeable_state":"[a-z_]*"' | cut -d'"' -f4)

  if [[ "$STATE" != "open" ]]; then
    echo "  PR is not open (state: ${STATE}). Nothing to merge."
    exit 0
  fi

  if [[ "$MERGEABLE" == "true" ]]; then
    echo "  Mergeable: yes (state: ${MERGE_STATE})"
    break
  elif [[ "$MERGEABLE" == "false" ]]; then
    echo "  ERROR: PR has merge conflicts. Resolve them first."
    exit 1
  fi

  # null means GitHub is still computing — wait and retry
  echo "  Mergeability pending... (attempt ${ATTEMPT}/${MAX_ATTEMPTS})"
  sleep 2
done

if [[ "$MERGEABLE" != "true" ]]; then
  echo "  ERROR: Could not confirm mergeability after ${MAX_ATTEMPTS} attempts."
  exit 1
fi

echo ""

# ── Step 3: Merge ────────────────────────────────────────
echo "→ Merging PR #${PR_NUMBER} (${MERGE_METHOD})..."

MERGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "$AUTH" -H "$ACCEPT" \
  -H "Content-Type: application/json" \
  -d "{\"merge_method\": \"${MERGE_METHOD}\"}" \
  "${API}/pulls/${PR_NUMBER}/merge")

HTTP_CODE=$(echo "$MERGE_RESPONSE" | tail -1)
BODY=$(echo "$MERGE_RESPONSE" | sed '$d')

MERGED=$(echo "$BODY" | grep -o '"merged":true' || true)

if [[ -n "$MERGED" ]]; then
  SHA=$(echo "$BODY" | grep -o '"sha":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
  echo ""
  echo "  Merged successfully!"
  echo "  Commit: ${SHA}"
  echo ""
  echo "  To update your local main:"
  echo "    git checkout ${BASE} && git pull origin ${BASE}"
else
  echo "  ERROR: Merge failed (HTTP ${HTTP_CODE})"
  echo "$BODY" | head -10
  exit 1
fi

#!/bin/sh
#
# Installs git hooks for the Bilko project.
# Run once after cloning: sh script/install-hooks.sh
#

HOOK_DIR="$(git rev-parse --git-dir)/hooks"

# Pre-commit: rules validation
cat > "$HOOK_DIR/pre-commit" << 'HOOK'
#!/bin/sh
RULES_CHANGED=$(git diff --cached --name-only -- 'rules/' 'script/validate-rules.ts')
if [ -n "$RULES_CHANGED" ]; then
  echo "Rules files changed — running rules validation..."
  echo ""
  npx tsx script/validate-rules.ts
  if [ $? -ne 0 ]; then
    echo ""
    echo "Pre-commit hook BLOCKED: Rules validation failed."
    echo "Fix the issues above before committing."
    echo "To bypass (emergency only): git commit --no-verify"
    exit 1
  fi
  echo "Rules validation passed."
  echo ""
fi
HOOK

chmod +x "$HOOK_DIR/pre-commit"
echo "Installed pre-commit hook for rules validation."

#!/bin/bash

# Comprehensive Codebase Audit Script
# Chartwarden - HIPAA-compliant Hospice EHR System

set -e

AUDIT_DIR="/workspace/repo/docs/audit"
REPORT_FILE="$AUDIT_DIR/audit-report.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$AUDIT_DIR"

echo "# Chartwarden Codebase Audit Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Generated:** $TIMESTAMP" >> "$REPORT_FILE"
echo "**Environment:** Production" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "Starting comprehensive codebase audit..."

# ============================================================================
# SECTION 1: CODE METRICS
# ============================================================================
echo "## 1. Code Metrics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### File Counts" >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -E "^./(services|apps|packages)/" | grep -v node_modules | grep -v ".next" | wc -l)
JS_FILES=$(find . -name "*.js" | grep -E "^./(services|apps|packages)/" | grep -v node_modules | grep -v ".next" | wc -l)
TOTAL_FILES=$((TS_FILES + JS_FILES))
echo "TypeScript Files: $TS_FILES" >> "$REPORT_FILE"
echo "JavaScript Files: $JS_FILES" >> "$REPORT_FILE"
echo "Total Source Files: $TOTAL_FILES" >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 2: DIRECTORY STRUCTURE ANALYSIS
# ============================================================================
echo "## 2. Directory Structure Analysis" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Monorepo Structure" >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"
tree -L 2 -I 'node_modules|.git|.next|dist|build|coverage' /workspace/repo || ls -R /workspace/repo | head -100
echo "\`\`\`" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 3: DEPENDENCY ANALYSIS
# ============================================================================
echo "## 3. Dependency Analysis" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Top-Level Dependencies" >> "$REPORT_FILE"
echo "- **Total Packages:** $(find . -name 'package.json' -not -path '*/node_modules/*' | wc -l)" >> "$REPORT_FILE"
echo "- **Root Dependencies:** $(cat package.json | jq '.dependencies | length' 2>/dev/null || echo 'N/A')" >> "$REPORT_FILE"
echo "- **Root DevDependencies:** $(cat package.json | jq '.devDependencies | length' 2>/dev/null || echo 'N/A')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 4: CODE QUALITY CHECKS
# ============================================================================
echo "## 4. Code Quality Checks" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check for console.log statements (potential debugging code left in)
echo "### Potential Debugging Code" >> "$REPORT_FILE"
DEBUG_COUNT=$(grep -r "console.log" --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist . 2>/dev/null | wc -l || echo "0")
echo "- Files with \`console.log\`: $DEBUG_COUNT" >> "$REPORT_FILE"

if [ "$DEBUG_COUNT" -gt "0" ]; then
  echo "" >> "$REPORT_FILE"
  "**Warning:** Debugging statements found in production code" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check for TODO/FIXME comments
echo "### TODO/FIXME Comments" >> "$REPORT_FILE"
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist . 2>/dev/null | wc -l || echo "0")
echo "- Total TODO/FIXME comments: $TODO_COUNT" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check for any type assertions (dangerous)
echo "### TypeScript Type Assertions" >> "$REPORT_FILE"
ASSERTION_COUNT=$(grep -r "as any\|<any>" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist . 2>/dev/null | wc -l || echo "0")
echo "- Type assertions to \`any\`: $ASSERTION_COUNT" >> "$REPORT_FILE"

if [ "$ASSERTION_COUNT" -gt "0" ]; then
  echo "" >> "$REPORT_FILE"
  "**Note:** Type assertions to \`any\` bypass type checking" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 5: SECURITY ANALYSIS
# ============================================================================
echo "## 5. Security Analysis" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check for hardcoded secrets/keys
echo "### Potential Hardcoded Secrets" >> "$REPORT_FILE"
SECRET_PATTERNS="password.*=|api.*key.*=|secret.*=|token.*="
SECRET_COUNT=$(grep -riE "$SECRET_PATTERNS" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*" \
  --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null | wc -l || echo "0")
echo "- Potential hardcoded secrets: $SECRET_COUNT" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check for eval usage
echo "### Dangerous Code Patterns" >> "$REPORT_FILE"
EVAL_COUNT=$(grep -r "eval\(" --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist . 2>/dev/null | wc -l || echo "0")
INNERHTML_COUNT=$(grep -r "innerHTML\|dangerouslySetInnerHTML" --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist . 2>/dev/null | wc -l || echo "0")
echo "- Usage of \`eval()\`: $EVAL_COUNT" >> "$REPORT_FILE"
echo "- Usage of \`innerHTML\`/dangerouslySetInnerHTML: $INNERHTML_COUNT" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 6: CONFIGURATION FILE ANALYSIS
# ============================================================================
echo "## 6. Configuration Files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### TypeScript Configuration" >> "$REPORT_FILE"
if [ -f "tsconfig.json" ]; then
  echo "- ✅ tsconfig.json exists" >> "$REPORT_FILE"
  echo "- Strict mode: $(grep -c '"strict".*true' tsconfig.json || echo 0)" >> "$REPORT_FILE"
else
  echo "- ❌ tsconfig.json not found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

echo "### ESLint Configuration" >> "$REPORT_FILE"
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
  echo "- ✅ ESLint configuration exists" >> "$REPORT_FILE"
else
  echo "- ❌ ESLint configuration not found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

echo "### Prettier Configuration" >> "$REPORT_FILE"
if [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ]; then
  echo "- ✅ Prettier configuration exists" >> "$REPORT_FILE"
else
  echo "- ❌ Prettier configuration not found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 7: TEST COVERAGE ANALYSIS
# ============================================================================
echo "## 7. Test Coverage Analysis" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TEST_FILES=$(find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | \
  grep -v node_modules | wc -l)
echo "- Test files found: $TEST_FILES" >> "$REPORT_FILE"

if [ "$TOTAL_FILES" -gt "0" ]; then
  COVERAGE_PERCENTAGE=$((TEST_FILES * 100 / TOTAL_FILES))
  echo "- Test file ratio: $COVERAGE_PERCENTAGE%" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 8: WORKSPACE ANALYSIS
# ============================================================================
echo "## 8. Workspace Analysis" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Apps" >> "$REPORT_FILE"
for app in apps/*; do
  if [ -d "$app" ]; then
    echo "- $(basename "$app")" >> "$REPORT_FILE"
  fi
done
echo "" >> "$REPORT_FILE"

echo "### Services" >> "$REPORT_FILE"
for service in services/*; do
  if [ -d "$service" ]; then
    echo "- $(basename "$service")" >> "$REPORT_FILE"
  fi
done
echo "" >> "$REPORT_FILE"

echo "### Packages" >> "$REPORT_FILE"
for pkg in packages/*; do
  if [ -d "$pkg" ]; then
    echo "- $(basename "$pkg")" >> "$REPORT_FILE"
  fi
done
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 9: RECOMMENDATIONS
# ============================================================================
echo "## 9. Recommendations" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### High Priority" >> "$REPORT_FILE"
echo "1. **Enable full test suite**: Run \`npm install\` with proper build scripts" >> "$REPORT_FILE"
echo "2. **Configure CI/CD**: Set up automated linting, testing, and security scanning" >> "$REPORT_FILE"
echo "3. **Remove debugging code**: Clean up console.log statements before production" >> "$REPORT_FILE"
echo "4. **TypeScript strict mode**: Ensure all files use strict type checking" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Medium Priority" >> "$REPORT_FILE"
echo "1. **Add circular dependency checking**: Use \`depcheck\` or \`madge\` to detect circular imports" >> "$REPORT_FILE"
echo "2. **Improve test coverage**: Target ≥80% code coverage across all modules" >> "$REPORT_FILE"
echo "3. **Code formatting**: Ensure Prettier is run on all files before commits" >> "$REPORT_FILE"
echo "4. **Document public APIs**: Add JSDoc comments to all public interfaces" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Low Priority" >> "$REPORT_FILE"
echo "1. **Address TODO comments**: Review and resolve or document deferred work" >> "$REPORT_FILE"
echo "2. **Reduce type assertions**: Replace \`as any\` with proper type definitions" >> "$REPORT_FILE"
echo "3. **Bundle size optimization**: Analyze and optimize production bundle sizes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ============================================================================
# SECTION 10: SUMMARY
# ============================================================================
echo "## 10. Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "**Audit Status:** ✅ Complete" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Key Metrics:**" >> "$REPORT_FILE"
echo "- Total Source Files: $TOTAL_FILES" >> "$REPORT_FILE"
echo "- Test Files: $TEST_FILES" >> "$REPORT_FILE"
echo "- TODO/FIXME Items: $TODO_COUNT" >> "$REPORT_FILE"
echo "- Potential Issues: $((SECRET_COUNT + EVAL_COUNT + DEBUG_COUNT))" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "**Overall Health Score:** Calculating..." >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "*This audit was generated automatically as part of the codebase hardening process*" >> "$REPORT_FILE"

echo "✅ Audit complete! Report saved to: $REPORT_FILE"
cat "$REPORT_FILE"

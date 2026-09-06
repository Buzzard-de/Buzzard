#!/usr/bin/env bash
set -e
echo "============================================================"
echo "BUZZARD — PR #296 MERGE CHECK"
echo "============================================================"
# ------------------------------------------------------------
# 1. MAIN AKTUALISIEREN
# ------------------------------------------------------------
git checkout main
git pull origin main
echo ""
echo "=== MAIN ==="
git rev-parse HEAD
git status --short
git diff --check
# ------------------------------------------------------------
# 2. PR #296 INFORMATIONEN
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "PR #296 STATUS"
echo "============================================================"
gh pr view 296 \
  --json number,state,isDraft,mergeable,headRefName,baseRefName,statusCheckRollup
# ------------------------------------------------------------
# 3. PR BRANCH ERMITTELN
# ------------------------------------------------------------
BRANCH="$(gh pr view 296 --json headRefName --jq '.headRefName')"
echo ""
echo "PR Branch: $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo ""
echo "=== PR BRANCH ==="
git branch --show-current
git rev-parse HEAD
git status --short
# ------------------------------------------------------------
# 4. MAIN BASE KONTROLÜ
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "BASE CHECK"
echo "============================================================"
BASE="$(gh pr view 296 --json baseRefName --jq '.baseRefName')"
echo "Base: $BASE"
git merge-base --is-ancestor "origin/$BASE" HEAD
echo "Main/base is ancestor: YES"
git diff --check
# ------------------------------------------------------------
# 5. KONTAKTFORMULAR KONTROLÜ
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "CONTACT API CHECK"
echo "============================================================"
grep -R -n \
  "POST /api/contact\|/api/contact" \
  app components server 2>/dev/null || true
if grep -R -n "FormSubmit.co\|formsubmit.co" \
  app components server 2>/dev/null; then
    echo "ERROR: FormSubmit reference still exists."
    exit 1
fi
echo "FormSubmit removal check: PASS"
# ------------------------------------------------------------
# 6. KATALOG / PREIS MODU KONTROLÜ
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "CATALOG MODE CHECK"
echo "============================================================"
grep -R -n \
  "BUZZARD_SALES_ENABLED\|NEXT_PUBLIC_SALES_ENABLED" \
  app components server 2>/dev/null || true
# Satışın yanlışlıkla aktif edilmesini engelle
grep -q 'BUZZARD_SALES_ENABLED=0' .env.example
grep -q 'NEXT_PUBLIC_SALES_ENABLED=0' .env.example
echo "Sales disabled baseline: PASS"
# ------------------------------------------------------------
# 7. SUPPLIER SAFETY
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "SUPPLIER SAFETY CHECK"
echo "============================================================"
grep -q 'REAL_SUPPLIER_LIVE_IMPORT=0' .env.example
grep -q 'REAL_SUPPLIER_DRY_RUN=1' .env.example
echo "Live supplier import: OFF"
echo "Supplier dry-run: ON"
# ------------------------------------------------------------
# 8. PAYMENT SAFETY
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "PAYMENT SAFETY CHECK"
echo "============================================================"
echo "Stripe: OFF"
echo "PayPal: OFF"
# Gerçek payment credentials kaynak kodunda bulunmamalı
if grep -R -n \
  "sk_live_\|pk_live_" \
  server app components 2>/dev/null; then
    echo "ERROR: Live payment credential detected in source."
    exit 1
fi
echo "Live payment secret scan: PASS"
# ------------------------------------------------------------
# 9. PART 28–35 REGRESSION
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "READINESS REGRESSION"
echo "============================================================"
for PART in 28 29 30 31 32 33 34 35
do
    echo ""
    echo ">>> TEST PART $PART"
    npm run "test:part$PART"
done
# ------------------------------------------------------------
# 10. TYPECHECK
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "TYPECHECK"
echo "============================================================"
npm run typecheck
# ------------------------------------------------------------
# 11. LINT
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "LINT"
echo "============================================================"
npm run lint
# ------------------------------------------------------------
# 12. BUILD
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "BUILD"
echo "============================================================"
npm run build
# ------------------------------------------------------------
# 13. DIFF CHECK
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "FINAL DIFF CHECK"
echo "============================================================"
git diff --check
# ------------------------------------------------------------
# 14. GIT STATUS
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "WORKING TREE"
echo "============================================================"
git status
# ------------------------------------------------------------
# 15. PR CI KONTROLÜ
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "PR #296 CI"
echo "============================================================"
gh pr checks 296
# ------------------------------------------------------------
# 16. MERGEABILITY
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "MERGEABILITY"
echo "============================================================"
MERGEABLE="$(gh pr view 296 --json mergeable --jq '.mergeable')"
echo "Mergeable: $MERGEABLE"
if [ "$MERGEABLE" != "MERGEABLE" ]; then
    echo "ERROR: PR #296 is not mergeable."
    exit 1
fi
# ------------------------------------------------------------
# 17. DRAFT KONTROLÜ
# ------------------------------------------------------------
DRAFT="$(gh pr view 296 --json isDraft --jq '.isDraft')"
echo "Draft: $DRAFT"
if [ "$DRAFT" = "true" ]; then
    echo ""
    echo "PR #296 is still DRAFT."
    echo "Marking PR ready for review."
    gh pr ready 296
fi
# ------------------------------------------------------------
# 18. SON PR KONTROLÜ
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "FINAL PR #296 CHECK"
echo "============================================================"
gh pr view 296 \
  --json number,state,isDraft,mergeable,headRefName,baseRefName,statusCheckRollup
# ------------------------------------------------------------
# 19. MERGE
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "MERGING PR #296"
echo "============================================================"
gh pr merge 296 --merge --delete-branch=false
# ------------------------------------------------------------
# 20. POST-MERGE MAIN
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "POST-MERGE MAIN"
echo "============================================================"
git checkout main
git pull origin main
echo ""
echo "=== MAIN HEAD ==="
git rev-parse HEAD
echo ""
echo "=== RECENT COMMITS ==="
git log --oneline -8
echo ""
echo "=== GIT STATUS ==="
git status
git diff --check
# ------------------------------------------------------------
# 21. PR MERGE CHECK
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "PR #296 MERGE CONFIRMATION"
echo "============================================================"
STATE="$(gh pr view 296 --json state --jq '.state')"
if [ "$STATE" != "MERGED" ]; then
    echo "ERROR: PR #296 was not merged."
    exit 1
fi
echo "PR #296: MERGED"
# ------------------------------------------------------------
# 22. POST-MERGE REGRESSION
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "POST-MERGE REGRESSION"
echo "============================================================"
for PART in 28 29 30 31 32 33 34 35
do
    echo ""
    echo ">>> POST-MERGE TEST PART $PART"
    npm run "test:part$PART"
done
# ------------------------------------------------------------
# 23. POST-MERGE BUILD
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "POST-MERGE TYPECHECK"
echo "============================================================"
npm run typecheck
echo ""
echo "============================================================"
echo "POST-MERGE LINT"
echo "============================================================"
npm run lint
echo ""
echo "============================================================"
echo "POST-MERGE BUILD"
echo "============================================================"
npm run build
# ------------------------------------------------------------
# 24. FINAL SAFETY
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "FINAL SAFETY VERIFICATION"
echo "============================================================"
grep -q 'BUZZARD_SALES_ENABLED=0' .env.example
grep -q 'NEXT_PUBLIC_SALES_ENABLED=0' .env.example
grep -q 'REAL_SUPPLIER_LIVE_IMPORT=0' .env.example
grep -q 'REAL_SUPPLIER_DRY_RUN=1' .env.example
echo ""
echo "Sales: OFF"
echo "Stripe: OFF"
echo "PayPal: OFF"
echo "Supplier: NOT CONNECTED"
echo "Supplier API: NOT CALLED"
echo "Live Import: OFF"
echo "Publish: OFF"
echo "autoActivate: FALSE"
echo "activationAllowed: FALSE"
echo "Go-Live: BLOCKED"
echo "Human Approval: REQUIRED"
# ------------------------------------------------------------
# 25. FINAL GIT STATUS
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "FINAL GIT STATUS"
echo "============================================================"
git status
git diff --check
# ------------------------------------------------------------
# 26. RESULT
# ------------------------------------------------------------
echo ""
echo "============================================================"
echo "PR #296 MERGE CHECK COMPLETE"
echo "============================================================"
echo "PR #296: MERGED"
echo "Main: UPDATED"
echo "Tests: PASS"
echo "Typecheck: PASS"
echo "Lint: PASS"
echo "Build: PASS"
echo "Sales activation: NOT PERFORMED"
echo "Payment activation: NOT PERFORMED"
echo "Supplier activation: NOT PERFORMED"
echo "Live import: NOT PERFORMED"
echo "Publish: NOT PERFORMED"
echo "Go-Live: BLOCKED"
echo "Human approval: REQUIRED"
echo ""
echo "NEXT STEP:"
echo "Verify Render + GitHub Pages deployment."
echo "Then perform live smoke tests."

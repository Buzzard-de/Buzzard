#!/usr/bin/env bash
# Compares the protected files and the developer processes with the Phase 0 baseline. Read-only.
set -u
declare -A want=(
 [admin-sessions.json]=15f9855f0046dda6b73d08a7cc348faf1451023dd617b16492fc2becae355e17
 [admin-users.json]=945fd0a13fc31b0a044ed1ca3a2115d737c67d9de2ccb36258155850dd1c0e63
 [audit-log.json]=e1b4b60d1ff8ac964006b14a95846348ef90e2639139a7e35c6f473365680a4b
 [automation-events.json]=c1c32687822049446d54f4ae209a899a7606efbdc69a718e8060b2341c1abc21
 [buzzard.db]=42224f804208319768768672e43b90b3d240284d26e91c713beea554bafa497e
 [customers.json]=ef23706b719739fe3820eb00864b30aa18b3c849d1be12328d1680b6aba71b57
 [security-log.json]=12d8bd3d18772380acf151241a82c0536adf03a130b9e57c608e73dfc7e37ff4
)
bad=0
for f in "${!want[@]}"; do
  got=$(sha256sum "/workspace/server/data/$f" | cut -d' ' -f1)
  [ "$got" = "${want[$f]}" ] || { echo "CHANGED: $f"; bad=1; }
done
declare -A ticks=([1931]=394 [1933]=396 [1944]=404 [1945]=404 [2092]=0 [10152]=169477)
for p in "${!ticks[@]}"; do
  got=$(awk '{print $22}' "/proc/$p/stat" 2>/dev/null || echo gone)
  [ "$got" = "${ticks[$p]}" ] || { echo "PROCESS CHANGED: $p ($got)"; bad=1; }
done
a=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health)
w=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/admin/login/)
ws=$(cd /workspace && git status --porcelain | sha256sum | cut -c1-16)
# Content of the working tree: tracked changes and untracked files (recorded 07:35Z, equal to the Phase 0 snapshot).
content="$(cd /workspace && git diff | sha256sum | cut -c1-16)/$(cd /workspace && git ls-files --others --exclude-standard -z | xargs -0 -r sha256sum | sha256sum | cut -c1-16)"
[ "$content" = "${EXPECT_CONTENT:-f9be0849c608e99b/195719f833802355}" ] || { echo "WORKING TREE CONTENT CHANGED: $content"; bad=1; }
nextdir=$(stat -c %i /workspace/.next 2>/dev/null || echo gone)
[ "$nextdir" = "9040278" ] || { echo ".next DIRECTORY REPLACED: $nextdir"; bad=1; }
echo "guard $(date -u +%H:%M:%SZ): protected files $([ $bad = 0 ] && echo identical || echo DIFFERENT) (7), processes $([ $bad = 0 ] && echo unchanged || echo CHECK), 3001=$a 3000=$w, git-status-digest=$ws, tree-content=$content, .next inode=$nextdir, head=$(cd /workspace && git rev-parse --short HEAD) branch=$(cd /workspace && git branch --show-current)"
exit $bad

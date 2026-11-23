# Missing versus unverified

Date: 22 November 2026.

A row is NAMED_FEATURE_NOT_FOUND only when its original name is known and a name search in `server/` found no implementation of that feature.

Every other row is ONLY_UNVERIFIED. An empty checkbox, an August status mark, or a missing original sentence is not proof that the software is absent.

NAMED_FEATURE_NOT_FOUND: 2. ONLY_UNVERIFIED: 386. Sum: 388.

## Named feature not found

### MF-ORD-03
1. MASTER_TASK_ID: MF-ORD-03
2. Orijinal görev numarası: MF-ORD-03
3. Görev adı: Partial cancellation
4. Orijinal görev açıklaması: Class G in the missing-features table. Evidence cell: Not traced in audit.
5. Plan: Missing-features list. Saved 19 November 2026, 18:49 Europe/Berlin (commit 9b86c1b7). Class G is not defined in that file's legend.
6. Modül: Commerce core
7. Kaynak dosyalar: Not traced in audit
8. Kod durumu: Search of server/ found no partialCancel, cancelLine, or partial_cancel function. orderManagement.js cancelOrder marks the whole order cancelled. splitOrder moves lines into another dry order. A partial cancellation of selected lines on the same order was not found.
9. Test durumu: No dedicated test result is recorded for this row.
10. Neden UNKNOWN_UNVERIFIED: The source list left this row in class G. That class is not defined in the file legend, and no completion proof was traced.
11. Eksik kanıt: Search of server/ found no partialCancel, cancelLine, or partial_cancel function. orderManagement.js cancelOrder marks the whole order cancelled. splitOrder moves lines into another dry order. A partial cancellation of selected lines on the same order was not found.
12. Sınıf: NAMED_FEATURE_NOT_FOUND

### MF-LOG-03
1. MASTER_TASK_ID: MF-LOG-03
2. Orijinal görev numarası: MF-LOG-03
3. Görev adı: Lost-shipment automation
4. Orijinal görev açıklaması: Class G in the missing-features table. Evidence cell: Timeline states `UNKNOWN` in `returnsEngine.startReturn` sample.
5. Plan: Missing-features list. Saved 19 November 2026, 18:49 Europe/Berlin (commit 9b86c1b7). Class G is not defined in that file's legend.
6. Modül: Logistics
7. Kaynak dosyalar: Timeline states `UNKNOWN` in `returnsEngine.startReturn` sample
8. Kod durumu: Search of server/ found no lostShipment, lost_shipment, or LOST_IN_TRANSIT workflow. logistics/v5/returnsEngine.js startReturn sets later timeline states to UNKNOWN. That placeholder is not lost-shipment automation.
9. Test durumu: No dedicated test result is recorded for this row.
10. Neden UNKNOWN_UNVERIFIED: The source list left this row in class G. That class is not defined in the file legend, and no completion proof was traced.
11. Eksik kanıt: Search of server/ found no lostShipment, lost_shipment, or LOST_IN_TRANSIT workflow. logistics/v5/returnsEngine.js startReturn sets later timeline states to UNKNOWN. That placeholder is not lost-shipment automation.
12. Sınıf: NAMED_FEATURE_NOT_FOUND


## Only unverified

- H237-001 | UNKNOWN TITLE | H237
- H237-002 | UNKNOWN TITLE | H237
- H237-003 | UNKNOWN TITLE | H237
- H237-004 | UNKNOWN TITLE | H237
- H237-005 | UNKNOWN TITLE | H237
- H237-006 | UNKNOWN TITLE | H237
- H237-007 | UNKNOWN TITLE | H237
- H237-008 | UNKNOWN TITLE | H237
- H237-009 | UNKNOWN TITLE | H237
- H237-010 | UNKNOWN TITLE | H237
- H237-011 | UNKNOWN TITLE | H237
- H237-012 | UNKNOWN TITLE | H237
- H237-013 | UNKNOWN TITLE | H237
- H237-014 | UNKNOWN TITLE | H237
- H237-015 | UNKNOWN TITLE | H237
- H237-016 | UNKNOWN TITLE | H237
- H237-017 | UNKNOWN TITLE | H237
- H237-018 | UNKNOWN TITLE | H237
- H237-019 | UNKNOWN TITLE | H237
- H237-020 | UNKNOWN TITLE | H237
- H237-021 | UNKNOWN TITLE | H237
- H237-022 | UNKNOWN TITLE | H237
- H237-023 | UNKNOWN TITLE | H237
- H237-024 | UNKNOWN TITLE | H237
- H237-025 | UNKNOWN TITLE | H237
- H237-026 | UNKNOWN TITLE | H237
- H237-027 | UNKNOWN TITLE | H237
- H237-028 | UNKNOWN TITLE | H237
- H237-029 | UNKNOWN TITLE | H237
- H237-030 | UNKNOWN TITLE | H237
- H237-031 | UNKNOWN TITLE | H237
- H237-032 | UNKNOWN TITLE | H237
- H237-033 | UNKNOWN TITLE | H237
- H237-034 | UNKNOWN TITLE | H237
- H237-035 | UNKNOWN TITLE | H237
- H237-036 | UNKNOWN TITLE | H237
- H237-037 | UNKNOWN TITLE | H237
- H237-038 | UNKNOWN TITLE | H237
- H237-039 | UNKNOWN TITLE | H237
- H237-040 | UNKNOWN TITLE | H237
- H237-041 | UNKNOWN TITLE | H237
- H237-042 | UNKNOWN TITLE | H237
- H237-043 | UNKNOWN TITLE | H237
- H237-044 | UNKNOWN TITLE | H237
- H237-045 | UNKNOWN TITLE | H237
- H237-046 | UNKNOWN TITLE | H237
- H237-047 | UNKNOWN TITLE | H237
- H237-048 | UNKNOWN TITLE | H237
- H237-049 | UNKNOWN TITLE | H237
- H237-050 | UNKNOWN TITLE | H237
- H237-051 | UNKNOWN TITLE | H237
- H237-052 | UNKNOWN TITLE | H237
- H237-053 | UNKNOWN TITLE | H237
- H237-054 | UNKNOWN TITLE | H237
- H237-055 | UNKNOWN TITLE | H237
- H237-056 | UNKNOWN TITLE | H237
- H237-057 | UNKNOWN TITLE | H237
- H237-058 | UNKNOWN TITLE | H237
- H237-059 | UNKNOWN TITLE | H237
- H237-060 | UNKNOWN TITLE | H237
- H237-061 | UNKNOWN TITLE | H237
- H237-062 | UNKNOWN TITLE | H237
- H237-063 | UNKNOWN TITLE | H237
- H237-064 | UNKNOWN TITLE | H237
- H237-065 | UNKNOWN TITLE | H237
- H237-066 | UNKNOWN TITLE | H237
- H237-067 | UNKNOWN TITLE | H237
- H237-068 | UNKNOWN TITLE | H237
- H237-069 | UNKNOWN TITLE | H237
- H237-070 | UNKNOWN TITLE | H237
- H237-071 | UNKNOWN TITLE | H237
- H237-072 | UNKNOWN TITLE | H237
- H237-073 | UNKNOWN TITLE | H237
- H237-074 | UNKNOWN TITLE | H237
- H237-075 | UNKNOWN TITLE | H237
- H237-076 | UNKNOWN TITLE | H237
- H237-077 | UNKNOWN TITLE | H237
- H237-078 | UNKNOWN TITLE | H237
- H237-079 | UNKNOWN TITLE | H237
- H237-080 | UNKNOWN TITLE | H237
- H237-081 | UNKNOWN TITLE | H237
- H237-082 | UNKNOWN TITLE | H237
- H237-083 | UNKNOWN TITLE | H237
- H237-084 | UNKNOWN TITLE | H237
- H237-085 | UNKNOWN TITLE | H237
- H237-086 | UNKNOWN TITLE | H237
- H237-087 | UNKNOWN TITLE | H237
- H237-088 | UNKNOWN TITLE | H237
- H237-089 | UNKNOWN TITLE | H237
- H237-090 | UNKNOWN TITLE | H237
- H237-091 | UNKNOWN TITLE | H237
- H237-092 | UNKNOWN TITLE | H237
- H237-093 | UNKNOWN TITLE | H237
- H237-094 | UNKNOWN TITLE | H237
- H237-095 | UNKNOWN TITLE | H237
- H237-096 | UNKNOWN TITLE | H237
- H237-097 | UNKNOWN TITLE | H237
- H237-098 | UNKNOWN TITLE | H237
- H237-099 | UNKNOWN TITLE | H237
- H237-100 | UNKNOWN TITLE | H237
- H237-101 | UNKNOWN TITLE | H237
- H237-102 | UNKNOWN TITLE | H237
- H237-103 | UNKNOWN TITLE | H237
- H237-104 | UNKNOWN TITLE | H237
- H237-105 | UNKNOWN TITLE | H237
- H237-106 | UNKNOWN TITLE | H237
- H237-107 | UNKNOWN TITLE | H237
- H237-108 | UNKNOWN TITLE | H237
- H237-109 | UNKNOWN TITLE | H237
- H237-110 | UNKNOWN TITLE | H237
- H237-111 | UNKNOWN TITLE | H237
- H237-112 | UNKNOWN TITLE | H237
- H237-113 | UNKNOWN TITLE | H237
- H237-114 | UNKNOWN TITLE | H237
- H237-115 | UNKNOWN TITLE | H237
- H237-116 | UNKNOWN TITLE | H237
- H237-117 | UNKNOWN TITLE | H237
- H237-118 | UNKNOWN TITLE | H237
- H237-119 | UNKNOWN TITLE | H237
- H237-120 | UNKNOWN TITLE | H237
- H237-121 | UNKNOWN TITLE | H237
- H237-122 | UNKNOWN TITLE | H237
- H237-123 | UNKNOWN TITLE | H237
- H237-124 | UNKNOWN TITLE | H237
- H237-125 | UNKNOWN TITLE | H237
- H237-126 | UNKNOWN TITLE | H237
- H237-127 | UNKNOWN TITLE | H237
- H237-128 | UNKNOWN TITLE | H237
- H237-129 | UNKNOWN TITLE | H237
- H237-130 | UNKNOWN TITLE | H237
- H237-131 | UNKNOWN TITLE | H237
- H237-132 | UNKNOWN TITLE | H237
- H237-133 | UNKNOWN TITLE | H237
- H237-134 | UNKNOWN TITLE | H237
- H237-135 | UNKNOWN TITLE | H237
- H237-136 | UNKNOWN TITLE | H237
- H237-137 | UNKNOWN TITLE | H237
- H237-138 | UNKNOWN TITLE | H237
- H237-139 | UNKNOWN TITLE | H237
- H237-140 | UNKNOWN TITLE | H237
- H237-141 | UNKNOWN TITLE | H237
- H237-142 | UNKNOWN TITLE | H237
- H237-143 | UNKNOWN TITLE | H237
- H237-144 | UNKNOWN TITLE | H237
- H237-145 | UNKNOWN TITLE | H237
- H237-146 | UNKNOWN TITLE | H237
- H237-147 | UNKNOWN TITLE | H237
- H237-148 | UNKNOWN TITLE | H237
- H237-149 | UNKNOWN TITLE | H237
- H237-150 | UNKNOWN TITLE | H237
- H237-151 | UNKNOWN TITLE | H237
- H237-152 | UNKNOWN TITLE | H237
- H237-153 | UNKNOWN TITLE | H237
- H237-154 | UNKNOWN TITLE | H237
- H237-155 | UNKNOWN TITLE | H237
- H237-156 | UNKNOWN TITLE | H237
- H237-157 | UNKNOWN TITLE | H237
- H237-158 | UNKNOWN TITLE | H237
- H237-159 | UNKNOWN TITLE | H237
- H237-160 | UNKNOWN TITLE | H237
- H237-161 | UNKNOWN TITLE | H237
- H237-162 | UNKNOWN TITLE | H237
- H237-163 | UNKNOWN TITLE | H237
- H237-164 | UNKNOWN TITLE | H237
- H237-165 | UNKNOWN TITLE | H237
- H237-166 | UNKNOWN TITLE | H237
- H237-167 | UNKNOWN TITLE | H237
- H237-168 | UNKNOWN TITLE | H237
- H237-169 | UNKNOWN TITLE | H237
- H237-170 | UNKNOWN TITLE | H237
- H237-171 | UNKNOWN TITLE | H237
- H237-172 | UNKNOWN TITLE | H237
- H237-173 | UNKNOWN TITLE | H237
- H237-174 | UNKNOWN TITLE | H237
- H237-175 | UNKNOWN TITLE | H237
- H237-176 | UNKNOWN TITLE | H237
- H237-177 | UNKNOWN TITLE | H237
- H237-178 | UNKNOWN TITLE | H237
- H237-179 | UNKNOWN TITLE | H237
- H237-180 | UNKNOWN TITLE | H237
- H237-181 | UNKNOWN TITLE | H237
- H237-182 | UNKNOWN TITLE | H237
- H237-183 | UNKNOWN TITLE | H237
- H237-184 | UNKNOWN TITLE | H237
- H237-185 | UNKNOWN TITLE | H237
- H237-186 | UNKNOWN TITLE | H237
- H237-187 | UNKNOWN TITLE | H237
- H237-188 | UNKNOWN TITLE | H237
- H237-189 | UNKNOWN TITLE | H237
- H237-190 | UNKNOWN TITLE | H237
- H237-191 | UNKNOWN TITLE | H237
- H237-192 | UNKNOWN TITLE | H237
- H237-193 | UNKNOWN TITLE | H237
- H237-194 | UNKNOWN TITLE | H237
- H237-195 | UNKNOWN TITLE | H237
- H237-196 | UNKNOWN TITLE | H237
- H237-197 | UNKNOWN TITLE | H237
- H237-198 | UNKNOWN TITLE | H237
- H237-199 | UNKNOWN TITLE | H237
- H237-200 | UNKNOWN TITLE | H237
- H237-201 | UNKNOWN TITLE | H237
- H237-202 | UNKNOWN TITLE | H237
- H237-203 | UNKNOWN TITLE | H237
- H237-204 | UNKNOWN TITLE | H237
- H237-205 | UNKNOWN TITLE | H237
- H237-206 | UNKNOWN TITLE | H237
- H237-207 | UNKNOWN TITLE | H237
- H237-208 | UNKNOWN TITLE | H237
- H237-209 | UNKNOWN TITLE | H237
- H237-210 | UNKNOWN TITLE | H237
- H237-211 | UNKNOWN TITLE | H237
- H237-212 | UNKNOWN TITLE | H237
- H237-213 | UNKNOWN TITLE | H237
- H237-214 | UNKNOWN TITLE | H237
- H237-215 | UNKNOWN TITLE | H237
- H237-216 | UNKNOWN TITLE | H237
- H237-217 | UNKNOWN TITLE | H237
- H237-218 | UNKNOWN TITLE | H237
- H237-219 | UNKNOWN TITLE | H237
- H237-220 | UNKNOWN TITLE | H237
- H237-221 | UNKNOWN TITLE | H237
- H237-222 | UNKNOWN TITLE | H237
- H237-223 | UNKNOWN TITLE | H237
- H237-224 | UNKNOWN TITLE | H237
- H237-225 | UNKNOWN TITLE | H237
- H237-226 | UNKNOWN TITLE | H237
- H237-227 | UNKNOWN TITLE | H237
- H237-228 | UNKNOWN TITLE | H237
- H237-229 | UNKNOWN TITLE | H237
- H237-230 | UNKNOWN TITLE | H237
- H237-231 | UNKNOWN TITLE | H237
- H237-232 | UNKNOWN TITLE | H237
- H237-233 | UNKNOWN TITLE | H237
- H237-234 | UNKNOWN TITLE | H237
- H237-235 | UNKNOWN TITLE | H237
- H237-236 | UNKNOWN TITLE | H237
- H237-237 | UNKNOWN TITLE | H237
- MF-PIM-03 | Variant matrix (all categories) | OTHER_151
- MF-MKT-03 | Order import from marketplaces | OTHER_151
- MF-PERF-02 | Dead-letter / retry storm controls | OTHER_151
- CUR-01 | P0 – Merge & Deployment | OTHER_151
- CUR-02 | P0 – Admin | OTHER_151
- CUR-03 | P0 – AI Orchestrator | OTHER_151
- CUR-04 | P0/P1 – Security | OTHER_151
- CUR-05 | P1 – Katalog/PIM | OTHER_151
- CUR-06 | P1 – Supplier/API/XML/TecDoc | OTHER_151
- CUR-07 | P1 – Price + Stock Automation | OTHER_151
- CUR-08 | P1 – Product AI | OTHER_151
- CUR-09 | P1 – Category Intelligence AI | OTHER_151
- CUR-10 | P1 – Customs AI | OTHER_151
- CUR-11 | P1 – Order Automation PREPARATION ONLY | OTHER_151
- CUR-12 | P1 – SEO / Google Preparation | OTHER_151
- CUR-13 | P1 – i18n/UX | OTHER_151
- CUR-14 | P0/P1 – QA | OTHER_151
- CUR-15 | P1 – Production Readiness | OTHER_151
- CHK-FINAL-001 | v21-v200 modules integrated | OTHER_151
- CHK-FINAL-002 | common configuration | OTHER_151
- CHK-FINAL-003 | common data model | OTHER_151
- CHK-FINAL-004 | event/task bus | OTHER_151
- CHK-FINAL-005 | common provenance | OTHER_151
- CHK-FINAL-009 | permitted public research | OTHER_151
- CHK-FINAL-010 | supplier APIs/XML/CSV | OTHER_151
- CHK-FINAL-012 | all source terms/rate limits reviewed | OTHER_151
- CHK-FINAL-013 | category intelligence | OTHER_151
- CHK-FINAL-014 | competitor intelligence | OTHER_151
- CHK-FINAL-015 | supplier intelligence | OTHER_151
- CHK-FINAL-016 | price intelligence | OTHER_151
- CHK-FINAL-017 | demand intelligence | OTHER_151
- CHK-FINAL-018 | profitability | OTHER_151
- CHK-FINAL-019 | risk/compliance | OTHER_151
- CHK-FINAL-020 | official verification | OTHER_151
- CHK-FINAL-021 | opportunity engine | OTHER_151
- CHK-FINAL-022 | global intelligence | OTHER_151
- CHK-FINAL-023 | v31 memory connected | OTHER_151
- CHK-FINAL-024 | agent memory retrieval | OTHER_151
- CHK-FINAL-025 | lessons retained | OTHER_151
- CHK-FINAL-026 | confidence tracking | OTHER_151
- CHK-FINAL-027 | conflict handling | OTHER_151
- CHK-FINAL-028 | Council synthesis | OTHER_151
- CHK-FINAL-029 | human approval | OTHER_151
- CHK-FINAL-030 | validation | OTHER_151
- CHK-FINAL-031 | retries | OTHER_151
- CHK-FINAL-032 | rate limits | OTHER_151
- CHK-FINAL-033 | timeouts | OTHER_151
- CHK-FINAL-034 | circuit breakers | OTHER_151
- CHK-FINAL-035 | data integrity | OTHER_151
- CHK-FINAL-036 | freshness | OTHER_151
- CHK-FINAL-037 | duplicate handling | OTHER_151
- CHK-FINAL-038 | recovery | OTHER_151
- CHK-FINAL-039 | secrets protected | OTHER_151
- CHK-FINAL-040 | least privilege | OTHER_151
- CHK-FINAL-041 | encryption | OTHER_151
- CHK-FINAL-042 | audit logs | OTHER_151
- CHK-FINAL-043 | privacy review | OTHER_151
- CHK-FINAL-044 | retention/deletion | OTHER_151
- CHK-FINAL-045 | incident response | OTHER_151
- CHK-FINAL-046 | unit | OTHER_151
- CHK-FINAL-047 | integration | OTHER_151
- CHK-FINAL-048 | end-to-end | OTHER_151
- CHK-FINAL-049 | security | OTHER_151
- CHK-FINAL-050 | load | OTHER_151
- CHK-FINAL-051 | failure/recovery | OTHER_151
- CHK-FINAL-052 | connector tests | OTHER_151
- CHK-FINAL-053 | restore test | OTHER_151
- CHK-FINAL-054 | monitoring | OTHER_151
- CHK-FINAL-055 | alerts | OTHER_151
- CHK-FINAL-056 | backups | OTHER_151
- CHK-FINAL-057 | runbooks | OTHER_151
- CHK-FINAL-058 | rollback | OTHER_151
- CHK-FINAL-059 | support process | OTHER_151
- CHK-FINAL-060 | cost monitoring | OTHER_151
- CHK-FINAL-061 | pilot | OTHER_151
- CHK-FINAL-062 | observe | OTHER_151
- CHK-FINAL-063 | correct | OTHER_151
- CHK-FINAL-064 | approve | OTHER_151
- CHK-FINAL-065 | production release | OTHER_151
- CHK-GOLIVE-001 | Build passes | OTHER_151
- CHK-GOLIVE-002 | Database migrations pass | OTHER_151
- CHK-GOLIVE-003 | 41 categories verified | OTHER_151
- CHK-GOLIVE-004 | Product catalog verified | OTHER_151
- CHK-GOLIVE-005 | Search verified | OTHER_151
- CHK-GOLIVE-006 | Cart verified | OTHER_151
- CHK-GOLIVE-007 | Checkout verified | OTHER_151
- CHK-GOLIVE-008 | Orders verified | OTHER_151
- CHK-GOLIVE-009 | Supplier integration verified | OTHER_151
- CHK-GOLIVE-010 | Stock synchronization verified | OTHER_151
- CHK-GOLIVE-011 | Dropshipping test verified | OTHER_151
- CHK-GOLIVE-012 | Carrier/tracking test verified | OTHER_151
- CHK-GOLIVE-013 | Returns workflow verified | OTHER_151
- CHK-GOLIVE-014 | Registration/login verified | OTHER_151
- CHK-GOLIVE-015 | Customer data isolation verified | OTHER_151
- CHK-GOLIVE-016 | Wishlist verified | OTHER_151
- CHK-GOLIVE-017 | Order history verified | OTHER_151
- CHK-GOLIVE-018 | German | OTHER_151
- CHK-GOLIVE-019 | Turkish | OTHER_151
- CHK-GOLIVE-020 | English | OTHER_151
- CHK-GOLIVE-021 | Arabic | OTHER_151
- CHK-GOLIVE-022 | Arabic RTL | OTHER_151
- CHK-GOLIVE-023 | Secrets protected | OTHER_151
- CHK-GOLIVE-024 | Authorization verified | OTHER_151
- CHK-GOLIVE-025 | Rate limits verified | OTHER_151
- CHK-GOLIVE-026 | Payment verification verified | OTHER_151
- CHK-GOLIVE-027 | File upload security verified | OTHER_151
- CHK-GOLIVE-028 | Dependency/security audit reviewed | OTHER_151
- CHK-GOLIVE-029 | Sitemap | OTHER_151
- CHK-GOLIVE-030 | robots.txt | OTHER_151
- CHK-GOLIVE-031 | canonical | OTHER_151
- CHK-GOLIVE-032 | hreflang | OTHER_151
- CHK-GOLIVE-033 | structured data | OTHER_151
- CHK-GOLIVE-034 | analytics events | OTHER_151
- CHK-GOLIVE-035 | consent | OTHER_151
- CHK-GOLIVE-036 | Merchant feed | OTHER_151
- CHK-GOLIVE-037 | AI chat | OTHER_151
- CHK-GOLIVE-038 | verified product data | OTHER_151
- CHK-GOLIVE-039 | verified order data | OTHER_151
- CHK-GOLIVE-040 | human escalation | OTHER_151
- CHK-GOLIVE-041 | multilingual AI | OTHER_151
- CHK-GOLIVE-042 | no fabricated prices/stock/order status | OTHER_151
- CHK-GOLIVE-043 | production environment configured | OTHER_151
- CHK-GOLIVE-044 | no production secrets in Git | OTHER_151
- CHK-GOLIVE-045 | backup/recovery documented | OTHER_151
- CHK-GOLIVE-046 | health checks | OTHER_151
- CHK-GOLIVE-047 | monitoring/error logging | OTHER_151
- CHK-GOLIVE-048 | final end-to-end test passed | OTHER_151
- CHK-P4-001 | `npm run test:part2` — 14/14 | OTHER_151
- CHK-P4-002 | `npm run test:part3` — 11/11 | OTHER_151
- CHK-P4-003 | `npm run test:part4` — 15/15 | OTHER_151
- CHK-P4-004 | `npm run test:unit` — 36/36 | OTHER_151
- CHK-P4-005 | `npm run typecheck` | OTHER_151
- CHK-P4-006 | `npm run lint` | OTHER_151
- CHK-P4-007 | `npm run build` | OTHER_151
- CHK-P4-008 | Confirm `BUZZARD_SALES_ENABLED=0` in env | OTHER_151
- CHK-P4-010 | `server/data/security-log.json` writable | OTHER_151
- CHK-P4-011 | If `BUZZARD_RATE_LIMIT_STORE=file`, `server/data/rate-limit-buckets.json` writable | OTHER_151
- CHK-P4-012 | No secrets in git | OTHER_151
- CHK-P4-015 | API allows `BUZZARD_SITE_URL` origin | OTHER_151
- CHK-P4-016 | HTTPS enforced in production | OTHER_151
- CHK-P4-017 | Security headers active (HSTS, CSP) | OTHER_151
- CHK-P4-018 | Admin login works | OTHER_151
- CHK-P4-019 | 2FA optional flow intact | OTHER_151
- CHK-P4-020 | Read-only user gets 403 on write routes | OTHER_151
- CHK-P4-021 | `/admin/control-center/` | OTHER_151
- CHK-P4-022 | `/admin/security-dashboard/` | OTHER_151
- CHK-P4-023 | `/admin/sessions/` | OTHER_151
- CHK-P4-024 | Nav filtered by role (catalog_manager vs order_manager) | OTHER_151
- CHK-P4-026 | DB backup before migrate (`npm run db:backup`) | OTHER_151
